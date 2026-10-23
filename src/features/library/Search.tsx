import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AccountPage } from '@/pages/account/shared'
import { useWorkspace } from '@/features/workspace/api'
import { WorkspaceHold, WorkspaceLoad, WorkspaceRecords } from '@/features/workspace/Records'
export default function LibrarySearch() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const type = params.get('type') || ''
  const offset = Math.max(0, Number(params.get('offset')) || 0)
  const [draft, setDraft] = useState<{ query: string; value: string }>({ query: q, value: q })
  const input = draft.query === q ? draft.value : q
  const load = useWorkspace(`view=search&q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&offset=${offset}`)
  return <AccountPage title="Search your library" intro="Find account-owned writing, references and recorded practice. Search does not change progress or use AI.">
    <form onSubmit={event => { event.preventDefault(); setParams({ q: input.trim(), ...(type ? { type } : {}) }) }} className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
      <label className="grid gap-2 text-sm font-semibold">Search saved work<input name="q" maxLength={120} value={input} onChange={event => setDraft({ query: q, value: event.target.value })} className="min-h-11 min-w-0 rounded-lg border px-3" /></label>
      <button className="min-h-11 self-end rounded-lg bg-[#14543D] px-5 py-3 font-semibold text-white">Search</button>
      <label className="grid gap-2 text-sm font-semibold">Type<select value={type} onChange={event => setParams({ q, ...(event.target.value ? { type: event.target.value } : {}) })} className="min-h-11 rounded-lg border px-3">
        <option value="">All available types</option>{['catalog','writing','factbook','topics','skills','ability','grammar','reading','handwriting','mentor'].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
    </form>
    {!load.data ? <WorkspaceLoad error={load.error} retry={load.refresh} /> : <div className="space-y-5">
      <WorkspaceHold paused={load.data.paused} />
      <p className="text-sm text-[#47564D]">{load.data.scope} Results include only currently permitted records.</p>
      {load.data.items.length ? <WorkspaceRecords items={load.data.items} /> : <p role="status" className="rounded-xl border p-5">No available saved work matches these filters. Try a title or open its original workspace.</p>}
      <div className="flex gap-3">{offset > 0 && <button className="min-h-11 rounded-lg border px-4" onClick={() => setParams({ q, type, offset: String(Math.max(0, offset - 20)) })}>Previous results</button>}{load.data.has_more && <button className="min-h-11 rounded-lg border px-4" onClick={() => setParams({ q, type, offset: String(offset + 20) })}>More results</button>}</div>
      <Link className="inline-flex min-h-11 items-center text-[#14543D] underline" to="/account/search">Current Affairs search and filters</Link>
    </div>}
  </AccountPage>
}
