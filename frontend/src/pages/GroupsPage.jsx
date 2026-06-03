import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJson, fmtDate } from '../services/api';
import { Empty, Loading } from '../components/ui';

export default function GroupsPage() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJson('/api/groups').then(setGroups).catch((e) => setError(e.message));
  }, []);

  if (error) return <Empty title="Could not load groups">{error}</Empty>;
  if (!groups) return <Loading />;

  return (
    <>
      <h1 className="page-title">Groups</h1>
      <p className="page-sub">Every ClassMarker group with synced results — most recent activity first.</p>

      {groups.length === 0 ? (
        <Empty title="No data synced yet">
          Hit <code>Sync</code> in the top right. If that fails, make sure{' '}
          <code>backend/.env</code> has <code>EXPORT_TOKEN</code> set and the same token is configured on Railway.
        </Empty>
      ) : (
        <div className="rows">
          {groups.map((g, i) => (
            <Link className="row group-row" to={`/groups/${g.groupId}`} key={g.groupId}>
              <span className="idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="main">
                <span className="name">{g.groupName}</span>
                <span className="meta">
                  <span>{g.tests} subtest{g.tests === 1 ? '' : 's'}</span>
                  <span>{g.attempts} attempt{g.attempts === 1 ? '' : 's'}</span>
                  <span>{g.students} student{g.students === 1 ? '' : 's'}</span>
                  {g.avgPercentage != null && <span>{g.avgPercentage}% avg</span>}
                </span>
              </span>
              <span className="right">{fmtDate(g.lastActivity)}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
