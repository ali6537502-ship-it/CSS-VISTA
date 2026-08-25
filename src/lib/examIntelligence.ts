import type { AttemptEvent, ProgressState, ReviewSchedule } from '@/lib/progress'
import type { QuizResult, StudyScheduleTask, VistaState } from '@/lib/store'

export type MasteryStatus = 'Not Started' | 'Started' | 'Learning' | 'Needs Practice' | 'Needs Revision' | 'Strong' | 'Mastered'
export type IntelligenceConfidence = 'limited' | 'developing' | 'moderate' | 'high'
export type RecommendationKind = 'recovery' | 'revision' | 'learning' | 'testing' | 'past-paper' | 'mistakes' | 'continue'

export interface IntelligenceSyllabusSection { title: string; items: string[] }
export interface IntelligenceSyllabusSubject {
  slug: string
  name: string
  designation: 'compulsory' | 'optional'
  sections: IntelligenceSyllabusSection[]
}
export interface IntelligenceSyllabusData { subjects: IntelligenceSyllabusSubject[] }

export interface TopicIntelligence {
  id: string
  subject: string
  subjectSlug: string
  name: string
  attempts: number
  correct: number
  accuracy: number | null
  recentAccuracy: number | null
  previousAccuracy: number | null
  lastAttemptAt: number | null
  mistakes: number
  revisionDue: number
  completion: number
  mastery: MasteryStatus
  confidence: IntelligenceConfidence
}

export interface SubjectIntelligence extends TopicIntelligence {
  topics: TopicIntelligence[]
  syllabusTopics: number
  startedTopics: number
  completedTopics: number
  revisedTopics: number
  testedTopics: number
  masteredTopics: number
  notStartedTopics: number
  readiness: number | null
  recommendation: string
}

export interface RevisionQueueItem {
  id: string
  subject: string
  topic: string
  dueCount: number
  previousAccuracy: number | null
  lastStudiedAt: number | null
  reason: string
  priority: 'Urgent' | 'High' | 'Normal'
  route: string
}

export interface IntelligenceRecommendation {
  id: string
  kind: RecommendationKind
  title: string
  detail: string
  why: string
  route: string
  subject?: string
  topic?: string
  priority: number
}

export interface TrendPoint {
  date: string
  label: string
  attempts: number
  accuracy: number | null
  studyMinutes: number
  revisions: number
}

export interface ExamIntelligenceReport {
  generatedAt: number
  hasActivity: boolean
  confidence: IntelligenceConfidence
  confidenceMessage: string
  readiness: number | null
  syllabusCoverage: number | null
  syllabus: {
    total: number
    practiced: number
    revised: number
    tested: number
    mastered: number
    notStarted: number
  }
  accuracy: { today: number | null; sevenDays: number | null; thirtyDays: number | null; allTime: number | null }
  questionsAttempted: number
  testsCompleted: number
  mocksCompleted: number
  revisionsCompleted: number
  pendingMistakes: number
  resolvedMistakes: number
  currentStudyStreak: number
  activeStudyDays: number
  subjects: SubjectIntelligence[]
  weakest: SubjectIntelligence | null
  strongest: SubjectIntelligence | null
  revisionQueue: RevisionQueueItem[]
  recommendations: IntelligenceRecommendation[]
  trends: TrendPoint[]
  daily: {
    questions: number
    accuracy: number | null
    studyMinutes: number
    topics: number
    revisions: number
    mistakesReviewed: number
  }
  weekly: {
    questions: number
    accuracy: number | null
    topicsStudied: number
    topicsRevised: number
    mocks: number
    mistakesResolved: number
    biggestImprovement: string | null
    needsAttention: string | null
    nextPriority: string | null
  }
  exam: { date: string; daysRemaining: number; stage: string } | null
}

export interface StudySessionItem {
  minutes: number
  title: string
  reason: string
  route: string
  kind: RecommendationKind
}

