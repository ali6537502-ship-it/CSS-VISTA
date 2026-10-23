import type { ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { useMembership, useMembershipExpired, type Overview } from './api'
import { ProBadge } from './AccountSections'
import { ProPausedNotice } from './ProRelease'
import { useProReleasePaused } from './proReleaseContext'

/** Presentation only: every protected source also checks native membership. */
type GateProps = { children: ReactNode; feature: string; fallbackAction?: ReactNode; allowExpiredHistory?: boolean; expiredHistoryView?: string; retainedHistoryMessage?: string }
export default function ProGate({ children, feature, fallbackAction, allowExpiredHistory = false, expiredHistoryView, retainedHistoryMessage }: GateProps) {
  const paused = useProReleasePaused()
  return paused ? <ProPausedNotice /> : <OpenProGate feature={feature} fallbackAction={fallbackAction} allowExpiredHistory={allowExpiredHistory} expiredHistoryView={expiredHistoryView} retainedHistoryMessage={retainedHistoryMessage}>{children}</OpenProGate>
}

function OpenProGate({ children, feature, fallbackAction, allowExpiredHistory, expiredHistoryView, retainedHistoryMessage }: GateProps) {
  const { user, loading } = useAccount()
  const location = useLocation()
  const { data, error, refresh } = useMembership<Overview>()
  const expired = useMembershipExpired(data?.membership.expires_at)
  if (loading || (user && !data && !error)) return <section className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-bold text-slate-950">{feature}</h1><p role="status" className="mt-3 text-sm text-slate-600">Checking Pro access…</p></section>
  const ended = expired || data?.membership.status === 'expired'
  const history = allowExpiredHistory && ended && (!expiredHistoryView || new URLSearchParams(location.search).get('view') === expiredHistoryView)
  if (user && data && !error && ((data.membership.status === 'active' && !expired) || history)) return <>{children}</>
  const returnTo = location.pathname + location.search
  return <section className="mx-auto max-w-3xl px-4 py-12"><div className="rounded-2xl border border-amber-200 bg-white p-6 sm:p-8">
    <ProBadge /><h1 className="mt-4 text-2xl font-bold text-slate-950">{feature}</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">{error ? 'Your membership could not be checked. Please retry.' : `${feature} is included in CSS Vista Pro. ${expired || data?.membership.status === 'expired' ? 'Renew your membership to continue.' : 'An active Pro membership is required.'}`}</p>
    {user && data && !error && ended && retainedHistoryMessage && <p className="mt-3 text-sm leading-7 text-slate-600">{retainedHistoryMessage}</p>}
    {user && data && !error && ended && allowExpiredHistory && expiredHistoryView && <Link to={`${location.pathname}?${new URLSearchParams({ view: expiredHistoryView })}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold">Read saved attempts</Link>}
    {error ? <button onClick={refresh} className="mt-5 min-h-11 rounded-lg border px-4 font-semibold">Retry access check</button> : <Link to={user ? '/account/membership' : `/account?returnTo=${encodeURIComponent(returnTo)}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-900 px-5 text-sm font-semibold text-white">{user ? 'View Pro membership' : 'Sign in to continue'}</Link>}
    {fallbackAction}
    <Link to="/account/dashboard?plan=free" className="mt-4 block min-h-11 py-3 text-sm font-semibold text-emerald-900">Back to Free account</Link>
  </div></section>
}

/** Shared routes remain free unless they select a paid study category. */
export function SelectedStudyGate({ children }: { children: ReactNode }) {
  const params = useParams()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const categories = (query.get('cats') || '').split(',')
  const ability = params.bankId === 'abilities' || params.bankId === 'reasoning' || params.slug === 'general-ability' || query.get('category') === 'general-ability' || categories.includes('general-ability')
  const affairs = params.bankId === 'current' || params.slug === 'current-affairs' || ['current-affairs-archive', 'pakistan-current-affairs'].includes(query.get('category') || '') || categories.includes('current-affairs')
  const precis = params.slug === 'precis-composition'
  return ability || affairs || precis ? <ProGate feature={ability ? 'General Ability' : affairs ? 'Current Affairs' : 'Précis & Composition'}>{children}</ProGate> : <>{children}</>
}
