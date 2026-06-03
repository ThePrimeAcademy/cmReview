import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJson, fmtDate } from '../services/api';
import { Crumbs, Empty, Loading } from '../components/ui';

export default function GroupPage() {
  const { groupId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJson(`/api/groups/${groupId}/tests`).then(setData).catch((e) => setError(e.message));
  }, [groupId]);

  if (error) return <Empty title="Could not load group">{error}</Empty>;
  if (!data) return <Loading />;

  return (
    <>
      <Crumbs items={[{ label: 'Groups', to: '/' }, { label: data.groupName || `Group #${groupId}` }]} />
      <h1 className="page-title">{data.groupName || `Group #${groupId}`}</h1>
      <p className="page-sub">{data.tests.length} subtest{data.tests.length === 1 ? '' : 's'} with synced attempts.</p>

      <div className="rows">
        {data.tests.map((t, i) => (
          <Link className="row test-row" to={`/groups/${groupId}/tests/${t.testId}`} key={t.testId}>
            <span className="idx">{String(i + 1).padStart(2, '0')}</span>
            <span className="main">
              <span className="name">{t.testName}</span>
              <span className="meta">
                <span>{t.questionCount} questions</span>
                <span>{t.attempts} attempt{t.attempts === 1 ? '' : 's'}</span>
                <span>{t.students} student{t.students === 1 ? '' : 's'}</span>
              </span>
            </span>
            <span className="right">{t.avgPercentage != null ? `${t.avgPercentage}% avg` : '—'}</span>
            <span className="right">{fmtDate(t.lastTaken)}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
