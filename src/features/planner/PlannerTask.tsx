import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Archive, Check, ClipboardCopy, Clock3, Pencil, Save, X } from 'lucide-react'
import { getState, updateStudyScheduleTask, type StudyScheduleTask } from '@/lib/store'
import { essayThemeIndex } from '@/data/essayThemes'
import { archiveTaskState, isTaskArchived } from '@/lib/myTasks'
import { subjectVisual } from '@/features/workspace/Visuals'
import { formatMinutes } from '@/pages/account/shared'
import { shiftDay, dayKey, readableDay, validDay } from './model'
import { buildVistaNotesCommand, cssGuideSubjects, findGuideUnit, pmsGuideSubjects, resolveLegacyCssNotesUnit } from './vistaGuideModel'

export default function PlannerTask({ task, refresh, conflict = false }: { task: StudyScheduleTask; refresh: () => void; conflict?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ date: task.date, time: task.time || '', minutes: String(task.minutes), status: task.status })
  const editBase = useRef({ date: task.date, time: task.time, minutes: task.minutes, status: task.status })
  const editButton = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState('')
  const [notesStatus, setNotesStatus] = useState('')
  const [manualCommand, setManualCommand] = useState('')
  const isEssay = task.syllabusItemId.startsWith('vista-css:essay:') || task.syllabusItemId.startsWith('pms-punjab:vista:compulsory-english-essay:')
  // Original FPSC schedule topics use slug:section:item; keep those task IDs and
  // offer exactly the same source-resolved command as newly generated Vista tasks.
  const legacyCssSyllabusTopic = /^[a-z0-9-]+:\d+:\d+$/.test(task.syllabusItemId)
  const canPrepareNotes = task.syllabusItemId.startsWith('pms-punjab:vista:') || task.syllabusItemId.startsWith('vista-css:') || legacyCssSyllabusTopic
  const legacyEssayInstruction = task.syllabusItemId.startsWith('pms-punjab:vista:compulsory-english-essay:s1:')
  const themeSlug = task.syllabusItemId.includes(':theme:') ? task.syllabusItemId.split(':theme:')[1].split(':')[0] : ''
  const themeLink = '/study-material/essay-themes' + (themeSlug ? '/' + encodeURIComponent(themeSlug) : '')
  const done = task.status === 'completed'
  const visual = subjectVisual(task.subject)
  function update(patch: Partial<Pick<StudyScheduleTask, 'date' | 'time' | 'minutes' | 'status'>>, expected?: Partial<Pick<StudyScheduleTask, 'date' | 'time' | 'minutes' | 'status'>>) {
    const current = getState().studyScheduleTasks.find(row => row.id === task.id)
    if (!current) { setError('This task is no longer available. Refresh the plan.'); return false }
    if (expected && Object.entries(expected).some(([key, value]) => current[key as keyof StudyScheduleTask] !== value)) {
      setError('This task changed while you were editing. Your draft is retained. Close and reopen the editor to review the latest values.'); return false
    }
    updateStudyScheduleTask(task.id, patch)
    const saved = getState().studyScheduleTasks.find(row => row.id === task.id)
    if (!saved || !Object.entries(patch).every(([key, value]) => saved[key as keyof StudyScheduleTask] === value)) {
      setError('Your change could not be saved on this device. Keep this form open and try again.'); return false
    }
    setError(''); refresh(); return true
  }
  function save(event: FormEvent) {
    event.preventDefault()
    if (!validDay(draft.date) || !Number.isInteger(Number(draft.minutes)) || Number(draft.minutes) < 5 || Number(draft.minutes) > 600) {
      setError('Choose a valid date and a whole duration from 5 to 600 minutes.'); return
    }
    const values = { date: draft.date, time: draft.time || undefined, minutes: Number(draft.minutes), status: draft.status }
    const changed = (Object.keys(values) as Array<keyof typeof values>).filter(key => values[key] !== editBase.current[key])
    const patch = Object.fromEntries(changed.map(key => [key, values[key]]))
    const expected = Object.fromEntries(changed.map(key => [key, editBase.current[key]]))
    if (!changed.length || update(patch, expected)) setEditing(false)
  }
  async function copyNotes() {
    setNotesStatus('Preparing chapter-specific command...')
    try {
      const pms = task.syllabusItemId.startsWith('pms-punjab:vista:')
      const path = pms ? '/pms-punjab/vista-syllabus.json' : '/fpsc-syllabus.json'
      const response = await fetch(path)
      if (!response.ok) throw Error('Unable to read the syllabus.')
      const data = await response.json()
      const subjects = pms ? pmsGuideSubjects(data,essayThemeIndex()) : cssGuideSubjects(data,essayThemeIndex())
      const unit = findGuideUnit(subjects,pms?'pms-punjab':'css',task.syllabusItemId)
        || (!pms && legacyCssSyllabusTopic ? resolveLegacyCssNotesUnit(data,task.syllabusItemId) : null)
      if(!unit)throw Error('This task could not be matched to an official syllabus topic. No command was generated and your saved task was not changed.')
      const command=buildVistaNotesCommand(unit)
      try { await navigator.clipboard.writeText(command); setManualCommand('');setNotesStatus('Command copied. Paste it into ChatGPT for detailed, source-checked notes with useful diagrams and sourced images when available.') }
      catch { setManualCommand(command);setNotesStatus('Select and copy the command below.') }
    } catch(e) { setNotesStatus(e instanceof Error ? e.message : 'Unable to copy notes command.') }
  }
  function archive() {
    archiveTaskState(task.id)
    if (!isTaskArchived(task.id)) { setError('Archiving could not be saved. Please try again.'); return }
    refresh()
  }
  return <article className={`pl-task pl-tone-${visual.tone} ${done ? 'pl-task-done' : ''}`} data-task-id={task.id}>
    <div className="pl-task-main">
      <button className="pl-check" type="button" aria-pressed={done} aria-label={`Mark ${task.topic} ${done ? 'incomplete' : 'complete'}`} onClick={() => {
        const current = getState().studyScheduleTasks.find(row => row.id === task.id)
        if (current?.status === task.status) update({ status: done ? 'in-progress' : 'completed' })
      }}>{done ? <Check size={18} /> : <span />}</button>
      <div className="pl-task-copy"><p className="pl-kicker">{task.subject}{task.paper ? ` · ${task.paper}` : ''}{task.activity === 'revision' ? ' · Revision' : ''}</p><h3 dir="auto">{legacyEssayInstruction?'English Essay paper guidance (legacy task)':task.topic}</h3>{legacyEssayInstruction&&<p className="pl-warning-text">This older activity was created from paper instructions, not an essay theme. Your original record is preserved; open the theme roadmap to prepare an actual essay.</p>}<p className="pl-task-meta"><span><Clock3 size={13}/>{task.time || 'Flexible time'}</span><span>{formatMinutes(task.minutes)} estimated</span><span>{readableDay(task.date, true)}</span><span>{done ? 'Completed' : task.status === 'in-progress' ? 'In progress' : 'Not started'}</span></p>{conflict && <p className="pl-warning-text">This time overlaps another unfinished task.</p>}</div>
      <button ref={editButton} className="pl-icon-button" type="button" aria-expanded={editing} aria-label={`Edit ${task.topic}`} onClick={() => {
        if (!editing) { editBase.current = { date: task.date, time: task.time, minutes: task.minutes, status: task.status }; setDraft({ date: task.date, time: task.time || '', minutes: String(task.minutes), status: task.status }) }
        setEditing(value => !value)
      }}><Pencil size={16}/></button>
    </div>
    {canPrepareNotes && <div className="pl-actions" style={{padding:'0 15px 10px'}}>
      {isEssay?<Link className="pl-secondary" to={themeLink}>Build essay theme</Link>:<button className="pl-secondary" type="button" onClick={copyNotes}><ClipboardCopy size={15}/>Copy analytical notes command</button>}
      {notesStatus && <span role="status" className="pl-muted">{notesStatus}</span>}
      {manualCommand && <textarea aria-label="Copy generated chapter command" readOnly rows={5} value={manualCommand} onFocus={e=>e.currentTarget.select()}/>}
    </div>}
    {editing && <form onSubmit={save} className="pl-task-editor">
      <p className="pl-muted">Reschedule this task without changing its identity or topic history.</p>
      <div className="pl-form-grid"><label>Date<input type="date" required value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })}/></label><label>Time (optional)<input type="time" value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })}/></label><label>Estimated minutes<input type="number" required min={5} max={600} step={1} value={draft.minutes} onChange={e => setDraft({ ...draft, minutes: e.target.value })}/></label><label>Status<select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as StudyScheduleTask['status'] })}><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></label></div>
      <div className="pl-actions"><button className="pl-primary" type="submit"><Save size={15}/>Save changes</button><button className="pl-secondary" type="button" onClick={() => setDraft({ ...draft, date: shiftDay(dayKey(), 1) })}>Move to tomorrow</button><button className="pl-secondary" type="button" onClick={archive}><Archive size={15}/>Archive task</button><button className="pl-text-button" type="button" onClick={() => { setEditing(false); requestAnimationFrame(() => editButton.current?.focus()) }}><X size={15}/>Cancel</button></div>
    </form>}
    {error && <p className="pl-error" role="alert">{error}</p>}
  </article>
}
