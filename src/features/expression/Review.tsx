import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, FileCheck2, Sparkles } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { learningRequest, saveIdentity } from '@/features/learning/api'
import { panelStyle, primaryStyle, secondaryStyle, inputStyle } from '@/features/handwriting/styles'
import { grammarLink, type Detail, type Operation } from './api'
export default function Review({ data, onVersion, refresh }: { data: Detail; onVersion: (id: string) => void; refresh: () => void }) {
 const { user } = useAccount(), v = data.version, writing = data.writing
 const [accepted, setAccepted] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [excerpt, setExcerpt] = useState(''), [reported, setReported] = useState<Operation>()
 const alive = useRef(true), running = useRef(false), savedText = useRef<HTMLParagraphElement>(null)
 useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
 const operation = reported ? data.operations.find(o => o.id === reported.id) || reported : data.operations[0]
 const pending = operation && ['reserved', 'in_flight'].includes(operation.state)
 useEffect(() => { if (!pending) return; const interval = window.setInterval(refresh, 3000); return () => window.clearInterval(interval) }, [pending, refresh])
 const kind = writing.kind === 'sentence' ? 'sentence' : 'paragraph', usage = data.usage[kind]
 const allowed = data.configuration.enabled && data.membership.status === 'active' && usage.used + usage.reserved < usage.limit && usage.accepted < usage.limit * 3 && v.word_count <= data.configuration.max_words[kind] && v.text.length <= data.configuration.max_characters && !/\n\s*\n/u.test(v.text)
 async function evaluate() {
  if (!user || running.current || !accepted || !allowed) return; running.current = true; setBusy(true); setError('')
  const body = { action: 'evaluate', version_id: v.id, accepted: true, policy_version: data.configuration.policy_version }
  try { const identity = await saveIdentity(user.id, `expression:evaluate:${v.id}`, body); const response = await learningRequest<{ operation: Operation }>(user.id, 'expression.php', { ...body, request_id: identity.id }); identity.done(); if (alive.current) { setReported(response.operation); refresh() } }
  catch (cause) { if (alive.current) { setError(cause instanceof Error ? cause.message : 'Check saved status before retrying this request.'); refresh() } }
  finally { running.current = false; if (alive.current) setBusy(false) }
 }
 const index = excerpt ? v.text.indexOf(excerpt) : -1
 return <section className={`${panelStyle} min-w-0 space-y-5`}>
  <h2 className="flex items-center gap-3 text-xl font-semibold tracking-tight"><FileCheck2 className="h-5 w-5 text-indigo-600" aria-hidden="true" />Saved wording</h2>
  <p className="break-words text-sm font-semibold text-slate-800">{writing.title}</p><label className="grid gap-2 text-sm font-semibold">Saved version<select value={v.id} onChange={e => onVersion(e.target.value)} className={inputStyle}>{writing.versions.map(version => <option key={version.id} value={version.id}>Version {version.version} · {version.word_count} words</option>)}</select></label>
  <p className="text-xs leading-6 text-slate-500">Version {v.version} · {v.word_count} words · {kind === 'sentence' ? 'short expression' : 'paragraph'}. Feedback always uses this saved wording, independently of an unsaved rewrite.</p>
  <p ref={savedText} tabIndex={-1} aria-label="Saved writing text" className="whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-base leading-8 focus:outline focus:outline-2 focus:outline-indigo-500">{index < 0 ? v.text : <>{v.text.slice(0, index)}<mark className="rounded bg-indigo-100 px-0.5 text-indigo-950">{excerpt}</mark>{v.text.slice(index + excerpt.length)}</>}</p>
  {pending && <p role="status" className="rounded-xl bg-indigo-50 p-4 text-sm leading-7">Your saved request is processing. You can return later; refreshing does not start another call.</p>}
  {operation?.state === 'unknown' && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7">This request’s outcome is unresolved. Its allowance stays reserved. Check the saved status before any further action.</p>}
  {operation?.state === 'failed' && <p className="text-sm leading-7 text-slate-600">Useful feedback was not saved. The successful-use allowance was released; this request still counts toward the attempt limit.</p>}
  {!data.configuration.enabled ? <p role="status" className="rounded-xl bg-indigo-50 p-4 text-sm leading-7">Expression feedback is not open yet. Saving, rewriting and reading your history remain available.</p> : data.membership.status !== 'active' ? <p role="status" className="text-sm leading-7">Active Pro access is needed for new feedback. <Link to="/account/membership" className="font-semibold text-indigo-700 underline">View membership</Link></p> : !allowed && !v.feedback && <p role="status" className="text-sm leading-7">Check the daily allowance and input limits before requesting feedback.</p>}
  {!v.feedback && !pending && operation?.state !== 'unknown' && <><p className="whitespace-pre-wrap text-xs leading-6 text-slate-500">{data.configuration.processing_notice}</p><label className="flex min-h-11 items-start gap-3 text-sm leading-7"><input type="checkbox" disabled={!allowed} checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-indigo-600" /><span>I reviewed this saved wording and understand how it will be processed for feedback.</span></label><button disabled={!allowed || !accepted || busy} onClick={() => void evaluate()} className={primaryStyle}><Sparkles className="h-4 w-4" aria-hidden="true" />{busy ? 'Processing…' : 'Evaluate saved version'}</button></>}
  {v.feedback && <div className="space-y-4 border-t border-slate-200 pt-5"><h3 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5 text-indigo-600" aria-hidden="true" />Saved diagnosis</h3><p className="whitespace-pre-wrap break-words rounded-2xl bg-indigo-50/60 p-4 text-sm leading-7 text-indigo-950">{v.feedback.summary}</p>{v.feedback.findings.map((f, i) => <article key={`${f.code}:${i}`} className="space-y-3 rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold">{f.label}</h4><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{f.severity}</span></div><p className="text-xs text-slate-500">{f.category}</p><button aria-pressed={excerpt === f.excerpt} onClick={() => { setExcerpt(f.excerpt); savedText.current?.focus({ preventScroll: true }); savedText.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' }) }} className="min-h-11 w-full whitespace-pre-wrap break-words rounded-xl border-l-2 border-indigo-400 bg-indigo-50 p-3 text-left text-sm leading-7 text-indigo-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"><span className="mb-1 block text-xs font-semibold">Show excerpt in saved wording</span>{f.excerpt}</button><p className="text-sm leading-7">{f.explanation}</p><p className="text-sm leading-7"><span className="font-semibold">Hint: </span>{f.hint}</p><p className="text-xs leading-6 text-slate-500">{f.rewrite_instruction}</p><Link to={grammarLink(f.lesson_day, writing.id, v.id)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline"><BookOpen className="h-4 w-4" aria-hidden="true" />Practise {f.label}</Link></article>)}</div>}
  <button onClick={refresh} disabled={busy} className={secondaryStyle}>Refresh saved status</button>
  {error && <p role="alert" className="rounded-xl border border-red-200 p-4 text-sm leading-7 text-red-800">{error}</p>}
 </section>
}