const DAY = 86_400_000

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function cleanLabel(value: string) {
  const cleaned = value
    .replace(/\s*\(retry\)$/i, '')
    .replace(/\b(MCQ Match|quiz|challenge|test|mock)\b/gi, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || 'General Knowledge'
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general-knowledge'
}

function accuracy(events: AttemptEvent[]) {
  return events.length ? Math.round(events.filter((event) => event.correct).length / events.length * 100) : null
}

function confidenceFor(attempts: number, distinctQuestions: number, distinctDays: number): IntelligenceConfidence {
  if (attempts >= 100 && distinctQuestions >= 40 && distinctDays >= 7) return 'high'
  if (attempts >= 30 && distinctQuestions >= 15 && distinctDays >= 3) return 'moderate'
  if (attempts >= 10 && distinctQuestions >= 5) return 'developing'
  return 'limited'
}

function masteryFor(input: {
  attempts: number
  accuracy: number | null
  recentAccuracy: number | null
  previousAccuracy: number | null
  revisionDue: number
  completion: number
  distinctQuestions: number
}): MasteryStatus {
  if (!input.attempts && !input.completion) return 'Not Started'
  if (input.attempts < 3) return 'Started'
  const decline = input.recentAccuracy !== null && input.previousAccuracy !== null
    ? input.previousAccuracy - input.recentAccuracy
    : 0
  if (input.revisionDue > 0 || (input.attempts >= 8 && decline >= 15)) return 'Needs Revision'
  if (input.attempts >= 5 && (input.accuracy ?? 0) < 60) return 'Needs Practice'
  if (input.attempts >= 15 && input.distinctQuestions >= 10 && (input.accuracy ?? 0) >= 85 && (input.recentAccuracy ?? 0) >= 80) return 'Mastered'
  if (input.attempts >= 8 && input.distinctQuestions >= 6 && (input.accuracy ?? 0) >= 75) return 'Strong'
  return 'Learning'
}

function mergedAttemptEvents(progress: ProgressState): AttemptEvent[] {
  const canonical = [...(progress.attemptEvents ?? [])]
  const timesByQuestion = new Map<string, number[]>()
  canonical.forEach((event) => {
    const list = timesByQuestion.get(event.questionId) ?? []
    list.push(event.ts)
    timesByQuestion.set(event.questionId, list)
  })
  const legacy = (progress.questionTimings ?? []).flatMap<AttemptEvent>((timing) => {
    const duplicate = (timesByQuestion.get(timing.questionId) ?? []).some((ts) => Math.abs(ts - timing.ts) < 10_000)
    if (duplicate) return []
    return [{
      id: `legacy:${timing.id}`,
      questionId: timing.questionId,
      correct: timing.correct,
      category: timing.category,
      topic: timing.topic,
      subtopic: timing.subtopic,
      difficulty: timing.difficulty,
      selected: timing.selected,
      mode: timing.mode,
      ts: timing.ts,
    }]
  })
  return [...canonical, ...legacy]
    .filter((event) => event.questionId && Number.isFinite(event.ts))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 16_000)
}

function groupReviews(reviews: Record<string, ReviewSchedule>, now: number) {
  const groups = new Map<string, ReviewSchedule[]>()
  Object.values(reviews ?? {}).filter((review) => review.dueAt <= now).forEach((review) => {
    const key = cleanLabel(review.cat)
    groups.set(key, [...(groups.get(key) ?? []), review])
  })
  return groups
}

function topicMetrics(
  subject: string,
  subjectSlug: string,
  topic: string,
  events: AttemptEvent[],
  completion: number,
  mistakeCount: number,
  revisionDue: number,
  now: number,
): TopicIntelligence {
  const recent = events.filter((event) => event.ts >= now - 30 * DAY).slice(0, 20)
  const previous = events.filter((event) => event.ts < now - 30 * DAY).slice(0, 20)
  const allAccuracy = accuracy(events)
  const distinctQuestions = new Set(events.map((event) => event.questionId)).size
  const distinctDays = new Set(events.map((event) => localDateKey(new Date(event.ts)))).size
  const input = {
    attempts: events.length,
    accuracy: allAccuracy,
    recentAccuracy: accuracy(recent),
    previousAccuracy: accuracy(previous),
    revisionDue,
    completion,
    distinctQuestions,
  }
  return {
    id: `${subjectSlug}:${slugify(topic)}`,
    subject,
    subjectSlug,
    name: topic,
    attempts: events.length,
    correct: events.filter((event) => event.correct).length,
    accuracy: allAccuracy,
    recentAccuracy: input.recentAccuracy,
    previousAccuracy: input.previousAccuracy,
    lastAttemptAt: events[0]?.ts ?? null,
    mistakes: mistakeCount,
    revisionDue,
    completion,
    mastery: masteryFor(input),
    confidence: confidenceFor(events.length, distinctQuestions, distinctDays),
  }
}

