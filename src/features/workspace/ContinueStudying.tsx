import { Link } from 'react-router'
import { ArrowUpRight, CalendarDays } from 'lucide-react'
import { useAccountSnapshot } from '@/pages/account/shared'
import StudyArtwork from './StudyArtwork'
export default function ContinueStudying({ greeting }: { greeting?: string }) {
  const { snapshot } = useAccountSnapshot()
  const task = snapshot.due.today.find(t => t.status !== 'completed')
  return <section className="ws-study-feature">
    <div className="ws-study-copy"><span className="ws-eyebrow"><span className="ws-live-dot"/> A little focus. A little further.</span>
      <h1>{greeting || 'Make space for your next big idea.'}</h1>
      <p className="ws-hero-description">Your ambitions, one focused session at a time.</p>
      <div className="ws-next-activity"><span className="ws-icon-box"><CalendarDays size={19}/></span><div><small>YOUR NEXT STUDY SESSION</small><h2>{task?.topic || 'Let’s give today a clear direction.'}</h2>{task && <p>{task.subject} · {task.minutes} min estimated</p>}</div></div>
      <Link className="ws-action" to={task?.syllabusItemId.startsWith('pms-punjab:') ? '/account/tasks?exam=pms-punjab' : '/account/tasks'}>Open my study plan<ArrowUpRight size={18}/></Link>
    </div><StudyArtwork/>
  </section>
}
