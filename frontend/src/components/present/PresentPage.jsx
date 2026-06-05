import { useEffect, useState } from 'react';
import QuestionHtml from '../QuestionHtml';
import AnnotationLayer from '../annotation/AnnotationLayer';
import { acceptedAnswers, normalizeOptions, isMathQuestion } from '../../lib/questions';
import { PRESENT_CHANNEL, MSG, channelSupported } from './channel';
import './present.css';

// Projector view: shows ONLY the question and its (unmarked) options. No
// correct-answer marker, pick counts, stats, or attempts — students see the
// question, never the answer. Driven entirely by the teacher's window over
// BroadcastChannel, so it has no API access of its own.
export default function PresentPage() {
  const [q, setQ] = useState(null);
  // Blank area to work the problem with the pen. Defaults open on math
  // questions, but the teacher can override per question via the ✎ toggle.
  const [workOpen, setWorkOpen] = useState(false);

  useEffect(() => {
    if (!channelSupported) return undefined;
    const channel = new BroadcastChannel(PRESENT_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.kind === MSG.SHOW) setQ(event.data.q);
    };
    channel.postMessage({ kind: MSG.HELLO }); // ask the teacher for the current question
    return () => channel.close();
  }, []);

  // Reset the work area to its auto-detected default whenever the slide changes.
  useEffect(() => {
    setWorkOpen(isMathQuestion(q));
  }, [q?.id, q?.number]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  };

  if (!channelSupported) {
    return (
      <div className="present-wait">
        <p>This browser can’t sync the presenter view.</p>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="present-wait">
        <div className="present-brand">cm<em>Review</em> · presenter</div>
        <p>Open a question in your main window and it’ll appear here for the class.</p>
        <button type="button" className="present-fs" onClick={toggleFullscreen}>Fullscreen</button>
        <p className="present-hint">Drag this window onto the projector, then go fullscreen.</p>
      </div>
    );
  }

  const accepted = acceptedAnswers(q.options);
  const options = accepted ? [] : normalizeOptions(q.options);

  return (
    <main className={`present${workOpen ? ' has-work' : ''}`}>
      <button
        type="button"
        className={`present-fs present-fs--float present-fs--work${workOpen ? ' is-on' : ''}`}
        onClick={() => setWorkOpen((open) => !open)}
        aria-pressed={workOpen}
        aria-label="Toggle work space"
        title="Work space"
      >✎</button>
      <button type="button" className="present-fs present-fs--float" onClick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen">⛶</button>

      <p className="present-num">Question {q.number}</p>
      <div className="present-q">
        {q.question
          ? <QuestionHtml html={q.question} />
          : <span className="present-missing">No question text for this one.</span>}
      </div>

      {options.length > 0 && (
        <ol className="present-options">
          {options.map((opt) => (
            <li key={opt.key} className="present-opt">
              <span className="present-key">{opt.key}</span>
              <QuestionHtml html={opt.html} className="inline" />
            </li>
          ))}
        </ol>
      )}

      {/* Blank room to work the problem live with the pen. Grows to fill the
          projector below the question; the annotation canvas spans the whole
          viewport, so writing here needs no extra wiring. */}
      {workOpen && <div className="present-work" aria-hidden="true" />}

      {/* Write on the projected question — scoped to this question, so
          advancing the slide clears the canvas. */}
      <AnnotationLayer surfaceId={`present:${q.id ?? q.number}`} />
    </main>
  );
}
