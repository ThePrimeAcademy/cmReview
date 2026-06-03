const path = require('path');
const express = require('express');
const cors = require('cors');
const { PORT } = require('./config');
const store = require('./services/store.service');
const sync = require('./services/sync.service');
const reviewRoutes = require('./routes/review.routes');

const auth = require('./middleware/auth');

const app = express();
app.set('trust proxy', 1); // Railway/proxies — makes secure-cookie detection work
app.use(cors());
app.use(express.json());

app.post('/api/login', auth.login);
app.get('/api/auth', auth.authStatus);
app.use('/api', auth.requireAuth, reviewRoutes);

// Serve the built frontend when it exists (npm start from the repo root).
const DIST = path.join(__dirname, '../../frontend/dist');
app.use(express.static(DIST));
app.get(/^\/(?!api).*/, (req, res, next) => {
  res.sendFile(path.join(DIST, 'index.html'), (err) => err && next());
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server]', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

store.load();

app.listen(PORT, () => {
  console.log(`cmReview API listening on http://localhost:${PORT}`);

  // First run with empty data → try an initial sync automatically.
  if (store.getState().attempts.length === 0 && sync.isConfigured()) {
    console.log('[sync] Store empty — running initial sync…');
    sync.runSync().catch((e) => console.error('[sync] Initial sync failed:', e.message));
  }
});
