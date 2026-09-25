import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { mptApi, type MptReviewQuestion } from '@/lib/mpt/api'
import { copy, pktDate, pktDateTime } from '@/lib/mpt/copy'
import { formatRollNumber } from '@/lib/mpt/rollNumber'
import { useBoundary, useServerClock } from '@/lib/mpt/useServerClock'
import { AccountPage } from '@/pages/account/shared'
import { StatusBadge } from '@/components/mpt/StatusBadge'
import { DetailList, ErrorNote, MptGate, PageSkeleton, primaryButton, secondaryButton, useMptLoad } from './common'

const LETTERS = ['A', 'B', 'C', 'D']

function duration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m ${seconds % 60}s`
}
const num = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2))

function Review({ code }: { code: string }) {
  const load = useMptLoad((signal) => mptApi.review(code, signal), [code])
  if (load.loading && !load.data) return <PageSkeleton />
  if (load.error) return <ErrorNote error={load.error} />
  return (
    <ol className="space-y-3">
      {(load.data?.questions ?? []).map((question: MptReviewQuestion) => (
        <li key={question.p} className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">{question.section} · Question {question.p} · {question.selected === null ? 'Unattempted' : question.selected === question.correct ? 'Correct' : 'Incorrect'}</p>
          <p className="mt-1 whitespace-pre-line text-base text-slate-950" dir="auto">{question.q}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {question.o.map((option, index) => (
              <li key={index} dir="auto" className={`rounded-lg px-2 py-1.5 ${index === question.correct ? 'bg-emerald-50 font-semibold text-emerald-950' : index === question.selected ? 'bg-amber-50 text-amber-950' : 'text-slate-700'}`}>
                <strong>{LETTERS[index]}.</strong> {option}
                {index === question.correct && ' — correct answer'}
                {index === question.selected && index !== question.correct && ' — your answer'}
              </li>
            ))}
          </ul>
          {question.explanation && <p className="mt-2 text-sm text-slate-600" dir="auto">{question.explanation}</p>}
        </li>
      ))}
    </ol>
  )
}

function ResultScreen({ code }: { code: string }) {
  const load = useMptLoad((signal) => mptApi.result(code, signal), [code])
  const now = useServerClock(5000)
  const [showReview, setShowReview] = useState(false)
  const reload = load.reload
  const refresh = useCallback(() => reload(), [reload])
  useBoundary(load.data?.state.next_transition_at, now, refresh)

  if (load.loading && !load.data) return <PageSkeleton />
  if (load.error && !load.data) return <ErrorNote error={load.error} onRetry={load.reload} />
  const data = load.data
  if (!data) return null
  const { mock, result, application, candidate } = data
  if (!result) {
    return (
      <div className="space-y-4">
        <StatusBadge phase={data.state.phase} />
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {data.submission?.result_available_at ? copy.result.pending(pktDateTime(data.submission.result_available_at)) : 'Your result is not available yet.'}
        </p>
        <Link to={`/account/mpt/applications/${application.application_code}`} className={secondaryButton}>View Application</Link>
      </div>
    )
  }
  const attempted = result.correct + result.incorrect
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-900/15 bg-white p-5 sm:p-6" aria-labelledby="score-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge phase={data.state.phase} />
          {result.submit_reason !== 'MANUAL' && <span className="text-xs font-semibold text-slate-500">Submitted automatically when time ended</span>}
        </div>
        <h2 id="score-heading" className="mt-3 text-sm font-semibold uppercase tracking-[.14em] text-slate-500">Score</h2>
        <p className="mt-1 text-5xl font-bold tabular-nums text-slate-950">{num(result.score)}<span className="text-2xl text-slate-400"> / {num(result.total_marks)}</span></p>
        <p className="mt-1 text-lg font-semibold text-emerald-900">{num(result.percentage)}%</p>
        {result.passed !== null && <p className="mt-2 text-sm font-semibold">{result.passed ? 'Passed' : 'Not passed'} (pass mark {mock.pass_percentage}%)</p>}
        {result.rank && <p className="mt-2 text-sm text-slate-700">Rank <strong>{result.rank.position}</strong> of {result.rank.candidates} · {num(result.rank.percentile)} percentile</p>}
        {result.previous_average_percentage !== null && (
          <p className="mt-2 text-sm text-slate-700">Your previous average: <strong>{num(result.previous_average_percentage)}%</strong> ({result.percentage >= result.previous_average_percentage ? '+' : ''}{num(result.percentage - result.previous_average_percentage)} points)</p>
        )}
        {result.rescored_at && <p className="mt-3 text-xs text-slate-500">{copy.result.rescored(pktDate(result.rescored_at))}</p>}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Correct', result.correct], ['Incorrect', result.incorrect], ['Unattempted', result.unanswered], ['Accuracy', result.accuracy === null ? '—' : `${num(result.accuracy)}%`]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">Accuracy = correct ÷ attempted ({result.correct} ÷ {attempted}).</p>

      <DetailList rows={[
        ['Candidate', candidate.name],
        ['Roll Number', application.roll_number ? <span className="font-mono">{formatRollNumber(application.roll_number)}</span> : '—'],
        ['Application ID', <span className="font-mono">{application.application_code}</span>],
        ['Mock', mock.title],
        ['Date', pktDate(mock.exam_open_at)],
        ['Time taken', duration(result.time_taken_seconds)],
      ]} />

      {result.subjects.length > 0 && (
        <section aria-labelledby="subject-heading">
          <h3 id="subject-heading" className="mb-2 text-sm font-semibold uppercase tracking-[.14em] text-slate-500">Subject-wise</h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[.08em] text-slate-500">
                <tr><th scope="col" className="px-3 py-2">Subject</th><th scope="col" className="px-3 py-2">Score</th><th scope="col" className="px-3 py-2">Correct</th><th scope="col" className="px-3 py-2">Incorrect</th><th scope="col" className="px-3 py-2">Accuracy</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.subjects.map((subject) => (
                  <tr key={subject.subject}>
                    <th scope="row" className="px-3 py-2 font-semibold text-slate-900">{subject.subject}</th>
                    <td className="px-3 py-2 tabular-nums">{num(subject.score)} / {subject.questions}</td>
                    <td className="px-3 py-2 tabular-nums">{subject.correct}</td>
                    <td className="px-3 py-2 tabular-nums">{subject.incorrect}</td>
                    <td className="px-3 py-2 tabular-nums">{subject.accuracy === null ? '—' : `${num(subject.accuracy)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!result.review_available && result.review_available_at && <p className="text-sm text-slate-600">{copy.result.reviewAt(pktDateTime(result.review_available_at))}</p>}
      <div className="flex flex-wrap gap-2">
        <Link to="/account/mpt/performance" className={primaryButton}>{copy.result.viewPerformance}</Link>
        <Link to="/account/mpt" className={secondaryButton}>{copy.result.back}</Link>
        {result.review_available && <button type="button" onClick={() => setShowReview((open) => !open)} aria-expanded={showReview} className={secondaryButton}>{copy.result.review}</button>}
      </div>
      {showReview && <Review code={code} />}
    </div>
  )
}

export default function MptResult() {
  const { code = '' } = useParams()
  return (
    <AccountPage title={copy.result.title} intro="Your official, server-scored result.">
      <MptGate><ResultScreen code={code} /></MptGate>
    </AccountPage>
  )
}

