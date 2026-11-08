import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAccount } from '@/lib/accountContext'
import { readDraft, useAutosavedDraft } from '@/hooks/useAutosavedDraft'
import { buttonStyle, inputStyle, learningRequest, saveIdentity, type Attempt, type SaveResult, type Writing, type WritingVersion } from './api'
type Draft = { title: string; text: string; kind: Writing['kind']; attemptId: string; baseVersion: number }
export default function WritingForm({ attempts, writing, version, onSaved }: { attempts: Attempt[]; writing?: Writing; version?: WritingVersion; onSaved: (id: string) => void }) {
  const { user } = useAccount()
  const draftKey = `learning:v1:${user?.id}:${writing?.id || 'new'}`
  const [draft, setDraft] = useState<Draft>(() => {
    const stored = readDraft<Draft>(draftKey)
    if (stored && typeof stored.title === 'string' && typeof stored.text === 'string' && ['sentence', 'paragraph', 'precis'].includes(stored.kind) && typeof stored.attemptId === 'string') return { ...stored, baseVersion: Number.isInteger(stored.baseVersion) ? stored.baseVersion : writing?.version || 0 }
    return { title: writing?.title || '', text: version?.text || '', kind: writing?.kind || 'paragraph', attemptId: writing?.attempt_id || attempts[0]?.id || '', baseVersion: writing?.version || 0 }
  })
  const { status, clearDraft } = useAutosavedDraft(draftKey, draft)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const running = useRef(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function save(event: FormEvent) {
    event.preventDefault(); if (!user || running.current) return
    running.current = true; setBusy(true); setError('')
    const body = { action: 'writing_save', expected_version: writing ? draft.baseVersion : 0, ...(writing ? { id: writing.id } : {}), attempt_id: writing?.attempt_id || draft.attemptId, kind: writing?.kind || draft.kind, title: draft.title, text: draft.text }
    try {
      const identity = await saveIdentity(user.id, `writing:${writing?.id || 'new'}`, body)
      const result = await learningRequest<SaveResult>(user.id, 'learning.php', { ...body, request_id: identity.id })
      identity.done(); if (alive.current && result.writing_id) { clearDraft(); onSaved(result.writing_id) }
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Save failed. Your draft remains on this page.') }
    finally { running.current = false; if (alive.current) setBusy(false) }
  }
  return <form onSubmit={event => void save(event)} className="space-y-5 rounded-xl border p-5 sm:p-6">
    <h2 className="text-xl font-semibold">{writing ? 'Save a new writing version' : 'Save your writing'}</h2>
    <p className="text-sm leading-7 text-slate-600">Saving creates an account-owned copy. Each revision preserves earlier versions. This step does not evaluate or assign marks to your writing.</p>
    {!writing && <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Preparation attempt<select required value={draft.attemptId} onChange={e => setDraft(d => ({ ...d, attemptId: e.target.value }))} className={inputStyle}><option value="">Choose attempt</option>{attempts.map(a => <option key={a.id} value={a.id}>CSS {a.target_year} · {a.id.slice(0, 8)}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Writing type<select value={draft.kind} onChange={e => setDraft(d => ({ ...d, kind: e.target.value as Draft['kind'] }))} className={inputStyle}><option value="sentence">Sentence</option><option value="paragraph">Paragraph</option><option value="precis">Précis</option></select></label></div>}
    <label className="grid gap-2 text-sm font-semibold">Title<input required maxLength={180} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} className={inputStyle} /></label>
    <label className="grid gap-2 text-sm font-semibold">Your writing<textarea required maxLength={20000} rows={10} value={draft.text} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} className={`${inputStyle} text-base leading-7`} /></label>
    <p role="status" className="text-sm leading-6 text-slate-500">{status === 'error' ? 'Browser draft could not be saved. Keep this page open and save to your account.' : status === 'saved' ? 'Draft saved on this browser. Use Save writing to keep it in your account.' : 'Browser draft saving…'}</p>
    {writing && draft.baseVersion !== writing.version && <div className="rounded-lg border border-amber-200 p-4 text-sm leading-7"><p>This browser draft was based on an older saved version. Review the current saved writing before continuing.</p><button type="button" className="mt-3 min-h-11 font-semibold text-pine underline" onClick={() => setDraft(d => ({ ...d, baseVersion: writing.version }))}>Keep my draft and use the current saved version as its base</button></div>}
    {error && <p role="alert" className="text-sm leading-7 text-red-800">{error}</p>}
    <button disabled={busy} className={buttonStyle}>{busy ? 'Saving…' : writing ? 'Save new version' : 'Save writing'}</button>
  </form>
}
