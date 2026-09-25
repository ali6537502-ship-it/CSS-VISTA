import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { MptMenu } from '@/components/mpt/MptMenu'
import { mptApi } from '@/lib/mpt/api'
import { copy, pktDate } from '@/lib/mpt/copy'
import { AccountPage, SectionTitle } from '@/pages/account/shared'
import { HistoryRows } from './MptArea'
import { ErrorNote, MptGate, PageSkeleton, secondaryButton, useMptLoad } from './common'

const FILTERS: Array<[string | null, string]> = [[null, 'All'], ['completed', 'Completed'], ['upcoming', 'Upcoming'], ['absent', 'Absent'], ['cancelled', 'Cancelled']]

function History() {
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const requested = params.get('status')
  const status = FILTERS.some(([value]) => value === requested) ? requested : null
  const setStatus = (value: string | null) => setParams(value ? { status: value } : {}, { replace: true })
  const load = useMptLoad((signal) => mptApi.history(page, status, signal), [page, status])
  const data = load.data
  const pages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1
  return (
    <div className="space-y-6">
      <MptMenu current={status === 'completed' ? '/account/mpt/history?status=completed' : '/account/mpt/history'} />
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button key={label} type="button" aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1) }}
            className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${status === value ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{label}</button>
        ))}
      </div>
      {load.loading && !data ? <PageSkeleton /> : load.error && !data ? <ErrorNote error={load.error} onRetry={load.reload} /> : data && (
        <>
          {data.rows.length ? <HistoryRows rows={data.rows} /> : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">No MPT Mocks in this view yet.</p>}
          {pages > 1 && (
            <nav aria-label="History pages" className="flex items-center justify-between gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={`${secondaryButton} disabled:opacity-40`}>Previous</button>
              <span className="text-sm text-slate-600">Page {page} of {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className={`${secondaryButton} disabled:opacity-40`}>Next</button>
            </nav>
          )}
          {data.legacy.length > 0 && (
            <section className="space-y-3">
              <SectionTitle>{copy.dashboard.legacy}</SectionTitle>
              <p className="text-sm text-slate-600">{copy.dashboard.legacyNote}</p>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {data.legacy.map((row) => (
                  <li key={`${row.completed_at}-${row.title}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span><span className="font-semibold text-slate-900">{row.title}</span> <span className="text-slate-500">· {pktDate(row.completed_at)}</span></span>
                    <span className="tabular-nums text-slate-700">{row.score} / {row.total} <span className="text-xs text-slate-500">(self-scored)</span></span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default function MptHistory() {
  const [params] = useSearchParams()
  const results = params.get('status') === 'completed'
  return (
    <AccountPage title={results ? 'My MPT Results' : 'My MPT Applications'}
      intro={results ? 'Every MPT Mock you completed, with its official score. Open one to see its result card.' : 'Every MPT Mock you applied for, with its Roll Number, status and official score.'}>
      <MptGate><History key={params.get('status') ?? 'all'} /></MptGate>
    </AccountPage>
  )
}
