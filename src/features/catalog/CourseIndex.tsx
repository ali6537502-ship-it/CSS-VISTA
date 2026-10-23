import { Link } from 'react-router'
import { useSearchParams } from 'react-router'
import { AccountPage } from '@/pages/account/shared'
import { useWorkspace } from '@/features/workspace/api'
import { WorkspaceHold, WorkspaceLoad } from '@/features/workspace/Records'
export default function CourseIndex() {
  const [params, setParams] = useSearchParams()
  const offset = Math.max(0, Number(params.get('offset')) || 0)
  const load = useWorkspace(`view=catalog&offset=${offset}`)
  return <AccountPage title="Learn" intro="Browse a course before choosing a preparation attempt. Your personal work stays in its existing workspace.">
    {!load.data ? <WorkspaceLoad error={load.error} retry={load.refresh} /> : <div className="space-y-6">
      <WorkspaceHold paused={load.data.paused} />
      {Array.from(new Set(load.data.catalog.map(item => item.parentId))).map(area => <section key={area}>
        <h2 className="mb-3 text-lg font-semibold capitalize">{area?.replaceAll('_', ' ') || 'Courses'}</h2>
        <ul className="divide-y rounded-xl border bg-white">{load.data!.catalog.filter(item => item.parentId === area).map(item => <li key={item.id} className="p-4">
          <Link to={item.canonicalDestination} className="inline-flex min-h-11 items-center text-lg font-semibold text-[#14543D] underline underline-offset-4">{item.title}</Link>
          <p className="max-w-[70ch] text-sm leading-7 text-[#47564D]">{item.outcomeSummary}</p>
          <p className="mt-1 text-xs text-[#47564D]">{item.accessClass === 'pro' ? 'Pro' : 'Free'} · Existing course edition</p>
        </li>)}</ul>
      </section>)}
      <div className="flex flex-wrap gap-3"><Link className="min-h-11 rounded-lg border px-4 py-3" to="/daily-briefing">Public Daily Briefing</Link><Link className="min-h-11 rounded-lg border px-4 py-3" to="/fpsc-syllabus">Official syllabus resources</Link></div>
      {offset > 0 && <button className="min-h-11 rounded-lg border px-4" onClick={() => setParams({ offset: String(Math.max(0, offset - 20)) })}>Previous courses</button>}
      {load.data.has_more && <button className="min-h-11 rounded-lg border px-4" onClick={() => setParams({ offset: String(offset + 20) })}>More courses</button>}
    </div>}
  </AccountPage>
}
