const express = require('express');
const store = require('../services/store.service');
const sync = require('../services/sync.service');
const stats = require('../services/stats.service');

const router = express.Router();

// ── Sync / status ─────────────────────────────────────────────
router.get('/status', (req, res) => {
  const { attempts, bank, meta } = store.getState();
  res.json({
    configured: sync.isConfigured(),
    attempts: attempts.length,
    questionsInBank: Object.keys(bank).length,
    lastSyncAt: meta.lastSyncAt || null,
    lastReceivedAt: meta.lastReceivedAt || null,
  });
});

router.post('/sync', async (req, res) => {
  try {
    const summary = await sync.runSync({ full: Boolean(req.body?.full) });
    res.json({ success: true, ...summary });
  } catch (e) {
    res.status(502).json({ success: false, error: e.message });
  }
});

// ── Review hierarchy ──────────────────────────────────────────
// While the very first sync is still running the store looks empty — answer
// with a retryable 503 instead of misleading 404s / empty lists.
router.use((req, res, next) => {
  if (store.getState().attempts.length === 0 && sync.isSyncing()) {
    return res.status(503).json({ error: 'First sync still running — data will appear shortly' });
  }
  next();
});

router.get('/groups', (req, res) => {
  res.json(stats.groupsSummary(store.getState().attempts));
});

router.get('/groups/:groupId/tests', (req, res) => {
  const result = stats.testsForGroup(store.getState().attempts, req.params.groupId);
  if (!result.groupName && result.tests.length === 0) {
    return res.status(404).json({ error: 'Group not found in synced data' });
  }
  res.json(result);
});

router.get('/groups/:groupId/tests/:testId/questions', (req, res) => {
  const { attempts, bank } = store.getState();
  const { groupId, testId } = req.params;
  const group = stats.testsForGroup(attempts, groupId);
  const test = group.tests.find((t) => t.testId === String(testId)) || null;
  if (!test) return res.status(404).json({ error: 'Test not found in synced data' });

  res.json({
    groupId: String(groupId),
    groupName: group.groupName,
    test,
    questions: stats.questionsForTest(attempts, bank, groupId, testId),
  });
});

router.get('/groups/:groupId/tests/:testId/questions/:questionId', (req, res) => {
  const { attempts, bank } = store.getState();
  const { groupId, testId, questionId } = req.params;
  const detail = stats.questionDetail(attempts, bank, groupId, testId, questionId);
  if (!detail.stats && !detail.attempts.length) {
    return res.status(404).json({ error: 'Question not found in synced data' });
  }
  const group = stats.testsForGroup(attempts, groupId);
  res.json({
    groupId: String(groupId),
    groupName: group.groupName,
    test: group.tests.find((t) => t.testId === String(testId)) || null,
    ...detail,
  });
});

module.exports = router;
