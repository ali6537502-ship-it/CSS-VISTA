import { useEffect, useState } from 'react'
import { loadAssessment, loadLesson } from './content'
import { Exercise, action, surface, type UpdateStudy } from './Exercise'
import type { StudyState } from './state'
import { DEPTHS, type Catalog, type Item } from './types'

export default function Lab({ catalog, state, update, mode, attempt, requestedItem, initialDay }: { catalog: Catalog; state: StudyState; update: UpdateStudy; mode: string; attempt?: string; requestedItem?: string; initialDay?: number }) {
  const [day, setDay] = useState(initialDay ?? state.cursor.day), [depth, setDepth] = useState('all'), [kind, setKind] = useState('all'), [now, setNow] = useState(() => Date.now())
  const [loaded, setLoaded] = useState<{ key: string; items?: Item[]; error?: string }>(), [retry, setRetry] = useState(0), [position, setPosition] = useState(0)
  const assessment = /^(?:diagnostic|phase-[1-4])$/.test(mode)
  const special = catalog.assessments.some(a => a.id === mode), dueMode = mode === 'due' || mode === 'errors'
  const eligible = catalog.items.filter(q => q.type === 'objective' && state.answers[q.id] && (mode === 'due' ? state.reviews[q.id]?.dueAt <= now : (state.answers[q.id].first !== q.answer || state.reviews[q.id]?.lapses > 0) && (state.reviews[q.id]?.streak ?? 0) < 2)).sort((a, b) => (state.reviews[a.id]?.dueAt ?? 0) - (state.reviews[b.id]?.dueAt ?? 0))
  const [queue, setQueue] = useState(() => eligible.map(q => q.id))
  const key = dueMode ? `${mode}:${queue.join(',')}` : special ? mode : `${mode}:${day}`
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    let active = true
    const load = async () => {
      if (special) return (await loadAssessment(mode)).items
      if (dueMode) {
        const indexes = key.split(':')[1].split(',').filter(Boolean).map(id => catalog.items.find(q => q.id === id)!)
        const days = [...new Set(indexes.filter(q => q.day > 0).map(q => q.day))], diagnostics = [...new Set(indexes.filter(q => q.day === 0).map(q => q.group))]
        const lessons = await Promise.all(days.map(loadLesson)), assessments = await Promise.all(diagnostics.map(loadAssessment))
        const pool = [...lessons.flatMap(l => [...l.questions, ...l.corrections, ...l.transformations, l.writing, ...l.recall]), ...assessments.flatMap(a => a.items)]
        return indexes.flatMap(q => { const item = pool.find(i => i.id === q.id); return item ? [item] : [] })
      }
      const l = await loadLesson(day)
      if (mode === 'transformations') return [...l.transformations, ...l.questions.filter(q => q.type === 'response' && ['transformation', 'combining', 'splitting', 'ordering'].includes(q.kind))]
      if (mode === 'analysis') return l.questions.filter(q => q.type === 'response' && ['analysis', 'classification', 'function', 'ordering', 'comparison'].includes(q.kind))
      if (mode === 'editing') return [...l.corrections, ...l.questions.filter(q => q.type === 'response' && ['paragraph-edit', 'correction'].includes(q.kind))]
      return [...l.questions, ...l.corrections, ...l.transformations, l.writing, ...l.recall]
    }
    void load().then(items => { if (active) { setLoaded({ key, items }); setPosition(Math.max(0, items.findIndex(q => q.id === requestedItem))) } }).catch(e => { if (active) setLoaded({ key, error: e.message }) })
    return () => { active = false }
  }, [catalog, day, dueMode, key, mode, requestedItem, retry, special])
  const items = loaded?.key === key ? loaded.items?.filter(q => (depth === 'all' || q.difficulty === depth) && (kind === 'all' || q.type === kind)) : undefined
  const at = Math.min(position, Math.max(0, (items?.length ?? 1) - 1)), item = items?.[at]
  const title = special ? catalog.assessments.find(a => a.id === mode)!.title : mode === 'due' ? 'Spaced retrieval' : mode === 'errors' ? 'Error diagnosis notebook' : mode === 'analysis' ? 'Advanced sentence analysis lab' : mode === 'editing' ? 'Correction and editing lab' : mode === 'transformations' ? 'Sentence transformation lab' : 'Master revision bank'
  return <section className="space-y-5" aria-label={title}>
    <div className={surface}><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-7 text-slate-700">{special ? 'Answer from your current knowledge. Objective feedback uses verified keys; written responses use model solutions and self-review rubrics. Results are practice evidence, not a proficiency certificate.' : dueMode ? 'Revisit the grammatical principle, compare your recorded response and attempt retrieval. A repeated item supplies retention evidence; it does not become a new independent question.' : 'Choose any topic at any time. These are the same authored tasks linked from the course; changing the view does not create additional questions or rewrite earlier responses.'}</p>
      {!special && !dueMode && <label className="mt-4 block text-sm font-semibold">Topic day<select value={day} onChange={e => setDay(Number(e.target.value))} className="mt-2 min-h-12 w-full rounded-xl border border-slate-400 bg-white px-3 font-normal">{catalog.days.map(d => <option value={d.day} key={d.day}>Day {d.day} · {d.title}</option>)}</select></label>}
      <div className="mt-4 flex flex-wrap gap-4"><label className="text-sm font-semibold">Difficulty<select value={depth} onChange={e => { setDepth(e.target.value); setPosition(0) }} className="ml-3 min-h-11 rounded-lg border border-slate-400 bg-white px-3 font-normal"><option value="all">All layers</option>{DEPTHS.map(d => <option key={d}>{d}</option>)}</select></label><label className="text-sm font-semibold">Response type<select value={kind} onChange={e => { setKind(e.target.value); setPosition(0) }} className="ml-3 min-h-11 rounded-lg border border-slate-400 bg-white px-3 font-normal"><option value="all">All activities</option><option value="objective">Objective only</option><option value="response">Written response</option></select></label>{dueMode && <button className={action} onClick={() => setQueue(eligible.map(q => q.id))}>Refresh review queue</button>}</div>
    </div>
    {loaded?.key === key && loaded.error ? <div role="alert" className={surface}><p>{loaded.error}</p><button className={`${action} mt-3`} onClick={() => setRetry(n => n + 1)}>Retry practice</button></div> : items ? <>
      <p className="text-sm leading-7 text-slate-600" role="status">{items.length} matching tasks{items.length ? ` · Task ${at + 1}` : ''}.</p>
      {item && <Exercise key={`${item.id}:${mode}`} {...{ item, catalog, state, update, attempt }} retrieval={dueMode} feedbackEnabled={!assessment || Boolean(loaded?.items?.every(q => q.type === 'objective' ? state.answers[q.id] : state.drafts[q.id]?.trim()))} />}
      {item && dueMode && state.answers[item.id] && <div className={`${surface} text-sm leading-7`}><h3 className="font-semibold">Recorded response and review history</h3><p className="mt-2">First response: {item.type === 'objective' ? item.options[state.answers[item.id].first] : ''}</p><p>Most recent response: {item.type === 'objective' ? item.options[state.answers[item.id].latest] : ''}</p><p>Recorded responses: {state.answers[item.id].exposures} · spaced successes: {state.reviews[item.id]?.streak ?? 0} · lapses: {state.reviews[item.id]?.lapses ?? 0}.</p><p>Review due: {state.reviews[item.id] ? new Date(state.reviews[item.id].dueAt).toLocaleString() : 'Now'}.</p></div>}
      {items.length > 0 && <nav className="flex flex-wrap justify-between gap-3" aria-label="Practice task navigation"><button className={action} disabled={at === 0} onClick={() => setPosition(at - 1)}>Previous task</button><button className={action} disabled={at === items.length - 1} onClick={() => setPosition(at + 1)}>Next task</button></nav>}
      {!items.length && <div className={surface}><p className="text-sm leading-7">{dueMode ? 'There are no matching reviews in this queue. You can continue with topic practice while waiting for the next scheduled retrieval.' : 'No tasks match these filters. Try another day or clear the difficulty and response-type filters.'}</p></div>}
    </> : <p role="status">Opening practice…</p>}
  </section>
}
