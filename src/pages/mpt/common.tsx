import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { HostingerApiError } from '@/lib/hostingerApi'
import { mptApi, type MptMock } from '@/lib/mpt/api'
import { copy, mockSlotLabel, mockTimeWindow, pktDate, pktTime } from '@/lib/mpt/copy'

export type Loadable<T> = { data: T | null; error: HostingerApiError | null; loading: boolean; reload: () => void }

/** Fetch with abort, a visible error, and a reload that keeps the old data on screen. */
export function useMptLoad<T>(loader: (signal: AbortSignal) => Promise<T>, deps: unknown[]): Loadable<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<HostingerApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    loaderRef.current(controller.signal)
      .then((value) => { setData(value); setError(null) })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setError(reason instanceof HostingerApiError ? reason : new HostingerApiError(copy.errors.generic, 0))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { data, error, loading, reload }
}

/** Renders children only when the MPT application flow is enabled for this account. */
export function MptGate({ children }: { children: ReactNode }) {
  const config = useMptLoad((signal) => mptApi.config(signal), [])
  if (config.loading && !config.data) return <PageSkeleton />
  if (!config.data?.enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
        <p className="text-base font-semibold text-slate-800">{copy.errors.notEnabled}</p>
        <Link to="/mpt" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-800">CSS MPT preparation</Link>
      </div>
    )
  }
  return <>{children}</>
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  )
}

export function ErrorNote({ error, onRetry }: { error: HostingerApiError; onRetry?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.focus() }, [error])
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 outline-none">
      <p className="font-semibold">{error.message || copy.errors.generic}</p>
      {onRetry && error.status !== 404 && (
        <button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-amber-400 bg-white px-4 font-semibold">Try again</button>
      )}
    </div>
  )
}

export function DetailList({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-4 py-3 text-sm">
          <dt className="text-slate-500">{label}</dt>
          <dd className="break-words font-semibold text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function examDetailRows(mock: MptMock): Array<[string, ReactNode]> {
  return [
    ['Mock', mock.title],
    ['Sitting', mockSlotLabel(mock)],
    ['Date', pktDate(mock.exam_open_at)],
    ['Exam time', mockTimeWindow(mock)],
    ['Duration', `${mock.duration_minutes} minutes`],
    ['Questions', `${mock.total_questions} MCQs`],
    ['Fee', copy.apply.fee],
    ['Applications close', 'When the exam starts'],
    ['Late entry until', `${pktTime(mock.entry_close_at)} (with the time left)`],
    ['Result card', `${pktTime(new Date(Date.parse(mock.exam_end_at) + (mock.results_delay_minutes ?? 30) * 60_000).toISOString())}`],
  ]
}

/** .ics for the exam start (Add to Calendar). */
export function downloadCalendar(mock: MptMock) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CSS Vista//MPT Mock//EN', 'BEGIN:VEVENT',
    `UID:${mock.slug}@css-vista.com`, `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(mock.exam_open_at)}`, `DTEND:${stamp(mock.exam_end_at)}`,
    `SUMMARY:${mock.title} · ${mockSlotLabel(mock)} (CSS Vista)`,
    `DESCRIPTION:The exam starts at ${pktTime(mock.exam_open_at)}. Open My CSS Vista and press Enter Exam.`,
    'URL:https://www.css-vista.com/account/mpt', 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${mock.slug}.ics`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const primaryButton = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-base font-bold text-white hover:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-50'
export const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-emerald-700 hover:text-emerald-800'

/** Sticky bottom action area that sits above the site's mobile bottom navigation (62px + safe area, below md). */
export const aboveMobileNav = 'bottom-[calc(62px+env(safe-area-inset-bottom))] md:bottom-0'
