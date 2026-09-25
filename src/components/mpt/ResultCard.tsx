import type { MptMock, MptResult } from '@/lib/mpt/api'
import { copy, mockSlot, mockSlotLabel, mockTimeWindow, pktDate } from '@/lib/mpt/copy'
import { formatRollNumber } from '@/lib/mpt/rollNumber'

const num = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2))

/**
 * The student's MPT Mock result card: CSS Vista identity, candidate, mock date
 * and time, score and a congratulation line. Printable / savable as PDF through
 * the scoped `.mpt-print-root` print stylesheet. Every value is the server's.
 */
export function ResultCard({ mock, result, candidate, rollNumber, applicationCode }: {
  mock: MptMock
  result: MptResult
  candidate: { name: string; candidate_code: string | null }
  rollNumber: string | null
  applicationCode: string
}) {
  const startedAt = result.mock_started_at ?? mock.exam_open_at
  return (
    <section aria-labelledby="result-card-title" className="overflow-hidden rounded-3xl border-2 border-emerald-900/20 bg-white shadow-sm print:shadow-none">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-amber-500 bg-emerald-950 px-5 py-4 text-white sm:px-7">
        <img src="/images/logo.webp?v=20260909" alt="CSS Vista" width="480" height="157" className="h-10 w-auto rounded-md bg-white px-2 py-1 object-contain" />
        <div className="text-right">
          <p id="result-card-title" className="text-sm font-extrabold tracking-[.18em]">{copy.result.card}</p>
          <p className="text-xs text-emerald-100">{mock.title}</p>
          <p className="text-xs font-bold text-amber-200">{mockSlotLabel(mock)}</p>
        </div>
      </header>

      <div className="grid gap-6 px-5 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-7">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Candidate</dt><dd className="break-words font-bold text-slate-950">{candidate.name}</dd>
          {candidate.candidate_code && <><dt className="text-slate-500">Candidate ID</dt><dd className="font-mono font-semibold">{candidate.candidate_code}</dd></>}
          <dt className="text-slate-500">Roll Number</dt><dd className="font-mono font-semibold">{rollNumber ? formatRollNumber(rollNumber) : '—'}</dd>
          <dt className="text-slate-500">Application ID</dt><dd className="break-all font-mono text-xs font-semibold">{applicationCode}</dd>
          <dt className="text-slate-500">Mock date</dt><dd className="font-semibold">{pktDate(startedAt)}</dd>
          <dt className="text-slate-500">Mock</dt><dd className="font-semibold">{mockSlot(mock.exam_open_at)} MPT Mock</dd>
          <dt className="text-slate-500">Mock time</dt><dd className="font-semibold">{mockTimeWindow({ exam_open_at: startedAt, exam_end_at: mock.exam_end_at })}</dd>
        </dl>
        <div className="rounded-2xl border border-emerald-900/15 bg-emerald-50 px-6 py-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-900">Score</p>
          <p className="mt-1 text-5xl font-extrabold tabular-nums text-slate-950">{num(result.score)}</p>
          <p className="text-sm font-semibold text-slate-600">out of {num(result.total_marks)}</p>
          <p className="mt-1 text-lg font-bold text-emerald-900">{num(result.percentage)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-y border-slate-100 bg-slate-100 sm:grid-cols-4">
        {[['Correct', result.correct], ['Incorrect', result.incorrect], ['Unattempted', result.unanswered], ['Accuracy', result.accuracy === null ? '—' : `${num(result.accuracy)}%`]].map(([label, value]) => (
          <div key={String(label)} className="bg-white px-4 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-slate-500">{label}</p>
            <p className="text-xl font-bold tabular-nums text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1 px-5 py-5 text-center sm:px-7">
        {result.rank && <p className="text-sm font-semibold text-slate-800">Rank {result.rank.position} of {result.rank.candidates} · {num(result.rank.percentile)} percentile</p>}
        {result.passed !== null && <p className="text-sm font-semibold">{result.passed ? 'Passed' : 'Not passed'} (pass mark {mock.pass_percentage}%)</p>}
        <p className="text-lg font-bold text-emerald-900">{copy.result.congrats(mock.mock_number)}</p>
        <p className="text-sm text-slate-600">{copy.result.keepGoing}</p>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-500 sm:px-7">
        <span>{copy.result.verifiedNote}</span>
        <span>www.css-vista.com</span>
      </footer>
    </section>
  )
}
