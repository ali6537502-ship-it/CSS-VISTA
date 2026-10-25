import { Link } from 'react-router'
import { ArrowUpRight, BookOpen, CalendarDays } from 'lucide-react'
import { bookCatalogueNow } from '@/data/bookSummaries'
import { getAllBookSummaryProgress } from '@/lib/progress'
import { useAccountSnapshot } from '@/pages/account/shared'
import StudyArtwork from './StudyArtwork'
export default function ContinueStudying({ greeting }: { greeting?: string }) {
  const { snapshot } = useAccountSnapshot()
  const progress = getAllBookSummaryProgress()
  const candidate = bookCatalogueNow().books.filter(book => {
    const p = progress[book.slug]
    return p && !p.completed && p.progress > 0 && p.progress < 100 && Number.isFinite(p.updatedAt)
  }).sort((a,b) => progress[b.slug].updatedAt - progress[a.slug].updatedAt || a.slug.localeCompare(b.slug))[0]
  const task = snapshot.due.today.find(t => t.status !== 'completed')
  return <section className="ws-study-feature">
    <div className="ws-study-copy"><span className="ws-eyebrow"><span className="ws-live-dot"/> A little focus. A little further.</span>
      <h1>{greeting || 'Make space for your next big idea.'}</h1>
      <p className="ws-hero-description">Your ambitions, one focused session at a time.</p>
      <div className="ws-next-activity"><span className="ws-icon-box">{candidate ? <BookOpen size={19}/> : <CalendarDays size={19}/>}</span><div><small>{candidate ? 'CONTINUE READING' : 'YOUR NEXT STUDY SESSION'}</small><h2>{candidate?.title || task?.topic || 'Let’s give today a clear direction.'}</h2>{task && !candidate && <p>{task.subject} · {task.minutes} min estimated</p>}</div></div>
      <Link className="ws-action" to={candidate ? `/book-summaries/${candidate.slug}` : '/account/tasks'}>{candidate ? 'Resume reading' : 'Open my study plan'}<ArrowUpRight size={18}/></Link>
      {candidate && <p className="ws-hero-footnote">Your saved reading position is ready. Reading is separate from assessed progress.</p>}
    </div><StudyArtwork/>
  </section>
}
