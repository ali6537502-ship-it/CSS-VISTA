import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Bookmark, BookmarkCheck, Check, Clock, Flag, Loader2,
  RotateCcw, X, Zap,
} from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/shared'
import PrintMenu from '@/components/PrintMenu'
import {
  adminBankQuestions, daySeed, dedupeBankQuestions, filterDisabled, getBankIndex, getCategoryQuestions, getChunk,
  getQuestionsByIds, sampleQuestions, seededRandom, type BankIndex, type BankQuestion,
} from '@/data/mcq'
import {
  addMistake, attemptedIds, dueRevisionIds, fiveMinToday, getMistakes, recordActivity,
  recordAttempt, recordFiveMin, recordQuestionTiming, savedMcqIds, toggleSavedMcq, wrongIds,
} from '@/lib/progress'
import {
  completeChallenge, DAILY_MOCK_TIME_LABELS, getDailyMockStatus, getMockAvailability, getState,
  recordQuizResult, recordReview, recordScheduledMock,
} from '@/lib/store'
import { isRtlText } from '@/lib/utils'
import {
  buildCompetitiveMock, currentPakistanDateKey, MOCK_BLUEPRINTS, type MockSection,
} from '@/data/mockPapers'
import QuestionPagination from '@/components/QuestionPagination'
import { questionPageForIndex, questionPageRange } from '@/lib/questionPagination'
import { remainingSeconds } from '@/hooks/useAccurateCountdown'

interface Resolved {
  title: string
  qs: BankQuestion[]
  exam: boolean
  timeSec: number
  note?: string
  blueprint?: MockSection[]
}

