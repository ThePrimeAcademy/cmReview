// Local cache of synced ClassMarker webhook results.
//
//   attempts.json — one row per test attempt. Question text is NOT stored here
//                   (deduped into the bank); per-attempt data keeps only the
//                   student's result + response per question.
//   bank.json     — questionId → { question, options, correctOption, type,
//                   categoryId, categoryName, updatedAt }
//   meta.json     — { lastSyncAt, lastReceivedAt }
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config');

const FILES = {
  attempts: path.join(DATA_DIR, 'attempts.json'),
  bank: path.join(DATA_DIR, 'bank.json'),
  meta: path.join(DATA_DIR, 'meta.json'),
};

let state = { attempts: [], bank: {}, meta: {} };
const attemptIndex = new Map(); // recordKey → index into state.attempts

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    console.error(`[store] Could not read ${path.basename(file)}: ${e.message}`);
  }
  return fallback;
}

function load() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  state = {
    attempts: readJson(FILES.attempts, []),
    bank: readJson(FILES.bank, {}),
    meta: readJson(FILES.meta, {}),
  };
  attemptIndex.clear();
  state.attempts.forEach((a, i) => attemptIndex.set(a.recordKey, i));
  console.log(`[store] Loaded ${state.attempts.length} attempts, ${Object.keys(state.bank).length} bank questions`);
}

function save() {
  fs.writeFileSync(FILES.attempts, JSON.stringify(state.attempts));
  fs.writeFileSync(FILES.bank, JSON.stringify(state.bank));
  fs.writeFileSync(FILES.meta, JSON.stringify(state.meta, null, 2));
}

// ClassMarker sends display fields HTML-escaped ("Danny&#039;s…"). The UI
// renders these as plain text, so decode common entities at ingest.
function decodeEntities(s) {
  if (s == null) return s;
  return String(s)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function toAttempt(record) {
  return {
    recordKey: record.recordKey,
    userId: record.userId != null ? String(record.userId) : null,
    email: record.email || null,
    name: decodeEntities(record.name) || record.email || 'Unknown',
    testId: record.testId != null ? String(record.testId) : null,
    testName: decodeEntities(record.testName) || null,
    groupId: record.groupId != null ? String(record.groupId) : null,
    groupName: decodeEntities(record.groupName) || null,
    percentage: record.percentage ?? null,
    score: record.score ?? null,
    maxScore: record.maxScore ?? null,
    timeFinished: record.timeFinished ?? null,
    date: record.date || null,
    receivedAt: record.receivedAt || null,
    questions: (record.questions || []).map((q) => ({
      questionId: q.questionId != null ? String(q.questionId) : null,
      type: q.questionType || q.type || null,
      categoryId: q.categoryId != null ? String(q.categoryId) : null,
      categoryName: decodeEntities(q.categoryName) || null,
      sectionNumber: q.sectionNumber ?? null,
      questionNumber: q.questionNumber ?? null,
      result: q.result || null,
      correct: !!q.correct,
      pointsScored: q.pointsScored ?? null,
      pointsAvailable: q.pointsAvailable ?? null,
      userResponse: q.userResponse ?? null,
    })),
  };
}

// Merge a page of export records into the store. Returns { added, updated }.
function applyRecords(records) {
  let added = 0;
  let updated = 0;

  for (const record of records || []) {
    if (!record || !record.recordKey) continue;

    // Question bank — keep the newest copy of each question's content.
    for (const q of record.questions || []) {
      if (q.questionId == null || q.question == null) continue;
      const id = String(q.questionId);
      const prev = state.bank[id];
      if (prev && (prev.updatedAt || '') > (record.receivedAt || '')) continue;
      state.bank[id] = {
        question: q.question,
        options: q.options ?? null,
        correctOption: q.correctOption ?? null,
        type: q.questionType || q.type || null,
        categoryId: q.categoryId != null ? String(q.categoryId) : null,
        categoryName: decodeEntities(q.categoryName) || null,
        updatedAt: record.receivedAt || null,
      };
    }

    const attempt = toAttempt(record);
    if (attemptIndex.has(attempt.recordKey)) {
      state.attempts[attemptIndex.get(attempt.recordKey)] = attempt;
      updated++;
    } else {
      attemptIndex.set(attempt.recordKey, state.attempts.length);
      state.attempts.push(attempt);
      added++;
    }
  }

  return { added, updated };
}

function setMeta(patch) {
  state.meta = { ...state.meta, ...patch };
}

function getState() {
  return state;
}

module.exports = { load, save, applyRecords, setMeta, getState };
