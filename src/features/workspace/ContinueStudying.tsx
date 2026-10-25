import { Link } from 'react-router'
import { bookCatalogueNow } from '@/data/bookSummaries'
import { getAllBookSummaryProgress } from '@/lib/progress'
import { useAccountSnapshot } from '@/pages/account/shared'
export default function ContinueStudying() {
  const { snapshot } = useAccountSnapshot()
  const progress = getAllBookSummaryProgress()
  const candidate = bookCatalogueNow().books.filter(book => {
    const p = progress[book.slug]
    return p && !p.completed && p.progress > 0 && p.progress < 100 && Number.isFinite(p.updatedAt)
  }).sort((a,b) => progress[b.slug].updatedAt - progress[a.slug].updatedAt || a.slug.localeCompare(b.slug))[0]
  return <section className="ws-panel"><p className="text-xs uppercase tracking-widest text-emerald-800 font-bold">{candidate ? 'Continue reading' : 'Your next study session'}</p><h2 className="text-2xl font-bold mt-3">{candidate?.title || snapshot.due.today.find(t => t.status !== 'completed')?.topic || 'Make room for focused preparation'}</h2><p className="ws-muted mt-3 mb-5">{candidate ? 'Return to your saved reading position. Reading progress is separate from assessed performance.' : 'Open your saved plan to choose your next activity and pick up your preparation.'}</p><Link className="ws-action" to={candidate ? `/book-summaries/${candidate.slug}` : '/account/tasks'}>{candidate ? 'Resume reading' : 'Open my study plan'}</Link></section>
}
