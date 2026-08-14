import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, Clock, Flag, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import type { Question } from '@/data/quiz'
import { recordQuizResult, toggleBookmark, isBookmarked } from '@/lib/store'
import { Badge } from './shared'
import { isRtlText } from '@/lib/utils'
import { recordQuestionTiming } from '@/lib/progress'

interface Props {
  questions: Question[]
  mode: 'mpt' | 'game' | 'quiz' | 'challenge'
  category: string
  timePerQuestion?: number // seconds; 0 = untimed
  negativeMarking?: boolean
  onDone?: (score: number, total: number) => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuizEngine({ questions, mode, category, timePerQuestion = 0, negativeMarking = false, onDone }: Props) {
  const [qs, setQs] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [bookmarked, setBookmarked] = useState<Record<number, boolean>>({})
  const [retryWrong, setRetryWrong] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const questionStartedAtRef = useRef(Date.now())

  const totalTime = timePerQuestion * qs.length

  useEffect(() => {
    setQs(shuffle(questions))
    const bm: Record<number, boolean> = {}
    questions.forEach((q) => (bm[q.id] = isBookmarked(`q-${q.id}`)))
    setBookmarked(bm)
  }, [questions])

  useEffect(() => {
    if (started && !finished) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  }, [started, finished])

  useEffect(() => {
    questionStartedAtRef.current = Date.now()
  }, [idx, started, finished])

  useEffect(() => {
    if (started && totalTime > 0 && seconds >= totalTime && !finished) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds])

  const wrongQuestions = useMemo(
    () => qs.filter((q) => answers[q.id] !== undefined && answers[q.id] !== q.answer),
    [qs, answers]
  )

  function start(onlyWrong = false) {
    const base = onlyWrong ? wrongQuestions : questions
    setQs(shuffle(base))
    setAnswers({})
    setIdx(0)
    setSeconds(0)
    setFinished(false)
    setStarted(true)
    setRetryWrong(onlyWrong)
    questionStartedAtRef.current = Date.now()
  }

  function chooseAnswer(q: Question, optionIndex: number) {
    if (answers[q.id] === undefined) {
      recordQuestionTiming({
        questionId: `q-${q.id}`,
        category,
        mode,
        seconds: Math.max(1, Math.round((Date.now() - questionStartedAtRef.current) / 1000)),
        correct: optionIndex === q.answer,
      })
    }
    setAnswers((current) => ({ ...current, [q.id]: optionIndex }))
  }

  function finish() {
    setFinished(true)
    if (timerRef.current) clearInterval(timerRef.current)
    const score = computeScore()
    recordQuizResult({
      type: mode,
      category: retryWrong ? `${category} (retry)` : category,
      score: score.correct,
      total: qs.length,
      wrongTopics: wrongQuestions.map((q) => q.category),
    })
    onDone?.(score.correct, qs.length)
  }

  function computeScore() {
    let correct = 0, wrong = 0
    for (const q of qs) {
      if (answers[q.id] === q.answer) correct++
      else if (answers[q.id] !== undefined) wrong++
    }
    const final = negativeMarking ? Math.max(0, correct - wrong * 0.25) : correct
    return { correct, wrong, final: Math.round(final * 100) / 100 }
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ---------- Screens ----------
  if (!started) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <h3 className="font-display text-lg font-bold text-pine">{category}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {qs.length} questions{totalTime > 0 ? ` · ${fmt(totalTime)} total` : ' · untimed'}
          {negativeMarking ? ' · −0.25 per wrong answer' : ''}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Correct answers are shown after submission. Your score is saved locally.</p>
        <button onClick={() => start()} className="mt-4 h-11 rounded-md bg-pine px-6 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-900">
          Start test
        </button>
      </div>
    )
  }