function scheduledTopics(tasks: StudyScheduleTask[]) {
  return new Map(tasks.map((task) => [task.syllabusItemId, task]))
}

function activeDays(state: VistaState, progress: ProgressState) {
  return new Set([
    ...(state.visitDates ?? []),
    ...(progress.studySessions ?? []).map((session) => session.date),
    ...mergedAttemptEvents(progress).map((event) => localDateKey(new Date(event.ts))),
  ]).size
}

function rangeAccuracy(events: AttemptEvent[], since: number) {
  return accuracy(events.filter((event) => event.ts >= since))
}

function weightedReadiness(values: Array<{ value: number | null; weight: number }>) {
  const available = values.filter((item): item is { value: number; weight: number } => item.value !== null)
  const weight = available.reduce((sum, item) => sum + item.weight, 0)
  return weight ? Math.round(available.reduce((sum, item) => sum + item.value * item.weight, 0) / weight) : null
}

function routeForSubject(subject: string) {
  const slug = slugify(subject)
  const gkRoutes: Record<string, string> = {
    english: 'english-grammar', 'everyday-science': 'everyday-science', 'general-knowledge': 'misc-gk',
    'pakistan-affairs': 'pakistan-affairs', 'islamic-studies': 'islamic-gk', islamiyat: 'islamic-gk',
    urdu: 'urdu-language', geography: 'pakistan-geography', history: 'pakistan-history',
    'international-organisations': 'international-organisations', economics: 'economics', environment: 'environment',
    'current-affairs': 'current-affairs', science: 'science',
  }
  return gkRoutes[slug] ? `/gk/cat/${gkRoutes[slug]}` : `/css-mcqs?subject=${encodeURIComponent(slug)}`
}

function examStage(days: number) {
  if (days <= 14) return 'Final Revision'
  if (days <= 45) return 'Mock Intensive'
  if (days <= 90) return 'Revision'
  if (days <= 180) return 'Consolidation'
  if (days <= 300) return 'Coverage'
  return 'Foundation'
}

