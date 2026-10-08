import { Link } from 'react-router'
import { useState } from 'react'
import { ArrowUpRight, ChartNoAxesCombined, Clock3 } from 'lucide-react'
export type GrammarProfile = {
  rule_version: string; basis: string
  totals: { questions: number; correct: number; due: number; completed: number }
  writing: { reviewed_wordings: number; window_days: number; basis: string }
  items: { day: number; title: string; phase: string; state: string; answered: number; correct: number; available: number; due: number; unresolved: number; spaced_questions: number; demonstrated_questions: number; completed: boolean; writing: { label: string; state: string; flagged_writings: number; reviewed_writings: number }[] }[]
}
export default function Profile({ profile, dirty, imported, lessonLink, openLab }: { profile?: GrammarProfile; dirty: boolean; imported: boolean; lessonLink: (day: number) => string; openLab: () => void }) {
  const [filter, setFilter] = useState<'active' | 'review' | 'all'>('active')
  if (!profile) return <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">Your Grammar Profile</h2><p className="mt-3 text-sm leading-7 text-slate-600">Select a preparation attempt to build your profile from saved practice and writing feedback. You can keep using the public course in this browser.</p></section>
  const { totals } = profile
  const visible = profile.items.filter(item => filter === 'all' || (filter === 'review' ? item.due > 0 || item.state === 'Needs review' : item.state !== 'Not started'))
  return <section className="mt-6 space-y-6" aria-label="Personal Grammar Profile">
    <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-200"><ChartNoAxesCombined className="h-4 w-4" aria-hidden="true" />Your Grammar Profile</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">{totals.completed === 30 ? 'Keep your Grammar in practice' : totals.questions ? 'See what needs your attention' : 'Your evidence starts with practice'}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Your first responses, revision and writing feedback, together. Use them to choose your next lesson and keep reviewing throughout your preparation.</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
        {[['Distinct questions', `${totals.questions}/480`], ['First responses correct', totals.questions ? `${totals.correct}/${totals.questions}` : 'No responses yet'], ['Due for review', String(totals.due)], ['Course days complete', `${totals.completed}/30`]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-2 text-xl font-semibold">{value}</dd></div>)}
      </dl>
      <button type="button" onClick={openLab} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold">{totals.due ? 'Review due questions' : 'Open Error Lab'}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></button>
    </div>
    {dirty && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">This profile reflects the last account save. Your latest browser changes are awaiting sync.</p>}
    {imported && <p className="text-sm leading-7 text-slate-600">Earlier browser progress was explicitly copied into this attempt. It remains self-reported practice evidence.</p>}
    <details className="rounded-2xl border bg-white px-5 text-sm leading-7 text-slate-600"><summary className="flex min-h-12 cursor-pointer items-center font-semibold text-slate-900">How to read your profile</summary><p className="mt-2">{profile.basis}</p><p className="mt-3">“Needs review” flags unresolved mistakes or recurring writing findings. Two spaced successes resolve an earlier question error without changing its first-response score. “Improving” requires at least eight distinct questions, 70% supported by either a correct first response or two spaced successes, three questions reviewed twice and no unresolved mistakes or recurring writing weakness.</p><p className="my-3">Writing feedback covers this attempt’s last {profile.writing.window_days} days ({profile.writing.reviewed_wordings} distinct reviewed wordings). Missing feedback is not evidence of correctness. Opening a lesson, completing a checklist or retrying an answer does not establish mastery.</p></details>
    <div className="flex flex-wrap gap-2" aria-label="Filter Grammar Profile">{([['active', 'Your lessons'], ['review', 'Needs attention'], ['all', 'All lessons']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${filter === value ? 'bg-indigo-600 text-white' : 'border bg-white text-slate-600'}`}>{label}</button>)}</div>
    {!visible.length && <div className="rounded-2xl border border-dashed bg-white p-6"><h3 className="font-semibold">{filter === 'review' ? 'No review signal yet' : 'Start with your first lesson'}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{filter === 'review' ? 'Keep practising to build evidence. You can open any lesson or try a focused Error Lab session.' : 'Your lesson practice will appear here after it is saved to this attempt.'}</p><Link to={lessonLink(1)} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700">Open Day 1<ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(item => <article key={item.day} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap justify-between gap-2 text-xs"><span className="font-semibold text-slate-500">Day {item.day} · {item.completed ? 'Completed' : item.phase}</span><span className={`rounded-full px-3 py-1 font-semibold ${item.state === 'Needs review' ? 'bg-amber-100 text-amber-950' : item.state === 'Improving' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>{item.state}</span></div>
      <h3 className="mt-4 font-semibold leading-6 text-slate-900">{item.title}</h3>
      <p className="mt-3 text-sm text-slate-600">{item.answered ? `${item.correct}/${item.answered} distinct first responses correct` : 'No first-response evidence yet'}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Day ${item.day} distinct questions attempted`} aria-valuenow={item.answered} aria-valuemin={0} aria-valuemax={item.available}><div className="h-full rounded-full bg-indigo-500" style={{ width: `${100 * item.answered / item.available}%` }} /></div>
      <p className="mt-2 flex items-center gap-2 text-xs text-slate-600"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{item.due} due · {item.unresolved} unresolved · {item.spaced_questions} reviewed twice</p>
      {item.writing.map(f => <p key={f.label} className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-6">{f.label}: {f.state} · reported in {f.flagged_writings}/{f.reviewed_writings} writing records</p>)}
      <Link to={lessonLink(item.day)} className="mt-auto inline-flex min-h-11 items-center gap-2 pt-4 text-sm font-semibold text-indigo-700">{item.state === 'Needs review' ? 'Revisit lesson' : 'Open lesson'}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
    </article>)}</div>
  </section>
}
