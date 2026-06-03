import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getJson, missColor } from '../services/api';
import { Chip, Crumbs, Empty, Loading } from '../components/ui';
import QuestionHtml from '../components/QuestionHtml';

// ClassMarker option payloads vary in shape — normalize to [{ key, html }].
function normalizeOptions(options) {
  if (options == null) return [];
  if (Array.isArray(options)) {
    return options.map((o, i) => ({ key: String.fromCharCode(65 + i), html: typeof o === 'object' ? (o.option ?? o.text ?? JSON.stringify(o)) : String(o) }));
  }
  if (typeof options === 'object') {
    return Object.entries(options).map(([key, value]) => ({ key, html: typeof value === 'object' ? JSON.stringify(value) : String(value) }));
  }
  return [{ key: 'A', html: String(options) }];
}

const textOf = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

// Freetext-style questions store grading rules instead of choices:
//   { exact_match: [{ content: '320' }, { content: '0.96' }] }
// Returns the accepted answers, or null when this is a normal choice question.
function acceptedAnswers(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options) || !options.exact_match) return null;
  const rules = Array.isArray(options.exact_match) ? options.exact_match : [options.exact_match];
  const answers = rules
    .map((r) => (r && typeof r === 'object' ? r.content : r))
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter(Boolean);
  return answers.length > 0 ? answers : null;
}

export default function QuestionPage() {
  const { groupId, testId, questionId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJson(`/api/groups/${groupId}/tests/${testId}/questions/${questionId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [groupId, testId, questionId]);

  if (error) return <Empty title="Could not load question">{error}</Empty>;
  if (!data) return <Loading />;

  const { groupName, test, bank, stats, distribution, attempts } = data;
  const accepted = acceptedAnswers(bank?.options);
  const options = accepted ? [] : normalizeOptions(bank?.options);
  const correctText = textOf(bank?.correctOption);
  const isAccepted = (response) => Boolean(accepted?.some((a) => textOf(a) === textOf(response)));

  const pickCount = (opt) => {
    const optText = textOf(opt.html);
    const hit = distribution.find((d) => {
      const resp = textOf(d.response);
      return resp === optText || resp === opt.key.toLowerCase();
    });
    return hit ? hit.count : 0;
  };
  const matchedResponses = new Set(
    options.map((o) => {
      const hit = distribution.find((d) => textOf(d.response) === textOf(o.html) || textOf(d.response) === o.key.toLowerCase());
      return hit?.response;
    }).filter(Boolean),
  );
  const otherResponses = distribution.filter((d) => !matchedResponses.has(d.response));
  const totalPicks = distribution.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <>
      <Crumbs
        items={[
          { label: 'Groups', to: '/' },
          { label: groupName || `Group #${groupId}`, to: `/groups/${groupId}` },
          { label: test?.testName || `Test #${testId}`, to: `/groups/${groupId}/tests/${testId}` },
          { label: `Question ${stats?.questionNumber ?? questionId}` },
        ]}
      />

      <h1 className="page-title">Question {stats?.questionNumber ?? `#${questionId}`}</h1>
      <p className="page-sub">
        {stats?.categoryName && <Chip>{stats.categoryName}</Chip>}{' '}
        {stats?.type && <span>{stats.type}</span>}
      </p>

      <div className="detail">
        <section>
          <div className="q-content">
            {bank?.question
              ? <QuestionHtml html={bank.question} />
              : <p className="q-missing">Question text wasn't included in the webhook data for this one — only result stats are available.</p>}

            {options.length > 0 && (
              <div className="options">
                {options.map((opt) => {
                  const isCorrect = correctText && (textOf(opt.html) === correctText || opt.key.toLowerCase() === correctText);
                  const picks = pickCount(opt);
                  return (
                    <div className={`option${isCorrect ? ' is-correct' : ''}`} key={opt.key}>
                      <div className="bar" style={{ width: `${(picks / totalPicks) * 100}%` }} />
                      <span className="opt-text">
                        {isCorrect && <span className="tick">✓</span>}
                        <strong>{opt.key}.</strong> <QuestionHtml html={opt.html} className="inline" />
                      </span>
                      <span className="picks">{picks} pick{picks === 1 ? '' : 's'}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {accepted && (
              <div className="options">
                <div className="option is-correct">
                  <span className="opt-text">
                    <span className="tick">✓</span>
                    <strong>Accepted answer{accepted.length === 1 ? '' : 's'}:</strong> {accepted.join('  ·  ')}
                  </span>
                </div>
                {distribution.map((d) => (
                  <div className={`option${isAccepted(d.response) ? ' is-correct' : ''}`} key={d.response}>
                    <div className="bar" style={{ width: `${(d.count / totalPicks) * 100}%` }} />
                    <span className="opt-text">
                      {isAccepted(d.response) && <span className="tick">✓</span>}
                      {d.response}
                    </span>
                    <span className="picks">{d.count} pick{d.count === 1 ? '' : 's'}</span>
                  </div>
                ))}
              </div>
            )}

            {!accepted && otherResponses.length > 0 && (
              <div className="options">
                {otherResponses.map((d) => (
                  <div className="option" key={d.response}>
                    <span className="opt-text">{d.response}</span>
                    <span className="picks">{d.count} pick{d.count === 1 ? '' : 's'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <table className="attempts-table">
            <caption>Attempts</caption>
            <thead>
              <tr><th>Student</th><th>Date</th><th>Response</th><th>Result</th></tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={i}>
                  <td>{a.name}</td>
                  <td>{a.date || '—'}</td>
                  <td className="resp">{a.userResponse != null ? textOf(a.userResponse) || a.userResponse : '—'}</td>
                  <td><Chip result={a.result}>{(a.result || '').replace(/_/g, ' ')}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="statcard">
          <div className="big" style={{ color: missColor(stats?.missRate ?? 0) }}>
            {Math.round(stats?.missRate ?? 0)}%
          </div>
          <div className="big-label">miss rate</div>
          <dl>
            <dt>Asked</dt><dd>{stats?.asked ?? 0}</dd>
            <dt>Missed</dt><dd>{stats?.missed ?? 0}</dd>
            <dt>Correct</dt><dd>{stats?.correct ?? 0}</dd>
            {stats?.partial > 0 && <><dt>Partial</dt><dd>{stats.partial}</dd></>}
            {stats?.unanswered > 0 && <><dt>Unanswered</dt><dd>{stats.unanswered}</dd></>}
            {stats?.ungraded > 0 && <><dt>Needs grading</dt><dd>{stats.ungraded}</dd></>}
          </dl>
        </aside>
      </div>
    </>
  );
}
