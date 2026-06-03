const test = require('node:test');
const assert = require('node:assert/strict');
const {
  groupsSummary,
  testsForGroup,
  questionsForTest,
  questionDetail,
  stripHtml,
  isMissed,
} = require('../src/services/stats.service');

let keySeq = 0;
function attempt(overrides = {}) {
  return {
    recordKey: `key-${++keySeq}`,
    userId: '1',
    email: 'a@example.com',
    name: 'Student A',
    testId: 't1',
    testName: 'Test One',
    groupId: 'g1',
    groupName: 'Group One',
    percentage: 80,
    timeFinished: 1700000000,
    date: '2026-06-01',
    questions: [],
    ...overrides,
  };
}

const q = (questionId, result, userResponse = null) => ({
  questionId,
  result,
  correct: result === 'correct' || result === 'partial_correct',
  userResponse,
  categoryName: 'Algebra',
});

test('groupsSummary aggregates attempts, tests and students per group', () => {
  // Arrange
  const attempts = [
    attempt({ userId: '1' }),
    attempt({ userId: '2', testId: 't2', testName: 'Test Two' }),
    attempt({ userId: '1', groupId: 'g2', groupName: 'Group Two' }),
  ];

  // Act
  const groups = groupsSummary(attempts);

  // Assert
  assert.equal(groups.length, 2);
  const g1 = groups.find((g) => g.groupId === 'g1');
  assert.equal(g1.attempts, 2);
  assert.equal(g1.tests, 2);
  assert.equal(g1.students, 2);
});

test('testsForGroup only includes the requested group, naturally sorted', () => {
  // Arrange
  const attempts = [
    attempt({ testId: 't10', testName: 'Section 10: Reading' }),
    attempt({ testId: 't2', testName: 'Section 2: Writing' }),
    attempt({ groupId: 'g2', testId: 't9', testName: 'Other group test' }),
  ];

  // Act
  const { tests } = testsForGroup(attempts, 'g1');

  // Assert
  assert.deepEqual(tests.map((t) => t.testName), ['Section 2: Writing', 'Section 10: Reading']);
});

test('questionsForTest ranks most-missed first', () => {
  // Arrange — q1 missed 2/2, q2 missed 1/2, q3 missed 0/2
  const attempts = [
    attempt({ questions: [q('q1', 'incorrect'), q('q2', 'correct'), q('q3', 'correct')] }),
    attempt({ userId: '2', questions: [q('q1', 'unanswered'), q('q2', 'incorrect'), q('q3', 'correct')] }),
  ];
  const bank = { q1: { question: '<p>Solve <b>x</b></p>' } };

  // Act
  const questions = questionsForTest(attempts, bank, 'g1', 't1');

  // Assert
  assert.deepEqual(questions.map((x) => x.questionId), ['q1', 'q2', 'q3']);
  assert.equal(questions[0].missRate, 100);
  assert.equal(questions[1].missRate, 50);
  assert.equal(questions[2].missRate, 0);
  assert.equal(questions[0].rank, 1);
  assert.equal(questions[0].snippet, 'Solve x');
});

test('requires_grading results are excluded from miss rate', () => {
  // Arrange
  const attempts = [
    attempt({ questions: [q('q1', 'requires_grading')] }),
    attempt({ userId: '2', questions: [q('q1', 'incorrect')] }),
  ];

  // Act
  const [stats] = questionsForTest(attempts, {}, 'g1', 't1');

  // Assert
  assert.equal(stats.asked, 1);
  assert.equal(stats.ungraded, 1);
  assert.equal(stats.missRate, 100);
});

test('questionDetail returns distribution and per-student rows', () => {
  // Arrange
  const attempts = [
    attempt({ name: 'A', questions: [q('q1', 'incorrect', 'B')] }),
    attempt({ name: 'B', userId: '2', questions: [q('q1', 'incorrect', 'B')] }),
    attempt({ name: 'C', userId: '3', questions: [q('q1', 'correct', 'A')] }),
  ];
  const bank = { q1: { question: '<p>Pick one</p>', correctOption: 'A' } };

  // Act
  const detail = questionDetail(attempts, bank, 'g1', 't1', 'q1');

  // Assert
  assert.equal(detail.attempts.length, 3);
  assert.equal(detail.stats.missed, 2);
  assert.deepEqual(detail.distribution[0], { response: 'B', count: 2 });
  assert.equal(detail.bank.correctOption, 'A');
});

test('isMissed counts incorrect and unanswered, not partial credit', () => {
  assert.equal(isMissed({ result: 'incorrect' }), true);
  assert.equal(isMissed({ result: 'unanswered' }), true);
  assert.equal(isMissed({ result: 'partial_correct' }), false);
  assert.equal(isMissed({ result: 'correct' }), false);
  assert.equal(isMissed({ result: null, correct: false }), true);
});

test('stripHtml flattens markup and entities', () => {
  assert.equal(stripHtml('<p>5 &gt; 3 &amp;&nbsp;<b>true</b></p>'), "5 > 3 & true");
});
