// Same-origin link between the teacher's window and the projector window.
// BroadcastChannel carries the current question payload — no server round-trip,
// so the presenter view shows exactly what the teacher is looking at.

export const PRESENT_CHANNEL = 'cmreview-present';

export const MSG = {
  SHOW: 'show', // teacher → projector: { kind, q: { number, question, options } }
  HELLO: 'hello', // projector → teacher: "I just opened, send me the current question"
};

export const channelSupported = typeof window !== 'undefined' && 'BroadcastChannel' in window;
