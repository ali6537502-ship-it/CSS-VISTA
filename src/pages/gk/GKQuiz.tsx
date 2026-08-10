import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Bookmark, BookmarkCheck, Check, ChevronLeft, ChevronRight, Clock, Flag, Loader2,
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
  recordAttempt, recordFiveMin, savedMcqIds, toggleSavedMcq, wrongIds,
} from '@/lib/progress'
import {
  completeChallenge, getMockAvailability, recordQuizResult, recordReview, recordScheduledMock,
} from '@/lib/store'
import { isRtlText } from '@/lib/utils'
import { questions as seedQuestions } from '@/data/quiz'



interface Resolved {
  title: string
  qs: BankQuestion[]
  exam: boolean
  timeSec: number
  note?: string
}

export default function GKQuiz({ forceMode }: { forceMode?: string }) {
  const [sp] = useSearchParams()
  const mode = forceMode ?? sp.get('mode') ?? 'random'
  const [idx, setIdx] = useState<BankIndex | null>(null)
  const [resolved, setResolved] = useState<Resolved | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
    if (mode === 'custom') {
      setLoading(false)
      return // wait for user config
    }
    resolve(mode).catch(() => {
      setError('Could not load questions. Please try again.')
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, mode])

  async function resolve(m: string, custom?: { cats: string[]; n: number; diff: string; time: number; order: string; attempt: string }) {
    setLoading(true)
    const cats = idx!.categories
    const catSlugs = cats.map((c) => c.slug)
    const paramCats = (sp.get('cats') ?? '').split(',').filter(Boolean)
    const n = parseInt(sp.get('n') ?? '15', 10)

    let r: Resolved | null = null
    switch (m) {
      case 'revision': {
        const dueIds = dueRevisionIds(60)
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
            note: `Your next PMS GK Grand Mock becomes available ${new Date(availability.nextAvailableAt!).toLocaleString()}. A new PMS GK Grand Mock unlocks two days after completion.`,
          }
          break
        }
        const pmsAreas = [
          'current-affairs', 'pakistan-affairs', 'pakistan-history', 'pakistan-geography',
          'everyday-science', 'science', 'islamic-gk', 'english-grammar', 'urdu-language',
          'computer-basics', 'misc-gk', 'international-organisations',
        ]
        const qs = await sampleQuestions(pmsAreas, 100)
        r = {
          title: 'PMS GK Grand Mock',
          qs,
          exam: true,
          timeSec: 90 * 60,
          note: 'A 100-question general-knowledge practice mock available every two days and drawn from the central CSS Vista question bank. Provincial PMS paper patterns can vary.',
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
            note: `Your next MPT mock becomes available ${new Date(availability.nextAvailableAt!).toLocaleString()}. A new MPT mock unlocks three days after completion.`,
          }
          break
        }
        const abilityQuestions: BankQuestion[] = seedQuestions
          .filter((question) => question.category === 'abilities' || question.category === 'reasoning')
          .sort(() => Math.random() - 0.5)
          .slice(0, 15)
          .map((question) => ({
            id: `mpt-seed-${question.id}`,
            q: question.question,
            o: question.options,
            a: question.answer,
            s: question.topic,
            d: question.difficulty === 'Easy'
              ? 'Basic'
              : question.difficulty === 'Hard'
                ? 'Advanced'
                : 'Intermediate',
          }))
        const [islamic, urdu, english, generalKnowledge] = await Promise.all([
          sampleQuestions(['islamic-gk'], 5),
          sampleQuestions(['urdu-language'], 5),
          sampleQuestions(['english-grammar'], 12),
          sampleQuestions(
            [
              'everyday-science', 'science', 'current-affairs', 'pakistan-affairs',
              'pakistan-history', 'pakistan-geography',
            ],
            13,
          ),
        ])
        r = {
          title: 'Full CSS MPT Practice Mock',
          qs: [...islamic, ...urdu, ...english, ...abilityQuestions, ...generalKnowledge]
            .sort(() => Math.random() - 0.5),
          exam: true,
          timeSec: 50 * 60,
          note: 'A 50-question proportional practice mock covering every official MPT paper area.',
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
        const counts: Record<string, number> = {}
        mis.forEach((m2) => { counts[m2.cat] = (counts[m2.cat] ?? 0) + 1 })
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c)
        const valid = top.filter((t) => catSlugs.includes(t))
        if (valid.length === 0) {
          r = { title: 'Weak-Area Practice', qs: [], exam: false, timeSec: 0, note: 'Answer some questions first - your weak areas will appear here automatically.' }
        } else {
          const qs = await sampleQuestions(valid, 15)
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
        const qs = await getQuestionsByIds(wrongIds().slice(0, 60))
        r = { title: 'Wrong Answers', qs, exam: false, timeSec: 0, note: qs.length ? undefined : 'No wrong answers recorded yet - good news!' }
        break
      }
      case 'unattempted': {
        const pool = await sampleQuestions(catSlugs, 250)
        const done = attemptedIds()
        const qs = pool.filter((q) => !done.has(q.id)).slice(0, 15)
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
        const qs = pool.sort(() => Math.random() - 0.5).slice(0, 15)
        r = { title: 'Recently Added Questions', qs, exam: false, timeSec: 0 }
        break
      }
      case 'difficult': {
        const withDiff = cats.filter((c) => ['science', 'islamic-gk', 'current-affairs', 'capitals', 'currencies', 'computer-basics', 'solar-system'].includes(c.slug))
        const pool = await sampleQuestions(withDiff.map((c) => c.slug), 300)
        const qs = pool.filter((q) => q.d === 'Advanced').slice(0, 15)
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
    const idBasedModes = new Set(['saved', 'wrong', 'revision'])
    if (!idBasedModes.has(m)) {
      const chosen = paramCats.length ? paramCats : null
      const adminPool = chosen ? chosen.flatMap((c) => adminBankQuestions(c)) : adminBankQuestions()
      r.qs = [...r.qs, ...adminPool.sort(() => Math.random() - 0.5).slice(0, 25)]
    }
    r.qs = dedupeBankQuestions(filterDisabled(r.qs))
    if (m === 'mock' || m === 'pms-mock') r.qs = r.qs.slice(0, 100)
    if (m === 'mpt-mock') r.qs = r.qs.slice(0, 50)
    setResolved(r)
    setLoading(false)
    if (r.qs.length) {
      recordActivity({ type: 'quiz', label: r.title, path: `/gk/quiz?mode=${m}${sp.get('cats') ? `&cats=${sp.get('cats')}` : ''}` })
    }
  }

  if (loading || !idx) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-pine" />
        <span className="ml-2 text-sm text-muted-foreground">Preparing your quiz…</span>
      </div>
    )
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

  return <QuizRun resolved={resolved} mode={mode} onRestart={() => { setResolved(null); resolve(mode) }} />
}

