import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, BellOff, Pause, PenLine, Play, Plus, RotateCcw, Square, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { recordActivity, saveTimerSession } from '@/lib/progress'
import { mergedPastPapers } from '@/lib/admin'
import { pastPapers as seedPapers } from '@/data/pastPapers'

const ALERTS = [
  { at: 5, text: '5 minutes: Outline should be ready.' },
  { at: 10, text: '10 minutes: Begin the main argument.' },
  { at: 20, text: '20 minutes: Check balance and evidence.' },
  { at: 35, text: '35 minutes: Conclude and review.' },
]

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.setValueAtTime(0.15, ctx.currentTime)
    o.start()
    o.stop(ctx.currentTime + 0.25)
  } catch {
    /* audio unavailable */
  }
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function AnswerTimer() {
  const [tab, setTab] = useState<'single' | 'paper'>('single')
  return (
    <div>
      <PageHeader
        title="Handwritten Answer Timer"
        description="Practise writing answers on paper under real exam timing - one question at a time, or a full four-question paper. Alerts keep your structure on track."
      />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="no-print mb-6 flex gap-2">
          <button onClick={() => setTab('single')} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === 'single' ? 'bg-pine text-emerald-50' : 'bg-secondary'}`}>
            Single Question Timer
          </button>
          <button onClick={() => setTab('paper')} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === 'paper' ? 'bg-pine text-emerald-50' : 'bg-secondary'}`}>
            Four-Question Paper Mode
          </button>
        </div>
        {tab === 'single' ? <SingleTimer /> : <PaperTimer />}
      </div>
    </div>
  )
}

function usePaperTitles() {
  return useMemo(() => mergedPastPapers(seedPapers).map((p) => p.title), [])
}

