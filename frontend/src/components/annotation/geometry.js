// Pure helpers for freehand annotation strokes. All coordinates are in
// document space (clientX + scroll), so strokes stay pinned to page content.

export const MIN_POINT_DISTANCE = 2.2; // px — skip samples closer than this
export const ERASE_RADIUS = 14; // px — whole-stroke erase hit radius

export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// Smooth quadratic path through the sampled points. Midpoints become curve
// endpoints with the raw point as the control handle, which rounds off the
// jitter from raw pointer samples. A single point renders as a dot via the
// round linecap on a near-zero segment.
export function strokePath(points) {
  if (!points || points.length === 0) return '';
  const [first] = points;
  if (points.length === 1) return `M ${first.x} ${first.y} l 0.01 0.01`;

  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last.x} ${last.y}`;
}

// True when an erase point lands within ERASE_RADIUS of any vertex of the
// stroke — Zoom-style erase removes the whole mark, not a slice of it.
export function strokeHit(stroke, x, y) {
  const reach = ERASE_RADIUS + stroke.width / 2;
  return stroke.points.some((p) => distance(p.x, p.y, x, y) <= reach);
}
