import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Check, NotebookPen, Plus, Save, Target, Trash2 } from 'lucide-react'
import { getState, setGoalChecklist, setQuickNotes, type VistaState } from '@/lib/store'
import { useAccountSnapshot } from '@/pages/account/shared'

export default function PlannerGoals() {
  const { snapshot, refresh } = useAccountSnapshot()
  const [text, setText] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('')
  const [notes, setNotes] = useState(snapshot.state.quickNotes || ''), [notesDirty, setNotesDirty] = useState(false)
  const notesEdited = useRef(false)
  useEffect(() => { if (!notesEdited.current) setNotes(snapshot.state.quickNotes || '') }, [snapshot.state.quickNotes])
  const goals = snapshot.state.goalChecklist || []
  const completed = goals.filter(goal => goal.completed).length
  function saveGoals(next: VistaState['goalChecklist']) {
    setGoalChecklist(next)
    if (JSON.stringify(getState().goalChecklist) !== JSON.stringify(next)) { setError('Your goals could not be saved on this device. Please try again.'); return false }
    setError(''); refresh(); return true
  }
  function add(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    const current = getState().goalChecklist || []
    if (current.length >= 100) { setError('Your goal checklist holds up to 100 goals. Complete or remove a goal before adding another.'); return }
    if (saveGoals([{ id: `goal-${crypto.randomUUID()}`, text: text.trim(), completed: false }, ...current])) { setText(''); setMessage('Goal added to your checklist.') }
  }
  function toggle(id: string) {
    const current = getState().goalChecklist || []
    saveGoals(current.map(goal => goal.id === id ? { ...goal, completed: !goal.completed } : goal))
  }
  function remove(id: string) {
    if (confirm('Remove this goal from your personal checklist?')) saveGoals((getState().goalChecklist || []).filter(goal => goal.id !== id))
  }
  function saveNotes(event: FormEvent) {
    event.preventDefault(); setQuickNotes(notes)
    if (getState().quickNotes !== notes) { setError('Notes could not be saved. Your text is retained; please try again.'); return }
    setError(''); notesEdited.current = false; setNotesDirty(false); setMessage('Planning notes saved.'); refresh()
  }
  return <div className="pl-goals-layout">
    <section className="pl-goals-list"><div className="pl-section-heading"><div><p className="pl-kicker">SMALL STEPS, CLEAR INTENT</p><h2>Personal study goals</h2></div><Target size={25}/></div><p className="pl-muted">Your existing goal checklist, shared with the quick-access goals tool. Completing a goal records your own check, not an assessed result.</p>
      <div className="pl-goal-progress"><strong>{completed}<small> / {goals.length} complete</small></strong><div role="progressbar" aria-label="Personal goals completed" aria-valuemin={0} aria-valuemax={goals.length || 1} aria-valuenow={completed}><i style={{ width: `${goals.length ? completed / goals.length * 100 : 0}%` }}/></div></div>
      <form onSubmit={add} className="pl-goal-add"><label className="sr-only" htmlFor="pl-new-goal">New study goal</label><input id="pl-new-goal" required value={text} onChange={e => setText(e.target.value)} maxLength={400} placeholder="What would you like to achieve?"/><button className="pl-primary" type="submit"><Plus size={17}/>Add goal</button></form>
      {!goals.length && <div className="pl-empty"><Target size={34}/><h3>Give your week a direction.</h3><p>Add a goal you can work towards, then schedule the sessions that support it.</p></div>}
      <ul className="pl-goal-items">{goals.map(goal => <li key={goal.id}><button className="pl-check" aria-label={`Mark goal ${goal.text} ${goal.completed ? 'incomplete' : 'complete'}`} aria-pressed={goal.completed} onClick={() => toggle(goal.id)}>{goal.completed ? <Check size={17}/> : <span/>}</button><span className={goal.completed ? 'pl-goal-done' : ''} dir="auto">{goal.text}</span><button className="pl-icon-button" aria-label={`Remove goal ${goal.text}`} onClick={() => remove(goal.id)}><Trash2 size={15}/></button></li>)}</ul>
      {error && <p role="alert" className="pl-error">{error}</p>}{message && <p role="status" className="pl-success">{message}</p>}
    </section>
    <aside className="pl-goal-notes"><div className="pl-section-heading"><h2>Planning notes</h2><NotebookPen size={22}/></div><form onSubmit={saveNotes}><label htmlFor="pl-planning-notes">Keep priorities, reminders and ideas together.</label><textarea id="pl-planning-notes" value={notes} onChange={e => { notesEdited.current = true; setNotes(e.target.value); setNotesDirty(true); setMessage('') }} maxLength={12000} rows={9} placeholder="What needs your attention this week?"/><button className="pl-secondary" type="submit" disabled={!notesDirty}><Save size={15}/>Save notes</button></form><div className="pl-related-link"><strong>Application checklists</strong><p>FPSC application steps and documents are separate from your personal study goals.</p><Link to="/checklists?tab=written">Open application checklists →</Link></div></aside>
  </div>
}