function SingleTimer() {
  const paperTitles = usePaperTitles()
  const [question, setQuestion] = useState('')
  const [customMin, setCustomMin] = useState(35)
  const [left, setLeft] = useState(customMin * 60)
  const [running, setRunning] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [fired, setFired] = useState<number[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const [doneTimes, setDoneTimes] = useState<{ q: string; secs: number }[]>([])
  const elapsedRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setLeft((s) => {
        const next = s - 1
        elapsedRef.current += 1
        const elapsedMin = Math.floor(elapsedRef.current / 60)
        const alert = ALERTS.find((a) => a.at === elapsedMin && !fired.includes(a.at))
        if (alert && elapsedRef.current % 60 === 0) {
          setFired((f) => [...f, alert.at])
          setBanner(alert.text)
          if (soundOn) beep()
          setTimeout(() => setBanner(null), 8000)
        }
        if (next <= 0) {
          setRunning(false)
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [running, fired, soundOn])

  function reset(newMin = customMin) {
    setRunning(false)
    setLeft(newMin * 60)
    elapsedRef.current = 0
    setFired([])
    setBanner(null)
  }

  function complete() {
    const secs = elapsedRef.current
    setDoneTimes((d) => [...d, { q: question || `Question ${d.length + 1}`, secs }])
    saveTimerSession({ mode: 'single', questions: [question || 'Untitled question'], times: [secs], total: secs, finished: true })
    recordActivity({ type: 'timer', label: `Answer timer - ${question.slice(0, 40) || 'question'} in ${Math.floor(secs / 60)}m`, path: '/answer-timer' })
    reset()
    setQuestion('')
  }

  return (
    <div className="space-y-4">
      {banner && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <Bell className="mr-2 inline h-4 w-4" /> {banner}
        </div>
      )}
      <div className="rounded-xl border bg-white p-5">
        <label className="text-sm font-semibold text-pine">Your question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder="Paste or type the question you will attempt on paper…"
          className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-sm"
        />
        {paperTitles.length > 0 && (
          <select
            onChange={(e) => e.target.value && setQuestion(`From past paper: ${e.target.value}`)}
            className="mt-2 h-9 w-full rounded-md border bg-white px-2 text-sm"
            defaultValue=""
          >
            <option value="">Or select from an uploaded past paper…</option>
            {paperTitles.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-pine">Time:</span>
          {[20, 30, 35, 45].map((m) => (
            <button key={m} onClick={() => { setCustomMin(m); reset(m) }} className={`rounded px-2.5 py-1 text-xs font-bold ${customMin === m ? 'bg-pine text-white' : 'bg-secondary'}`}>
              {m}m
            </button>
          ))}
          <button onClick={() => setSoundOn(!soundOn)} className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary">
            {soundOn ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />} Sound {soundOn ? 'on' : 'off'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {question ? question.slice(0, 80) : 'Set a question, then start the timer'}
        </p>
        <p className={`mt-3 font-display text-5xl font-bold tabular-nums ${left < 300 ? 'text-red-600' : 'text-pine'}`}>{fmt(Math.max(0, left))}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {!running ? (
            <button onClick={() => setRunning(true)} className="inline-flex h-11 items-center gap-1.5 rounded-md bg-pine px-5 text-sm font-semibold text-emerald-50">
              <Play className="h-4 w-4" /> {left < customMin * 60 && left > 0 ? 'Resume' : 'Start'}
            </button>
          ) : (
            <button onClick={() => setRunning(false)} className="inline-flex h-11 items-center gap-1.5 rounded-md bg-amber-600 px-5 text-sm font-semibold text-white">
              <Pause className="h-4 w-4" /> Pause
            </button>
          )}
          <button onClick={() => reset()} className="inline-flex h-11 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-pine">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button onClick={complete} className="inline-flex h-11 items-center gap-1.5 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white">
            <Square className="h-4 w-4" /> Done - next question
          </button>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {ALERTS.map((a) => (
            <span key={a.at} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${fired.includes(a.at) ? 'bg-emerald-100 text-emerald-800' : 'bg-secondary text-muted-foreground'}`}>
              {a.at}m alert
            </span>
          ))}
        </div>
      </div>

      {doneTimes.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-semibold text-pine">Completed this session</p>
          <div className="mt-2 space-y-1.5">
            {doneTimes.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded bg-secondary/60 px-3 py-1.5 text-sm">
                <span className="truncate">{d.q}</span>
                <span className="ml-2 shrink-0 font-mono font-bold text-pine">{fmt(d.secs)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PaperTimer() {
  const [questions, setQuestions] = useState<string[]>(['', '', '', ''])
  const [phase, setPhase] = useState<'setup' | 'running' | 'done'>('setup')
  const [current, setCurrent] = useState(0)
  const [qLeft, setQLeft] = useState(45 * 60)
  const [totalLeft, setTotalLeft] = useState(3 * 3600)
  const [paused, setPaused] = useState(false)
  const [times, setTimes] = useState<(number | null)[]>([null, null, null, null])
  const qElapsed = useRef(0)
  const QTIME = 45 * 60

  useEffect(() => {
    if (phase !== 'running' || paused) return
    const t = setInterval(() => {
      setQLeft((s) => Math.max(0, s - 1))
      setTotalLeft((s) => Math.max(0, s - 1))
      qElapsed.current += 1
    }, 1000)
    return () => clearInterval(t)
  }, [phase, paused])

  useEffect(() => {
    if (phase === 'running' && totalLeft <= 0) finishPaper()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalLeft])

  function startPaper() {
    setPhase('running')
    setCurrent(0)
    setTimes([null, null, null, null])
    setQLeft(QTIME)
    setTotalLeft(3 * 3600)
    qElapsed.current = 0
    recordActivity({ type: 'timer', label: 'Four-question paper attempt started', path: '/answer-timer' })
  }

  function finishQuestion() {
    setTimes((t) => {
      const n = [...t]
      n[current] = qElapsed.current
      return n
    })
    if (current < 3) {
      setCurrent((c) => c + 1)
      setQLeft(QTIME)
      qElapsed.current = 0
      setPaused(false)
    } else {
      finishPaper([...times.slice(0, 3), qElapsed.current] as number[])
    }
  }

  function finishPaper(finalTimes?: number[]) {
    const t = finalTimes ?? times.map((x, i) => (x ?? (i === current ? qElapsed.current : null)))
    const done = t.filter((x): x is number => x !== null)
    const total = done.reduce((a, b) => a + b, 0)
    saveTimerSession({
      mode: 'paper',
      questions: questions.map((q2, i) => q2 || `Question ${i + 1}`),
      times: t.map((x) => x ?? -1),
      total,
      finished: done.length === 4,
    })
    recordActivity({
      type: 'timer',
      label: `Paper attempt - ${done.length}/4 questions in ${Math.floor(total / 60)}m`,
      path: '/answer-timer',
    })
    setPhase('done')
  }

  if (phase === 'setup') {
    return (
      <div className="rounded-xl border bg-white p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-pine">
          <PenLine className="h-4 w-4" /> Enter your four questions
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Standard paper: 4 questions × 45 minutes recommended, 3 hours total.</p>
        <div className="mt-3 space-y-2">
          {questions.map((q2, i) => (
            <textarea
              key={i}
              value={q2}
              onChange={(e) => setQuestions((qs2) => qs2.map((x, j) => (j === i ? e.target.value : x)))}
              rows={2}
              placeholder={`Question ${i + 1}…`}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
            />
          ))}
        </div>
        <button onClick={startPaper} className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-md bg-pine px-6 text-sm font-semibold text-emerald-50">
          <Play className="h-4 w-4" /> Start paper (3 hours)
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    const done = times.filter((x): x is number => x !== null)
    const total = done.reduce((a, b) => a + b, 0)
    const avg = done.length ? Math.round(total / done.length) : 0
    const longestIdx = done.length ? times.indexOf(Math.max(...done)) : -1
    const fastestIdx = done.length ? times.indexOf(Math.min(...done)) : -1
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Paper attempt complete</p>
          <p className="mt-2 font-display text-4xl font-bold text-pine">{fmt(total)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Total attempt time · {done.length} of 4 questions finished · Average {fmt(avg)} per question
          </p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-semibold text-pine">Time per question</p>
          <div className="mt-3 space-y-2">
            {times.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs font-semibold text-muted-foreground">Question {i + 1}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-secondary">
                  {t !== null && (
                    <div
                      className={`h-full rounded-full ${i === longestIdx ? 'bg-red-400' : i === fastestIdx ? 'bg-emerald-500' : 'bg-emerald-700'}`}
                      style={{ width: `${Math.min(100, (t / (45 * 60)) * 100)}%` }}
                    />
                  )}
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-xs font-bold text-pine">
                  {t !== null ? fmt(t) : 'unfinished'}
                </span>
              </div>
            ))}
          </div>
          {longestIdx >= 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Longest: Question {longestIdx + 1} ({fmt(times[longestIdx]!)}) · Fastest: Question {fastestIdx + 1} ({fmt(times[fastestIdx]!)})
              {times.some((t) => t === null) && ' · Unfinished questions are recorded.'}
            </p>
          )}
        </div>
        <button onClick={() => setPhase('setup')} className="inline-flex h-11 items-center gap-1.5 rounded-md bg-pine px-6 text-sm font-semibold text-emerald-50">
          <Plus className="h-4 w-4" /> New four-question attempt
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Question {current + 1} of 4 {questions[current] ? `- ${questions[current].slice(0, 40)}` : ''}
          </p>
          <p className={`mt-2 font-display text-4xl font-bold tabular-nums ${qLeft < 300 ? 'text-red-600' : 'text-pine'}`}>{fmt(qLeft)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Target: 45 minutes per question</p>
        </div>
        <div className="rounded-xl border bg-white p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Whole paper</p>
          <p className={`mt-2 font-display text-4xl font-bold tabular-nums ${totalLeft < 600 ? 'text-red-600' : 'text-pine'}`}>{fmt(totalLeft)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">3 hours total</p>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={() => setPaused(!paused)} className={`inline-flex h-11 items-center gap-1.5 rounded-md px-5 text-sm font-semibold text-white ${paused ? 'bg-pine' : 'bg-amber-600'}`}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {paused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={finishQuestion} className="inline-flex h-11 items-center gap-1.5 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white">
            <Square className="h-4 w-4" /> {current < 3 ? `Finish Q${current + 1} - start Q${current + 2}` : 'Finish Q4 & end paper'}
          </button>
          <button onClick={() => finishPaper()} className="inline-flex h-11 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-red-600">
            <Trash2 className="h-4 w-4" /> End paper early
          </button>
        </div>
        <div className="mt-4 flex justify-center gap-1.5">
          {times.map((t, i) => (
            <span key={i} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${i === current ? 'bg-pine text-white' : t !== null ? 'bg-emerald-100 text-emerald-800' : 'bg-secondary text-muted-foreground'}`}>
              Q{i + 1}{t !== null ? ` ✓ ${fmt(t)}` : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
