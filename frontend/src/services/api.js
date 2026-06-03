async function handle(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export function getJson(path) {
  return fetch(path).then(handle);
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
