import { useEffect, useRef, useState } from 'react';
import QuestionHtml from '../QuestionHtml';
import MirrorLayer from '../annotation/MirrorLayer';
import { acceptedAnswers, normalizeOptions, isMathQuestion } from '../../lib/questions';
import { PRESENT_CHANNEL, MSG, channelSupported } from './channel';
import './present.css';

// Projector view: shows ONLY the question and its (unmarked) options. No
// correct-answer marker, pick counts, stats, or attempts — students see the
// question, never the answer. Driven entirely by the teacher's window over
// BroadcastChannel: the question, the work panel, and the pen strokes the
// teacher draws on their own screen. Nothing here is interactive except
// fullscreen — writing happens in the main window.
export default function PresentPage() {
  const [q, setQ] = useState(null);
  const [workOpen, setWorkOpen] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const qidRef = useRef(null); // current question id, to drop stale stroke messages

  useEffect(() => {
    if (!channelSupported) return undefined;
    const channel = new BroadcastChannel(PRESENT_CHANNEL);
    channel.onmessage = (event) => {
      const msg = event.data;
      if (msg?.kind === MSG.SHOW) {
        const id = msg.q?.id ?? msg.q?.number;
        if (String(id) !== String(qidRef.current)) {
          qidRef.current = id;
          setStrokes([]); // new slide starts clean
        }
        setQ(msg.q);
        // Older teacher windows don't send workOpen — fall back to the same
        // math auto-detection they would have used.
        setWorkOpen(msg.workOpen ?? isMathQuestion(msg.q));
      } else if (msg?.kind === MSG.STROKES) {
        if (String(msg.qid) === String(qidRef.current)) setStrokes(msg.strokes);
      }
    };
    channel.postMessage({ kind: MSG.HELLO }); // ask the teacher for the current question
    return () => channel.close();
  }, []);

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
      <button type="button" className="present-fs present-fs--float" onClick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen">⛶</button>

      <p className="present-num">Question {q.number}</p>
      <div className="present-q" data-mirror="q">
        {q.question
          ? <QuestionHtml html={q.question} />
          : <span className="present-missing">No question text for this one.</span>}
      </div>

      {options.length > 0 && (
        <ol className="present-options">
          {options.map((opt) => (
            <li key={opt.key} className="present-opt" data-mirror={`opt-${opt.key}`}>
              <span className="present-key">{opt.key}</span>
              <QuestionHtml html={opt.html} className="inline" />
            </li>
          ))}
        </ol>
      )}

      {/* Blank room for the worked problem, toggled from the teacher's window.
          Their pen strokes land here via the mirror layer below. */}
      {workOpen && <div className="present-work" data-mirror="work" aria-hidden="true" />}

      {/* The teacher's ink, re-projected onto this layout. */}
      <MirrorLayer strokes={strokes} />
    </main>
  );
}
