import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { readDraft, useAutosavedDraft } from '@/hooks/useAutosavedDraft'
import { learningRequest, saveIdentity } from '@/features/learning/api'
import { FilePenLine, ScanLine, CheckCircle2, Sparkles, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { panelStyle, primaryStyle as buttonStyle, secondaryStyle, inputStyle } from './styles'
import { stateNames, type HandwritingDetail, type HandwritingPage } from './api'
function TranscriptionEditor({ page, refresh, busy, act, onDirty }: { page: HandwritingPage; refresh: () => void; busy: boolean; act: (action: 'edit' | 'confirm' | 'extract' | 'evaluate', text?: string) => Promise<void>; onDirty: (dirty: boolean) => void }) {
 const { user } = useAccount(), transcription = page.transcription!
 const key = `handwriting:v1:${user?.id}:${page.id}`
 const [draft, setDraft] = useState(() => { const saved = readDraft<{ text: string; baseVersion: number }>(key); return saved && typeof saved.text === 'string' && Number.isInteger(saved.baseVersion) ? { ...saved, baseVersion: saved.text === transcription.text ? transcription.version : saved.baseVersion } : { text: transcription.text, baseVersion: transcription.version } })
 const { status } = useAutosavedDraft(key, draft), [accepted, setAccepted] = useState(false)
 const changed = draft.text !== transcription.text, outdated = draft.baseVersion !== transcription.version
 useEffect(() => { onDirty(changed || outdated) }, [changed, outdated, onDirty])
 const editable = ['awaiting_confirmation', 'confirmed', 'completed', 'evaluation_failed'].includes(page.state)
 const confirmed = page.confirmed_version === transcription.version && !changed && !outdated
 return <section className={`${panelStyle} min-w-0 space-y-5`}><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><FilePenLine className="h-5 w-5" aria-hidden="true" /></span><h2 className="text-xl font-semibold tracking-tight">Check your transcription</h2></div>
  <p className="text-sm leading-7 text-slate-600">Compare every word with your page. Correct misread words, preserve your original wording and save corrections before confirming. Transcription is not an evaluation.</p>
  {transcription.uncertain && <p className="rounded-lg bg-amber-50 p-4 text-sm leading-7">Some words may be unreadable. Check the entire paragraph and replace every [unreadable] marker.</p>}
  <label className="grid gap-2 text-sm font-semibold">Transcribed paragraph<textarea value={draft.text} disabled={!editable || busy} maxLength={6000} rows={10} onChange={e => { setDraft(d => ({ ...d, text: e.target.value })); setAccepted(false) }} className={`${inputStyle} resize-y bg-white text-base leading-8 sm:min-h-80`} /></label>
  <p role="status" className="text-sm leading-7 text-slate-500">{status === 'error' ? 'Browser draft could not be saved. Keep this page open and save corrections.' : status === 'saved' ? 'Draft saved on this browser. Save corrections to update the account copy.' : 'Saving browser draft…'}</p>
  {outdated && <div className="rounded-lg border border-amber-200 p-4 text-sm leading-7"><p>Your browser draft started from an older transcription. Review the current saved text before continuing.</p><details className="mt-2"><summary className="cursor-pointer font-semibold">Current saved transcription</summary><p className="mt-3 whitespace-pre-wrap break-words">{transcription.text}</p></details><button type="button" className={`${secondaryStyle} mt-3`} onClick={() => { setDraft(d => ({ ...d, baseVersion: transcription.version })); setAccepted(false) }}>Keep my draft after reviewing the saved text</button></div>}
  <div className="flex flex-wrap gap-3"><button disabled={!editable || !changed || outdated || busy} onClick={() => void act('edit', draft.text)} className={secondaryStyle}>Save corrections</button><button disabled={busy} onClick={refresh} className={secondaryStyle}>Refresh saved text</button></div>
  {changed && <p className="text-sm leading-7 text-slate-600">Save these corrections before confirmation or evaluation. Changing the transcription requires a new confirmation.</p>}
  {!confirmed && editable && <><label className="flex min-h-11 items-start gap-3 text-sm leading-7"><input type="checkbox" disabled={changed || outdated || busy} checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-indigo-600" /><span>I checked every word. This saved transcription matches my handwritten paragraph.</span></label><button disabled={!accepted || changed || outdated || busy} onClick={() => void act('confirm')} className={buttonStyle}>Confirm transcription</button></>}
  {confirmed && <p className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-7 text-indigo-950"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />This exact saved version is confirmed. Your original page is no longer needed for feedback.</p>}
 </section>
}
export default function HandwritingDetailView({ data, refresh }: { data: HandwritingDetail; refresh: () => void }) {
 const { user } = useAccount(), page = data.page
 const [busy, setBusy] = useState(false), [error, setError] = useState(''), [dirty, setDirty] = useState(true)
 const alive = useRef(true), running = useRef(false)
 useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
 async function act(action: 'edit' | 'confirm' | 'extract' | 'evaluate', text?: string) {
  if (!user || running.current) return; running.current = true; setBusy(true); setError('')
  const body = { action, page_id: page.id, expected_version: page.transcription?.version || 0, ...(action === 'edit' ? { text } : action === 'confirm' ? { confirmed: true } : {}) }
  try { const identity = await saveIdentity(user.id, `handwriting:${page.id}:${action}`, body); await learningRequest(user.id, 'handwriting.php', { ...body, request_id: identity.id }); identity.done(); if (alive.current) refresh() }
  catch (cause) { if (alive.current) { setError(cause instanceof Error ? cause.message : 'The request could not be completed. Refresh the saved status before trying again.'); refresh() } }
  finally { running.current = false; if (alive.current) setBusy(false) }
 }
 const enabled = data.configuration.enabled && data.membership.status === 'active'
 const pending = ['extracting', 'evaluating'].includes(page.state)
 const result = page.operation?.feature === 'handwriting' && page.operation.state === 'succeeded' && page.operation.version_id === page.confirmed_text_version_id ? page.operation.result : null
 useEffect(() => { if (!pending) return; const timer = window.setInterval(refresh, 3000); return () => window.clearInterval(timer) }, [pending, refresh])
 return <div className="space-y-6">
  <div className="grid items-start gap-6 lg:grid-cols-[.85fr_1.15fr]">
  <section className={`${panelStyle} min-w-0`}><p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700"><ScanLine className="h-4 w-4" aria-hidden="true" /> Source page</p><h2 className="break-words text-xl font-semibold tracking-tight">{page.title}</h2><p className="mt-3 inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold leading-6 text-indigo-800">{stateNames[page.state] || 'Status unavailable'}</p>
   {page.image_available && <img src={`/api/student/handwriting-image.php?page_id=${encodeURIComponent(page.id)}`} alt="Your temporarily stored handwritten page" className="mt-5 h-72 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 object-contain sm:h-96" />}
   {!page.image_available && <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6"><ShieldCheck className="mb-3 h-6 w-6 text-indigo-600" aria-hidden="true" /><p className="text-sm leading-7 text-slate-500">The temporary page image is no longer available. Saved text and feedback remain in your account.</p></div>}
   {page.image_cleanup_pending && <p role="status" className="mt-3 text-sm leading-7">Image deletion is pending. The image is no longer served and cleanup will retry.</p>}
   {['uploaded', 'extraction_failed', 'awaiting_confirmation'].includes(page.state) && page.image_available && <button disabled={!enabled || busy} onClick={() => void act('extract')} className={`${buttonStyle} mt-5`}>{busy ? 'Processing…' : page.state === 'uploaded' ? 'Extract handwriting' : 'Retry extraction'}</button>}
   {pending && <p role="status" className="mt-4 text-sm leading-7">Processing your saved request. You can leave this page and return to check its status.</p>}
   {page.state === 'outcome_unknown' && <p role="status" className="mt-4 rounded-lg border border-amber-200 p-4 text-sm leading-7">The request outcome is unresolved. Its allowance remains reserved. Refresh to check the same request; starting another call could duplicate processing.</p>}
   {page.state === 'unreadable' && <p className="mt-4 text-sm leading-7">This page could not be read reliably. Choose a clearer image with one paragraph. No wording has been guessed.</p>}
   {page.state === 'evaluation_failed' && <p className="mt-4 text-sm leading-7">Useful feedback was not saved. Your confirmed text remains available. A new evaluation attempt counts toward the daily attempt limit.</p>}
   {!enabled && <p className="mt-4 text-sm leading-7">New extraction and evaluation are unavailable. You can still read your saved work and confirm existing transcription.</p>}
   <button onClick={refresh} disabled={busy} className={`${secondaryStyle} mt-4`}>Refresh page status</button>
  </section>
  {page.transcription && <TranscriptionEditor key={page.transcription.version} page={page} refresh={refresh} busy={busy} act={act} onDirty={setDirty} />}
  </div>
  {['confirmed', 'evaluation_failed'].includes(page.state) && <section className={`${panelStyle} border-indigo-200 bg-indigo-50/30`}><h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Feedback on confirmed wording</h2><p className="mt-3 text-sm leading-7 text-slate-600">Feedback uses only the version you explicitly confirmed. It provides anchored findings and hints for your next attempt, without replacing your paragraph or assigning examination marks.</p><button disabled={!enabled || busy || dirty} onClick={() => void act('evaluate')} className={`${buttonStyle} mt-4`}>{busy ? 'Processing…' : 'Evaluate confirmed paragraph'}</button></section>}
  {result && 'summary' in result && <section className={`${panelStyle} space-y-5`}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white"><Sparkles className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="text-xl font-semibold tracking-tight">Saved feedback</h2><p className="mt-1 text-xs text-slate-500">Based on your confirmed wording</p></div></div><p className="whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-5 leading-8 text-slate-700">{result.summary}</p>{result.findings.map((finding, i) => <article key={`${finding.code}:${i}`} className="space-y-3 rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold capitalize text-slate-900">{finding.code.replaceAll('_', ' ')}</p><span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">{finding.severity}</span></div><blockquote className="whitespace-pre-wrap break-words border-l-2 border-indigo-400 bg-indigo-50/50 p-4 leading-8 text-slate-800">{finding.excerpt}</blockquote><p className="leading-8">{finding.explanation}</p><p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600"><span className="font-semibold text-slate-900">Try next: </span>{finding.hint}</p></article>)}{page.writing_id && <Link to={`/account/preparation?writing=${encodeURIComponent(page.writing_id)}`} className={buttonStyle}>Practise a rewrite <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>}</section>}
  {page.writing_id && <p className="text-sm leading-7"><Link to={`/account/preparation?writing=${encodeURIComponent(page.writing_id)}`} className="font-semibold text-indigo-700 underline">Open saved writing versions</Link> · <Link to="/account/ai-usage" className="font-semibold text-indigo-700 underline">Previous operation results</Link></p>}
  {error && <p role="alert" className="rounded-xl border border-red-200 p-4 text-sm leading-7 text-red-800">{error}</p>}
 </div>
}
