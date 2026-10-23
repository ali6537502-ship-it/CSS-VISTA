import SaveRecovery from './Recovery'
import { useAccount } from '@/lib/accountContext'
import { Link, useSearchParams } from 'react-router'
import { AccountPage } from '@/pages/account/shared'
import { useWorkspace } from './api'
import { WorkspaceHold, WorkspaceLoad, WorkspaceRecords } from './Records'
import { safeStudyReturn } from './navigation'
export default function Today() {
  const { user } = useAccount()
  const [params] = useSearchParams()
  const load = useWorkspace()
  return <AccountPage title="Today" intro="Continue your saved work, then choose one next study action.">
    {!load.data ? <WorkspaceLoad error={load.error} retry={load.refresh} /> : <div className="space-y-8">
      {user && <SaveRecovery key={user.id} user={user.id} />}
      <WorkspaceHold paused={load.data.paused} />
      {params.has('plan') && <p className="text-sm text-[#47564D]">Your {params.get('plan') === 'pro' ? 'Pro' : 'Free'} entry opens the same account. Access follows your current membership and availability.</p>}
      <section className="rounded-xl border border-[#D7E0DA] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{load.data.items.length ? 'Continue your recent work' : 'Choose your first lesson'}</h2>
        <p className="mt-2 max-w-[70ch] text-sm leading-7 text-[#47564D]">{load.data.items.length ? `“${load.data.items[0].title}” is your most recently updated available account record. Its original workspace keeps saved versions and any draft recovery.` : 'Browse the course catalog. Choose a preparation attempt when you start work that needs account storage.'}</p>
        <Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#14543D] px-5 py-3 font-semibold text-white hover:bg-[#0E3E2C]" to={load.data.items.length ? safeStudyReturn(load.data.items[0].destination) : '/account/learn'}>{load.data.items.length ? 'Resume saved work' : 'Browse lessons'}</Link>
      </section>
      <section><h2 className="text-lg font-semibold">Your next study action</h2><p className="mt-2 text-sm leading-7 text-[#47564D]">Resolve any unconfirmed save in its original workspace before starting a new revision. Then choose what fits your time.</p><div className="mt-4 flex flex-wrap gap-3"><Link className="min-h-11 rounded-lg border px-4 py-3" to="/account/review">Check due review</Link><Link className="min-h-11 rounded-lg border px-4 py-3" to="/account/preparation">Open your existing plan</Link><Link className="min-h-11 rounded-lg border px-4 py-3" to="/daily-briefing">Read today’s public briefing</Link></div></section>
      <section><h2 className="mb-3 text-lg font-semibold">Recent account work</h2>{load.data.items.length ? <WorkspaceRecords items={load.data.items.slice(0, 5)} /> : <p className="rounded-xl border p-5 text-sm">No synchronized work yet. Device-only records remain in their original tools.</p>}</section>
      <section><h2 className="mb-3 text-lg font-semibold">Free study tools</h2><div className="flex flex-wrap gap-3">{[['/grammar-course','Grammar'],['/fpsc-syllabus','My Syllabus'],['/account/tasks','My Tasks'],['/account/resources','Resources'],['/factbook','My Factbook']].map(([to,title]) => <Link key={to} to={to} className="min-h-11 rounded-lg border px-4 py-3">{title}</Link>)}</div></section>
    </div>}
  </AccountPage>
}
