import { useState } from 'react'
import { useLearning } from '@/features/learning/api'
type Version = { id: string; slot: string; version: number; text: string; text_hash: string; imported_baseline: boolean }
export default function TopicWritingHistory({ attempt, edition, revision }: { attempt: string; edition: string; revision: number }) {
  const [open, setOpen] = useState(false)
  const [offset, setOffset] = useState(0)
  const load = useLearning<{ versions: Version[]; has_more: boolean }>(open ? `topics.php?view=writing_history&attempt=${encodeURIComponent(attempt)}&topic_version_id=${encodeURIComponent(edition)}&offset=${offset}&revision=${revision}` : undefined)
  return <details className="mt-5 rounded-xl border bg-white p-4" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="min-h-11 cursor-pointer font-semibold">Saved topic writing versions</summary>
    {open && (!load.data ? <p role={load.error ? 'alert' : 'status'}>{load.error || 'Loading versions…'}{load.error && <button className="ml-2 min-h-11 underline" onClick={load.refresh}>Retry</button>}</p> : <div className="space-y-4">
      <p className="text-sm leading-7 text-slate-600">The imported baseline is the exact text retained when version history began. Earlier edits are not reconstructed. Compare wording here; save revisions explicitly in the topic editor.</p>
      {!load.data.versions.length && <p>No version history yet. Existing text remains retained; the next topic save creates its baseline.</p>}
      {load.data.versions.map(item => <details key={item.id} className="rounded-lg border p-3"><summary className="min-h-11 cursor-pointer">{item.slot} · version {item.version}{item.imported_baseline ? ' · imported baseline' : ''}</summary><p className="whitespace-pre-wrap break-words leading-8" dir="auto">{item.text || '(Empty saved text)'}</p></details>)}
      {offset > 0 && <button className="min-h-11 rounded-lg border px-3" onClick={() => setOffset(Math.max(0, offset - 20))}>Newer versions</button>}
      {load.data.has_more && <button className="min-h-11 rounded-lg border px-3" onClick={() => setOffset(offset + 20)}>Older versions</button>}
    </div>)}
  </details>
}
