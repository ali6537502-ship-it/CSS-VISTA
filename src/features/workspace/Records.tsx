import { Link } from 'react-router'
import type { WorkspaceItem } from './api'
import { safeStudyReturn } from './navigation'
export function WorkspaceRecords({ items }: { items: WorkspaceItem[] }) {
  return <ul className="divide-y divide-[#D7E0DA] rounded-xl border border-[#D7E0DA] bg-white">{items.map(item => <li key={`${item.domain}:${item.id}`} className="min-w-0 p-4">
    <p className="text-xs font-semibold text-[#47564D]">{item.domain} · synchronized{item.due_at ? ` · due ${item.due_at}` : ''}</p>
    <Link to={safeStudyReturn(item.destination)} className="mt-1 inline-flex min-h-11 items-center break-words text-base font-semibold text-[#14543D] underline underline-offset-4">{item.title || 'Untitled saved work'}</Link>
    <p className="text-sm leading-6 text-[#47564D]">{item.evidence}</p>
    {item.edition && <p className="mt-1 break-all text-xs text-[#47564D]">Edition/version: {item.edition}</p>}
  </li>)}</ul>
}
export function WorkspaceLoad({ error, retry }: { error?: string; retry(): void }) {
  return error ? <div role="alert" className="rounded-xl border border-red-200 p-4"><p>{error}</p><button onClick={retry} className="mt-2 min-h-11 rounded-lg border px-4 font-semibold">Retry</button></div> : <p role="status">Loading your saved work…</p>
}
export function WorkspaceHold({ paused }: { paused: boolean }) {
  return paused ? <p role="status" className="rounded-xl border border-[#D7E0DA] bg-[#F6F8F7] p-4 text-sm leading-6">Pro is temporarily unavailable while it is being finalised. Saved records are retained. Free Grammar, public Daily Briefing and your available account tools remain accessible.</p> : null
}
