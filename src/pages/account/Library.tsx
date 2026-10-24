import BrowserImport from '@/features/workspace/BrowserImport'
import { Link } from 'react-router'
import { AvailableStudyLink } from '@/features/membership/ProRelease'
import { AccountPage } from './shared'
import { useWorkspace } from '@/features/workspace/api'
import { WorkspaceHold, WorkspaceLoad, WorkspaceRecords } from '@/features/workspace/Records'
export default function AccountLibrary() {
  const load = useWorkspace()
  return <AccountPage title="Library" intro="Find your saved work, personal references and original sources without creating a folder first.">
    <Link to="/account/library/search" className="mb-6 inline-flex min-h-11 items-center rounded-lg bg-[#14543D] px-5 py-3 font-semibold text-white">Search saved work</Link>
    <section className="mb-8"><h2 className="mb-3 text-lg font-semibold">Find your work</h2><div className="flex flex-wrap gap-3">
      <Link className="min-h-11 rounded-lg border px-4 py-3" to="/factbook">My Factbook</Link>
      <Link className="min-h-11 rounded-lg border px-4 py-3" to="/account/library/search?type=writing">Saved writing</Link>
      <Link className="min-h-11 rounded-lg border px-4 py-3" to="/account/library/search?type=reading&state=saved">Saved reading</Link>
      <Link className="min-h-11 rounded-lg border px-4 py-3" to="/account/library/search?state=unfinished">Unfinished work</Link>
      <Link className="min-h-11 rounded-lg border px-4 py-3" to="/account/library/search?state=saved">All saved work</Link>
      <Link className="min-h-11 rounded-lg border px-4 py-3" to="/account/library/search?type=sources">Personal source references</Link>
      <Link className="min-h-11 rounded-lg border px-4 py-3" to="/account/library/search?type=grammar">Grammar evidence</Link>
      <AvailableStudyLink className="min-h-11 rounded-lg border px-4 py-3" to="/account/factbook">Daily Facts</AvailableStudyLink>
      <Link className="min-h-11 rounded-lg border px-4 py-3" to="/account/resources">Account downloads</Link>
      <Link className="min-h-11 rounded-lg border px-4 py-3" to="/answer-writing">Cached answer-writing history</Link>
    </div></section>
    {!load.data ? <WorkspaceLoad error={load.error} retry={load.refresh} /> : <div className="space-y-5"><WorkspaceHold paused={load.data.paused} /><BrowserImport premium={load.data.premium_available} /><h2 className="text-lg font-semibold">Recent account work</h2>{load.data.items.length ? <WorkspaceRecords items={load.data.items} /> : <p className="rounded-xl border p-5">No available account records yet. Browser-cached work remains in its original tool.</p>}</div>}
  </AccountPage>
}
