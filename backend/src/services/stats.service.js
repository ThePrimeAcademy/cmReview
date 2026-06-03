// Pure aggregation over the synced store ({ attempts, bank }).
// "Missed" = incorrect or unanswered. Essay-style results that still need
// grading (requires_grading / answered) are excluded from the miss rate.
const GRADABLE = new Set(['correct', 'partial_correct', 'incorrect', 'unanswered']);
const MISSED = new Set(['incorrect', 'unanswered']);

function isGradable(q) {
  return q.result ? GRADABLE.has(q.result) : true; // no result string → trust `correct` flag
}

function isMissed(q) {
  return q.result ? MISSED.has(q.result) : !q.correct;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippet(html, maxLength = 160) {
  const text = stripHtml(html);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

const naturalCompare = (a, b) =>
  String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });

function studentKey(attempt) {
  return attempt.userId || attempt.email || attempt.name || attempt.recordKey;
}

// ── Groups ────────────────────────────────────────────────────
function groupsSummary(attempts) {
  const groups = {};
  for (const a of attempts) {
    if (!a.groupId) continue;
    if (!groups[a.groupId]) {
      groups[a.groupId] = {
        groupId: a.groupId, groupName: a.groupName, attempts: 0,
        tests: new Set(), students: new Set(), pctSum: 0, pctCount: 0, lastActivity: 0,
      };
    }
    const g = groups[a.groupId];
    g.attempts++;
    if (a.testId) g.tests.add(a.testId);
    g.students.add(studentKey(a));
    if (a.percentage != null) { g.pctSum += Number(a.percentage); g.pctCount++; }
    if ((a.timeFinished || 0) > g.lastActivity) {
      g.lastActivity = a.timeFinished;
      g.groupName = a.groupName || g.groupName; // prefer the most recent name
    }
  }

  return Object.values(groups)
    .map((g) => ({
      groupId: g.groupId,
      groupName: g.groupName || `Group #${g.groupId}`,
      attempts: g.attempts,
      tests: g.tests.size,
      students: g.students.size,
      avgPercentage: g.pctCount ? Math.round((g.pctSum / g.pctCount) * 10) / 10 : null,
      lastActivity: g.lastActivity || null,
    }))
    .sort((x, y) => (y.lastActivity || 0) - (x.lastActivity || 0));
}

// ── Tests within a group ──────────────────────────────────────
function testsForGroup(attempts, groupId) {
  const tests = {};
  let groupName = null;

  for (const a of attempts) {
    if (a.groupId !== String(groupId)) continue;
    groupName = a.groupName || groupName;
    if (!a.testId) continue;
    if (!tests[a.testId]) {
      tests[a.testId] = {
        testId: a.testId, testName: a.testName, attempts: 0,
        students: new Set(), pctSum: 0, pctCount: 0, questionCount: 0, lastTaken: 0,
      };
    }
    const t = tests[a.testId];
    t.attempts++;
    t.students.add(studentKey(a));
    if (a.percentage != null) { t.pctSum += Number(a.percentage); t.pctCount++; }
    if ((a.timeFinished || 0) > t.lastTaken) {
      t.lastTaken = a.timeFinished;
      t.testName = a.testName || t.testName;
    }
    t.questionCount = Math.max(t.questionCount, (a.questions || []).length);
  }

  return {
    groupId: String(groupId),
    groupName,
    tests: Object.values(tests)
      .map((t) => ({
        testId: t.testId,
        testName: t.testName || `Test #${t.testId}`,
        attempts: t.attempts,
        students: t.students.size,
        avgPercentage: t.pctCount ? Math.round((t.pctSum / t.pctCount) * 10) / 10 : null,
        questionCount: t.questionCount,
        lastTaken: t.lastTaken || null,
      }))
      .sort((x, y) => naturalCompare(x.testName, y.testName)),
  };
}

// ── Questions within a (group, test), most-missed first ───────
function aggregateQuestions(attempts, groupId, testId) {
  const byId = {};
  for (const a of attempts) {
    if (a.groupId !== String(groupId) || a.testId !== String(testId)) continue;
    for (const q of a.questions || []) {
      if (!q.questionId) continue;
      if (!byId[q.questionId]) {
        byId[q.questionId] = {
          questionId: q.questionId, asked: 0, missed: 0, correct: 0, partial: 0,
          unanswered: 0, ungraded: 0, categoryName: null, questionNumber: null,
          sectionNumber: null, type: null,
        };
      }
      const s = byId[q.questionId];
      if (isGradable(q)) {
        s.asked++;
        if (isMissed(q)) s.missed++;
        if (q.result === 'correct' || (!q.result && q.correct)) s.correct++;
        if (q.result === 'partial_correct') s.partial++;
        if (q.result === 'unanswered') s.unanswered++;
      } else {
        s.ungraded++;
      }
      s.categoryName = q.categoryName || s.categoryName;
      s.questionNumber = q.questionNumber ?? s.questionNumber;
      s.sectionNumber = q.sectionNumber ?? s.sectionNumber;
      s.type = q.type || s.type;
    }
  }
  return byId;
}

function questionsForTest(attempts, bank, groupId, testId) {
  const byId = aggregateQuestions(attempts, groupId, testId);

  return Object.values(byId)
    .map((s) => {
      const entry = bank[s.questionId];
      return {
        ...s,
        missRate: s.asked > 0 ? Math.round((s.missed / s.asked) * 1000) / 10 : 0,
        snippet: entry ? snippet(entry.question) : null,
        hasText: Boolean(entry && entry.question),
      };
    })
    .sort((x, y) => y.missRate - x.missRate || y.missed - x.missed || y.asked - x.asked)
    .map((q, i) => ({ ...q, rank: i + 1 }));
}

// ── Single question detail ────────────────────────────────────
function questionDetail(attempts, bank, groupId, testId, questionId) {
  const stats = aggregateQuestions(attempts, groupId, testId)[String(questionId)] || null;
  const entry = bank[String(questionId)] || null;

  const rows = [];
  const distribution = {};
  for (const a of attempts) {
    if (a.groupId !== String(groupId) || a.testId !== String(testId)) continue;
    for (const q of a.questions || []) {
      if (q.questionId !== String(questionId)) continue;
      rows.push({
        name: a.name,
        email: a.email,
        date: a.date,
        timeFinished: a.timeFinished,
        userResponse: q.userResponse,
        result: q.result || (q.correct ? 'correct' : 'incorrect'),
      });
      const key = q.userResponse == null || q.userResponse === '' ? '(no answer)' : String(q.userResponse);
      distribution[key] = (distribution[key] || 0) + 1;
    }
  }

  rows.sort((x, y) => (y.timeFinished || 0) - (x.timeFinished || 0));

  return {
    questionId: String(questionId),
    bank: entry,
    stats: stats
      ? { ...stats, missRate: stats.asked > 0 ? Math.round((stats.missed / stats.asked) * 1000) / 10 : 0 }
      : null,
    distribution: Object.entries(distribution)
      .map(([response, count]) => ({ response, count }))
      .sort((x, y) => y.count - x.count),
    attempts: rows,
  };
}

module.exports = {
  groupsSummary,
  testsForGroup,
  questionsForTest,
  questionDetail,
  stripHtml,
  snippet,
  isMissed,
  isGradable,
};
