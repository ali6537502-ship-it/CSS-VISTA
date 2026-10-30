import { useMemo, useState } from 'react'
import { taskExam, readPmsSettings, PMS_SETTINGS_KEY, type ExamTrack } from '@/features/planner/pmsModel'
import { preparationPhysicalKey } from '@/lib/preparationStorage'
import type { StudyScheduleTask } from '@/lib/store'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCheck, Clock3, RotateCcw } from 'lucide-react'
import { isTaskArchived, readTaskArchiveState, restoreTaskState } from '@/lib/myTasks'
import { formatMinutes, useAccountSnapshot } from '@/pages/account/shared'
import PlannerTask from '@/features/planner/PlannerTask'
import { dayKey, dayWorkload, plannerHref, readableDay, shiftDay, taskOrder, validDay, weekDays } from '@/features/planner/model'

function TaskList({ rows, refresh, overlaps }: { rows: StudyScheduleTask[]; refresh: () => void; overlaps: Set<string> }) {
  const [limit, setLimit] = useState(30)
  return <div className="pl-task-list">{rows.slice(0, limit).map(task => <PlannerTask key={task.id} task={task} refresh={refresh} conflict={overlaps.has(task.id)}/>)}{rows.length > limit && <button className="pl-secondary" onClick={() => setLimit(value => value + 30)}>Show more tasks · {rows.length - limit} remaining</button>}</div>
}

