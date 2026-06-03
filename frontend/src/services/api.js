async function handle(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

// Transient conditions worth retrying: the backend restarting (dev watch /
// redeploy drops the connection) and 503 while the first sync fills the store.
const RETRYABLE = new Set([502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getJson(path, retries = 3) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(path);
      if (!RETRYABLE.has(res.status) || attempt >= retries) return await handle(res);
    } catch (err) {
      if (attempt >= retries) throw err instanceof Error ? err : new Error('Network error');
    }
    await sleep(900 * (attempt + 1));
  }
}

export function postJson(path, data = {}) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handle);
}

export const fmtDate = (unixSeconds) =>
  unixSeconds
    ? new Date(unixSeconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

// Heat color for a miss rate: 0% → green, 50% → amber, 100% → red.
export const missColor = (rate) => `oklch(58% 0.18 ${Math.round(145 - (Math.min(Math.max(rate, 0), 100) / 100) * 120)})`;
