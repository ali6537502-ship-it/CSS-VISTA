import { Link } from 'react-router'
import { ArrowRight, CalendarCheck2, CheckCircle2 } from 'lucide-react'
import { AccountPage, EmptyNote, SectionTitle, TaskItem, formatMinutes, useAccountSnapshot } from './shared'

export default function AccountTasks() {
  const { snapshot, refresh } = useAccountSnapshot()
  const todayRemaining = snapshot.due.today.filter((task) => task.status !== 'completed')
  // dueStudyTasks already excludes completed work from overdue and upcoming.
  const { overdue, upcoming } = snapshot.due

  return (
    <AccountPage
      title="Today’s Plan"
      intro="What you set out to study today, and anything still waiting from earlier."
      action={
        <Link to="/study-planner" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800">
          Open Planner <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-500">Planned today</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{formatMinutes(snapshot.todayMinutes)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-500">Completed</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{snapshot.todayDone.length}<span className="text-base font-semibold text-slate-400"> / {snapshot.todayTasks.length}</span></p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-500">Overdue</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{overdue.length}</p>
        </div>
      </div>

      <section className="mt-10">
        <SectionTitle>Due today</SectionTitle>
        <div className="mt-4 space-y-2.5">
          {todayRemaining.length
            ? todayRemaining.map((task) => <TaskItem key={task.id} task={task} refresh={refresh} />)
            : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center">
                <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-700" />
                <p className="mt-2 text-sm font-bold text-slate-900">Nothing left for today</p>
                <p className="mt-1 text-sm text-slate-500">Add more from the planner whenever you are ready.</p>
              </div>
            )}
        </div>
      </section>

      {overdue.length > 0 && (
        <section className="mt-10">
          <SectionTitle>Carried forward</SectionTitle>
          <div className="mt-4 space-y-2.5">
            {overdue.map((task) => <TaskItem key={task.id} task={task} refresh={refresh} />)}
          </div>
        </section>
      )}

      {snapshot.todayDone.length > 0 && (
        <section className="mt-10">
          <SectionTitle>Completed today</SectionTitle>
          <div className="mt-4 space-y-2.5">
            {snapshot.todayDone.map((task) => <TaskItem key={task.id} task={task} refresh={refresh} />)}
          </div>
        </section>
      )}

      <section className="mt-10">
        <SectionTitle>Coming up</SectionTitle>
        <div className="mt-4 space-y-2.5">
          {upcoming.length
            ? upcoming.slice(0, 8).map((task) => <TaskItem key={task.id} task={task} refresh={refresh} />)
            : <EmptyNote>Nothing scheduled after today. <Link className="font-semibold text-emerald-800 underline" to="/study-planner">Plan your week</Link>.</EmptyNote>}
        </div>
      </section>

      <p className="mt-10 flex items-center gap-2 text-sm text-slate-500">
        <CalendarCheck2 className="h-4 w-4 text-emerald-700" />
        {snapshot.activeTasks.length} active task{snapshot.activeTasks.length === 1 ? '' : 's'} in your planner.
      </p>
    </AccountPage>
  )
}