export default function GKQuiz({ forceMode }: { forceMode?: string }) {
  const [sp] = useSearchParams()
  const mode = forceMode ?? sp.get('mode') ?? 'random'
  const [idx, setIdx] = useState<BankIndex | null>(null)
  const [resolved, setResolved] = useState<Resolved | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const scheduledKind = mode === 'mpt-mock' ? 'mpt' : mode === 'pms-mock' || mode === 'mock' ? 'gk' : null
  const [studentName, setStudentName] = useState(() => localStorage.getItem('cssvista:mock-student-name') ?? '')
  const [mockRegistered, setMockRegistered] = useState(false)
  const [mockSessionDateKey, setMockSessionDateKey] = useState('')

  // custom mode config
  const allCats = useMemo(() => idx?.categories ?? [], [idx])
  const [cfgCats, setCfgCats] = useState<string[]>([])
  const [cfgN, setCfgN] = useState(20)
  const [cfgDiff, setCfgDiff] = useState('all')
  const [cfgTime, setCfgTime] = useState(0)
  const [cfgOrder, setCfgOrder] = useState<'random' | 'sequential'>('random')
  const [cfgAttempt, setCfgAttempt] = useState<'all' | 'unattempted' | 'attempted'>('all')

  useEffect(() => {
    getBankIndex().then(setIdx)
  }, [])

  useEffect(() => {
    if (!idx) return
    if (scheduledKind && !mockRegistered) {
      setLoading(false)
      return
    }
    if (mode === 'custom') {
      setLoading(false)
      return // wait for user config
    }
    resolve(mode).catch(() => {
      setError('Could not load questions. Please try again.')
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, mode, mockRegistered, scheduledKind])

  async function resolve(m: string, custom?: { cats: string[]; n: number; diff: string; time: number; order: string; attempt: string }) {
    setLoading(true)
    const cats = idx!.categories
    const catSlugs = cats.map((c) => c.slug)
    const paramCats = (sp.get('cats') ?? '').split(',').filter(Boolean)
    const requestedCount = Number.parseInt(sp.get('n') ?? '15', 10)
    const n = Math.max(5, Math.min(200, Number.isFinite(requestedCount) ? requestedCount : 15))

    let r: Resolved | null = null
    switch (m) {
      case 'revision': {
        const dueIds = dueRevisionIds(n)
        const qs = await getQuestionsByIds(dueIds)
        r = {
          title: 'Smart Revision Queue',
          qs,
          exam: false,
          timeSec: 0,
          note: qs.length
            ? 'Questions appear when their personal review date is due.'
            : 'Nothing is due right now. Keep practising and the next revision set will appear automatically.',
        }
        break
      }
      case 'daily': {
        const qs = await sampleQuestions(catSlugs, 10, seededRandom(daySeed()))
        r = { title: 'Daily GK Challenge', qs, exam: false, timeSec: 0, note: 'A fixed set for today - come back tomorrow for a new one.' }
        break
      }
      case 'five-minute': {
        const qs = await sampleQuestions(catSlugs, 10)
        r = { title: 'Daily Five-Minute Challenge', qs, exam: true, timeSec: 300 }
        break
      }
      case 'mock':
      case 'pms-mock': {
        const availability = getMockAvailability('gk')
        if (!availability.available) {
          r = {
            title: 'PMS GK Grand Mock',
            qs: [],
            exam: true,
            timeSec: 0,
            note: `PMS GK registration opens ${new Date(availability.nextAvailableAt!).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })} and remains open until 10:00 PM.`,
          }
          break
        }
        const paper = buildCompetitiveMock('pms-gk', mockSessionDateKey || getDailyMockStatus('gk').dateKey)
        r = {
          title: paper.title,
          qs: paper.questions,
          exam: true,
          timeSec: paper.timeSec,
          note: `${paper.note} Daily registration: ${DAILY_MOCK_TIME_LABELS.gk}. Once entered, you may finish after registration closes.`,
          blueprint: paper.blueprint,
        }
        break
      }
      case 'mpt-mock': {
        const availability = getMockAvailability('mpt')
        if (!availability.available) {
          r = {
            title: 'Full CSS MPT Practice Mock',
            qs: [],
            exam: true,
            timeSec: 0,
            note: `CSS MPT registration opens ${new Date(availability.nextAvailableAt!).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })} and remains open until midnight.`,
          }
          break
        }
        const paper = buildCompetitiveMock('mpt', mockSessionDateKey || getDailyMockStatus('mpt').dateKey)
        r = {
          title: paper.title,
          qs: paper.questions,
          exam: true,
          timeSec: paper.timeSec,
          note: `${paper.note} Daily registration: ${DAILY_MOCK_TIME_LABELS.mpt}. Once entered, you may finish after registration closes.`,
          blueprint: paper.blueprint,
        }
        break
      }
      case 'one-paper': {
        const paper = buildCompetitiveMock('one-paper', currentPakistanDateKey())
        r = {
          title: paper.title,
          qs: paper.questions,
          exam: true,
          timeSec: paper.timeSec,
          note: paper.note,
          blueprint: paper.blueprint,
        }
        break
      }
      case 'timed': {
        const qs = await sampleQuestions(paramCats.length ? paramCats : catSlugs, n)
        r = { title: 'Timed Quiz', qs, exam: true, timeSec: n * 40 }
        break
      }
      case 'random': {
        const qs = await sampleQuestions(catSlugs, n)
        r = { title: 'Random GK Quiz', qs, exam: false, timeSec: 0 }
        break
      }
      case 'mixed': {
        const qs = await sampleQuestions(paramCats.length ? paramCats : catSlugs, n)
        r = { title: 'Mixed Category Quiz', qs, exam: false, timeSec: 0 }
        break
      }
      case 'category': {
        const slug = paramCats[0] ?? catSlugs[0]
        const all = await getCategoryQuestions(slug)
        const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, n)
        r = { title: `${cats.find((c) => c.slug === slug)?.name ?? slug} - Practice Quiz`, qs: shuffled, exam: false, timeSec: 0 }
        break
      }
      case 'weak': {
        const mis = getMistakes()
        const requestedTopic = (sp.get('topic') ?? '').trim()
        const requestedSubject = (sp.get('subject') ?? '').trim().toLowerCase()
        const subjectCategory: Record<string, string> = {
          'pakistan affairs': 'pakistan-affairs', 'islamic studies': 'islamic-gk', 'islamiyat': 'islamic-gk',
          english: 'english-grammar', urdu: 'urdu-language', geography: 'pakistan-geography', history: 'pakistan-history',
          'everyday science': 'everyday-science', science: 'science', 'current affairs': 'current-affairs',
          'general knowledge': 'misc-gk', economics: 'economics', environment: 'environment',
          'international organisations': 'international-organisations',
        }
        const requestedCategory = subjectCategory[requestedSubject]
        if (requestedTopic && requestedCategory && catSlugs.includes(requestedCategory)) {
          const all = await getCategoryQuestions(requestedCategory)
          const topicNeedle = requestedTopic.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
          const matching = all.filter((question) => (question.s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').includes(topicNeedle))
          const source = matching.length >= 5 ? matching : all
          const qs = [...source].sort(() => Math.random() - 0.5).slice(0, n)
          r = {
            title: `${requestedTopic} Practice`, qs, exam: false, timeSec: 0,
            note: matching.length >= 5 ? `Focused questions for ${requestedTopic}.` : `A related ${requestedSubject} recovery set; the verified bank does not yet tag enough questions with this exact topic.`,
          }
          break
        }
        const counts: Record<string, number> = {}
        mis.forEach((m2) => { counts[m2.cat] = (counts[m2.cat] ?? 0) + 1 })
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c)
        const valid = top.filter((t) => catSlugs.includes(t))
        if (valid.length === 0) {
          r = { title: 'Weak-Area Practice', qs: [], exam: false, timeSec: 0, note: 'Answer some questions first - your weak areas will appear here automatically.' }
        } else {
          const qs = await sampleQuestions(valid, n)
          r = { title: 'Weak-Area Practice', qs, exam: false, timeSec: 0, note: `Focus: ${valid.map((v) => cats.find((c) => c.slug === v)?.name ?? v).join(', ')}` }
        }
        break
      }
      case 'saved': {
        const ids = savedMcqIds()
        const qs = await getQuestionsByIds(ids)
        r = { title: 'Saved Questions', qs, exam: false, timeSec: 0, note: qs.length ? undefined : 'You have not saved any questions yet. Use the Save button on any MCQ.' }
        break
      }
      case 'wrong': {
        const qs = await getQuestionsByIds(wrongIds().slice(0, n))
        r = { title: 'Wrong Answers', qs, exam: false, timeSec: 0, note: qs.length ? undefined : 'No wrong answers recorded yet - good news!' }
        break
      }
      case 'unattempted': {
        const pool = await sampleQuestions(catSlugs, 250)
        const done = attemptedIds()
        const qs = pool.filter((q) => !done.has(q.id)).slice(0, n)
        r = { title: 'Unattempted Questions', qs, exam: false, timeSec: 0 }
        break
      }
      case 'recent': {
        const pool: BankQuestion[] = []
        const chosen = paramCats.length ? paramCats : catSlugs
        await Promise.all(
          chosen.slice(0, 20).map(async (slug) => {
            const cat = cats.find((c) => c.slug === slug)
            if (!cat) return
            pool.push(...(await getChunk(slug, cat.chunks - 1)))
          }),
        )
        const qs = pool.sort(() => Math.random() - 0.5).slice(0, n)
        r = { title: 'Recently Added Questions', qs, exam: false, timeSec: 0 }
        break
      }
      case 'difficult': {
        const withDiff = cats.filter((c) => ['science', 'islamic-gk', 'current-affairs', 'capitals', 'currencies', 'computer-basics', 'solar-system'].includes(c.slug))
        const pool = await sampleQuestions(withDiff.map((c) => c.slug), 300)
        const qs = pool.filter((q) => q.d === 'Advanced').slice(0, n)
        r = { title: 'Difficult Questions', qs, exam: false, timeSec: 0, note: 'Advanced-level questions only.' }
        break
      }
      case 'custom': {
        const c = custom!
        const pool = await sampleQuestions(c.cats.length ? c.cats : catSlugs, Math.min(800, c.n * 6))
        let f = pool
        if (c.diff !== 'all') f = f.filter((q) => q.d === c.diff)
        const done = attemptedIds()
        if (c.attempt === 'unattempted') f = f.filter((q) => !done.has(q.id))
        if (c.attempt === 'attempted') f = f.filter((q) => done.has(q.id))
        if (c.order === 'sequential') f = f.sort((a, b2) => a.id.localeCompare(b2.id))
        else f = f.sort(() => Math.random() - 0.5)
        const qs = f.slice(0, c.n)
        r = { title: 'Custom Quiz', qs, exam: c.time > 0, timeSec: c.time * 60 }
        break
      }
      default: {
        const qs = await sampleQuestions(catSlugs, n)
        r = { title: 'GK Quiz', qs, exam: false, timeSec: 0 }
      }
    }
    // merge admin-uploaded MCQs into sampled modes + remove disabled ones
    const protectedModes = new Set(['saved', 'wrong', 'revision', 'mock', 'pms-mock', 'mpt-mock', 'one-paper'])
    if (!protectedModes.has(m)) {
      const chosen = paramCats.length ? paramCats : null
      const adminPool = chosen ? chosen.flatMap((c) => adminBankQuestions(c)) : adminBankQuestions()
      r.qs = [...r.qs, ...adminPool.sort(() => Math.random() - 0.5).slice(0, 25)]
    }
    r.qs = dedupeBankQuestions(filterDisabled(r.qs))
    if (m === 'mock' || m === 'pms-mock') r.qs = r.qs.slice(0, 100)
    if (m === 'mpt-mock') r.qs = r.qs.slice(0, 200)
    if (m === 'one-paper') r.qs = r.qs.slice(0, 100)
    setResolved(r)
    setLoading(false)
    if (r.qs.length) {
      recordActivity({ type: 'quiz', label: r.title, path: `/gk/quiz?mode=${m}${sp.get('cats') ? `&cats=${sp.get('cats')}` : ''}` })
    }
  }

  if (!idx) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-pine" />
        <span className="ml-2 text-sm text-muted-foreground">Preparing your quiz…</span>
      </div>
    )
  }

  if (scheduledKind && !mockRegistered) {
    const status = getDailyMockStatus(scheduledKind)
    const label = DAILY_MOCK_TIME_LABELS[scheduledKind]
    const registrationBlueprint = MOCK_BLUEPRINTS[scheduledKind === 'mpt' ? 'mpt' : 'pms-gk']
    return (
      <div>
        <PageHeader title={status.title} description={`Daily supervised entry window: ${label}. Enter your name to create a named, printable result and keep your mock history together.`} />
        <div className="mx-auto max-w-xl px-4 py-10">
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7">
            <p className={`text-xs font-extrabold uppercase tracking-[.16em] ${status.available ? 'text-emerald-700' : 'text-amber-700'}`}>
              {status.available ? 'Registration open now' : status.completedToday ? 'Today’s attempt completed' : 'Registration currently closed'}
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-pine">Student registration</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {status.available
                ? `Entry is open during ${label}. Your paper timer continues normally after you enter.`
                : status.completedToday
                  ? 'Your result is saved in your mock record. Return tomorrow for the next paper.'
                  : `Next entry opens ${new Date(status.nextAvailableAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}.`}
            </p>
            <div className="mt-4 rounded-xl border bg-secondary/35 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-extrabold uppercase tracking-[.12em] text-pine">Paper sequence</p>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {registrationBlueprint.reduce((total, section) => total + section.count, 0)} questions
                </span>
              </div>
              <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {registrationBlueprint.map((section, index) => (
                  <li key={section.label} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-xs">
                    <span className="min-w-0 truncate"><strong className="mr-1 text-emerald-800">{index + 1}.</strong>{section.label}</span>
                    <span className="shrink-0 font-bold text-pine">{section.count}</span>
                  </li>
                ))}
              </ol>
            </div>
            <label className="mt-5 block text-sm font-bold text-pine">
              Student full name
              <input value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Enter your name as it should appear on the result" className="mt-1.5 h-11 w-full rounded-lg border px-3 font-normal text-foreground outline-none focus:ring-2 focus:ring-emerald-700" />
            </label>
            <button
              type="button"
              disabled={!status.available || studentName.trim().length < 2}
              onClick={() => {
                localStorage.setItem('cssvista:mock-student-name', studentName.trim())
                setMockSessionDateKey(status.dateKey)
                setLoading(true)
                setMockRegistered(true)
              }}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-pine px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Enter today’s mock
            </button>
            <p className="mt-3 text-xs text-muted-foreground">One recorded attempt per student profile per daily session. Results include score, time, weak areas and previous mock records.</p>
          </section>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-pine" /><span className="ml-2 text-sm text-muted-foreground">Preparing your quiz…</span></div>
  }

  if (mode === 'custom' && !resolved) {
    return (
      <div>
        <PageHeader title="Custom Quiz Generator" description="Choose the categories, size, difficulty, time limit and order - your quiz is built instantly from the central bank." />
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
          <div>
            <p className="text-sm font-semibold text-pine">Categories ({cfgCats.length || 'all'} selected)</p>
            <div className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto rounded-lg border bg-white p-3">
              {allCats.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => setCfgCats((s) => (s.includes(c.slug) ? s.filter((x) => x !== c.slug) : [...s, c.slug]))}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${cfgCats.includes(c.slug) ? 'bg-pine text-emerald-50' : 'bg-secondary text-foreground'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-semibold text-pine">Number of questions</span>
              <select value={cfgN} onChange={(e) => setCfgN(parseInt(e.target.value, 10))} className="mt-1 h-10 w-full rounded-md border bg-white px-2">
                {[10, 20, 30, 50].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-semibold text-pine">Difficulty</span>
              <select value={cfgDiff} onChange={(e) => setCfgDiff(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-white px-2">
                <option value="all">All levels</option>
                <option value="Basic">Basic</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="font-semibold text-pine">Time limit</span>
              <select value={cfgTime} onChange={(e) => setCfgTime(parseInt(e.target.value, 10))} className="mt-1 h-10 w-full rounded-md border bg-white px-2">
                <option value={0}>Untimed (practice)</option>
                {[5, 10, 15, 30].map((v) => <option key={v} value={v}>{v} minutes</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-semibold text-pine">Order</span>
              <select value={cfgOrder} onChange={(e) => setCfgOrder(e.target.value as 'random')} className="mt-1 h-10 w-full rounded-md border bg-white px-2">
                <option value="random">Random</option>
                <option value="sequential">Sequential</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-semibold text-pine">Question history</span>
              <select value={cfgAttempt} onChange={(e) => setCfgAttempt(e.target.value as 'all')} className="mt-1 h-10 w-full rounded-md border bg-white px-2">
                <option value="all">All questions</option>
                <option value="unattempted">Only unattempted</option>
                <option value="attempted">Only attempted</option>
              </select>
            </label>
          </div>
          <button
            onClick={() => resolve('custom', { cats: cfgCats, n: cfgN, diff: cfgDiff, time: cfgTime, order: cfgOrder, attempt: cfgAttempt })}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-pine px-6 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"
          >
            <Zap className="h-4 w-4" /> Generate quiz
          </button>
        </div>
      </div>
    )
  }

  if (error) return <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState title={error} /></div>
  if (!resolved) return null
  if (resolved.qs.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title={resolved.title} hint={resolved.note ?? 'No questions available for this mode yet.'} />
        <div className="mt-4 text-center">
          <Link to="/gk" className="text-sm font-semibold text-emerald-800 underline underline-offset-2">Back to GK World</Link>
        </div>
      </div>
    )
  }

  return <QuizRun resolved={resolved} mode={mode} studentName={scheduledKind ? studentName.trim() : ''} sessionDateKey={mockSessionDateKey} onRestart={() => { setResolved(null); resolve(mode) }} />
}

// ---------------- Runner ----------------
interface QuizSnapshot {
  signature: string
  answers: Record<string, number>
  revealed: Record<string, boolean>
  page: number
  startedAt: number
  deadline: number | null
}

const QUIZ_SESSION_PREFIX = 'cssvista:quiz-session:'

function readQuizSnapshot(key: string): QuizSnapshot | null {
  try {
    const raw = localStorage.getItem(QUIZ_SESSION_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as QuizSnapshot
    if (!parsed || typeof parsed.signature !== 'string' || typeof parsed.answers !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function writeQuizSnapshot(key: string, snapshot: QuizSnapshot | null) {
  try {
    if (snapshot) localStorage.setItem(QUIZ_SESSION_PREFIX + key, JSON.stringify(snapshot))
    else localStorage.removeItem(QUIZ_SESSION_PREFIX + key)
  } catch {
    /* storage full or blocked */
  }
}

function QuizRun({ resolved, mode, studentName, sessionDateKey, onRestart }: { resolved: Resolved; mode: string; studentName: string; sessionDateKey: string; onRestart: () => void }) {
  const { qs, title, exam, timeSec, blueprint, note } = resolved
  const [page, setPage] = useState(1)
  const [reviewPage, setReviewPage] = useState(1)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({})
  const [finished, setFinished] = useState(false)
  const [left, setLeft] = useState(timeSec)
  const [resultTimeSeconds, setResultTimeSeconds] = useState(0)
  const startRef = useRef(Date.now())
  const deadlineRef = useRef(exam && timeSec > 0 ? startRef.current + timeSec * 1000 : null)
  const questionStartedAtRef = useRef<Record<string, number>>({})
  const finishedRef = useRef(false)
  // Question ids already written to durable progress, so finish() never
  // double-counts an attempt that was committed the moment it was answered.
  const committedRef = useRef<Set<string>>(new Set())
  const [resumeOffer, setResumeOffer] = useState<QuizSnapshot | null>(null)
  const signature = useMemo(() => qs.map((question) => question.id).join('|'), [qs])

  const range = questionPageRange(page, qs.length)
  const pageQuestions = useMemo(() => qs.slice(range.start, range.end), [qs, range.end, range.start])
  const activeSections = useMemo(() => new Set(pageQuestions.map((question) => question.paperSection).filter(Boolean)), [pageQuestions])
  const answeredCount = Object.keys(answers).length
  const score = qs.filter((x) => answers[x.id] !== undefined && answers[x.id] === x.a).length

  useEffect(() => {
    if (!exam || finished || deadlineRef.current === null) return
    const updateRemaining = () => {
      const deadline = deadlineRef.current
      if (deadline === null) return
      const next = remainingSeconds(deadline)
      setLeft((current) => current === next ? current : next)
    }
    updateRemaining()
    const interval = window.setInterval(updateRemaining, 250)
    document.addEventListener('visibilitychange', updateRemaining)
    window.addEventListener('pageshow', updateRemaining)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', updateRemaining)
      window.removeEventListener('pageshow', updateRemaining)
    }
  }, [exam, finished])

  useEffect(() => {
    if (exam && left <= 0 && !finished) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left])

  useEffect(() => {
    if (finished) return
    const now = Date.now()
    pageQuestions.forEach((question) => {
      if (!questionStartedAtRef.current[question.id]) questionStartedAtRef.current[question.id] = now
    })
  }, [finished, pageQuestions])

  // An interrupted session is offered back when the same question set is
  // rebuilt - which is the case for the mocks and the daily challenge, where
  // losing a part-finished attempt costs the most.
  useEffect(() => {
    const snapshot = readQuizSnapshot(mode)
    if (snapshot && snapshot.signature === signature && Object.keys(snapshot.answers).length > 0) {
      setResumeOffer(snapshot)
    }
  }, [mode, signature])

  useEffect(() => {
    if (finished || resumeOffer) return
    if (Object.keys(answers).length === 0) return
    const persist = () => writeQuizSnapshot(mode, {
      signature,
      answers,
      revealed,
      page,
      startedAt: startRef.current,
      deadline: deadlineRef.current,
    })
    persist()
    document.addEventListener('visibilitychange', persist)
    window.addEventListener('pagehide', persist)
    return () => {
      document.removeEventListener('visibilitychange', persist)
      window.removeEventListener('pagehide', persist)
    }
  }, [answers, revealed, page, mode, signature, finished, resumeOffer])

  function acceptResume() {
    const snapshot = resumeOffer
    if (!snapshot) return
    setAnswers(snapshot.answers)
    setRevealed(snapshot.revealed ?? {})
    setPage(snapshot.page || 1)
    startRef.current = snapshot.startedAt || Date.now()
    deadlineRef.current = snapshot.deadline ?? null
    // Answers restored from a practice session were already committed before
    // the interruption; do not record them a second time.
    if (!exam) Object.keys(snapshot.answers).forEach((id) => committedRef.current.add(id))
    setResumeOffer(null)
  }

  function discardResume() {
    writeQuizSnapshot(mode, null)
    setResumeOffer(null)
  }

  // Practice answers lock on first tap, so they are recorded immediately.
  // Previously nothing reached durable storage until "Finish & see result",
  // which meant an abandoned session left no attempts, no mistakes and no
  // revision scheduling behind.
  function commitAnswer(question: BankQuestion, selected: number) {
    if (question.id.startsWith('mock-')) return
    if (committedRef.current.has(question.id)) return
    committedRef.current.add(question.id)
    const correct = selected === question.a
    const category = question.id.replace(/-\d+$/, '')
    recordAttempt(question.id, correct, category, {
      selected,
      topic: question.s,
      difficulty: question.d,
      mode: mode.includes('mpt') ? 'mpt' : mode === 'daily' || mode === 'five-minute' ? 'challenge' : 'gk',
    })
    recordReview(question.id, correct)
    if (!correct) addMistake(question.id, selected, category)
  }

  function choose(question: BankQuestion, i: number) {
    if (finished) return
    if (answers[question.id] === undefined) {
      recordQuestionTiming({
        questionId: question.id,
        category: title,
        mode: mode.includes('mpt') ? 'mpt' : mode === 'daily' || mode === 'five-minute' ? 'challenge' : 'gk',
        seconds: Math.max(1, Math.round((Date.now() - (questionStartedAtRef.current[question.id] ?? Date.now())) / 1000)),
        correct: i === question.a,
        selected: i,
        topic: question.s,
        difficulty: question.d,
      })
    }
    if (exam) {
      setAnswers((a) => ({ ...a, [question.id]: i }))
    } else {
      if (answers[question.id] !== undefined) return
      setAnswers((a) => ({ ...a, [question.id]: i }))
      setRevealed((r) => ({ ...r, [question.id]: true }))
      commitAnswer(question, i)
    }
  }

  function finish() {
    if (finishedRef.current) return
    finishedRef.current = true
    deadlineRef.current = null
    writeQuizSnapshot(mode, null)
    setFinished(true)
    setReviewPage(1)
    const secs = Math.round((Date.now() - startRef.current) / 1000)
    setResultTimeSeconds(secs)
    const weaknessCounts = new Map<string, number>()
    qs.forEach((x) => {
      const sel = answers[x.id]
      const correct = sel === x.a
      if (!correct) {
        const area = x.s || x.id.replace(/-\d+$/, '').replaceAll('-', ' ')
        weaknessCounts.set(area, (weaknessCounts.get(area) ?? 0) + 1)
      }
      if (sel === undefined) return
      if (!x.id.startsWith('mock-') && !committedRef.current.has(x.id)) {
        committedRef.current.add(x.id)
        recordAttempt(x.id, correct, x.id.replace(/-\d+$/, ''), {
          selected: sel,
          topic: x.s,
          difficulty: x.d,
          mode: mode.includes('mpt') ? 'mpt' : mode === 'daily' || mode === 'five-minute' ? 'challenge' : 'gk',
        })
        recordReview(x.id, correct)
        if (!correct) addMistake(x.id, sel, x.id.replace(/-\d+$/, ''))
      }
    })
    const wrongTopics = [...weaknessCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([area]) => area)
    const mockKind = mode === 'mpt-mock' ? 'mpt' : mode === 'pms-mock' || mode === 'mock' ? 'gk' : undefined
    recordQuizResult({
      type: 'quiz',
      category: title,
      score,
      total: qs.length,
      wrongTopics,
      wrongTopicCounts: Object.fromEntries(weaknessCounts),
      studentName: studentName || undefined,
      durationSeconds: secs,
      mockKind,
    })
    if (mode === 'five-minute') recordFiveMin(score, qs.length)
    if (mode === 'daily') completeChallenge(new Date().toISOString().slice(0, 10))
    if (mode === 'mock' || mode === 'pms-mock') recordScheduledMock('gk', sessionDateKey)
    if (mode === 'mpt-mock') recordScheduledMock('mpt', sessionDateKey)
    recordActivity({ type: 'quiz', label: `${title} - scored ${score}/${qs.length} in ${Math.floor(secs / 60)}m`, path: '/gk' })
  }

  const mm = Math.floor(Math.max(0, left) / 60)
  const ss = Math.max(0, left) % 60
  const timeAnnouncement = useMemo(() => {
    if (!exam || finished) return ''
    for (const milestone of [1800, 900, 600, 300, 60]) {
      if (left <= milestone && left > milestone - 5) {
        const minutes = Math.round(milestone / 60)
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} remaining`
      }
    }
    return ''
  }, [exam, finished, left])
  const fiveDone = mode === 'five-minute' ? fiveMinToday() : null

  if (finished) {
    const pct = Math.round((score / qs.length) * 100)
    const reviewRange = questionPageRange(reviewPage, qs.length)
    const reviewQuestions = qs.slice(reviewRange.start, reviewRange.end)
    const weaknessCounts = new Map<string, number>()
    qs.forEach((item) => {
      if (answers[item.id] === item.a) return
      const area = item.s || item.id.replace(/-\d+$/, '').replaceAll('-', ' ')
      weaknessCounts.set(area, (weaknessCounts.get(area) ?? 0) + 1)
    })
    const weakAreas = [...weaknessCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const mockKind = mode === 'mpt-mock' ? 'mpt' : mode === 'pms-mock' || mode === 'mock' ? 'gk' : null
    const history = mockKind
      ? getState().quizResults.filter((result) => result.mockKind === mockKind && (!studentName || result.studentName === studentName)).slice(0, 6)
      : []
    const sectionResults = (blueprint ?? []).map((section) => {
      const sectionQuestions = qs.filter((item) => item.paperSection === section.label)
      const correct = sectionQuestions.filter((item) => answers[item.id] === item.a).length
      return { ...section, correct, total: sectionQuestions.length }
    })
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <section className="print-area">
        <div className="mock-result-summary rounded-xl border bg-white p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title} - Result</p>
          {studentName && <p className="mt-1 font-bold text-emerald-900">Student: {studentName}</p>}
          <p className="mt-2 font-display text-4xl font-bold text-pine">{score} / {qs.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Accuracy {pct}% · Time {Math.floor(resultTimeSeconds / 60)}m {resultTimeSeconds % 60}s
          </p>
          {(mockKind || sectionResults.length > 0) && (
            <div className="mt-5 grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-lg bg-amber-50 p-3">
                <h3 className="text-sm font-bold text-amber-950">Weakness areas</h3>
                {weakAreas.length ? <ol className="mt-2 space-y-1 text-xs text-amber-950">{weakAreas.map(([area, count]) => <li key={area}>{area} · {count} missed</li>)}</ol> : <p className="mt-2 text-xs text-amber-900">No weakness detected in this attempt.</p>}
              </div>
              {mockKind && <div className="rounded-lg bg-emerald-50 p-3">
                <h3 className="text-sm font-bold text-emerald-950">Previous mock record</h3>
                <div className="mt-2 space-y-1 text-xs text-emerald-950">{history.map((item, index) => <p key={item.id}>{index + 1}. {new Date(item.date).toLocaleDateString('en-PK')} · {item.score}/{item.total} · {Math.round(item.score / Math.max(1, item.total) * 100)}%</p>)}</div>
              </div>}
              {sectionResults.length > 0 && (
                <div className="rounded-lg bg-sky-50 p-3 sm:col-span-2">
                  <h3 className="text-sm font-bold text-sky-950">Section performance</h3>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {sectionResults.map((section) => (
                      <div key={section.label} className="flex items-center justify-between gap-2 rounded-md bg-white/75 px-2.5 py-1.5 text-xs text-sky-950">
                        <span>{section.label}</span>
                        <strong>{section.correct}/{section.total}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {mode === 'five-minute' && <p className="mt-1 text-xs font-semibold text-emerald-700">Saved to your daily challenge history.</p>}
          <div className="no-print mt-4 flex flex-wrap items-center justify-center gap-2">
            {!mockKind && <button onClick={onRestart} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-semibold text-emerald-50">
              <RotateCcw className="h-4 w-4" /> New quiz
            </button>}
            <PrintMenu answersAvailable={!mockKind} label={mockKind ? 'Print branded result' : 'Print quiz'} targetSelector={mockKind ? '.mock-result-summary' : '.print-area'} />
            <Link to="/mistakes" className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-pine">
              Review mistake notebook
            </Link>
            <Link to="/exam-intelligence" className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white">
              Exam Intelligence report
            </Link>
            <Link to="/gk" className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-pine">
              GK World
            </Link>
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl font-bold text-pine">Review - answers</h2>
        <div className="mt-3 space-y-4">
          {reviewQuestions.map((x, i) => {
            const sel = answers[x.id]
            const reviewRtl = isRtlText(x.q)
            return (
              <div key={x.id} className="mcq-card rounded-lg border bg-white p-4">
                <p
                  dir={reviewRtl ? 'rtl' : undefined}
                  lang={reviewRtl ? 'ur' : undefined}
                  className={`text-sm font-semibold text-foreground ${reviewRtl ? 'urdu-text text-right' : ''}`}
                >
                  Q{reviewRange.start + i + 1}. {x.q}
                </p>
                <div className="mt-2 grid gap-1.5">
                  {x.o.map((o, j) => {
                    const optionRtl = isRtlText(o)
                    return (
                      <div
                        key={j}
                        dir={optionRtl ? 'rtl' : undefined}
                        lang={optionRtl ? 'ur' : undefined}
                        className={`flex items-center gap-2 rounded border px-2.5 py-1.5 text-sm ${j === x.a ? 'border-emerald-500 bg-emerald-50' : j === sel ? 'border-red-300 bg-red-50' : 'bg-white'}`}
                      >
                        <span className="text-xs font-bold text-muted-foreground">{'ABCD'[j]}</span>
                        <span className={optionRtl ? 'urdu-text' : undefined}>{o}</span>
                        {j === x.a && <Check className="ml-auto h-4 w-4 text-emerald-700" />}
                        {j === sel && j !== x.a && <X className="ml-auto h-4 w-4 text-red-600" />}
                      </div>
                    )
                  })}
                </div>
                <div className="answer-block mt-2 rounded border-l-4 border-emerald-500 bg-emerald-50/60 px-3 py-2 text-xs leading-relaxed">
                  <span className="font-semibold">
                    Correct: {'ABCD'[x.a]}){' '}
                    <span
                      dir={isRtlText(x.o[x.a]) ? 'rtl' : undefined}
                      lang={isRtlText(x.o[x.a]) ? 'ur' : undefined}
                      className={isRtlText(x.o[x.a]) ? 'urdu-text inline-block' : undefined}
                    >
                      {x.o[x.a]}
                    </span>
                  </span>
                  {x.e && <p className="mt-1.5 text-muted-foreground">{x.e}</p>}
                  {x.sourceUrl && (
                    <a href={x.sourceUrl} target="_blank" rel="noopener noreferrer" className="no-print mt-1.5 inline-flex font-bold text-emerald-800 underline underline-offset-2">
                      Official reference ↗
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <QuestionPagination currentPage={reviewPage} totalItems={qs.length} onPageChange={setReviewPage} className="mt-6" />
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {resumeOffer && (
        <div className="no-print mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">You have an unfinished attempt at this quiz.</p>
          <p className="mt-1 text-xs">
            {Object.keys(resumeOffer.answers).length} of {qs.length} questions were answered.
            {resumeOffer.deadline !== null ? ' Resuming continues the original timer.' : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={acceptResume} className="inline-flex h-9 items-center rounded-md bg-amber-800 px-3 text-xs font-bold text-white">Resume attempt</button>
            <button onClick={discardResume} className="inline-flex h-9 items-center rounded-md border border-amber-400 px-3 text-xs font-bold text-amber-900">Start fresh</button>
          </div>
        </div>
      )}
      {/* Status bar */}
      <div className="no-print sticky top-16 z-20 rounded-lg border bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-pine">{title}</span>
          <div className="flex items-center gap-3">
            {exam && (
              <span className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-sm font-bold ${left < 60 ? 'bg-red-100 text-red-700' : 'bg-secondary text-pine'}`}>
                <Clock className="h-3.5 w-3.5" /> {mm}:{String(ss).padStart(2, '0')}
              </span>
            )}
            {exam && (
              // Announced only at milestones; a per-second live region would
              // make the timer unusable with a screen reader.
              <span role="status" aria-live="assertive" className="sr-only">{timeAnnouncement}</span>
            )}
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-pine">
              Questions {range.start + 1}–{range.end}
            </span>
            <span className="text-xs text-muted-foreground">{answeredCount}/{qs.length} answered</span>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">Tip: press 1-4 or A-D to answer</span>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${(answeredCount / qs.length) * 100}%` }} />
        </div>
      </div>

      {blueprint && blueprint.length > 0 && (
        <div className="no-print mt-3 overflow-x-auto pb-1" aria-label="Paper section sequence">
          <ol className="flex min-w-max gap-1.5">
            {blueprint.map((section, index) => {
              const active = activeSections.has(section.label)
              return (
                <li key={section.label} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${active ? 'border-emerald-700 bg-emerald-50 text-pine' : 'bg-white text-muted-foreground'}`}>
                  {index + 1}. {section.label} · {section.count}
                </li>
              )
            })}
          </ol>
        </div>
      )}
      {note && <p className="no-print mt-2 text-xs leading-relaxed text-muted-foreground">{note}</p>}

      {mode === 'five-minute' && fiveDone && (
        <p className="no-print mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You already completed today’s challenge ({fiveDone.score}/{fiveDone.total}). You can practise again - your best daily record stays saved.
        </p>
      )}

      <div id="gk-quiz-question-list" className="mt-4 scroll-mt-32 space-y-4">
        {pageQuestions.map((question, questionIndex) => {
          const questionNumber = range.start + questionIndex + 1
          const rtl = isRtlText(question.q)
          return (
            <article key={question.id} id={`gk-quiz-question-${questionNumber}`} className="scroll-mt-32 rounded-xl border bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-xs font-bold text-muted-foreground">Question {questionNumber} of {qs.length}</span>
                  {question.paperSection && <span className="truncate rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">{question.paperSection}</span>}
                </div>
                <button onClick={() => setSavedMap((current) => ({ ...current, [question.id]: toggleSavedMcq(question.id) }))} className="no-print rounded p-1.5 text-muted-foreground hover:bg-secondary" aria-label={`Save question ${questionNumber}`}>
                  {savedMap[question.id] ? <BookmarkCheck className="h-4 w-4 text-emerald-700" /> : <Bookmark className="h-4 w-4" />}
                </button>
              </div>
              <p id={`gk-quiz-stem-${question.id}`} dir={rtl ? 'rtl' : undefined} lang={rtl ? 'ur' : undefined} className={`mt-2 text-base font-medium leading-relaxed ${rtl ? 'urdu-text text-right' : ''}`}>{question.q}</p>
              <div
                className="mt-4 grid gap-2"
                role="radiogroup"
                aria-labelledby={`gk-quiz-stem-${question.id}`}
                onKeyDown={(event) => {
                  // 1-4 or A-D answers the question whose options have focus.
                  if (event.altKey || event.ctrlKey || event.metaKey) return
                  const key = event.key.toLowerCase()
                  const byNumber = '1234'.indexOf(key)
                  const byLetter = 'abcd'.indexOf(key)
                  const index = byNumber >= 0 ? byNumber : byLetter
                  if (index < 0 || index >= question.o.length) return
                  event.preventDefault()
                  choose(question, index)
                }}
              >
                {question.o.map((option, optionIndex) => {
                  const optionRtl = isRtlText(option)
                  const selected = answers[question.id] === optionIndex
                  const show = !exam && revealed[question.id]
                  let classes = 'border hover:border-emerald-700/50 hover:bg-emerald-50/40'
                  if (exam && selected) classes = 'border-emerald-700 bg-emerald-50'
                  if (show) {
                    if (optionIndex === question.a) classes = 'border-emerald-600 bg-emerald-50'
                    else if (selected) classes = 'border-red-400 bg-red-50'
                    else classes = 'border opacity-70'
                  }
                  return (
                    <button
                      key={optionIndex}
                      role="radio"
                      aria-checked={selected}
                      aria-label={`Option ${'ABCD'[optionIndex]}: ${option}`}
                      dir={optionRtl ? 'rtl' : undefined}
                      lang={optionRtl ? 'ur' : undefined}
                      onClick={() => choose(question, optionIndex)}
                      className={`flex min-h-11 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors ${optionRtl ? 'text-right' : 'text-left'} ${classes}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold text-muted-foreground">{'ABCD'[optionIndex]}</span>
                      <span className={optionRtl ? 'urdu-text' : undefined}>{option}</span>
                    </button>
                  )
                })}
              </div>
              {!exam && revealed[question.id] && (
                <div role="status" aria-live="polite" className="answer-block mt-3 rounded-md border-l-4 border-emerald-500 bg-emerald-50/60 px-3 py-2.5 text-sm">
                  <p className="font-semibold text-pine">Correct answer: {'ABCD'[question.a]}) <span dir={isRtlText(question.o[question.a]) ? 'rtl' : undefined} lang={isRtlText(question.o[question.a]) ? 'ur' : undefined} className={isRtlText(question.o[question.a]) ? 'urdu-text inline-block' : undefined}>{question.o[question.a]}</span></p>
                  {question.e && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{question.e}</p>}
                </div>
              )}
              {!exam && !revealed[question.id] && <button onClick={() => setRevealed((current) => ({ ...current, [question.id]: true }))} className="no-print mt-3 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"><Flag className="h-3.5 w-3.5" /> Reveal answer without attempting</button>}
            </article>
          )
        })}
      </div>

      <QuestionPagination currentPage={page} totalItems={qs.length} onPageChange={(nextPage) => { setPage(nextPage); window.requestAnimationFrame(() => document.getElementById('gk-quiz-question-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }} className="mt-5" />

      <section className="no-print mt-4 rounded-lg border bg-white p-3" aria-label="Question navigator">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xs font-bold uppercase tracking-wide text-pine">Question navigator</h2><span className="text-[11px] text-muted-foreground">Green means answered; a ring means saved.</span></div>
        <div className="flex flex-wrap gap-1.5">
          {qs.map((question, index) => {
            const number = index + 1
            const currentPage = questionPageForIndex(index) === page
            return <button key={question.id} onClick={() => { setPage(questionPageForIndex(index)); window.setTimeout(() => document.getElementById(`gk-quiz-question-${number}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0) }} aria-label={`Go to question ${number}`} className={`grid h-11 min-w-11 place-items-center rounded border px-1 text-[11px] font-bold ${answers[question.id] !== undefined ? 'border-emerald-600 bg-emerald-200 text-emerald-900' : currentPage ? 'border-pine bg-secondary text-pine' : 'bg-white text-muted-foreground'} ${savedMap[question.id] ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}>{number}</button>
          })}
        </div>
      </section>

      <div className="no-print mt-5 flex justify-end">
        <button onClick={finish} className="inline-flex min-h-11 items-center gap-1 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white"><Check className="h-4 w-4" /> Finish &amp; see result</button>
      </div>

    </div>
  )
}
