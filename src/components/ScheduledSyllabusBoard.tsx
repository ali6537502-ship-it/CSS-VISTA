import { useMemo, useState, type FormEvent } from 'react'
import { CalendarPlus, Copy, FileInput, Plus, Upload } from 'lucide-react'
import PrintMenu from '@/components/PrintMenu'
import PlannerDashboard from '@/components/PlannerDashboard'
import { addStudyScheduleTasks, getState, type StudyScheduleTask } from '@/lib/store'
import { AI_SCHEDULE_PROMPT, aiScheduleTaskId, localTaskDateKey, parseCssVistaSchedule } from '@/lib/myTasks'
import { useAccountSnapshot } from '@/pages/account/shared'
import { readableDay, validDay } from '@/features/planner/model'
import '@/features/planner/planner.css'

type NewTask = Omit<StudyScheduleTask, 'id' | 'createdAt' | 'status'>
export default function ScheduledSyllabusBoard({ compact = false, toolsOnly = false }: { compact?: boolean; toolsOnly?: boolean }) {
  const { snapshot, refresh } = useAccountSnapshot()
  const [mode, setMode] = useState<'task' | 'import'>('task')
  const [title, setTitle] = useState(''), [subject, setSubject] = useState('')
  const [taskDate, setTaskDate] = useState(localTaskDateKey()), [taskTime, setTaskTime] = useState('')
  const [taskMinutes, setTaskMinutes] = useState('30'), [aiText, setAiText] = useState('')
  const [message, setMessage] = useState(''), [error, setError] = useState('')
  const aiPreview = useMemo(() => {
    if (!aiText.trim()) return null
    try { return { parsed: parseCssVistaSchedule(aiText), error: '' } }
    catch (caught) { return { parsed: null, error: caught instanceof Error ? caught.message : 'This schedule could not be read.' } }
  }, [aiText])
  function persist(rows: NewTask[]) {
    const existing = getState().studyScheduleTasks
    const keys = new Set(existing.map(task => `${task.syllabusItemId}|${task.date}`))
    const newRows = rows.filter(task => !keys.has(`${task.syllabusItemId}|${task.date}`))
    if (existing.length + newRows.length > 3000) throw new Error('Your saved task limit is reached. Export your plan and contact support before adding more. Existing tasks have been retained.')
    const added = addStudyScheduleTasks(rows)
    const saved = getState().studyScheduleTasks
    if (!added.every(task => saved.some(row => row.id === task.id))) throw new Error('These tasks could not be saved on this device. Your form is retained; please try again.')
    refresh(); return added
  }
  function addPersonalTask(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    if (!title.trim() || !validDay(taskDate) || !Number.isInteger(Number(taskMinutes)) || Number(taskMinutes) < 5 || Number(taskMinutes) > 600) { setError('Enter a task, valid date and 5–600 whole minutes.'); return }
    try {
      persist([{ syllabusItemId: `manual:${crypto.randomUUID()}`, subject: subject.trim() || 'General', paper: '', section: 'Personal task', topic: title.trim(), date: taskDate, time: taskTime || undefined, minutes: Number(taskMinutes) }])
      setTitle(''); setSubject(''); setTaskTime(''); setTaskMinutes('30'); setMessage('Task added to your saved schedule.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Your task could not be saved.') }
  }
  function importSchedule() {
    setError(''); setMessage('')
    try {
      const parsed = parseCssVistaSchedule(aiText)
      const added = persist(parsed.tasks.map((task, index) => ({ syllabusItemId: aiScheduleTaskId(task, index), subject: task.subject, paper: task.activity, section: `AI schedule · ${task.priority} priority`, topic: task.topic, date: task.date, time: task.time, minutes: task.minutes })))
      setMessage(added.length ? `${parsed.title}: ${added.length} task${added.length === 1 ? '' : 's'} added across ${parsed.dayCount} day${parsed.dayCount === 1 ? '' : 's'}.` : 'This exact schedule is already saved. No duplicate tasks were added.')
      setAiText('')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The schedule could not be imported.') }
  }
  async function copy(text: string, confirmation: string) {
    try { await navigator.clipboard.writeText(text); setError(''); setMessage(confirmation) }
    catch { setError('Your browser could not copy this text. Allow clipboard access and try again.') }
  }
  const planText = [...snapshot.activeTasks].sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`)).map(task => `${readableDay(task.date, true)} — [${task.status === 'completed' ? 'x' : ' '}] ${task.subject}: ${task.topic}${task.time ? ` at ${task.time}` : ''} (${task.minutes} min)`).join('\n')
  return <section className="planner-workspace pl-task-tools syllabus-schedule-print-area" aria-label="Create and import study tasks">
    <div className="pl-section-heading"><div><p className="pl-kicker">MAKE SPACE FOR YOUR NEXT SESSION</p><h2>Add to your plan</h2></div><div className="pl-actions"><button className="pl-secondary" onClick={() => void copy(planText || 'No active tasks scheduled yet.', 'Active task plan copied.')}><Copy size={15}/>Copy plan</button>{!compact && <PrintMenu answersAvailable={false} label="Print or download" targetSelector=".syllabus-schedule-print-area"/>}</div></div>
    {!compact && <>
      <div className="pl-segmented" aria-label="Choose a task creation method"><button aria-pressed={mode === 'task'} onClick={() => setMode('task')}><CalendarPlus size={16}/>One task</button><button aria-pressed={mode === 'import'} onClick={() => setMode('import')}><FileInput size={16}/>Import schedule</button></div>
      <form onSubmit={addPersonalTask} hidden={mode !== 'task'} className="pl-compose-form">
        <div className="pl-form-grid"><label className="pl-span-two">What will you study?<input value={title} onChange={e => setTitle(e.target.value)} maxLength={240} required placeholder="A topic, practice session or revision task"/></label><label className="pl-span-two">Subject (optional)<input value={subject} onChange={e => setSubject(e.target.value)} maxLength={120} list="pl-subject-suggestions" placeholder="Choose or enter a subject"/><datalist id="pl-subject-suggestions">{[...new Set([...snapshot.activeTasks.map(task => task.subject), ...(snapshot.state.studyPlanner?.selectedOptionals || [])])].map(name => <option key={name} value={name}/>)}</datalist></label><label>Date<input type="date" required value={taskDate} onChange={e => setTaskDate(e.target.value)}/></label><label>Time (optional)<input type="time" value={taskTime} onChange={e => setTaskTime(e.target.value)}/></label><label>Estimated minutes<input type="number" required min={5} max={600} step={1} value={taskMinutes} onChange={e => setTaskMinutes(e.target.value)}/></label></div>
        <div className="pl-actions"><button type="submit" className="pl-primary"><Plus size={17}/>Add task</button><p className="pl-muted">Personal tasks share your existing study schedule.</p></div>
      </form>
      <div hidden={mode !== 'import'} className="pl-import">
        <div className="pl-import-intro"><div><h3>Bring your schedule with you.</h3><p>Paste an existing CSS Vista schedule block. Review the detected tasks before importing. Your saved work stays in place.</p></div><button className="pl-secondary" onClick={() => void copy(AI_SCHEDULE_PROMPT, 'Schedule command copied. Use it in your chosen AI tool, then paste its CSS Vista block here.')}><Copy size={15}/>Copy AI command</button></div>
        <label>Schedule block<textarea rows={7} value={aiText} onChange={e => { setAiText(e.target.value); setError(''); setMessage('') }} spellCheck={false} placeholder="CSSV_SCHEDULE_V1 …"/></label>
        {aiPreview?.parsed && <div className="pl-import-preview"><strong>{aiPreview.parsed.title}</strong><span>{aiPreview.parsed.tasks.length} tasks · {aiPreview.parsed.dayCount} days</span><ul>{aiPreview.parsed.tasks.slice(0, 4).map((task, i) => <li key={i}>{task.date} · {task.subject} · {task.topic} · {task.minutes} min</li>)}</ul>{aiPreview.parsed.tasks.length > 4 && <p>And {aiPreview.parsed.tasks.length - 4} more tasks.</p>}</div>}
        {aiPreview?.error && <p className="pl-error" role="alert">{aiPreview.error}</p>}
        <button className="pl-primary" disabled={!aiPreview?.parsed} onClick={importSchedule}><Upload size={16}/>Import and create my schedule</button>
        <p className="pl-muted">The command is for use in an external tool. CSS Vista does not send your records to an AI provider.</p>
      </div>
    </>}
    {message && <p className="pl-success" role="status">{message}</p>}{error && <p className="pl-error" role="alert">{error}</p>}
    {!toolsOnly && <PlannerDashboard/>}
  </section>
}
