import { useState } from 'react'
import { Link } from 'react-router'
import { addMistake } from '@/lib/progress'
import { answerStudy, type StudyState } from './state'
import { conceptHref, loadItem } from './content'
import type { Catalog, Item, ResponseTask } from './types'

export const action = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-indigo-600 disabled:opacity-50'
export const primary = `${action} !border-indigo-700 !bg-indigo-700 !text-white hover:!bg-indigo-800`
export const surface = 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-7'
export type UpdateStudy = (fn: (state: StudyState) => StudyState) => void
export function ResponseExercise({ item, state, update, feedbackEnabled = true }: { item: ResponseTask; state: StudyState; update: UpdateStudy; feedbackEnabled?: boolean }) {
  const revealed = state.revealed.includes(item.id), draft = state.drafts[item.id] ?? ''
  return <article className={surface} id={item.id} aria-label={`${item.kind} practice`}>
    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">{item.kind.replaceAll('-', ' ')} · {item.difficulty} · {item.ability}</p>
    <h4 className="mt-3 whitespace-pre-line text-base font-semibold leading-7 text-slate-950">{item.prompt}</h4>
    <label className="mt-4 block text-sm font-semibold">Your response
      <textarea value={draft} onChange={e => { const value = e.target.value; update(s => ({ ...s, drafts: { ...s.drafts, [item.id]: value } })) }} rows={item.kind === 'writing' || item.kind === 'paragraph-edit' ? 7 : 3} className="mt-2 w-full rounded-xl border border-slate-400 bg-white p-3 font-normal leading-7" />
    </label>
    {!feedbackEnabled ? <p className="mt-4 text-sm leading-7 text-indigo-950" role="status">Your response is retained. Attempt all tasks in this assessment before opening models and feedback.</p> : !revealed ? <button className={`${action} mt-4`} disabled={!draft.trim()} onClick={() => update(s => ({ ...s, revealed: [...new Set([...s.revealed, item.id])] }))}>Compare with model and rubric</button> : <div className="mt-4 space-y-4 rounded-xl bg-indigo-50 p-4 text-sm leading-7" role="status">
      <div><p className="font-semibold">One model solution</p><p className="mt-2 whitespace-pre-line">{item.model}</p></div>
      <div><p className="font-semibold">Check your reasoning</p><ul className="mt-2 list-disc space-y-1 pl-5">{item.rubric.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
      {item.alternatives.length > 0 && <div><p className="font-semibold">Other defensible responses</p><ul className="mt-2 list-disc space-y-1 pl-5">{item.alternatives.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
      <label className="block font-semibold">Your self-review
        <select value={state.selfReviews[item.id] ?? ''} onChange={e => { const rating = e.target.value as StudyState['selfReviews'][string]; if (rating) update(s => ({ ...s, selfReviews: { ...s.selfReviews, [item.id]: rating } })) }} className="mt-2 min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 font-normal">
          <option value="">Choose after comparing</option><option value="needs-work">I need to revise this</option><option value="developing">Some criteria met</option><option value="meets-rubric">I judge that the criteria are met</option>
        </select>
      </label>
    </div>}
    <p className="mt-4 text-xs leading-6 text-slate-600">This is self-review. Revealing a model or selecting a label does not objectively grade your English or establish mastery.</p>
  </article>
}
export function Exercise({ item, catalog, state, update, attempt, retrieval = false, feedbackEnabled = true }: { item: Item; catalog: Catalog; state: StudyState; update: UpdateStudy; attempt?: string; retrieval?: boolean; feedbackEnabled?: boolean }) {
  const [retry, setRetry] = useState(retrieval), [submitted, setSubmitted] = useState(false)
  const [reinforcement, setReinforcement] = useState<ResponseTask>(), [error, setError] = useState('')
  if (item.type === 'response') return <ResponseExercise item={item} state={state} update={update} feedbackEnabled={feedbackEnabled} />
  const prior = state.answers[item.id], answered = Boolean(prior) && (!retry || submitted), selected = answered ? prior.latest : undefined
  const answerKey = item.answer
  const correct = selected === answerKey, concept = catalog.concepts.find(c => c.id === item.conceptId), q = catalog.items.find(q => q.id === item.id)
  function answer(option: number) {
    if (!q || answered) return
    update(s => answerStudy(s, q, option, Date.now())); setSubmitted(true)
    if (option !== answerKey) addMistake(item.id, option, `Grammar · ${concept?.title ?? 'Practice'}`)
  }
  return <article id={item.id} className={surface} aria-label="Objective grammar practice">
    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">{item.kind === 'spot' ? 'Error analysis' : item.kind === 'gap' ? 'Contextual gap' : 'Choose one answer'} · {item.difficulty} · {item.ability}</p>
    <h4 className="mt-3 whitespace-pre-line text-base font-semibold leading-7 text-slate-950">{item.prompt}</h4>
    {prior && <p className="mt-2 text-xs leading-6 text-slate-600">Previously seen · {prior.exposures} recorded response{prior.exposures === 1 ? '' : 's'}. The first-response record stays fixed.</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2" role="group" aria-label="Answer options">{item.options.map((option, index) => <button key={index} type="button" disabled={answered} onClick={() => answer(index)} className={`min-h-12 rounded-xl border p-3 text-left text-sm leading-7 ${answered && feedbackEnabled && index === item.answer ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : answered && index === selected ? 'border-indigo-700 bg-indigo-50 text-indigo-950' : 'border-slate-400 bg-white text-slate-900 hover:border-indigo-700'} disabled:cursor-default`}>
      <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span>{option}{answered && index === selected && <span className="ml-2 font-semibold">Your response</span>}{answered && feedbackEnabled && index === item.answer && <span className="ml-2 font-semibold">Correct answer</span>}
    </button>)}</div>
    {answered && !feedbackEnabled && <p role="status" className="mt-4 text-sm leading-7">Response saved. Feedback opens after every task in this assessment has a response.</p>}
    {answered && feedbackEnabled && <div role="status" className={`mt-4 rounded-xl p-4 text-sm leading-7 ${correct ? 'bg-emerald-50 text-emerald-950' : 'bg-amber-50 text-amber-950'}`}>
      <p className="font-semibold">{correct ? 'Correct on this response.' : 'Review the distinction.'}</p><p className="mt-2">{item.why}</p><p className="mt-2 text-xs">Review category: {q ? catalog.errorCategories[q.errorCategory] : 'Grammar'}. This labels the task’s grammatical issue; it does not diagnose your thought process.</p>
      {concept && <p className="mt-3"><Link className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4" to={conceptHref(concept, attempt)}>Review {concept.title}</Link> · <Link className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4" to={`/grammar-course?view=reference&concept=${concept.id}${attempt ? `&attempt=${attempt}` : ''}`}>Advanced reference</Link></p>}
      {state.reviews[item.id] && <p className="mt-2 text-xs">Next retrieval: {new Date(state.reviews[item.id].dueAt).toLocaleString()}. Same-day retries do not advance the spaced-review schedule.</p>}
      <button className={`${action} mt-3`} onClick={() => { setRetry(true); setSubmitted(false) }}>Try this item again</button>
      {!correct && q?.reinforcementId && !reinforcement && <button className={`${action} ml-2 mt-3`} onClick={() => { void loadItem(catalog, q.reinforcementId!).then(task => { if (task?.type === 'response') setReinforcement(task) }).catch(cause => setError(cause.message)) }}>Short reinforcement exercise</button>}
      {error && <p role="alert" className="mt-3">{error}</p>}
    </div>}
    {reinforcement && <div className="mt-4"><h4 className="mb-3 text-sm font-semibold">Apply the same grammatical principle</h4><ResponseExercise item={reinforcement} state={state} update={update} /></div>}
  </article>
}
