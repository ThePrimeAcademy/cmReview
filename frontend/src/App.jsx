import { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { getJson, postJson } from './services/api';
import PasswordGate from './components/PasswordGate';
import AnnotationLayer from './components/annotation/AnnotationLayer';
import GroupsPage from './pages/GroupsPage';
import GroupPage from './pages/GroupPage';
import TestPage from './pages/TestPage';
import QuestionPage from './pages/QuestionPage';

function relativeTime(iso) {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / (60 * 24))}d ago`;
}

export default function App() {
  // null = checking, false = password needed, true = good to go
  const [authed, setAuthed] = useState(null);
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  // Bump to force route content to re-fetch after a sync completes.
  const [dataVersion, setDataVersion] = useState(0);

  const refreshStatus = useCallback(() => {
    getJson('/api/status').then(setStatus).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    getJson('/api/auth')
      .then((a) => setAuthed(a.authenticated))
      .catch(() => setAuthed(true)); // older backend without /api/auth — proceed
  }, []);

  useEffect(() => { if (authed) refreshStatus(); }, [authed, refreshStatus]);

  const runSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await postJson('/api/sync');
      refreshStatus();
      setDataVersion((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  if (authed === null) return null;
  if (authed === false) return <PasswordGate onUnlock={() => setAuthed(true)} />;

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="wordmark">cm<em>Review</em></Link>
        <div className="syncline">
          {error
            ? <span className="error" title={error}>⚠ {error}</span>
            : status && <span>{status.attempts} attempts · synced {relativeTime(status.lastSyncAt)}</span>}
          <button onClick={runSync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync'}</button>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<GroupsPage key={dataVersion} />} />
          <Route path="/groups/:groupId" element={<GroupPage key={dataVersion} />} />
          <Route path="/groups/:groupId/tests/:testId" element={<TestPage key={dataVersion} />} />
          <Route path="/groups/:groupId/tests/:testId/questions/:questionId" element={<QuestionPage key={dataVersion} />} />
        </Routes>
      </main>

      <AnnotationLayer />
    </div>
  );
}
