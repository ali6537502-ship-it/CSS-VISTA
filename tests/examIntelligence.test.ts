import test from 'node:test'
import assert from 'node:assert/strict'
import { buildExamIntelligence, buildPersonalStudySession, type IntelligenceSyllabusData } from '../src/lib/examIntelligence.ts'
import type { AttemptEvent, ProgressState } from '../src/lib/progress.ts'
import type { VistaState } from '../src/lib/store.ts'

const NOW = new Date('2026-08-25T12:00:00Z').getTime()

function progress(events: AttemptEvent[] = []): ProgressState {
  return {
    attempts: {}, attemptEvents: events, reviews: {}, savedMcqs: [], mistakes: [], activities: [],
    checklists: {}, timerSessions: [], notif: { asked: false, enabled: false, tags: {}, dismissed: false },
    seenUpdates: [], fiveMin: [], bookSummaries: {}, studySessions: [], questionTimings: [],
    intelligence: { focusSubjects: [], reducedSubjects: [], pausedTopics: [], ignoredRecommendations: [], customRevisionDue: {}, onboardingDismissed: false },
  }
}

function state(): VistaState {
  return {
    quizResults: [], savedAnswers: [], bookmarks: [], completedChallenges: [], lastVisit: '', streakDays: 0,
    bestStreakDays: 0, visitDates: [], subjectProgress: {}, testSchedules: [], gameHighScores: {}, goalText: '',
    mockSchedule: {}, studyPlanner: null, planTaskCompletions: {}, syllabusItemStatuses: {}, studyScheduleTasks: [],
    quickNotes: '', goalChecklist: [], vistaShortcut: { enabled: true, shortcutIds: [] }, evaluationRequests: [],
    customTestSeriesRequests: [], reviews: {},
  }
}

const syllabus: IntelligenceSyllabusData = {
  subjects: [{ slug: 'pakistan-affairs', name: 'Pakistan Affairs', designation: 'compulsory', sections: [{ title: 'Core', items: ['Constitutional development'] }] }],
}

function event(index: number, correct: boolean, at = NOW - index * 60_000): AttemptEvent {
  return {
    id: `attempt-${index}`, questionId: `question-${index}`, correct, category: 'Pakistan Affairs',
    topic: 'Constitutional development', mode: 'gk', ts: at,
  }
}

test('empty activity never fabricates accuracy, mastery, or readiness', () => {
  const report = buildExamIntelligence(progress(), state(), syllabus, NOW)
  assert.equal(report.hasActivity, false)
  assert.equal(report.readiness, null)
  assert.equal(report.accuracy.allTime, null)
  assert.equal(report.syllabusCoverage, 0)
  assert.equal(report.subjects[0].mastery, 'Not Started')
  assert.equal(report.weakest, null)
})

test('one ordinary quiz is activity but not a reliable readiness baseline', () => {
  const vista = state()
  vista.quizResults.push({ id: 'quiz-one', type: 'quiz', category: 'General Knowledge', score: 0, total: 25, date: new Date(NOW).toISOString() })
  const report = buildExamIntelligence(progress(), vista, syllabus, NOW)
  assert.equal(report.hasActivity, true)
  assert.equal(report.readiness, null)
  assert.equal(report.confidence, 'limited')
})

test('weakness is shown only after the five-attempt reliability threshold', () => {
  const four = buildExamIntelligence(progress([event(1, false), event(2, false), event(3, true), event(4, false)]), state(), syllabus, NOW)
  assert.equal(four.weakest, null)
  const five = buildExamIntelligence(progress([event(1, false), event(2, false), event(3, true), event(4, false), event(5, true)]), state(), syllabus, NOW)
  assert.equal(five.weakest?.subject, 'Pakistan Affairs')
  assert.equal(five.weakest?.mastery, 'Needs Practice')
})

test('mastery requires sustained, distinct and accurate real attempts', () => {
  const events = Array.from({ length: 15 }, (_, index) => event(index + 1, index < 13))
  const report = buildExamIntelligence(progress(events), state(), syllabus, NOW)
  assert.equal(report.subjects[0].topics.find((topic) => topic.name === 'Constitutional development')?.mastery, 'Mastered')
  assert.equal(report.syllabus.mastered, 1)
})

test('legacy timing beside its canonical event is not double counted', () => {
  const canonical = event(1, true)
  const data = progress([canonical])
  data.questionTimings = [{ id: 'timing-1', questionId: canonical.questionId, category: canonical.category, mode: 'gk', seconds: 20, correct: true, ts: canonical.ts + 2_000 }]
  const report = buildExamIntelligence(data, state(), syllabus, NOW)
  assert.equal(report.questionsAttempted, 1)
})

test('personal study plans use the requested duration without inventing tasks', () => {
  const report = buildExamIntelligence(progress(Array.from({ length: 8 }, (_, index) => event(index + 1, index % 3 === 0))), state(), syllabus, NOW)
  const session = buildPersonalStudySession(report, 60)
  assert.ok(session.length > 0)
  assert.equal(session.reduce((sum, item) => sum + item.minutes, 0), 60)
  assert.ok(session.every((item) => item.route.startsWith('/')))
})
