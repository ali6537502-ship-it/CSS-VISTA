import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { pakistanTime, useMembership, useMembershipExpired, type Overview } from './api'

export default function MembershipSummary() {
  const { data, error, refresh } = useMembership<Overview>()
  const expired = useMembershipExpired(data?.membership.expires_at)
  const active = data?.membership.status === 'active' && !expired
  return <aside aria-label="Membership" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
    <div><p className="text-sm font-semibold text-slate-900">{error ? 'Membership status unavailable' : !data ? 'Checking membership…' : active ? 'Pro Active' : expired ? 'Pro access expired' : 'Free membership'}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{active ? `Expires ${pakistanTime(data?.membership.expires_at ?? null)}` : 'Your preparation records stay with your account.'}</p>
      {error && <button type="button" onClick={refresh} className="min-h-11 text-sm font-semibold text-pine underline">Retry status check</button>}
    </div>
    <Link to="/account/membership" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-pine hover:underline">{active ? 'Membership & Payments' : expired ? 'Renew access' : 'Explore Pro'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
  </aside>
}
