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
