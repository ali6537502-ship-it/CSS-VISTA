import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { saveIdentity } from '@/features/learning/api'
import { ScanLine, ImagePlus, Check, X, ShieldCheck } from 'lucide-react'
import { panelStyle, primaryStyle as buttonStyle, inputStyle, secondaryStyle } from './styles'
import { uploadHandwriting, type HandwritingOverview } from './api'
export default function HandwritingUpload({ data, onSaved }: { data: HandwritingOverview; onSaved: (id: string) => void }) {
 const { user } = useAccount()
 const [file, setFile] = useState<File>(), [preview, setPreview] = useState(''), [title, setTitle] = useState(''), [attempt, setAttempt] = useState(data.attempts[0]?.id || '')
 const [accepted, setAccepted] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
 const alive = useRef(true), running = useRef(false), picker = useRef<HTMLInputElement>(null)
 const [dragging, setDragging] = useState(false)
 useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
 useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url) }, [file])
 const enabled = data.configuration.enabled && data.membership.status === 'active'
 function choose(next?: File) {
  setAccepted(false); setError(''); setFile(undefined); setPreview('')
  if (!next) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type) || next.size > data.configuration.limits.max_bytes) { setError('Choose a JPG, PNG or WebP page within the displayed size limit.'); return }
  setFile(next)
 }
 async function upload(event: FormEvent) {
  event.preventDefault(); if (!user || !file || !accepted || !enabled || running.current) return
  running.current = true; setBusy(true); setError('')
  try {
   const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
   const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
   const identity = await saveIdentity(user.id, 'handwriting:upload', { title, attempt, hash, policy: data.configuration.policy_version })
   const form = new FormData(); form.set('request_id', identity.id); form.set('attempt_id', attempt); form.set('title', title); form.set('policy_version', data.configuration.policy_version || ''); form.set('image', file)
   const result = await uploadHandwriting(user.id, form); identity.done(); if (alive.current) onSaved(result.page_id)
  } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Upload failed. Keep the selected page and try again.') }
  finally { running.current = false; if (alive.current) setBusy(false) }
 }
 const limits = data.configuration.limits
 return <form onSubmit={event => void upload(event)} className={panelStyle}>
  <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><ScanLine className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="text-xl font-semibold tracking-tight text-slate-950">One handwritten paragraph</h2><p className="mt-1 text-sm leading-6 text-slate-500">Start with a clear photo of your writing.</p></div></div>
  <div className="mt-6 grid gap-7 lg:grid-cols-[1.05fr_1fr]">
   <div className="min-w-0 space-y-4">
    <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) choose(e.dataTransfer.files[0]) }} className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50/80'}`}>
     <label className="relative flex min-h-72 cursor-pointer flex-col items-center justify-center p-6 text-center">
      <input ref={picker} type="file" aria-label="Page image" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => choose(e.target.files?.[0])} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait" />
      {preview ? <img src={preview} alt="Your selected handwritten page" className="h-72 w-full rounded-lg object-contain sm:h-96" /> : <><span className="grid h-16 w-16 place-items-center rounded-2xl border border-indigo-100 bg-white text-indigo-600 shadow-sm"><ImagePlus className="h-7 w-7" aria-hidden="true" /></span><span className="mt-5 text-base font-semibold text-slate-900">Drop your page here</span><span className="mt-2 text-sm text-slate-500">or tap to choose a photo</span><span className="mt-5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">JPG · PNG · WebP · {(limits.max_bytes / 1048576).toFixed(0)} MB max</span></>}
     </label>
    </div>
    {file && <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-700">{file.name}</p><p className="text-xs leading-6 text-slate-500">Preview on this browser · {(file.size / 1048576).toFixed(2)} MB</p></div><button type="button" disabled={busy} aria-label="Remove selected page" onClick={() => { choose(); if (picker.current) picker.current.value = '' }} className={`${secondaryStyle} shrink-0 px-3`}><X className="h-4 w-4" aria-hidden="true" /></button></div>}
    <div className="rounded-2xl bg-slate-50 p-4"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">For a clear transcription</h3><ul className="mt-3 space-y-2 text-xs leading-6 text-slate-600">{['One page with one English paragraph', 'Even lighting, straight camera, every word visible', 'Crop out names, roll numbers and personal details'].map(tip => <li key={tip} className="flex gap-2"><Check className="mt-1 h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden="true" />{tip}</li>)}</ul><p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-6 text-slate-500">320–{limits.max_edge} pixels per edge · up to {(limits.max_pixels / 1000000).toFixed(0)} megapixels · {limits.max_words} words.</p></div>
   </div>
   <div className="min-w-0 space-y-5">
    {!data.configuration.enabled ? <p role="status" className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm leading-7 text-indigo-950">Handwriting assistance is not open yet. A selected image stays on this browser until uploads are enabled.</p> : data.membership.status !== 'active' ? <p role="status" className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm leading-7 text-indigo-950">Active Pro access is needed for new uploads, extraction and feedback. Your saved text and feedback remain available. <Link to="/account/membership" className="font-semibold text-indigo-700 underline">View membership</Link></p> : null}
    <label className="grid gap-2 text-sm font-semibold text-slate-700">Writing title<input required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} className={inputStyle} /></label>
    <label className="grid gap-2 text-sm font-semibold text-slate-700">Preparation attempt<select required value={attempt} onChange={e => setAttempt(e.target.value)} className={inputStyle}><option value="">Choose attempt</option>{data.attempts.map(a => <option key={a.id} value={a.id}>CSS {a.target_year}</option>)}</select></label>
    {data.attempts.length === 0 && <p className="text-sm leading-7"><Link to="/account/preparation?new=attempt" className="font-semibold text-indigo-700 underline">Create a preparation attempt</Link> before saving a page.</p>}
    {enabled && <><p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{data.configuration.processing_notice}</p><label className="flex min-h-11 items-start gap-3 text-sm leading-7"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-indigo-600" /><span>I understand how my page and confirmed text will be processed.</span></label></>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-800">{error}</p>}
    <button disabled={!enabled || !accepted || !file || !attempt || busy} className={`${buttonStyle} w-full`}>{busy ? 'Uploading…' : 'Upload page'}</button>
    <p className="flex items-start gap-2 text-xs leading-6 text-slate-500"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />You check and confirm the extracted text before feedback. A local preview does not upload your image.</p>
   </div>
  </div>
 </form>
}
