import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { FilePenLine, Save } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { readDraft, useAutosavedDraft } from '@/hooks/useAutosavedDraft'
import { learningRequest, saveIdentity, type SaveResult } from '@/features/learning/api'
import { panelStyle, primaryStyle, inputStyle } from '@/features/handwriting/styles'
import type { Detail, Overview } from './api'
type Draft = { title: string; text: string; kind: 'paragraph' | 'sentence'; attempt: string; base: number }
export default function Composer({ overview, detail, onSaved }: { overview: Overview; detail?: Detail; onSaved: (writing: string, version: string) => void }) {
 const { user } = useAccount(), writing = detail?.writing, version = detail?.version
 const key = `expression:v1:${user?.id}:${writing?.id || 'new'}:${version?.id || 'new'}`
 const [draft, setDraft] = useState<Draft>(() => { const stored = readDraft<Draft>(key); return stored && typeof stored.title === 'string' && typeof stored.text === 'string' && ['paragraph', 'sentence'].includes(stored.kind) && typeof stored.attempt === 'string' && Number.isInteger(stored.base) ? stored : { title: writing?.title || '', text: version?.text || '', kind: writing?.kind === 'sentence' ? 'sentence' : 'paragraph', attempt: writing?.attempt_id || overview.attempts[0]?.id || '', base: writing?.version || 0 } })
 const { status, clearDraft } = useAutosavedDraft(key, draft), [busy, setBusy] = useState(false), [error, setError] = useState('')
 const alive = useRef(true), running = useRef(false)
 useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
 const stale = !!writing && draft.base !== writing.version
 async function save(e: FormEvent) {
  e.preventDefault(); if (!user || running.current || stale) return; running.current = true; setBusy(true); setError('')
  const body = { action: 'writing_save', ...(writing ? { id: writing.id } : {}), expected_version: writing ? draft.base : 0, attempt_id: writing?.attempt_id || draft.attempt, kind: writing?.kind || draft.kind, title: draft.title, text: draft.text }
  try { const identity = await saveIdentity(user.id, `expression:save:${writing?.id || 'new'}`, body); const result = await learningRequest<SaveResult>(user.id, 'learning.php', { ...body, request_id: identity.id }); identity.done(); if (alive.current && result.writing_id && result.version_id) { clearDraft(); onSaved(result.writing_id, result.version_id) } }
  catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Your draft remains here. Refresh saved history before retrying.') }
  finally { running.current = false; if (alive.current) setBusy(false) }
 }
 return <form onSubmit={e => void save(e)} className={`${panelStyle} min-w-0 space-y-5`}>
  <h2 className="flex items-center gap-3 text-xl font-semibold tracking-tight"><FilePenLine className="h-5 w-5 text-indigo-600" aria-hidden="true" />{writing ? 'Write your next version' : 'Write something of your own'}</h2>
  <p className="text-sm leading-7 text-slate-500">{writing ? 'Use the explanation and hint to make your own revision. Earlier wording stays in your history.' : 'Start with a sentence, short expression or one English paragraph. Saving and revision use no AI allowance.'}</p>
  {!writing && <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Writing type<select value={draft.kind} onChange={e => setDraft(d => ({ ...d, kind: e.target.value as Draft['kind'] }))} className={inputStyle}><option value="paragraph">Paragraph</option><option value="sentence">Sentence / short expression</option></select></label><label className="grid gap-2 text-sm font-semibold">Preparation attempt<select required value={draft.attempt} onChange={e => setDraft(d => ({ ...d, attempt: e.target.value }))} className={inputStyle}><option value="">Choose attempt</option>{overview.attempts.map(a => <option key={a.id} value={a.id}>CSS {a.target_year}</option>)}</select></label></div>}
  <label className="grid gap-2 text-sm font-semibold">Writing title<input required maxLength={180} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} className={inputStyle} /></label>
  <label className="grid gap-2 text-sm font-semibold">{writing ? 'Your rewrite' : 'Your writing'}<textarea required maxLength={6000} rows={9} value={draft.text} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} className={`${inputStyle} resize-y bg-white text-base leading-8`} /></label>
  <p className="text-xs leading-6 text-slate-500">Feedback supports up to {overview.configuration.max_words[draft.kind]} words in one {draft.kind === 'sentence' ? 'short expression' : 'paragraph'}. Saved drafts may be longer; trim them before requesting feedback.</p>
  <p role="status" className="text-xs leading-6 text-slate-500">{status === 'error' ? 'Browser draft could not be saved. Keep this page open and save to your account.' : status === 'saved' ? 'Draft saved on this browser. Save a version to keep it in your account.' : 'Saving browser draft…'}</p>
  {stale && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7"><p>Your draft started from an older record. Review the latest saved version before saving.</p><button type="button" className="min-h-11 font-semibold text-indigo-700 underline" onClick={() => setDraft(d => ({ ...d, base: writing.version }))}>I reviewed the latest version; keep my draft</button></div>}
  {!draft.attempt && <Link to="/account/preparation?new=attempt" className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline">Create a preparation attempt</Link>}
  {error && <p role="alert" className="rounded-xl border border-red-200 p-4 text-sm leading-7 text-red-800">{error}</p>}
  <button disabled={busy || stale || !draft.attempt} className={primaryStyle}><Save className="h-4 w-4" aria-hidden="true" />{busy ? 'Saving…' : writing ? 'Save rewrite' : 'Save writing'}</button>
 </form>
}
