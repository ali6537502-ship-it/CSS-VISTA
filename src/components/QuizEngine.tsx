import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, Clock, Flag, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import type { Question } from '@/data/quiz'
import { recordQuizResult, toggleBookmark, isBookmarked } from '@/lib/store'
import { Badge } from './shared'
import { isRtlText } from '@/lib/utils'
import { recordQuestionTiming } from '@/lib/progress'
import QuestionPagination from '@/components/QuestionPagination'
import { QUESTIONS_PER_PAGE, questionPageForIndex, questionPageRange } from '@/lib/questionPagination'
import { usePageBack } from '@/lib/backNavigation'

interface Props {
  questions: Question[]
  mode: 'mpt' | 'game' | 'quiz' | 'challenge'
  category: string
  timePerQuestion?: number
  negativeMarking?: boolean
  onDone?: (score: number, total: number) => void
  onNewRound?: () => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const fmt = (seconds: number) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`

export default function QuizEngine({ questions, mode, category, timePerQuestion = 0, negativeMarking = false, onDone, onNewRound }: Props) {
  const [qs, setQs] = useState<Question[]>([])
  const [page, setPage] = useState(1)
  const [reviewPage, setReviewPage] = useState(1)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [bookmarked, setBookmarked] = useState<Record<number, boolean>>({})
  const [retryWrong, setRetryWrong] = useState(false)
  const testStartedAtRef = useRef<number | null>(null)
  const questionStartedAtRef = useRef<Record<number, number>>({})
  const totalTime = timePerQuestion * qs.length
  const range = questionPageRange(page, qs.length)
  const pageQuestions = useMemo(() => qs.slice(range.start, range.end), [qs, range.end, range.start])
  const answeredCount = Object.keys(answers).length

  usePageBack(
    (started && !finished && page > 1) || (finished && reviewPage > 1),
    () => {
      if (finished) setReviewPage((current) => Math.max(1, current - 1))
      else setPage((current) => Math.max(1, current - 1))
    },
    10,
  )

  useEffect(() => {
    setQs(shuffle(questions))
    const saved: Record<number, boolean> = {}
    questions.forEach((question) => { saved[question.id] = isBookmarked(`q-${question.id}`) })
    setBookmarked(saved)
  }, [questions])

  useEffect(() => {
    if (!started || finished) return
    const updateElapsed = () => {
      const beganAt = testStartedAtRef.current
      if (beganAt === null) return
      const elapsed = Math.max(0, Math.floor((Date.now() - beganAt) / 1000))
      setSeconds((current) => current === elapsed ? current : elapsed)
    }
    updateElapsed()
    const interval = window.setInterval(updateElapsed, 250)
    document.addEventListener('visibilitychange', updateElapsed)
    window.addEventListener('pageshow', updateElapsed)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', updateElapsed)
      window.removeEventListener('pageshow', updateElapsed)
    }
  }, [started, finished])

  useEffect(() => {
    if (!started || finished) return
    const now = Date.now()
    pageQuestions.forEach((question) => {
      if (!questionStartedAtRef.current[question.id]) questionStartedAtRef.current[question.id] = now
    })
  }, [finished, pageQuestions, started])

  useEffect(() => {
    if (started && totalTime > 0 && seconds >= totalTime && !finished) finish()
    // finish intentionally follows the latest timer tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds])

  const wrongQuestions = useMemo(
    () => qs.filter((question) => answers[question.id] !== undefined && answers[question.id] !== question.answer),
    [answers, qs],
  )

  function start(onlyWrong = false) {
    const base = onlyWrong ? wrongQuestions : questions
    const next = shuffle(base)
    setQs(next)
    setAnswers({})
    setPage(1)
    setReviewPage(1)
    setSeconds(0)
    setFinished(false)
    setStarted(true)
    setRetryWrong(onlyWrong)
    testStartedAtRef.current = Date.now()
    questionStartedAtRef.current = {}
    const now = Date.now()
    next.slice(0, QUESTIONS_PER_PAGE).forEach((question) => { questionStartedAtRef.current[question.id] = now })
  }

  function chooseAnswer(question: Question, optionIndex: number) {
    if (answers[question.id] === undefined) {
      const beganAt = questionStartedAtRef.current[question.id] ?? Date.now()
      recordQuestionTiming({
        questionId: `q-${question.id}`,
        category,
        mode,
        seconds: Math.max(1, Math.round((Date.now() - beganAt) / 1000)),
        correct: optionIndex === question.answer,
      })
    }
    setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
  }

  function computeScore() {
    let correct = 0
    let wrong = 0
    for (const question of qs) {
      if (answers[question.id] === question.answer) correct += 1
      else if (answers[question.id] !== undefined) wrong += 1
    }
    const final = negativeMarking ? Math.max(0, correct - wrong * 0.25) : correct
    return { correct, wrong, final: Math.round(final * 100) / 100 }
  }

  function finish() {
    const elapsed = testStartedAtRef.current === null
      ? seconds
      : Math.max(0, Math.floor((Date.now() - testStartedAtRef.current) / 1000))
    setSeconds(elapsed)
    setFinished(true)
    setReviewPage(1)
    const score = computeScore()
    recordQuizResult({
      type: mode,
      category: retryWrong ? `${category} (retry)` : category,
      score: score.correct,
      total: qs.length,
      wrongTopics: wrongQuestions.map((question) => question.category),
    })
    onDone?.(score.correct, qs.length)
  }

  function goToPage(nextPage: number) {
    setPage(nextPage)
    window.requestAnimationFrame(() => document.getElementById('quiz-question-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function goToQuestion(index: number) {
    const nextPage = questionPageForIndex(index)
    setPage(nextPage)
    window.setTimeout(() => document.getElementById(`quiz-question-${index + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }

