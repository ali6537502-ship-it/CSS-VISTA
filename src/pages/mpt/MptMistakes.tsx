import { useState } from 'react'
import { mptApi, type MptMistake } from '@/lib/mpt/api'
import { copy, mockSlotLabel, pktDate } from '@/lib/mpt/copy'
import { AccountPage } from '@/pages/account/shared'
import { ErrorNote, MptGate, PageSkeleton, secondaryButton, useMptLoad } from './common'

const LETTERS = ['A', 'B', 'C', 'D']

function MistakeItem({ item }: { item: MptMistake }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">{item.section} · {item.title} · {mockSlotLabel(item)} · {pktDate(item.exam_open_at)} · Question {item.p}</p>
      <p className="mt-1 whitespace-pre-line text-base text-slate-950" dir="auto">{item.q}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {item.o.map((option, index) => (
          <li key={index} dir="auto" className={`rounded-lg px-2 py-1.5 ${index === item.correct ? 'bg-emerald-50 font-semibold text-emerald-950' : index === item.selected ? 'bg-amber-50 text-amber-950' : 'text-slate-700'}`}>
            <strong>{LETTERS[index]}.</strong> {option}
            {index === item.correct && <span className="ml-1">— correct answer</span>}
            {index === item.selected && <span className="ml-1">— your answer</span>}
          </li>
        ))}
      </ul>
      {item.explanation && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700" dir="auto">{item.explanation}</p>}
    </li>
  )
}

function Mistakes() {
  const [page, setPage] = useState(1)
  const [subject, setSubject] = useState<string | null>(null)
  const load = useMptLoad((signal) => mptApi.mistakes(page, subject, signal), [page, subject])
  const data = load.data
  if (load.loading && !data) return <PageSkeleton />
  if (load.error && !data) return <ErrorNote error={load.error} onRetry={load.reload} />
  if (!data) return null
  const pages = Math.max(1, Math.ceil(data.total / data.per_page))
  const all = data.subjects.reduce((sum, row) => sum + row.count, 0)
  if (all === 0) return <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">{copy.dashboard.mistakesEmpty}</p>
  return (
    <div className="space-y-5">
      <div role="group" aria-label="Filter by subject" className="flex flex-wrap gap-2">
        {[[null, 'All', all] as const, ...data.subjects.map((row) => [row.subject, row.subject, row.count] as const)].map(([value, label, count]) => (
          <button key={label} type="button" aria-pressed={subject === value} onClick={() => { setSubject(value); setPage(1) }}
            className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${subject === value ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
            {label} · {count}
          </button>
        ))}
      </div>
      <ol className="space-y-3">{data.questions.map((item) => <MistakeItem key={`${item.mock_number}-${item.p}`} item={item} />)}</ol>
      {pages > 1 && (
        <nav aria-label="Wrong answer pages" className="flex items-center justify-between gap-2">
          <button type="button" disabled={page <= 1} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0 }) }} className={`${secondaryButton} disabled:opacity-40`}>Previous</button>
          <span className="text-sm text-slate-600">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0 }) }} className={`${secondaryButton} disabled:opacity-40`}>Next</button>
        </nav>
      )}
    </div>
  )
}

export default function MptMistakes() {
  return (
    <AccountPage title={copy.dashboard.mistakesTitle} intro={copy.dashboard.mistakesIntro}>
      <MptGate><Mistakes /></MptGate>
    </AccountPage>
  )
}
