import { useEffect, useState } from 'react';
import { strokePath } from './geometry';
import { collectRegions, denormalizeStrokes } from './mirror';
import './annotation.css';

// Read-only twin of AnnotationLayer for the projector: renders the strokes
// the teacher draws in the main window. No toolbar, never captures the
// pointer. Strokes arrive in landmark coordinates (see mirror.js) and are
// re-projected against this window's layout whenever it changes — covering
// resizes, fullscreen, and images that load after the question appears.
export default function MirrorLayer({ strokes }) {
  const [drawn, setDrawn] = useState([]);
  const [layoutTick, setLayoutTick] = useState(0);
  const [scroll, setScroll] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const bump = () => setLayoutTick((t) => t + 1);
    const observer = new ResizeObserver(bump);
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
    window.addEventListener('resize', bump);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', bump);
    };
  }, []);

  // Re-project after the DOM commits, so the landmarks measured are the ones
  // currently on screen.
  useEffect(() => {
    setDrawn(denormalizeStrokes(strokes, collectRegions()));
  }, [strokes, layoutTick]);

  // Same scroll-follow trick as AnnotationLayer: strokes live in document
  // space, the SVG is viewport-fixed.
  useEffect(() => {
    let frame = 0;
    const sync = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setScroll({ x: window.scrollX, y: window.scrollY });
      });
    };
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => {
      window.removeEventListener('scroll', sync);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg className="annot-svg" aria-hidden="true">
      <g transform={`translate(${-scroll.x} ${-scroll.y})`}>
        {drawn.map((s) => (
          <path
            key={s.id}
            d={strokePath(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeOpacity={s.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={s.blend === 'multiply' ? { mixBlendMode: 'multiply' } : undefined}
          />
        ))}
      </g>
    </svg>
  );
}
