// Mirrors pen strokes from the teacher's window onto the projector. The two
// layouts differ (the teacher page has stats, bars, and tables the projector
// never shows), so raw page coordinates can't be copied across. Instead both
// views tag the landmarks they share with data-mirror — "q" for the question
// body, "opt-A"… for each choice, "work" for the blank work panel — and each
// stroke travels relative to the landmark under its first point, scaled
// uniformly on arrival so handwriting keeps its shape.

// ── Raw stroke relay (teacher window only) ─────────────────────────────────
// AnnotationLayer publishes whatever is inked; usePresenter subscribes and
// relays it over the BroadcastChannel. A module-level link avoids threading
// props from App down to whichever page happens to be presenting.

let latestStrokes = [];
const listeners = new Set();

export function publishStrokes(strokes) {
  latestStrokes = strokes;
  listeners.forEach((fn) => fn(strokes));
}

export function subscribeStrokes(fn) {
  listeners.add(fn);
  fn(latestStrokes);
  return () => listeners.delete(fn);
}

// ── Landmark coordinate mapping ────────────────────────────────────────────

// Document-space rects of every data-mirror landmark on the current page.
export function collectRegions() {
  const regions = {};
  document.querySelectorAll('[data-mirror]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    regions[el.dataset.mirror] = {
      left: r.left + window.scrollX,
      top: r.top + window.scrollY,
      width: r.width,
      height: r.height,
    };
  });
  return regions;
}

const contains = (r, p) =>
  p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height;

// Strokes that start outside every landmark (margins, the stats card…) fall
// back to the question frame so nothing silently disappears.
function regionFor(regions, point) {
  const hit = Object.keys(regions).find((id) => id !== 'q' && contains(regions[id], point));
  return hit ?? ('q' in regions ? 'q' : null);
}

// Points and pen width become fractions of the source landmark's width;
// `aspect` carries the source proportions so the far side can scale uniformly.
export function normalizeStrokes(strokes, regions) {
  const out = [];
  for (const s of strokes) {
    if (!s.points.length) continue;
    const id = regionFor(regions, s.points[0]);
    if (!id) continue;
    const r = regions[id];
    out.push({
      ...s,
      region: id,
      aspect: r.height / r.width,
      width: s.width / r.width,
      points: s.points.map((p) => ({ x: (p.x - r.left) / r.width, y: (p.y - r.top) / r.width })),
    });
  }
  return out;
}

// Contain-fit into the matching landmark: one scale factor for x, y, and pen
// width, capped by the target's height so work-panel ink never spills past
// the projector's panel even when the two panels' proportions differ.
export function denormalizeStrokes(strokes, regions) {
  const out = [];
  for (const s of strokes) {
    const r = regions[s.region] ?? regions.q;
    if (!r) continue;
    const scale = s.aspect > 0 ? Math.min(r.width, r.height / s.aspect) : r.width;
    out.push({
      ...s,
      width: s.width * scale,
      points: s.points.map((p) => ({ x: r.left + p.x * scale, y: r.top + p.y * scale })),
    });
  }
  return out;
}