export default function PlannerDashboard({ view = 'today', onCreate, exam }: { view?: 'today' | 'week'; onCreate?: () => void; exam?: ExamTrack }) {
  const { snapshot, refresh } = useAccountSnapshot()
  const [params, setParams] = useSearchParams()
  const { pathname, hash } = useLocation()
  const [allOpen, setAllOpen] = useState(false)
  const [subject, setSubject] = useState('all')
  const [status, setStatus] = useState('all')
  const [restoreError, setRestoreError] = useState('')
  const today = dayKey()
  const selectedDay = validDay(params.get('date') || '') ? params.get('date')! : today
  const dates = weekDays(selectedDay)
  const activeTasks = exam ? snapshot.activeTasks.filter(task => taskExam(task) === exam) : snapshot.activeTasks
  let dailyHours = snapshot.state.studyPlanner?.dailyHours
  if (exam === 'pms-punjab') { try { dailyHours = readPmsSettings(JSON.parse(localStorage.getItem(preparationPhysicalKey(PMS_SETTINGS_KEY)) || 'null')).dailyMinutes / 60 } catch { dailyHours = undefined } }
  const tasks = [...activeTasks].sort(taskOrder)
  const overlaps = useMemo(() => {
    const grouped = new Map<string, StudyScheduleTask[]>()
    for (const task of activeTasks) {
      const rows = grouped.get(task.date) || []
      rows.push(task); grouped.set(task.date, rows)
    }
    const ids = new Set<string>()
    for (const [date, rows] of grouped) for (const id of dayWorkload(rows, date).overlaps) ids.add(id)
    return ids
  }, [activeTasks])
  const day = view === 'week' ? selectedDay : today
  const workload = dayWorkload(tasks, day, dailyHours)
  const subjects = [...new Set(tasks.map(task => task.subject))].sort()
  const filtered = tasks.filter(task => (subject === 'all' || task.subject === subject) && (status === 'all' || task.status === status))
  const selectedTasks = filtered.filter(task => task.date === day)
  const overdue = filtered.filter(task => task.date < today && task.status !== 'completed')
  const upcoming = filtered.filter(task => task.date > today && task.status !== 'completed')
  const archived = snapshot.state.studyScheduleTasks.filter(task => isTaskArchived(task.id, readTaskArchiveState()) && (!exam || taskExam(task) === exam))
  function pickDate(date: string) { const next = new URLSearchParams(params); next.set('date', date); setParams(next, { preventScrollReset: true }) }
  function restore(id: string) {
    restoreTaskState(id)
    if (isTaskArchived(id)) setRestoreError('The task could not be restored. Please try again.')
    else { setRestoreError(''); refresh() }
  }
  function renderTasks(rows: typeof tasks) {
    return <TaskList rows={rows} refresh={refresh} overlaps={overlaps}/>
  }
  return <div className="pl-agenda-layout">
    <div className="pl-agenda-main">
      {view === 'week' && <section className="pl-week" aria-label="Weekly schedule">
        <div className="pl-section-heading"><div><p className="pl-kicker">MONDAY – SUNDAY</p><h2>{readableDay(dates[0], true)} – {readableDay(dates[6], true)}</h2></div><div className="pl-actions"><button className="pl-icon-button" aria-label="Previous week" onClick={() => pickDate(shiftDay(selectedDay, -7))}><ArrowLeft size={17}/></button><button className="pl-secondary" onClick={() => pickDate(today)}>This week</button><button className="pl-icon-button" aria-label="Next week" onClick={() => pickDate(shiftDay(selectedDay, 7))}><ArrowRight size={17}/></button></div></div>
        <div className="pl-week-days">{dates.map(date => {
          const work = dayWorkload(tasks, date, dailyHours)
          const dateObject = new Date(`${date}T12:00:00`)
          return <button key={date} type="button" className="pl-week-day" aria-pressed={date === selectedDay} aria-label={`${readableDay(date)}: ${work.rows.length} tasks`} onClick={() => pickDate(date)}>
            <span>{dateObject.toLocaleDateString(undefined, { weekday: 'short' })}</span><strong>{dateObject.getDate()}</strong><small>{work.rows.length ? `${work.rows.length} task${work.rows.length === 1 ? '' : 's'}` : 'Open day'}</small><span className="pl-day-meter" aria-hidden="true"><i style={{ width: `${work.capacity ? Math.min(100, work.minutes / work.capacity * 100) : work.minutes ? 100 : 0}%` }}/></span><small>{work.minutes ? formatMinutes(work.minutes) : '—'}</small>
          </button>
        })}</div>
        <p className="pl-muted">Choose a day to see subjects, timings and completion controls. Durations are planned estimates.</p>
      </section>}
      <section className="pl-agenda-section" aria-labelledby={`pl-${view}-title`}>
        <div className="pl-section-heading"><div><p className="pl-kicker">{view === 'today' ? 'YOUR DAILY AGENDA' : 'SELECTED DAY'}</p><h2 id={`pl-${view}-title`}>{view === 'today' ? 'Today’s tasks' : readableDay(day)}</h2></div><span className="pl-count">{selectedTasks.length} task{selectedTasks.length === 1 ? '' : 's'}</span></div>
        <div className="pl-filter-row"><label><span className="sr-only">Filter by subject</span><select aria-label="Filter planner by subject" value={subject} onChange={e => setSubject(e.target.value)}><option value="all">All subjects</option>{subjects.map(name => <option key={name}>{name}</option>)}</select></label><label><span className="sr-only">Filter task status</span><select aria-label="Filter planner by status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></label>{(subject !== 'all' || status !== 'all') && <button className="pl-text-button" onClick={() => { setSubject('all'); setStatus('all') }}>Clear filters</button>}</div>
        {selectedTasks.length ? renderTasks(selectedTasks) : <div className="pl-empty"><CalendarDays size={34}/><h3>{subject !== 'all' || status !== 'all' ? 'No tasks match these filters' : 'Your agenda is open'}</h3><p>{subject !== 'all' || status !== 'all' ? 'Try another subject or task status.' : 'Add a focused session, import your schedule or choose a syllabus topic.'}</p>{onCreate && subject === 'all' && status === 'all' && <button className="pl-primary" onClick={onCreate}>Add a study task</button>}</div>}
      </section>
      {view === 'today' && <>
        <section className="pl-agenda-section"><div className="pl-section-heading"><div><p className="pl-kicker">MAKE ROOM TO CATCH UP</p><h2>Carried forward</h2></div><span className="pl-count">{overdue.length}</span></div>{overdue.length ? renderTasks(overdue) : <p className="pl-muted">No unfinished tasks from earlier dates.</p>}</section>
        <section className="pl-agenda-section"><div className="pl-section-heading"><h2>Coming up</h2><Link to={plannerHref(pathname, params, 'week', hash)} className="pl-text-button">View the week <ArrowRight size={15}/></Link></div>{upcoming.length ? renderTasks(upcoming.slice(0, 8)) : <p className="pl-muted">No upcoming tasks yet. Leave space for your next session.</p>}</section>
        <details className="pl-history" onToggle={event => setAllOpen(event.currentTarget.open)}><summary>Full schedule · {filtered.length} tasks</summary>{allOpen && renderTasks(filtered)}</details>
        <details className="pl-history"><summary>Completed history · {tasks.filter(task => task.status === 'completed').length}</summary>{renderTasks(tasks.filter(task => task.status === 'completed').reverse())}</details>
        <details className="pl-history"><summary>Archived tasks · {archived.length}</summary><p className="pl-muted">Archived tasks keep their original records and can be restored.</p>{archived.map(task => <article key={task.id} className="pl-archive-row"><div><small>{task.subject} · {readableDay(task.date, true)}</small><h3>{task.topic}</h3></div><button className="pl-secondary" onClick={() => restore(task.id)}><RotateCcw size={15}/>Restore {task.topic}</button></article>)}{!archived.length && <p className="pl-muted">Nothing archived.</p>}{restoreError && <p role="alert" className="pl-error">{restoreError}</p>}</details>
      </>}
    </div>
    <aside className="pl-day-context" aria-label="Selected day summary">
      <div className="pl-context-art" aria-hidden="true"><CalendarDays size={35}/><span/><i/><b/></div><p className="pl-kicker">{day === today ? 'TODAY’S STUDY SPACE' : readableDay(day, true)}</p><h2>{formatMinutes(workload.minutes)}<small> planned</small></h2><p className="pl-muted">Scheduled duration, including completed tasks. Actual study time is recorded separately.</p>
      <dl><div><dt><CheckCheck size={16}/>Completed</dt><dd>{workload.rows.filter(task => task.status === 'completed').length} / {workload.rows.length}</dd></div><div><dt><Clock3 size={16}/>Daily availability</dt><dd>{workload.capacity === null ? 'Not set' : formatMinutes(workload.capacity)}</dd></div></dl>
      {exam !== 'pms-punjab' && snapshot.state.studyPlanner && new Date(`${day}T12:00:00`).getDay() === snapshot.state.studyPlanner.restDay && <p className="pl-note">Your chosen light-study day. Keep the workload comfortable.</p>}
      {workload.overBy > 0 && <p className="pl-warning" role="status">{formatMinutes(workload.overBy)} above your saved daily availability. Edit a task to adjust the load.</p>}
      {workload.overlaps.size > 0 && <p className="pl-warning">{workload.overlaps.size} unfinished tasks have overlapping times.</p>}
      <Link className="pl-text-button" to={plannerHref(pathname, params, 'settings', hash)}>Adjust study availability <ArrowRight size={15}/></Link>
    </aside>
  </div>
}
