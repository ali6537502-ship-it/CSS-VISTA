import { useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, FileCheck2, Sparkles } from 'lucide-react'
import { panelStyle, secondaryStyle, inputStyle } from '@/features/handwriting/styles'
import { grammarLink, type Detail } from './api'
export default function Review({ data, onVersion, refresh }: { data: Detail; onVersion: (id: string) => void; refresh: () => void }) {
 const versionSelect = useId()
 const v = data.version, writing = data.writing
 const [excerpt, setExcerpt] = useState('')
 const savedText = useRef<HTMLParagraphElement>(null)
 const kind = writing.kind === 'sentence' ? 'sentence' : 'paragraph'
 const index = excerpt ? v.text.indexOf(excerpt) : -1
 return <section className={`${panelStyle} min-w-0 space-y-5`}>
  <h2 className="flex items-center gap-3 text-xl font-semibold tracking-tight"><FileCheck2 className="h-5 w-5 text-indigo-600" aria-hidden="true" />Saved wording</h2>
  <p className="break-words text-sm font-semibold text-slate-800">{writing.title}</p><label htmlFor={versionSelect} className="grid gap-2 text-sm font-semibold">Saved version<select id={versionSelect} value={v.id} onChange={e => onVersion(e.target.value)} className={inputStyle}>{writing.versions.map(version => <option key={version.id} value={version.id}>Version {version.version} · {version.word_count} words</option>)}</select></label>
  <p className="text-xs leading-6 text-slate-500">Version {v.version} · {v.word_count} words · {kind === 'sentence' ? 'short expression' : 'paragraph'}. Earlier feedback, when present, belongs to this saved wording.</p>
  <p ref={savedText} tabIndex={-1} aria-label="Saved writing text" className="whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-base leading-8 focus:outline focus:outline-2 focus:outline-indigo-500">{index < 0 ? v.text : <>{v.text.slice(0, index)}<mark className="rounded bg-indigo-100 px-0.5 text-indigo-950">{excerpt}</mark>{v.text.slice(index + excerpt.length)}</>}</p>
  <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7"><h3 className="font-semibold">Review before rewriting</h3><ul className="mt-2 list-disc space-y-2 pl-5"><li>Is the subject and main action clear?</li><li>Does each sentence develop the intended point?</li><li>Are references, time and conditions unchanged?</li><li>Can you explain why each change improves clarity?</li></ul><p className="mt-3">New AI evaluation is cancelled. Compare your independent revisions and keep your original meaning.</p></div>
  {v.feedback && <div className="space-y-4 border-t border-slate-200 pt-5"><h3 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5 text-indigo-600" aria-hidden="true" />Historical saved feedback</h3><p className="whitespace-pre-wrap break-words rounded-2xl bg-indigo-50/60 p-4 text-sm leading-7 text-indigo-950">{v.feedback.summary}</p>{v.feedback.findings.map((f, i) => <article key={`${f.code}:${i}`} className="space-y-3 rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold">{f.label}</h4><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{f.severity}</span></div><p className="text-xs text-slate-500">{f.category}</p><button aria-pressed={excerpt === f.excerpt} onClick={() => { setExcerpt(f.excerpt); savedText.current?.focus({ preventScroll: true }); savedText.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' }) }} className="min-h-11 w-full whitespace-pre-wrap break-words rounded-xl border-l-2 border-indigo-400 bg-indigo-50 p-3 text-left text-sm leading-7 text-indigo-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"><span className="mb-1 block text-xs font-semibold">Show excerpt in saved wording</span>{f.excerpt}</button><p className="text-sm leading-7">{f.explanation}</p><p className="text-sm leading-7"><span className="font-semibold">Hint: </span>{f.hint}</p><p className="text-xs leading-6 text-slate-500">{f.rewrite_instruction}</p><Link to={grammarLink(f.lesson_day, writing.id, v.id, writing.attempt_id)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline"><BookOpen className="h-4 w-4" aria-hidden="true" />Practise {f.label}</Link></article>)}</div>}
  <button onClick={refresh} className={secondaryStyle}>Refresh saved status</button>

 </section>
}
