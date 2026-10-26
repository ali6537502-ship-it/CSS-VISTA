import { Link, useSearchParams } from 'react-router'
import { AccountPage } from '@/pages/account/shared'
import { useWorkspace } from '@/features/workspace/api'
import { WorkspaceHold, WorkspaceLoad, WorkspaceRecords } from '@/features/workspace/Records'
export default function ReviewQueue() {
  const [params, setParams] = useSearchParams()
  const offset = Math.max(0, Number(params.get('offset')) || 0)
  const course = params.get('course') || ''
  const load = useWorkspace(`view=review&offset=${offset}&course=${encodeURIComponent(course)}`)
  return <AccountPage title="Review" intro="Return to scheduled recall and recorded mistakes. Opening an item does not resolve it or award progress.">
    {!load.data ? <WorkspaceLoad error={load.error} retry={load.refresh} /> : <div className="space-y-5">
      <WorkspaceHold paused={load.data.paused} />
      <p className="text-sm leading-7 text-[#47564D]">Schedules and unresolved mistakes come from their original tools. {load.data.review_scope}</p>
      {load.data.items.length ? <WorkspaceRecords items={load.data.items} /> : <p role="status" className="rounded-xl border p-5">No available scheduled recalls or recorded mistakes are due.</p>}
      <div className="flex flex-wrap gap-3"><Link className="min-h-11 rounded-lg border px-4 py-3" to="/grammar-course?view=lab">Grammar practice and recall</Link><Link className="min-h-11 rounded-lg border px-4 py-3" to="/account/tasks">Device tasks and revision</Link><Link className="min-h-11 rounded-lg border px-4 py-3" to="/account/preparation">Preparation evidence and reviews</Link></div>
      {offset > 0 && <button className="min-h-11 rounded-lg border px-4" onClick={() => setParams(current => { const next = new URLSearchParams(current); next.set('offset', String(Math.max(0, offset - 20))); return next })}>Previous reviews</button>}{load.data.has_more && <button className="min-h-11 rounded-lg border px-4" onClick={() => setParams(current => { const next = new URLSearchParams(current); next.set('offset', String(offset + 20)); return next })}>More reviews</button>}
    </div>}
  </AccountPage>
}