export function buildExamIntelligence(
  progress: ProgressState,
  state: VistaState,
  syllabus: IntelligenceSyllabusData | null,
  now = Date.now(),
): ExamIntelligenceReport {
  const events = mergedAttemptEvents(progress)
  const preferences = progress.intelligence
  const dueGroups = groupReviews(progress.reviews ?? {}, now)
  const customDue = Object.entries(preferences?.customRevisionDue ?? {})
    .filter(([, dueAt]) => Number.isFinite(dueAt) && dueAt <= now)
  const mistakes = progress.mistakes ?? []
  const taskMap = scheduledTopics(state.studyScheduleTasks ?? [])
  const subjectRows = new Map<string, {
    slug: string
    events: AttemptEvent[]
    syllabusIds: string[]
    topicNames: Map<string, string>
  }>()

  ;(syllabus?.subjects ?? []).filter((subject) => subject.slug !== 'essay').forEach((subject) => {
    const syllabusIds: string[] = []
    const topicNames = new Map<string, string>()
    subject.sections.forEach((section, sectionIndex) => section.items.forEach((item, itemIndex) => {
      const id = `${subject.slug}:${sectionIndex}:${itemIndex}`
      syllabusIds.push(id)
      topicNames.set(id, item.replace(/\s+/g, ' ').trim())
    }))
    subjectRows.set(subject.name, { slug: subject.slug, events: [], syllabusIds, topicNames })
  })

  events.forEach((event) => {
    const name = cleanLabel(event.category)
    const existingName = [...subjectRows.keys()].find((candidate) => slugify(candidate) === slugify(name))
    const key = existingName ?? name
    const row: { slug: string; events: AttemptEvent[]; syllabusIds: string[]; topicNames: Map<string, string> } = subjectRows.get(key) ?? {
      slug: slugify(key), events: [], syllabusIds: [], topicNames: new Map<string, string>(),
    }
    row.events.push(event)
    subjectRows.set(key, row)
  })

  const subjects: SubjectIntelligence[] = [...subjectRows.entries()].map(([subject, row]) => {
    const topicEvents = new Map<string, AttemptEvent[]>()
    row.events.forEach((event) => {
      const topic = cleanLabel(event.topic || event.category)
      topicEvents.set(topic, [...(topicEvents.get(topic) ?? []), event])
    })
    const topicRows: TopicIntelligence[] = [...topicEvents.entries()].map(([topic, topicAttemptEvents]) => topicMetrics(
      subject,
      row.slug,
      topic,
      topicAttemptEvents,
      0,
      mistakes.filter((mistake) => cleanLabel(mistake.cat) === cleanLabel(subject) && !mistake.resolvedAt).length,
      (dueGroups.get(cleanLabel(subject))?.length ?? 0) + customDue.filter(([key]) => cleanLabel(key.split('::')[0]) === cleanLabel(subject)).length,
      now,
    ))
    row.syllabusIds.forEach((id) => {
      const status = state.syllabusItemStatuses?.[id] ?? 'not-started'
      const task = taskMap.get(id)
      const name = row.topicNames.get(id) ?? task?.topic ?? id
      if (!topicRows.some((topic) => topic.name === name)) {
        topicRows.push(topicMetrics(subject, row.slug, name, [], status === 'completed' ? 100 : status === 'in-progress' ? 35 : 0, 0, 0, now))
      }
    })
    const statuses = row.syllabusIds.map((id) => state.syllabusItemStatuses?.[id] ?? 'not-started')
    const startedTopics = statuses.filter((status) => status !== 'not-started').length
    const completedTopics = statuses.filter((status) => status === 'completed').length
    const allAccuracy = accuracy(row.events)
    const recent = row.events.filter((event) => event.ts >= now - 30 * DAY).slice(0, 40)
    const previous = row.events.filter((event) => event.ts < now - 30 * DAY).slice(0, 40)
    const revisionDue = (dueGroups.get(cleanLabel(subject))?.length ?? 0) + customDue.filter(([key]) => cleanLabel(key.split('::')[0]) === cleanLabel(subject)).length
    const completion = row.syllabusIds.length ? Math.round(completedTopics / row.syllabusIds.length * 100) : 0
    const base = topicMetrics(
      subject,
      row.slug,
      subject,
      row.events,
      completion,
      mistakes.filter((mistake) => cleanLabel(mistake.cat) === cleanLabel(subject) && !mistake.resolvedAt).length,
      revisionDue,
      now,
    )
    base.recentAccuracy = accuracy(recent)
    base.previousAccuracy = accuracy(previous)
    const masteredTopics = topicRows.filter((topic) => topic.mastery === 'Mastered').length
    const revisedTopics = row.syllabusIds.filter((id) => (state.syllabusItemStatuses?.[id] === 'completed') && (taskMap.get(id)?.status === 'completed')).length
    const testedTopics = new Set(row.events.map((event) => cleanLabel(event.topic || event.category))).size
    const readiness = row.events.length >= 5 || startedTopics >= 2
      ? weightedReadiness([
          { value: row.events.length >= 5 ? allAccuracy : null, weight: 55 },
          { value: row.syllabusIds.length ? completion : null, weight: 30 },
          { value: topicRows.length ? Math.round(topicRows.filter((topic) => topic.mastery === 'Strong' || topic.mastery === 'Mastered').length / topicRows.length * 100) : null, weight: 15 },
        ])
      : null
    return {
      ...base,
      topics: topicRows.sort((a, b) => b.revisionDue - a.revisionDue || b.mistakes - a.mistakes || b.attempts - a.attempts),
      syllabusTopics: row.syllabusIds.length,
      startedTopics,
      completedTopics,
      revisedTopics,
      testedTopics,
      masteredTopics,
      notStartedTopics: Math.max(0, row.syllabusIds.length - startedTopics),
      readiness,
      recommendation: revisionDue ? 'Revise due material' : allAccuracy !== null && row.events.length >= 5 && allAccuracy < 60 ? 'Practice weak questions' : completedTopics < row.syllabusIds.length ? 'Continue syllabus coverage' : 'Run a mixed test',
    }
  }).filter((subject) => subject.attempts > 0 || subject.startedTopics > 0 || subject.syllabusTopics > 0)
    .sort((a, b) => (b.readiness ?? -1) - (a.readiness ?? -1) || b.attempts - a.attempts)

  const reliableSubjects = subjects.filter((subject) => subject.attempts >= 5)
  const weakest = [...reliableSubjects].sort((a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101))[0] ?? null
  const strongest = [...reliableSubjects].sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1))[0] ?? null
  const allAccuracy = accuracy(events)
  const syllabusIds = (syllabus?.subjects ?? []).filter((subject) => subject.slug !== 'essay').flatMap((subject) => subject.sections.flatMap((section, sectionIndex) => section.items.map((_, itemIndex) => `${subject.slug}:${sectionIndex}:${itemIndex}`)))
  const statusValues = syllabusIds.map((id) => state.syllabusItemStatuses?.[id] ?? 'not-started')
  const practiced = statusValues.filter((status) => status !== 'not-started').length
  const completed = statusValues.filter((status) => status === 'completed').length
  const syllabusCoverage = syllabusIds.length ? Math.round(completed / syllabusIds.length * 100) : null
  const reviewValues = Object.values(progress.reviews ?? {})
  const revisionCompletion = reviewValues.length >= 3
    ? Math.round(reviewValues.filter((review) => review.dueAt > now).length / reviewValues.length * 100)
    : null
  const mocks = state.quizResults.filter((result) => result.mockKind === 'gk' || result.mockKind === 'mpt')
  const mockAccuracy = mocks.length ? Math.round(mocks.slice(0, 5).reduce((sum, result) => sum + result.score / Math.max(1, result.total), 0) / Math.min(5, mocks.length) * 100) : null
  const masteredTopicCount = subjects.reduce((sum, subject) => sum + subject.masteredTopics, 0)
  const trackedTopicCount = subjects.reduce((sum, subject) => sum + subject.topics.length, 0)
  const masteryScore = trackedTopicCount >= 3 ? Math.round(masteredTopicCount / trackedTopicCount * 100) : null
  const visitDays = activeDays(state, progress)
  const consistency = visitDays >= 3 ? clamp(Math.round(Math.min(1, visitDays / 30) * 100)) : null
  const hasReliableBaseline = events.length >= 10 || mocks.length >= 1 || state.quizResults.length >= 3 || completed >= 3
  const readiness = hasReliableBaseline ? weightedReadiness([
    { value: syllabusCoverage, weight: 25 },
    { value: events.length >= 10 ? allAccuracy : null, weight: 30 },
    { value: revisionCompletion, weight: 15 },
    { value: mockAccuracy, weight: 15 },
    { value: masteryScore, weight: 10 },
    { value: consistency, weight: 5 },
  ]) : null
  const distinctQuestions = new Set(events.map((event) => event.questionId)).size
  const distinctDays = new Set(events.map((event) => localDateKey(new Date(event.ts)))).size
  const confidence = confidenceFor(events.length, distinctQuestions, distinctDays)
  const confidenceMessage = confidence === 'limited'
    ? 'More practice is needed before a reliable assessment can be generated.'
    : confidence === 'developing'
      ? 'Your assessment is provisional and will become more reliable with broader practice.'
      : confidence === 'moderate'
        ? 'This assessment uses a meaningful range of your recent platform activity.'
        : 'This assessment uses sustained activity across questions and study days.'

  const revisionQueue: RevisionQueueItem[] = [...dueGroups.entries()].map(([subject, reviews]) => {
    const subjectEvents = events.filter((event) => cleanLabel(event.category) === subject)
    const oldestDue = Math.min(...reviews.map((review) => review.dueAt))
    const overdueDays = Math.max(0, Math.floor((now - oldestDue) / DAY))
    return {
      id: `revision:${slugify(subject)}`,
      subject,
      topic: reviews.length === 1 ? reviews[0].cat : `${reviews.length} due questions`,
      dueCount: reviews.length,
      previousAccuracy: accuracy(subjectEvents),
      lastStudiedAt: subjectEvents[0]?.ts ?? null,
      reason: overdueDays ? `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue` : 'Scheduled spaced revision',
      priority: overdueDays >= 7 || reviews.length >= 10 ? 'Urgent' : overdueDays >= 2 || reviews.length >= 5 ? 'High' : 'Normal',
      route: '/gk/quiz?mode=wrong',
    }
  })
  customDue.forEach(([key, dueAt]) => {
    const [subject, topic = subject] = key.split('::')
    if (revisionQueue.some((item) => cleanLabel(item.subject) === cleanLabel(subject) && item.topic === topic)) return
    revisionQueue.push({
      id: `custom-revision:${slugify(key)}`,
      subject,
      topic,
      dueCount: 1,
      previousAccuracy: subjects.find((item) => cleanLabel(item.subject) === cleanLabel(subject))?.accuracy ?? null,
      lastStudiedAt: subjects.find((item) => cleanLabel(item.subject) === cleanLabel(subject))?.lastAttemptAt ?? null,
      reason: dueAt < now - DAY ? 'User-scheduled revision is overdue' : 'Scheduled by you',
      priority: dueAt < now - 3 * DAY ? 'High' : 'Normal',
      route: routeForSubject(subject),
    })
  })
  revisionQueue.sort((a, b) => ({ Urgent: 3, High: 2, Normal: 1 }[b.priority] - { Urgent: 3, High: 2, Normal: 1 }[a.priority] || b.dueCount - a.dueCount))

  const recommendations: IntelligenceRecommendation[] = []
  if (progress.activities?.[0]) recommendations.push({
    id: `continue:${progress.activities[0].path}`,
    kind: 'continue',
    title: `Continue: ${progress.activities[0].label}`,
    detail: 'Resume the activity you most recently used.',
    why: 'Your previous position is retained so you can continue without restarting.',
    route: progress.activities[0].path,
    priority: 72,
  })
  if (weakest) recommendations.push({
    id: `weak:${weakest.subjectSlug}`,
    kind: 'recovery',
    title: `Practice ${weakest.subject}`,
    detail: `${weakest.accuracy}% accuracy across ${weakest.attempts} recorded attempts.`,
    why: `Recommended because ${weakest.subject} is your lowest reliable subject result, based on at least five attempts.`,
    route: routeForSubject(weakest.subject),
    subject: weakest.subject,
    priority: 95,
  })
  if (revisionQueue[0]) recommendations.push({
    id: revisionQueue[0].id,
    kind: 'revision',
    title: `Revise ${revisionQueue[0].subject}`,
    detail: `${revisionQueue[0].dueCount} scheduled item${revisionQueue[0].dueCount === 1 ? '' : 's'} need revision.`,
    why: `Recommended because spaced revision is ${revisionQueue[0].reason.toLowerCase()}.`,
    route: '/exam-intelligence?section=revision',
    subject: revisionQueue[0].subject,
    priority: 92,
  })
  const pendingMistakes = mistakes.filter((mistake) => !mistake.resolvedAt).length
  if (pendingMistakes) recommendations.push({
    id: 'mistakes:pending',
    kind: 'mistakes',
    title: 'Review My Mistake Bank',
    detail: `${pendingMistakes} mistake${pendingMistakes === 1 ? '' : 's'} remain in recovery.`,
    why: 'Mistakes remain active until repeated correct retries show recovery.',
    route: '/mistakes',
    priority: 89,
  })
  const nextTask = (state.studyScheduleTasks ?? []).filter((task) => task.status !== 'completed').sort((a, b) => a.date.localeCompare(b.date))[0]
  if (nextTask) recommendations.push({
    id: `learning:${nextTask.id}`,
    kind: 'learning',
    title: nextTask.topic,
    detail: `${nextTask.subject} · ${nextTask.minutes} planned minutes`,
    why: `This is your next unfinished syllabus-planner task${nextTask.date ? `, scheduled for ${nextTask.date}` : ''}.`,
    route: '/study-planner',
    subject: nextTask.subject,
    topic: nextTask.topic,
    priority: 80,
  })
  if (events.length >= 10) recommendations.push({
    id: 'testing:mixed',
    kind: 'testing',
    title: 'Run a Mixed Knowledge Check',
    detail: 'Use a fresh verified question set to test retention beyond one weak area.',
    why: 'Balanced testing prevents recommendations from concentrating only on weaknesses.',
    route: '/gk/quiz?mode=random',
    priority: 68,
  })
  if (!events.length && !state.quizResults.length) recommendations.push({
    id: 'diagnostic:start',
    kind: 'testing',
    title: 'Start Diagnostic Assessment',
    detail: 'Build an initial preparation profile from the verified question bank.',
    why: 'No question history is available yet, so no readiness or weakness score has been generated.',
    route: '/gk/quiz?mode=random',
    priority: 100,
  })
  const focused = new Set(preferences?.focusSubjects ?? [])
  const reduced = new Set(preferences?.reducedSubjects ?? [])
  const ignored = new Set(preferences?.ignoredRecommendations ?? [])
  const paused = new Set(preferences?.pausedTopics ?? [])
  const filteredRecommendations = recommendations
    .filter((recommendation) => !ignored.has(recommendation.id) && !(recommendation.topic && paused.has(recommendation.topic)))
    .map((recommendation) => ({
      ...recommendation,
      priority: recommendation.priority + (recommendation.subject && focused.has(recommendation.subject) ? 12 : 0) - (recommendation.subject && reduced.has(recommendation.subject) ? 15 : 0),
    }))
    .sort((a, b) => b.priority - a.priority)

  const earliestActivity = Math.min(
    ...events.map((event) => event.ts),
    ...(progress.studySessions ?? []).map((session) => session.startedAt),
    now,
  )
  const trendDays = Math.min(365, Math.max(90, Math.ceil((now - earliestActivity) / DAY) + 1))
  const trendStart = localDateKey(new Date(now - (trendDays - 1) * DAY))
  const eventsByDate = new Map<string, AttemptEvent[]>()
  events.forEach((event) => {
    const date = localDateKey(new Date(event.ts))
    eventsByDate.set(date, [...(eventsByDate.get(date) ?? []), event])
  })
  const sessionSecondsByDate = new Map<string, number>()
  ;(progress.studySessions ?? []).forEach((session) => {
    sessionSecondsByDate.set(session.date, (sessionSecondsByDate.get(session.date) ?? 0) + session.seconds)
  })
  const revisionsByDate = new Map<string, number>()
  Object.values(progress.reviews ?? {}).forEach((review) => {
    const date = localDateKey(new Date(review.lastReviewedAt))
    revisionsByDate.set(date, (revisionsByDate.get(date) ?? 0) + 1)
  })
  const trends: TrendPoint[] = Array.from({ length: trendDays }, (_, index) => {
    const date = localDateKey(new Date(now - (trendDays - 1 - index) * DAY))
    const dayEvents = eventsByDate.get(date) ?? []
    return {
      date,
      label: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`)),
      attempts: dayEvents.length,
      accuracy: accuracy(dayEvents),
      studyMinutes: Math.round((sessionSecondsByDate.get(date) ?? 0) / 60),
      revisions: revisionsByDate.get(date) ?? 0,
    }
  }).filter((point) => point.date >= trendStart)
  const todayKey = localDateKey(new Date(now))
  const todayTrend = trends.find((point) => point.date === todayKey)!
  const sevenDayEvents = events.filter((event) => event.ts >= now - 7 * DAY)
  const improvementRows = subjects.flatMap((subject) => subject.recentAccuracy !== null && subject.previousAccuracy !== null
    ? [{ subject: subject.subject, change: subject.recentAccuracy - subject.previousAccuracy }]
    : [])
  const biggestImprovement = [...improvementRows].sort((a, b) => b.change - a.change)[0]
  const resolvedThisWeek = mistakes.filter((mistake) => mistake.resolvedAt && mistake.resolvedAt >= now - 7 * DAY).length
  const revisionsThisWeek = Object.values(progress.reviews ?? {}).filter((review) => review.lastReviewedAt >= now - 7 * DAY).length
  const topicsThisWeek = new Set(sevenDayEvents.map((event) => cleanLabel(event.topic || event.category))).size
  const mocksThisWeek = mocks.filter((mock) => new Date(mock.date).getTime() >= now - 7 * DAY).length
  const currentStreak = state.streakDays || 0
  const customExamDate = state.studyPlanner?.examDate
  const examDate = customExamDate ? new Date(`${customExamDate}T00:00:00`) : null
  const daysRemaining = examDate && !Number.isNaN(examDate.getTime()) ? Math.ceil((examDate.getTime() - now) / DAY) : null

  return {
    generatedAt: now,
    hasActivity: Boolean(events.length || state.quizResults.length || practiced || progress.studySessions.length),
    confidence,
    confidenceMessage,
    readiness,
    syllabusCoverage,
    syllabus: {
      total: syllabusIds.length,
      practiced,
      revised: subjects.reduce((sum, subject) => sum + subject.revisedTopics, 0),
      tested: subjects.reduce((sum, subject) => sum + subject.testedTopics, 0),
      mastered: masteredTopicCount,
      notStarted: Math.max(0, syllabusIds.length - practiced),
    },
    accuracy: {
      today: rangeAccuracy(events, new Date(`${todayKey}T00:00:00`).getTime()),
      sevenDays: accuracy(sevenDayEvents),
      thirtyDays: rangeAccuracy(events, now - 30 * DAY),
      allTime: allAccuracy,
    },
    questionsAttempted: events.length,
    testsCompleted: state.quizResults.length,
    mocksCompleted: mocks.length,
    revisionsCompleted: Object.values(progress.reviews ?? {}).filter((review) => review.streak > 0).length,
    pendingMistakes,
    resolvedMistakes: mistakes.filter((mistake) => Boolean(mistake.resolvedAt)).length,
    currentStudyStreak: currentStreak,
    activeStudyDays: visitDays,
    subjects,
    weakest,
    strongest,
    revisionQueue,
    recommendations: filteredRecommendations,
    trends,
    daily: {
      questions: todayTrend?.attempts ?? 0,
      accuracy: todayTrend?.accuracy ?? null,
      studyMinutes: todayTrend?.studyMinutes ?? 0,
      topics: new Set(events.filter((event) => localDateKey(new Date(event.ts)) === todayKey).map((event) => cleanLabel(event.topic || event.category))).size,
      revisions: todayTrend?.revisions ?? 0,
      mistakesReviewed: mistakes.filter((mistake) => mistake.lastCorrectAt && localDateKey(new Date(mistake.lastCorrectAt)) === todayKey).length,
    },
    weekly: {
      questions: sevenDayEvents.length,
      accuracy: accuracy(sevenDayEvents),
      topicsStudied: topicsThisWeek,
      topicsRevised: revisionsThisWeek,
      mocks: mocksThisWeek,
      mistakesResolved: resolvedThisWeek,
      biggestImprovement: biggestImprovement && biggestImprovement.change > 0 ? biggestImprovement.subject : null,
      needsAttention: weakest?.subject ?? null,
      nextPriority: filteredRecommendations[0]?.title ?? null,
    },
    exam: daysRemaining !== null && daysRemaining >= 0 ? { date: customExamDate!, daysRemaining, stage: examStage(daysRemaining) } : null,
  }
}

export function buildPersonalStudySession(report: ExamIntelligenceReport, minutes: number): StudySessionItem[] {
  const duration = Math.max(10, Math.min(480, Math.round(minutes)))
  const recommendations = report.recommendations.length ? report.recommendations : [{
    id: 'diagnostic:start', kind: 'testing' as const, title: 'Start Diagnostic Assessment', detail: '',
    why: 'No reliable preparation history is available yet.', route: '/gk/quiz?mode=random', priority: 100,
  }]
  const kinds: RecommendationKind[] = ['revision', 'recovery', 'learning', 'testing', 'mistakes', 'continue', 'past-paper']
  const balanced = kinds.flatMap((kind) => recommendations.find((recommendation) => recommendation.kind === kind) ?? [])
  const selected = (balanced.length ? balanced : recommendations).slice(0, duration <= 20 ? 1 : duration <= 45 ? 2 : duration <= 75 ? 3 : duration <= 105 ? 4 : 5)
  const weights = selected.map((recommendation) => recommendation.kind === 'recovery' || recommendation.kind === 'revision' ? 1.2 : recommendation.kind === 'testing' ? 1.1 : 1)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let allocated = 0
  return selected.map((recommendation, index) => {
    const remaining = duration - allocated
    const itemMinutes = index === selected.length - 1
      ? remaining
      : Math.max(5, Math.round(duration * weights[index] / totalWeight / 5) * 5)
    allocated += itemMinutes
    return {
      minutes: itemMinutes,
      title: recommendation.title,
      reason: recommendation.why,
      route: recommendation.route,
      kind: recommendation.kind,
    }
  })
}

export function weeklyComparison(current: QuizResult[], previous: QuizResult[]) {
  const resultAccuracy = (rows: QuizResult[]) => {
    const total = rows.reduce((sum, row) => sum + row.total, 0)
    return total ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / total * 100) : null
  }
  const currentAccuracy = resultAccuracy(current)
  const previousAccuracy = resultAccuracy(previous)
  return {
    currentAccuracy,
    previousAccuracy,
    change: currentAccuracy !== null && previousAccuracy !== null ? currentAccuracy - previousAccuracy : null,
  }
}
