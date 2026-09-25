import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { mptApi, type MptDashboard } from '@/lib/mpt/api'
import { copy } from '@/lib/mpt/copy'
import { useMptFlowEnabled } from '@/lib/mpt/useMptFlow'
import { useServerClock } from '@/lib/mpt/useServerClock'
import { MptHeroCard, pickCurrentCard } from './MptHeroCard'

/**
 * The dashboard is the only notification channel (Section 1A #7): it shows the
 * current MPT Mock's stage — countdown, Roll Number, Enter Exam — at a glance.
 * Renders nothing while the application flow is off.
 */
export function DashboardMptCard() {
  const enabled = useMptFlowEnabled()
  const [data, setData] = useState<MptDashboard | null>(null)
  const [version, setVersion] = useState(0)
  const now = useServerClock()
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    mptApi.dashboard(controller.signal).then(setData).catch(() => setData(null))
    return () => controller.abort()
  }, [enabled, version])
  if (!enabled) return null
  if (!data) return <div aria-hidden="true" className="mt-8 h-40 animate-pulse rounded-2xl bg-slate-100" />
  const current = pickCurrentCard(data.cards)
  return (
    <div className="mt-8 space-y-2">
      {current
        ? <MptHeroCard card={current} now={now} onBoundary={reload} />
        : <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">{copy.hub.noMocks}</p>}
      <div className="flex flex-wrap gap-x-4 text-sm font-semibold">
        <Link to="/account/mpt" className="inline-flex min-h-11 items-center text-emerald-800 underline-offset-4 hover:underline">My MPT Mocks</Link>
        {data.latest && <Link to={`/account/mpt/results/${data.latest.application_code}`} className="inline-flex min-h-11 items-center text-emerald-800 underline-offset-4 hover:underline">{copy.dashboard.scoreTitle}: {data.latest.result.score} / {data.latest.result.total_marks}</Link>}
      </div>
    </div>
  )
}
