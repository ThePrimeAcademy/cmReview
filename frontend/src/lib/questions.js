// Shared helpers for turning ClassMarker question payloads into renderable
// shapes. Used by the full review view (QuestionPage) and the question-only
// presenter view (PresentPage), so they stay in lockstep.

// ClassMarker option payloads vary in shape — normalize to [{ key, html }].
export function normalizeOptions(options) {
  if (options == null) return [];
  if (Array.isArray(options)) {
    return options.map((o, i) => ({
      key: String.fromCharCode(65 + i),
      html: typeof o === 'object' ? (o.option ?? o.text ?? JSON.stringify(o)) : String(o),
    }));
  }
  if (typeof options === 'object') {
    return Object.entries(options).map(([key, value]) => ({
      key,
      html: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));
  }
  return [{ key: 'A', html: String(options) }];
}

export const textOf = (html) =>
  String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

// Freetext-style questions store grading rules instead of choices:
//   { exact_match: [{ content: '320' }, { content: '0.96' }] }
// Returns the accepted answers, or null when this is a normal choice question.
export function acceptedAnswers(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options) || !options.exact_match) return null;
  const rules = Array.isArray(options.exact_match) ? options.exact_match : [options.exact_match];
  const answers = rules
    .map((r) => (r && typeof r === 'object' ? r.content : r))
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter(Boolean);
  return answers.length > 0 ? answers : null;
}

// A purely numeric / quantitative answer: 320, 0.96, -2, 3/4, $5, 50%, 1,000.
const NUMERIC_ANSWER_RE = /^[+\-−]?\$?\s*\d[\d.,\s]*(?:\/\d+)?\s*%?$/;
// Math notation in the *visible* text (tags stripped first, so HTML attribute
// `=` and the like never trigger): comparison/operator glyphs, LaTeX delims,
// inline $…$, a/b fractions, and `x = …` / `x ^ …` operand pairs.
const MATH_NOTATION_RE = /[≠≤≥±×÷√∑∏∫πθΔ∞≈°]|\\[([]|\$[^$\n]{1,40}\$|\b\d+\s*\/\s*\d+\b|[\w)]\s*[=^]\s*[\w(+\-]/i;
const MATH_KEYWORDS_RE = /\b(solve|simplify|evaluate|factor|equation|expression|derivative|integral|slope|exponent|polynomial|quadratic|calculate|round to)\b/i;

// Heuristic: does this question look like math? Drives whether the presenter
// shows a blank work area by default. Erring toward "yes" is cheap — the
// presenter has a manual toggle — so numeric free-text answers, math notation,
// MathML/superscripts, and common math verbs all count.
export function isMathQuestion(q) {
  if (!q) return false;

  const answers = acceptedAnswers(q.options);
  if (answers && answers.every((a) => NUMERIC_ANSWER_RE.test(a))) return true;

  const optionsRaw =
    q.options == null ? '' : typeof q.options === 'string' ? q.options : JSON.stringify(q.options);
  const rawHtml = `${q.question ?? ''} ${optionsRaw}`;
  if (/<math|<su[bp]\b/i.test(rawHtml)) return true; // MathML or super/subscripts

  const visible = textOf(rawHtml); // strips tags, so attribute `=` can't match
  return MATH_NOTATION_RE.test(visible) || MATH_KEYWORDS_RE.test(visible);
}
