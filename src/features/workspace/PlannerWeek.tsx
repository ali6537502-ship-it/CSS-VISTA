import { CalendarDays } from 'lucide-react'
import { useAccountSnapshot } from '@/pages/account/shared'
import { localTaskDateKey } from '@/lib/myTasks'
export default function PlannerWeek() {
  const { snapshot } = useAccountSnapshot()
  const today=new Date(),monday=today.getDate()-((today.getDay()+6)%7)
  const days=Array.from({length:7},(_,i)=>new Date(today.getFullYear(),today.getMonth(),monday+i,12))
  return <section className="ws-week-strip"><div className="ws-section-head"><h2><CalendarDays size={18}/> Your week, at a glance</h2><span className="ws-muted">Scheduled tasks</span></div><ol>{days.map(day=>{const key=localTaskDateKey(day),tasks=snapshot.activeTasks.filter(t=>t.date===key),isToday=key===localTaskDateKey();return <li key={key} aria-current={isToday?'date':undefined}><span>{day.toLocaleDateString('en',{weekday:'short'})}</span><strong>{day.getDate()}</strong><small>{tasks.length ? `${tasks.length} task${tasks.length===1?'':'s'}` : 'Open day'}</small><i aria-hidden="true" className={tasks.length?'has-tasks':''}/></li>})}</ol></section>
}
