import { Link } from 'react-router'
import { panelStyle, inputStyle } from '@/features/handwriting/styles'
import { grammarLink, type Detail } from './api'
export default function Review({ data, onVersion }: { data: Detail; refresh: () => void; onVersion: (id: string) => void }) {
  const v = data.version
  return <section className={`${panelStyle} min-w-0 space-y-5`}>
    <h2 className="text-xl font-semibold">Saved wording</h2><p className="font-semibold">{data.writing.title}</p>
    <label className="grid gap-2 text-sm font-semibold">Saved version<select className={inputStyle} value={v.id} onChange={event => onVersion(event.target.value)}>{data.writing.versions.map(version => <option key={version.id} value={version.id}>Version {version.version} · {version.word_count} words</option>)}</select></label>
    <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-5 leading-8">{v.text}</p>
    <p className="text-sm leading-7">Review one point at a time: complete sentences, clear references, precise wording and connected ideas. Save a rewrite to compare your versions.</p>
    <Link className="inline-flex min-h-11 items-center font-semibold underline" to="/account/expression?view=guide">Open the free expression guide</Link>
    {v.feedback && <details><summary className="min-h-11 cursor-pointer font-semibold">Earlier saved feedback</summary><p className="my-3 leading-7">{v.feedback.summary}</p>{v.feedback.findings.map((finding, index) => <article key={`${finding.code}:${index}`} className="mt-4 rounded-xl border p-4"><h3 className="font-semibold">{finding.label}</h3><p className="mt-2 whitespace-pre-wrap">{finding.excerpt}</p><p className="mt-2 leading-7">{finding.explanation}</p><p className="mt-2 leading-7">{finding.hint}</p><Link className="inline-flex min-h-11 items-center underline" to={grammarLink(finding.lesson_day)}>Practise this grammar point</Link></article>)}</details>}
  </section>
}
