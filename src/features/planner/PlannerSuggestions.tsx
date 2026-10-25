import { Link } from 'react-router'
import { Check, ChevronRight } from 'lucide-react'
import { getState, togglePlanTask } from '@/lib/store'
import { buildDailyPlan, localDateKey } from '@/lib/studyPlanner'
import { useAccountSnapshot } from '@/pages/account/shared'
import { useState } from 'react'

export default function PlannerSuggestions() {
  const { snapshot, refresh } = useAccountSnapshot()
  const [error, setError] = useState('')
  const settings = snapshot.state.studyPlanner
  const today = localDateKey()
  if (!settings) return null
  const tasks = buildDailyPlan(settings, snapshot.state.subjectProgress, today, snapshot.revision.due)
  const completed = snapshot.state.planTaskCompletions?.[today] || []
  function toggle(id: string) {
    const intended = !((getState().planTaskCompletions?.[today] || []).includes(id))
    togglePlanTask(today, id)
    if ((getState().planTaskCompletions?.[today] || []).includes(id) !== intended) setError('This suggestion check could not be saved. Please try again.')
    else { setError(''); refresh() }
  }
  return <details className="pl-history pl-suggestions"><summary>Optional daily suggestions · {tasks.filter(task => completed.includes(task.id)).length} / {tasks.length} checked</summary><p className="pl-muted">Suggestions from the existing planning engine. Their checks are separate from your scheduled task records.</p><div>{tasks.map(task => <article key={task.id}><button className="pl-check" aria-pressed={completed.includes(task.id)} aria-label={`Mark suggestion ${task.title} ${completed.includes(task.id) ? 'incomplete' : 'complete'}`} onClick={() => toggle(task.id)}>{completed.includes(task.id) ? <Check size={16}/> : <span/>}</button><div><p className="pl-kicker">{task.subject} · {task.minutes} min estimated</p><h3>{task.title}</h3><p>{task.detail}</p></div><Link className="pl-secondary" to={task.to}>Start <ChevronRight size={15}/></Link></article>)}</div>{error && <p className="pl-error" role="alert">{error}</p>}</details>
}
