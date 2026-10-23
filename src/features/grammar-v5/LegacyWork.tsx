import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { grammarLessons } from '@/data/grammarCourse'
import { courseKey, type CourseState } from '@/features/grammar/state'
import { learningRequest } from '@/features/learning/api'
import { action, surface } from './Exercise'
import { dayHref } from './content'

import { LEGACY_DAY_MAP } from './legacyMap'

export default function LegacyWork({ user, attempt }: { user?: string; attempt?: string }) {
  const [copy, setCopy] = useState<{ state?: CourseState; error?: string; loaded: boolean }>({ loaded: false })
  useEffect(() => {
    let active = true
    if (user && attempt) void learningRequest<{ state: CourseState | null }>(user, `grammar.php?attempt_id=${attempt}`).then(r => { if (active) setCopy({ state: r.state ?? undefined, loaded: true }) }).catch(e => { if (active) setCopy({ error: e.message, loaded: true }) })
    else {
      try { const raw = localStorage.getItem(courseKey(user)) ?? (!user ? localStorage.getItem('cssvista:grammar-course:v3') : null); setCopy({ state: raw ? JSON.parse(raw) : undefined, loaded: true }) }
      catch { setCopy({ loaded: true, error: 'The earlier browser record could not be read. It has not been changed.' }) }
    }
    return () => { active = false }
  }, [attempt, user])
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ edition: 'legacy-v4', state: copy.state, user: user ?? null, attempt: attempt ?? null }, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'css-vista-earlier-grammar-work.json'; a.click(); URL.revokeObjectURL(url)
  }
  return <section className="space-y-5" aria-label="Earlier course work"><div className={surface}><h2 className="text-2xl font-semibold">Your earlier course work</h2><p className="mt-3 text-sm leading-7 text-slate-700">Earlier notes, responses, completions and account records remain in their original edition. The new syllabus has different lessons and verified assessment keys, so earlier completion is historical study evidence and is not transferred into new mastery claims.</p><p className="mt-3 text-sm leading-7 text-slate-700">The audit found unreliable items in the earlier teaching. This archive preserves your work and links it to the corresponding new topics; use the reconstructed lessons for current instruction.</p>{copy.state && <button className={`${action} mt-4`} onClick={download}>Export earlier work</button>}</div>
    {!copy.loaded ? <p role="status">Opening earlier work…</p> : copy.error ? <p role="alert" className={surface}>{copy.error}</p> : !copy.state ? <p className={surface}>No earlier work was found in this account and preparation attempt, or this browser scope. Other account and guest records remain separate.</p> : grammarLessons.filter(l => copy.state!.completed?.includes(l.day) || copy.state!.notes?.[String(l.day)] || copy.state!.sessions?.[String(l.day)]).map(l => {
      const session = copy.state!.sessions?.[String(l.day)]
      return <article className={surface} key={l.day}><h3 className="text-lg font-semibold">Earlier Day {l.day} · {l.title}</h3><p className="mt-2 text-sm text-slate-600">{copy.state!.completed?.includes(l.day) ? 'Historically recorded complete' : 'Earlier saved work'}. Scores and answer records are retained in the export.</p>{copy.state!.notes?.[String(l.day)] && <div className="mt-4"><h4 className="font-semibold">Your note</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{copy.state!.notes[String(l.day)]}</p></div>}{session?.writing && <div className="mt-4"><h4 className="font-semibold">Your writing</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{session.writing}</p></div>}{session?.drafts && Object.entries(session.drafts).some(([, value]) => value) && <details className="mt-4 rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer font-semibold">Earlier correction drafts</summary><ul className="mt-3 space-y-3 text-sm leading-7">{Object.entries(session.drafts).filter(([, value]) => value).map(([id, value]) => <li key={id}><p className="font-semibold">{l.corrections.find(c => c.id === id)?.task ?? id}</p><p className="mt-1 whitespace-pre-wrap">Your draft: {value}</p></li>)}</ul></details>}<div className="mt-5 flex flex-wrap gap-3">{LEGACY_DAY_MAP[l.day].map(d => <Link key={d} className={action} to={dayHref(d, 'orientation', attempt)}>New Day {d}</Link>)}</div></article>
    })}
  </section>
}
