import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJson } from '../services/api';
import { Chip, Crumbs, Empty, Loading, MissMeter } from '../components/ui';

export default function TestPage() {
  const { groupId, testId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJson(`/api/groups/${groupId}/tests/${testId}/questions`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [groupId, testId]);

  if (error) return <Empty title="Could not load test">{error}</Empty>;
  if (!data) return <Loading />;

  const { groupName, test, questions } = data;

  return (
    <>
      <Crumbs
        items={[
          { label: 'Groups', to: '/' },
          { label: groupName || `Group #${groupId}`, to: `/groups/${groupId}` },
          { label: test?.testName || `Test #${testId}` },
        ]}
      />
      <h1 className="page-title">{test?.testName || `Test #${testId}`}</h1>
      <p className="page-sub">
        {questions.length} questions, ranked most-missed first · {test?.attempts} attempt{test?.attempts === 1 ? '' : 's'} by {test?.students} student{test?.students === 1 ? '' : 's'}
      </p>

      {questions.length === 0 ? (
        <Empty title="No per-question data">
          The synced attempts for this test came through without a question breakdown.
        </Empty>
      ) : (
        <div className="rows">
          {questions.map((q) => (
            <Link
              className="row question-row"
              to={`/groups/${groupId}/tests/${testId}/questions/${q.questionId}`}
              key={q.questionId}
            >
              <span className="idx">{q.rank}</span>
              <MissMeter rate={q.missRate} missed={q.missed} asked={q.asked} />
              <span className="main">
                <span className="name">
                  {q.hasText ? q.snippet : `Question ${q.questionNumber ?? q.questionId}`}
                </span>
                <span className="meta">
                  {q.categoryName && <Chip>{q.categoryName}</Chip>}
                  {q.questionNumber != null && <span>#{q.questionNumber}</span>}
                  {q.ungraded > 0 && <span>{q.ungraded} ungraded</span>}
                </span>
              </span>
              <span className="right">→</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
