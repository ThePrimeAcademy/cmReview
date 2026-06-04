import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Toolbar from './Toolbar';
import { DEFAULT_COLOR, TOOLS } from './tools';
import { MIN_POINT_DISTANCE, strokeHit, strokePath } from './geometry';
import './annotation.css';

// Pointer position in document space, so strokes stay glued to page content
// while it scrolls underneath the fixed overlay.
const docPoint = (e) => ({ x: e.clientX + window.scrollX, y: e.clientY + window.scrollY });

export default function AnnotationLayer() {
  const { pathname } = useLocation();

  const [active, setActive] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(DEFAULT_COLOR);

  // Each route keeps its own marks for the session (cleared on full reload).
  const storeRef = useRef(new Map());
  const [strokes, setStrokes] = useState([]);
  const [current, setCurrent] = useState(null); // in-progress stroke
  const idRef = useRef(0);
  const erasingRef = useRef(false);

  // Offset the drawn group by the scroll position so document-space strokes
  // render in the right place on the viewport-fixed SVG.
  const [scroll, setScroll] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setStrokes(storeRef.current.get(pathname) || []);
  }, [pathname]);

  const commit = useCallback((next) => {
    storeRef.current.set(pathname, next);
    setStrokes(next);
  }, [pathname]);

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
    window.addEventListener('resize', sync, { passive: true });
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // While drawing: Esc exits, Ctrl/Cmd+Z undoes the last stroke.
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setActive(false);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        commit(strokes.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, strokes, commit]);

  const eraseAt = useCallback((x, y) => {
    const next = strokes.filter((s) => !strokeHit(s, x, y));
    if (next.length !== strokes.length) commit(next);
  }, [strokes, commit]);

  const onPointerDown = (e) => {
    if (!active || (e.button != null && e.button !== 0)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const { x, y } = docPoint(e);
    if (tool === 'eraser') {
      erasingRef.current = true;
      eraseAt(x, y);
      return;
    }
    const t = TOOLS[tool];
    idRef.current += 1;
    setCurrent({ id: idRef.current, color, width: t.width, opacity: t.opacity, blend: t.blend, points: [{ x, y }] });
  };

  const onPointerMove = (e) => {
    if (!active) return;
    const { x, y } = docPoint(e);
    if (tool === 'eraser') {
      if (erasingRef.current) eraseAt(x, y);
      return;
    }
    setCurrent((cur) => {
      if (!cur) return cur;
      const last = cur.points[cur.points.length - 1];
      if (Math.hypot(x - last.x, y - last.y) < MIN_POINT_DISTANCE) return cur;
      return { ...cur, points: [...cur.points, { x, y }] };
    });
  };

  const endStroke = () => {
    erasingRef.current = false;
    if (current && current.points.length) commit([...strokes, current]);
    setCurrent(null);
  };

  const rendered = current ? [...strokes, current] : strokes;

  return (
    <>
      <svg
        className={`annot-svg${active ? ' is-active' : ''}`}
        data-tool={tool}
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      >
        <g transform={`translate(${-scroll.x} ${-scroll.y})`}>
          {rendered.map((s) => (
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

      <Toolbar
        active={active}
        tool={tool}
        color={color}
        hasStrokes={strokes.length > 0}
        onToggle={() => setActive((a) => !a)}
        onTool={setTool}
        onColor={setColor}
        onUndo={() => commit(strokes.slice(0, -1))}
        onClear={() => commit([])}
      />
    </>
  );
}
