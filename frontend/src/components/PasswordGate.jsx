import { useState } from 'react';
import { postJson } from '../services/api';

// Shown when the backend reports authRequired && !authenticated.
// One shared password — success sets an httpOnly session cookie.
export default function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postJson('/api/login', { password });
      onUnlock();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <span className="wordmark">cm<em>Review</em></span>
        <p>Enter the access password to continue.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
        />
        {error && <span className="error">⚠ {error}</span>}
        <button type="submit" disabled={busy || !password}>
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
