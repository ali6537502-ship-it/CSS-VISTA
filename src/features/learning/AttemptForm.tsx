import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAccount } from '@/lib/accountContext'
import { buttonStyle, inputStyle, learningRequest, saveIdentity, type Attempt, type SaveResult, type Subject } from './api'
export default function AttemptForm({ attempt, catalog, onSaved }: { attempt?: Attempt; catalog: Subject[]; onSaved: (id: string) => void }) {
  const { user } = useAccount()
  const [year, setYear] = useState(attempt ? String(attempt.target_year) : '')
  const [date, setDate] = useState(attempt?.target_date || '')
  const [minutes, setMinutes] = useState(String(attempt?.daily_minutes || 120))
  const [stage, setStage] = useState(attempt?.stage || 'starting')
  const [ids, setIds] = useState(attempt?.optional_subject_ids || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const running = useRef(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function save(event: FormEvent) {
    event.preventDefault(); if (!user || running.current) return
    running.current = true; setBusy(true); setError('')
    const body = { action: 'attempt_save', expected_version: attempt?.version || 0, ...(attempt ? { id: attempt.id } : {}), target_year: Number(year), target_date: date || null, daily_minutes: Number(minutes), stage, optional_subject_ids: [...ids].sort() }
    try {
      const identity = await saveIdentity(user.id, `attempt:${attempt?.id || 'new'}`, body)
      const result = await learningRequest<SaveResult>(user.id, 'learning.php', { ...body, request_id: identity.id })
      identity.done(); if (alive.current && result.attempt_id) onSaved(result.attempt_id)
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Save failed. Keep this page open and retry with the same details.') }
    finally { running.current = false; if (alive.current) setBusy(false) }
  }
  const marks = catalog.filter(s => ids.includes(s.slug)).reduce((sum, s) => sum + s.marks, 0)
  return <form onSubmit={event => void save(event)} className="space-y-5 rounded-xl border p-5 sm:p-6">
    <h2 className="text-xl font-semibold">{attempt ? 'Update preparation settings' : 'Create a CSS preparation attempt'}</h2>
    <p className="text-sm leading-7 text-slate-600">This record follows your preparation beyond a subscription period. A target date is your own planning choice; it is not an official examination announcement.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold">Target CSS year<input type="number" required min={2000} max={2100} value={year} onChange={e => setYear(e.target.value)} className={inputStyle} /></label>
      <label className="grid gap-2 text-sm font-semibold">Your target date (optional)<input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${inputStyle} min-w-0`} /></label>
      <label className="grid gap-2 text-sm font-semibold">Daily study time (minutes)<input type="number" required min={15} max={1440} value={minutes} onChange={e => setMinutes(e.target.value)} className={inputStyle} /></label>
      <label className="grid gap-2 text-sm font-semibold">Preparation stage<select value={stage} onChange={e => setStage(e.target.value as Attempt['stage'])} className={inputStyle}><option value="starting">Starting</option><option value="in_progress">In progress</option><option value="revision">Revision</option></select></label>
    </div>
    <fieldset><legend className="font-semibold">Optional-subject preparation shortlist</legend><p className="mt-2 text-sm leading-7 text-slate-600">You can leave this incomplete. These choices identify study interests; they do not validate FPSC group rules or an examination application. Selected: {marks} of 600 marks.</p>
      <details className="mt-3 rounded-lg border p-4"><summary className="cursor-pointer text-sm font-semibold">Choose subjects</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">{catalog.map(subject => <label key={subject.slug} className="flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" checked={ids.includes(subject.slug)} onChange={e => setIds(current => e.target.checked ? [...current, subject.slug] : current.filter(id => id !== subject.slug))} className="mt-1 h-5 w-5 shrink-0 accent-emerald-800" /><span>{subject.name} · {subject.marks} marks</span></label>)}</div></details>
    </fieldset>
    {error && <p role="alert" className="text-sm leading-7 text-red-800">{error}</p>}
    <button disabled={busy} className={buttonStyle}>{busy ? 'Saving…' : 'Save preparation attempt'}</button>
  </form>
}
