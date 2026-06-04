import { PALETTE } from './tools';

// Minimal stroke icons (18px, currentColor) so the toolbar inherits ink/paper.
const Pen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19l7-7-4-4-7 7-1 5z" /><path d="M16 6l2-2 4 4-2 2" />
  </svg>
);
const Highlighter = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h6" /><path d="M9 14l-3 5 5-1 9-9-4-4-9 9z" /><path d="M14 7l3 3" />
  </svg>
);
const Eraser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 15l7 7h9" /><path d="M11 22L3 14a2 2 0 010-3l7-7a2 2 0 013 0l6 6a2 2 0 010 3l-5 5" />
  </svg>
);
const Undo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7v6h6" /><path d="M3 13a9 9 0 109-6L3 13" />
  </svg>
);
const Trash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7l1 13h10l1-13" />
  </svg>
);
const Close = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

function ToolBtn({ label, active, disabled, className = '', onClick, children }) {
  return (
    <button
      type="button"
      className={`annot-btn${active ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export default function Toolbar({ active, tool, color, hasStrokes, onToggle, onTool, onColor, onUndo, onClear }) {
  if (!active) {
    return (
      <button type="button" className="annot-fab" onClick={onToggle} aria-label="Annotate — draw on the page" title="Annotate the page">
        <Pen />
      </button>
    );
  }

  return (
    <div className="annot-bar" role="toolbar" aria-label="Annotation tools">
      <div className="annot-group">
        <ToolBtn label="Pen" active={tool === 'pen'} onClick={() => onTool('pen')}><Pen /></ToolBtn>
        <ToolBtn label="Highlighter" active={tool === 'highlighter'} onClick={() => onTool('highlighter')}><Highlighter /></ToolBtn>
        <ToolBtn label="Eraser" active={tool === 'eraser'} onClick={() => onTool('eraser')}><Eraser /></ToolBtn>
      </div>

      <span className="annot-div" aria-hidden="true" />

      <div className="annot-group annot-swatches">
        {PALETTE.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`annot-dot${color === c.value ? ' is-on' : ''}`}
            style={{ '--dot': c.value }}
            onClick={() => onColor(c.value)}
            aria-pressed={color === c.value}
            aria-label={`${c.name} ink`}
            title={c.name}
          />
        ))}
      </div>

      <span className="annot-div" aria-hidden="true" />

      <div className="annot-group">
        <ToolBtn label="Undo last stroke" disabled={!hasStrokes} onClick={onUndo}><Undo /></ToolBtn>
        <ToolBtn label="Clear this page" disabled={!hasStrokes} onClick={onClear}><Trash /></ToolBtn>
        <ToolBtn label="Done annotating" className="annot-done" onClick={onToggle}><Close /></ToolBtn>
      </div>
    </div>
  );
}
