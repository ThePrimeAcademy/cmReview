import { Link } from 'react-router-dom';
import { missColor } from '../services/api';

export function Crumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && <span className="sep">/</span>}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span className="here">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function MissMeter({ rate, missed, asked }) {
  const color = missColor(rate);
  return (
    <div className="miss">
      <span className="pct" style={{ color }}>{Math.round(rate)}%</span>
      <div className="track" role="img" aria-label={`Missed by ${missed} of ${asked} attempts`}>
        <div className="fill" style={{ width: `${rate}%`, background: color }} />
      </div>
      <span className="counts">{missed}/{asked} missed</span>
    </div>
  );
}

export function Chip({ children, result }) {
  return <span className={`chip${result ? ` result-${result}` : ''}`}>{children}</span>;
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Loading() {
  return <p className="loading">Loading…</p>;
}
