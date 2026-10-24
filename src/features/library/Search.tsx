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
  const query = new URLSearchParams(params)
  query.set('view', 'search')
  const load = useWorkspace(query.toString())
  function change(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'offset') next.delete('offset')
    setParams(next)
  }
  return <AccountPage title="Search your library" intro="Find account-owned writing, references and recorded practice. Search does not change progress or use AI.">
    <form onSubmit={event => { event.preventDefault(); change('q', input.trim()) }} className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
      <label className="grid gap-2 text-sm font-semibold">Search saved work<input name="q" maxLength={120} value={input} onChange={event => setDraft({ query: q, value: event.target.value })} className="min-h-11 min-w-0 rounded-lg border px-3" /></label>
      <button className="min-h-11 self-end rounded-lg bg-[#14543D] px-5 py-3 font-semibold text-white">Search</button>
      <label className="grid gap-2 text-sm font-semibold">Type<select value={type} onChange={event => change('type', event.target.value)} className="min-h-11 rounded-lg border px-3">
        <option value="">All available types</option>{['catalog','writing','factbook','sources','topics','skills','ability','grammar','precis','reading','handwriting','mentor'].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <label className="grid gap-2 text-sm font-semibold">Work status<select value={params.get('state') || ''} onChange={event => change('state', event.target.value)} className="min-h-11 min-w-0 rounded-lg border px-3"><option value="">All recorded work</option><option value="saved">Saved</option><option value="unfinished">Recorded unfinished work</option></select></label>
      {(['course', 'source', 'collection'] as const).map(key => {
        const options = key === 'collection' ? load.data?.collections : load.data?.facets[key === 'course' ? 'courses' : 'sources']
        const selected = params.get(key) || ''
        return <label key={key} className="grid min-w-0 gap-2 text-sm font-semibold">{key === 'course' ? 'Course' : key === 'source' ? 'Source' : 'My Factbook collection'}<select value={selected} onChange={event => change(key, event.target.value)} className="min-h-11 min-w-0 max-w-full rounded-lg border px-3"><option value="">All available</option>{selected && !options?.some(option => option.id === selected) ? <option value={selected}>Selected filter (no matching records)</option> : null}{options?.map(option => <option key={option.id} value={option.id}>{option.title} ({option.count})</option>)}</select></label>
      })}
      {(['from', 'to'] as const).map(key => <label key={key} className="grid min-w-0 gap-2 text-sm font-semibold">{key === 'from' ? 'From date' : 'Through date'}<input type="date" value={params.get(key) || ''} onChange={event => change(key, event.target.value)} className="min-h-11 min-w-0 rounded-lg border px-3" /></label>)}
      <p className="text-sm leading-6 text-[#47564D] sm:col-span-2">Use up to eight search words. Dates use publication or source dates where recorded, otherwise the last account update. Unfinished means an explicit state in the original tool; it is not a judgement of writing quality.</p>
      <Link to="/account/library/search" className="inline-flex min-h-11 items-center text-[#14543D] underline">Clear filters</Link>
    </form>
    {!load.data ? <WorkspaceLoad error={load.error} retry={load.refresh} /> : <div className="space-y-5">
      <WorkspaceHold paused={load.data.paused} />
      <p className="text-sm text-[#47564D]">{load.data.scope} Results include only currently permitted records.</p>
      {load.data.items.length ? <WorkspaceRecords items={load.data.items} /> : <p role="status" className="rounded-xl border p-5">No available saved work matches these filters. Try a title or open its original workspace.</p>}
      <div className="flex gap-3">{offset > 0 && <button className="min-h-11 rounded-lg border px-4" onClick={() => change('offset', String(Math.max(0, offset - 20)))}>Previous results</button>}{load.data.has_more && <button className="min-h-11 rounded-lg border px-4" onClick={() => change('offset', String(offset + 20))}>More results</button>}</div>
      <Link className="inline-flex min-h-11 items-center text-[#14543D] underline" to="/account/search">Current Affairs search and filters</Link>
    </div>}
  </AccountPage>
}