  if (!started) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <h3 className="font-display text-lg font-bold text-pine">{category}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {qs.length} questions · {Math.max(1, Math.ceil(qs.length / QUESTIONS_PER_PAGE))} page{qs.length > QUESTIONS_PER_PAGE ? 's' : ''}{totalTime > 0 ? ` · ${fmt(totalTime)} total` : ' · untimed'}
          {negativeMarking ? ' · −0.25 per wrong answer' : ''}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Ten questions appear per page. Correct answers are shown after submission and your score is saved locally.</p>
        <button onClick={() => start()} className="mt-4 h-11 rounded-md bg-pine px-6 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-900">Start test</button>
      </div>
    )
  }

  if (finished) {
    const score = computeScore()
    const pct = qs.length ? Math.round((score.correct / qs.length) * 100) : 0
    const reviewRange = questionPageRange(reviewPage, qs.length)
    const reviewQuestions = qs.slice(reviewRange.start, reviewRange.end)
    return (
      <div className="space-y-5">
        <div className="rounded-lg border bg-white p-6 text-center">
          <div className="font-display text-4xl font-bold text-pine">{score.final}<span className="text-xl text-muted-foreground">/{qs.length}</span></div>
          <p className="mt-1 text-sm text-muted-foreground">{score.correct} correct · {score.wrong} wrong · {qs.length - score.correct - score.wrong} skipped · {pct}% · Time {fmt(seconds)}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => start()} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"><RotateCcw className="h-4 w-4" /> New attempt</button>
            {onNewRound && <button onClick={onNewRound} className="inline-flex items-center gap-1.5 rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"><RotateCcw className="h-4 w-4" /> Next fresh question round</button>}
            {wrongQuestions.length > 0 && <button onClick={() => start(true)} className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary"><Flag className="h-4 w-4" /> Retry {wrongQuestions.length} wrong</button>}
          </div>
        </div>

        <section className="space-y-3" aria-labelledby="quiz-review-heading">
          <h4 id="quiz-review-heading" className="font-semibold text-pine">Review answers</h4>
          {reviewQuestions.map((question, index) => {
            const given = answers[question.id]
            const ok = given === question.answer
            const rtl = isRtlText(question.question)
            return (
              <div key={question.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start gap-2">
                  {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
                  <div className="flex-1">
                    <p dir={rtl ? 'rtl' : undefined} lang={rtl ? 'ur' : undefined} className={`text-sm font-medium text-foreground ${rtl ? 'urdu-text text-right' : ''}`}>{reviewRange.start + index + 1}. {question.question}</p>
                    <div className="mt-2 grid gap-1.5">
                      {question.options.map((option, optionIndex) => {
                        const optionRtl = isRtlText(option)
                        return <div key={optionIndex} dir={optionRtl ? 'rtl' : undefined} lang={optionRtl ? 'ur' : undefined} className={`rounded px-2.5 py-1.5 text-[13px] ${optionRtl ? 'urdu-text text-right' : ''} ${optionIndex === question.answer ? 'bg-emerald-100 font-medium text-emerald-900' : optionIndex === given ? 'bg-red-100 text-red-900' : 'bg-secondary/60 text-muted-foreground'}`}>{option}</div>
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <QuestionPagination currentPage={reviewPage} totalItems={qs.length} onPageChange={setReviewPage} className="pt-3" />
        </section>
      </div>
    )
  }

  const remaining = totalTime > 0 ? totalTime - seconds : null
  return (
    <div className="space-y-4">
      <section className="sticky top-14 z-20 rounded-lg border bg-white/95 p-3 shadow-sm backdrop-blur" aria-label="Test progress">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-pine">Questions {range.start + 1}–{range.end} of {qs.length}</span>
          <span className="text-xs font-medium text-muted-foreground">{answeredCount} answered · {qs.length - answeredCount} remaining</span>
          <span className={`ml-auto inline-flex items-center gap-1 text-sm font-bold ${remaining !== null && remaining < 60 ? 'text-red-600' : 'text-pine'}`}><Clock className="h-4 w-4" /> {remaining !== null ? fmt(remaining) : fmt(seconds)}</span>
        </div>
      </section>

      <div id="quiz-question-list" className="scroll-mt-32 space-y-4">
        {pageQuestions.map((question, index) => {
          const questionNumber = range.start + index + 1
          const rtl = isRtlText(question.question)
          return (
            <article key={question.id} id={`quiz-question-${questionNumber}`} className="scroll-mt-32 rounded-lg border bg-white">
              <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                <span className="text-sm font-semibold text-pine">Question {questionNumber}</span>
                <Badge tone="gray">{question.difficulty}</Badge>
                <button aria-label={`Bookmark question ${questionNumber}`} onClick={() => { const saved = toggleBookmark(`q-${question.id}`); setBookmarked((current) => ({ ...current, [question.id]: saved })) }} className="ml-auto rounded p-1 hover:bg-secondary">
                  {bookmarked[question.id] ? <BookmarkCheck className="h-4 w-4 text-emerald-800" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
              <div className="p-4 sm:p-5">
                <p dir={rtl ? 'rtl' : undefined} lang={rtl ? 'ur' : undefined} className={`text-[15px] font-medium leading-relaxed ${rtl ? 'urdu-text text-right' : ''}`}>{question.question}</p>
                <div className="mt-4 grid gap-2" role="radiogroup" aria-label={`Answer options for question ${questionNumber}`}>
                  {question.options.map((option, optionIndex) => {
                    const optionRtl = isRtlText(option)
                    const selected = answers[question.id] === optionIndex
                    return <button key={optionIndex} dir={optionRtl ? 'rtl' : undefined} lang={optionRtl ? 'ur' : undefined} role="radio" aria-checked={selected} onClick={() => chooseAnswer(question, optionIndex)} className={`rounded-md border px-4 py-3 text-sm transition-all duration-150 ${optionRtl ? 'text-right' : 'text-left'} ${selected ? 'border-emerald-700 bg-emerald-50 font-medium text-emerald-900' : 'hover:border-emerald-800/40 hover:bg-secondary/60'}`}><span className="mr-2 font-semibold text-muted-foreground">{String.fromCharCode(65 + optionIndex)}.</span> <span className={optionRtl ? 'urdu-text' : undefined}>{option}</span></button>
                  })}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <QuestionPagination currentPage={page} totalItems={qs.length} onPageChange={goToPage} />

      <section className="no-print rounded-lg border bg-white p-3" aria-label="Question navigator">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold uppercase tracking-wide text-pine">Question navigator</h3><span className="text-[11px] text-muted-foreground">Answered questions are green; bookmarks have a ring.</span></div>
        <div className="flex flex-wrap gap-1.5">
          {qs.map((question, index) => {
            const number = index + 1
            const onCurrentPage = questionPageForIndex(index) === page
            return <button key={question.id} type="button" onClick={() => goToQuestion(index)} aria-label={`Go to question ${number}`} className={`grid h-9 min-w-9 place-items-center rounded-md border px-1 text-xs font-bold ${answers[question.id] !== undefined ? 'border-emerald-600 bg-emerald-100 text-emerald-900' : onCurrentPage ? 'border-pine bg-secondary text-pine' : 'bg-white text-muted-foreground'} ${bookmarked[question.id] ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}>{number}</button>
          })}
        </div>
      </section>

      <div className="flex justify-end"><button onClick={finish} className="min-h-11 rounded-md bg-pine px-5 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">Submit test</button></div>
    </div>
  )
}
