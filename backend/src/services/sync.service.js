// Pulls webhook records from the progressReport export endpoint and merges
// them into the local store. Incremental by default (since=lastReceivedAt);
// pass { full: true } to re-pull everything.
const store = require('./store.service');
const { EXPORT_URL, EXPORT_TOKEN } = require('../config');

const PAGE_SIZE = 200;

let syncing = false;

function isConfigured() {
  return Boolean(EXPORT_URL && EXPORT_TOKEN);
}

async function fetchPage({ since, offset }) {
  const url = new URL(EXPORT_URL);
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('offset', String(offset));
  if (since) url.searchParams.set('since', since);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${EXPORT_TOKEN}` },
  });

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch (_) { /* non-JSON body */ }
    throw new Error(`Export endpoint returned ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return res.json();
}

async function runSync({ full = false } = {}) {
  if (!isConfigured()) {
    throw new Error('EXPORT_URL / EXPORT_TOKEN not set — copy backend/.env.example to backend/.env');
  }
  if (syncing) throw new Error('Sync already in progress');
  syncing = true;

  try {
    const since = full ? null : store.getState().meta.lastReceivedAt || null;
    let offset = 0;
    let pages = 0;
    let added = 0;
    let updated = 0;
    let maxReceivedAt = since || '';

    while (true) {
      const data = await fetchPage({ since, offset });
      const counts = store.applyRecords(data.records);
      added += counts.added;
      updated += counts.updated;
      pages++;

      for (const r of data.records || []) {
        if ((r.receivedAt || '') > maxReceivedAt) maxReceivedAt = r.receivedAt;
      }

      if (data.count === 0 || offset + data.count >= data.total) break;
      offset += data.count;
    }

    store.setMeta({
      lastSyncAt: new Date().toISOString(),
      lastReceivedAt: maxReceivedAt || null,
    });
    store.save();

    const summary = { added, updated, pages, totalAttempts: store.getState().attempts.length };
    console.log(`[sync] Done: +${added} new, ~${updated} updated across ${pages} page(s)`);
    return summary;
  } finally {
    syncing = false;
  }
}

module.exports = { runSync, isConfigured };
