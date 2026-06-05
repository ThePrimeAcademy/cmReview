import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getJson, fmtDate } from '../services/api';
import { Crumbs, Empty, Loading } from '../components/ui';

const naturalCompare = (a, b) =>
  String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });

const SORTS = [
  { key: 'recent', label: 'Newest' },
  { key: 'az', label: 'A–Z' },
];

export default function GroupPage() {
  const { groupId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get('sort') === 'az' ? 'az' : 'recent';

  useEffect(() => {
    getJson(`/api/groups/${groupId}/tests`).then(setData).catch((e) => setError(e.message));
  }, [groupId]);

  // API returns tests A–Z; re-sort client-side so flipping order is instant.
  const tests = useMemo(() => {
    if (!data) return [];
    const copy = [...data.tests];
    if (sort === 'recent') copy.sort((x, y) => (y.lastTaken || 0) - (x.lastTaken || 0));
    else copy.sort((x, y) => naturalCompare(x.testName, y.testName));
    return copy;
  }, [data, sort]);

  if (error) return <Empty title="Could not load group">{error}</Empty>;
  if (!data) return <Loading />;

  return (
    <>
      <Crumbs items={[{ label: 'Groups', to: '/' }, { label: data.groupName || `Group #${groupId}` }]} />
      <h1 className="page-title">{data.groupName || `Group #${groupId}`}</h1>
      <div className="listhead">
        <p className="page-sub">{data.tests.length} subtest{data.tests.length === 1 ? '' : 's'} with synced attempts.</p>
        <div className="sortbar" role="group" aria-label="Sort tests">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={sort === s.key}
              onClick={() => setSearchParams(s.key === 'recent' ? {} : { sort: s.key }, { replace: true })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rows">
        {tests.map((t, i) => (
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