  if (finished) {
    const score = computeScore()
    const pct = qs.length ? Math.round((score.correct / qs.length) * 100) : 0
    return (
      <div className="space-y-5">
        <div className="rounded-lg border bg-white p-6 text-center">
          <div className="font-display text-4xl font-bold text-pine">{score.final}<span className="text-xl text-muted-foreground">/{qs.length}</span></div>
          <p className="mt-1 text-sm text-muted-foreground">
            {score.correct} correct · {score.wrong} wrong · {qs.length - score.correct - score.wrong} skipped · {pct}% · Time {fmt(seconds)}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => start()} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
              <RotateCcw className="h-4 w-4" /> New attempt
            </button>
            {wrongQuestions.length > 0 && (
              <button onClick={() => start(true)} className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary">
                <Flag className="h-4 w-4" /> Retry {wrongQuestions.length} wrong
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-pine">Review answers</h4>
          {qs.map((q, i) => {
            const given = answers[q.id]
            const ok = given === q.answer
            const rtl = isRtlText(q.question)
            return (
              <div key={q.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start gap-2">
                  {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
                  <div className="flex-1">
                    <p
                      dir={rtl ? 'rtl' : undefined}
                      lang={rtl ? 'ur' : undefined}
                      className={`text-sm font-medium text-foreground ${rtl ? 'urdu-text text-right' : ''}`}
                    >
                      {i + 1}. {q.question}
                    </p>
                    <div className="mt-2 grid gap-1.5">
                      {q.options.map((o, oi) => {
                        const optionRtl = isRtlText(o)
                        return (
                          <div
                            key={oi}
                            dir={optionRtl ? 'rtl' : undefined}
                            lang={optionRtl ? 'ur' : undefined}
                            className={`rounded px-2.5 py-1.5 text-[13px] ${optionRtl ? 'urdu-text text-right' : ''} ${
                              oi === q.answer ? 'bg-emerald-100 font-medium text-emerald-900' : oi === given ? 'bg-red-100 text-red-900' : 'bg-secondary/60 text-muted-foreground'
                            }`}
                          >
                            {o}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const q = qs[idx]
  const rtl = isRtlText(q.question)
  const remaining = totalTime > 0 ? totalTime - seconds : null
  const questionElapsed = Math.max(0, Math.round((Date.now() - questionStartedAtRef.current) / 1000))

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <span className="text-sm font-semibold text-pine">Question {idx + 1} of {qs.length}</span>
        <Badge tone="gray">{q.difficulty}</Badge>
        <div className="ml-auto flex items-center gap-3">
          <button
            aria-label="Bookmark question"
            onClick={() => {
              const now = toggleBookmark(`q-${q.id}`)
              setBookmarked((b) => ({ ...b, [q.id]: now }))
            }}
            className="rounded p-1 hover:bg-secondary"
          >
            {bookmarked[q.id] ? <BookmarkCheck className="h-4 w-4 text-emerald-800" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
          </button>
          <span className={`inline-flex items-center gap-1 text-sm font-medium ${remaining !== null && remaining < 60 ? 'text-red-600' : 'text-muted-foreground'}`}>
            <Clock className="h-4 w-4" /> {remaining !== null ? fmt(remaining) : fmt(seconds)}
          </span>
          <span className="rounded bg-secondary px-2 py-1 font-mono text-[11px] font-semibold text-pine" title="Time spent on this question">
            Q {fmt(questionElapsed)}
          </span>
        </div>
      </div>

      <div className="p-5">
        <p
          dir={rtl ? 'rtl' : undefined}
          lang={rtl ? 'ur' : undefined}
          className={`text-[15px] font-medium leading-relaxed ${rtl ? 'urdu-text text-right' : ''}`}
        >
          {q.question}
        </p>
        <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Answer options">
          {q.options.map((o, oi) => {
            const optionRtl = isRtlText(o)
            const selected = answers[q.id] === oi
            return (
              <button
                key={oi}
                dir={optionRtl ? 'rtl' : undefined}
                lang={optionRtl ? 'ur' : undefined}
                role="radio"
                aria-checked={selected}
                onClick={() => chooseAnswer(q, oi)}
                className={`rounded-md border px-4 py-3 text-sm transition-all duration-150 ${optionRtl ? 'text-right' : 'text-left'} ${
                  selected ? 'border-emerald-700 bg-emerald-50 font-medium text-emerald-900' : 'hover:border-emerald-800/40 hover:bg-secondary/60'
                }`}
              >
                <span className="mr-2 font-semibold text-muted-foreground">{String.fromCharCode(65 + oi)}.</span>{' '}
                <span className={optionRtl ? 'urdu-text' : undefined}>{o}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-40"
        >
          Previous
        </button>
        <div className="hidden gap-1 sm:flex" aria-label="Question navigation">
          {qs.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setIdx(i)}
              aria-label={`Go to question ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${i === idx ? 'bg-pine' : answers[qq.id] !== undefined ? 'bg-emerald-400' : 'bg-border'}`}
            />
          ))}
        </div>
        {idx === qs.length - 1 ? (
          <button onClick={finish} className="rounded-md bg-pine px-5 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
            Submit test
          </button>
        ) : (
          <button onClick={() => setIdx((i) => Math.min(qs.length - 1, i + 1))} className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
            Next
          </button>
        )}
      </div>
    </div>
  )
}