// ---------------- Runner ----------------
function QuizRun({ resolved, mode, onRestart }: { resolved: Resolved; mode: string; onRestart: () => void }) {
  const { qs, title, exam, timeSec } = resolved
  const [cur, setCur] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({})
  const [finished, setFinished] = useState(false)
  const [left, setLeft] = useState(timeSec)
  const startRef = useRef(Date.now())
  const finishedRef = useRef(false)

  const q = qs[cur]
  const rtl = isRtlText(q.q)
  const answeredCount = Object.keys(answers).length
  const score = qs.filter((x) => answers[x.id] !== undefined && answers[x.id] === x.a).length

  useEffect(() => {
    if (exam && !finished && left > 0) {
      const t = setInterval(() => setLeft((s) => s - 1), 1000)
      return () => clearInterval(t)
    }
  }, [exam, finished, left])

  useEffect(() => {
    if (exam && left <= 0 && !finished) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left])

  function choose(i: number) {
    if (finished) return
    if (exam) {
      setAnswers((a) => ({ ...a, [q.id]: i }))
    } else {
      if (answers[q.id] !== undefined) return
      setAnswers((a) => ({ ...a, [q.id]: i }))
      setRevealed((r) => ({ ...r, [q.id]: true }))
    }
  }

  function finish() {
    if (finishedRef.current) return
    finishedRef.current = true
    setFinished(true)
    const secs = Math.round((Date.now() - startRef.current) / 1000)
    qs.forEach((x) => {
      const sel = answers[x.id]
      if (sel === undefined) return
      const correct = sel === x.a
      if (!x.id.startsWith('mpt-seed-')) {
        recordAttempt(x.id, correct, x.id.replace(/-\d+$/, ''))
        recordReview(x.id, correct)
        if (!correct) addMistake(x.id, sel, x.id.replace(/-\d+$/, ''))
      }
    })
    recordQuizResult({ type: 'quiz', category: title, score, total: qs.length })
    if (mode === 'five-minute') recordFiveMin(score, qs.length)
    if (mode === 'daily') completeChallenge(new Date().toISOString().slice(0, 10))
    if (mode === 'mock' || mode === 'pms-mock') recordScheduledMock('gk')
    if (mode === 'mpt-mock') recordScheduledMock('mpt')
    recordActivity({ type: 'quiz', label: `${title} - scored ${score}/${qs.length} in ${Math.floor(secs / 60)}m`, path: '/gk' })
  }

  const mm = Math.floor(Math.max(0, left) / 60)
  const ss = Math.max(0, left) % 60
  const fiveDone = mode === 'five-minute' ? fiveMinToday() : null

  if (finished) {
    const pct = Math.round((score / qs.length) * 100)
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl border bg-white p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title} - Result</p>
          <p className="mt-2 font-display text-4xl font-bold text-pine">{score} / {qs.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Accuracy {pct}% · Time {Math.floor((Date.now() - startRef.current) / 60000)}m {Math.floor(((Date.now() - startRef.current) / 1000) % 60)}s
          </p>
          {mode === 'five-minute' && <p className="mt-1 text-xs font-semibold text-emerald-700">Saved to your daily challenge history.</p>}
          <div className="no-print mt-4 flex flex-wrap items-center justify-center gap-2">
            <button onClick={onRestart} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-semibold text-emerald-50">
              <RotateCcw className="h-4 w-4" /> New quiz
            </button>
            <PrintMenu label="Print quiz" />
            <Link to="/mistakes" className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-pine">
              Review mistake notebook
            </Link>
            <Link to="/gk" className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-pine">
              GK World
            </Link>
          </div>
        </div>

        <h2 className="print-area mt-8 font-display text-xl font-bold text-pine">Review - answers</h2>
        <div className="print-area mt-3 space-y-4">
          {qs.map((x, i) => {
            const sel = answers[x.id]
            const reviewRtl = isRtlText(x.q)
            return (
              <div key={x.id} className="mcq-card rounded-lg border bg-white p-4">
                <p
                  dir={reviewRtl ? 'rtl' : undefined}
                  lang={reviewRtl ? 'ur' : undefined}
                  className={`text-sm font-semibold text-foreground ${reviewRtl ? 'urdu-text text-right' : ''}`}
                >
                  Q{i + 1}. {x.q}
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
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
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
            <span className="text-xs text-muted-foreground">{answeredCount}/{qs.length} answered</span>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${(answeredCount / qs.length) * 100}%` }} />
        </div>
      </div>

      {mode === 'five-minute' && fiveDone && (
        <p className="no-print mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You already completed today’s challenge ({fiveDone.score}/{fiveDone.total}). You can practise again - your best daily record stays saved.
        </p>
      )}

      {/* Question */}
      <div className="mt-4 rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground">Question {cur + 1} of {qs.length}</span>
          <button
            onClick={() => setSavedMap((s) => ({ ...s, [q.id]: toggleSavedMcq(q.id) }))}
            className="no-print rounded p-1.5 text-muted-foreground hover:bg-secondary"
            aria-label="Save question"
          >
            {savedMap[q.id] ? <BookmarkCheck className="h-4 w-4 text-emerald-700" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
        <p
          dir={rtl ? 'rtl' : undefined}
          lang={rtl ? 'ur' : undefined}
          className={`mt-2 text-base font-medium leading-relaxed ${rtl ? 'urdu-text text-right' : ''}`}
        >
          {q.q}
        </p>
        <div className="mt-4 grid gap-2">
          {q.o.map((o, i) => {
            const optionRtl = isRtlText(o)
            const sel = answers[q.id] === i
            const show = !exam && revealed[q.id]
            let cls = 'border hover:border-emerald-700/50 hover:bg-emerald-50/40'
            if (exam && sel) cls = 'border-emerald-700 bg-emerald-50'
            if (show) {
              if (i === q.a) cls = 'border-emerald-600 bg-emerald-50'
              else if (sel) cls = 'border-red-400 bg-red-50'
              else cls = 'opacity-70'
            }
            return (
              <button
                key={i}
                dir={optionRtl ? 'rtl' : undefined}
                lang={optionRtl ? 'ur' : undefined}
                onClick={() => choose(i)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors ${optionRtl ? 'text-right' : 'text-left'} ${cls}`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold text-muted-foreground">
                  {'ABCD'[i]}
                </span>
                <span className={optionRtl ? 'urdu-text' : undefined}>{o}</span>
              </button>
            )
          })}
        </div>
        {!exam && revealed[q.id] && (
          <div className="answer-block mt-3 rounded-md border-l-4 border-emerald-500 bg-emerald-50/60 px-3 py-2.5 text-sm">
            <p className="font-semibold text-pine">
              Correct answer: {'ABCD'[q.a]}){' '}
              <span
                dir={isRtlText(q.o[q.a]) ? 'rtl' : undefined}
                lang={isRtlText(q.o[q.a]) ? 'ur' : undefined}
                className={isRtlText(q.o[q.a]) ? 'urdu-text inline-block' : undefined}
              >
                {q.o[q.a]}
              </span>
            </p>
          </div>
        )}
        {!exam && !revealed[q.id] && (
          <button
            onClick={() => setRevealed((r) => ({ ...r, [q.id]: true }))}
            className="no-print mt-3 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
          >
            <Flag className="h-3.5 w-3.5" /> Reveal answer without attempting
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="no-print mt-4 flex items-center justify-between">
        <button
          onClick={() => setCur((c) => Math.max(0, c - 1))}
          disabled={cur === 0}
          className="inline-flex h-10 items-center gap-1 rounded-md border bg-white px-4 text-sm font-semibold disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        {cur < qs.length - 1 ? (
          <button
            onClick={() => setCur((c) => c + 1)}
            className="inline-flex h-10 items-center gap-1 rounded-md bg-pine px-4 text-sm font-semibold text-emerald-50"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={finish}
            className="inline-flex h-10 items-center gap-1 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white"
          >
            <Check className="h-4 w-4" /> Finish &amp; see result
          </button>
        )}
      </div>

      {/* Palette */}
      <div className="no-print mt-4 flex flex-wrap gap-1.5">
        {qs.map((x, i) => (
          <button
            key={x.id}
            onClick={() => setCur(i)}
            className={`h-7 w-7 rounded text-[11px] font-bold ${i === cur ? 'bg-pine text-white' : answers[x.id] !== undefined ? 'bg-emerald-200 text-emerald-900' : 'bg-secondary text-muted-foreground'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="no-print mt-6 text-center">
        <button onClick={finish} className="text-xs font-semibold text-muted-foreground underline underline-offset-2">
          End quiz and view result
        </button>
      </div>
    </div>
  )
}
