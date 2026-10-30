import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, Check, RotateCcw } from 'lucide-react'
import { getProgress, getMistakes, toggleMistakeRevised } from '@/lib/progress'
import { useAccountSnapshot } from '@/pages/account/shared'
import { revisionGroups } from './model'

export default function PlannerRevision() {
  const { snapshot, refresh } = useAccountSnapshot()
  const [filter, setFilter] = useState<'due' | 'upcoming' | 'reviewed'>('due')
  const [category, setCategory] = useState('all'), [error, setError] = useState('')
  const progress = useMemo(() => { void snapshot; return getProgress() }, [snapshot])
  const [now] = useState(() => Date.now())
  const groups = revisionGroups(Object.values(progress.reviews || {}), now)
  const categories = [...new Set(Object.values(progress.reviews || {}).map(review => review.cat))].sort()
  const rows = groups[filter].filter(review => category === 'all' || review.cat === category)
  const mistakes = (progress.mistakes || []).filter(mistake => !mistake.resolvedAt)
  function markReviewed(id: string) {
    const current = getMistakes().find(mistake => mistake.id === id)
    if (!current) return
    toggleMistakeRevised(id)
    const saved = getMistakes().find(mistake => mistake.id === id)
    if (!saved || saved.revised === current.revised) setError('The review check could not be saved. Please try again.')
    else { setError(''); refresh() }
  }
  return <div className="pl-revision-layout">
    <section className="pl-review-queue"><div className="pl-section-heading"><div><p className="pl-kicker">RETURN TO WHAT YOU’VE LEARNED</p><h2>Revision queue</h2></div><RotateCcw size={23}/></div><p className="pl-muted">Question reviews follow your existing spaced-review dates. Reading a page or checking a task does not create an assessed result.</p>
      <div className="pl-revision-summary"><div><strong>{groups.due.length}</strong><span>Due now</span></div><div><strong>{groups.upcoming.length}</strong><span>Scheduled ahead</span></div><div><strong>{groups.reviewed.length}</strong><span>Previously reviewed</span></div></div>
      <div className="pl-filter-row"><div className="pl-segmented" aria-label="Revision queue filter">{(['due','upcoming','reviewed'] as const).map(id => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{id === 'due' ? 'Due' : id === 'upcoming' ? 'Upcoming' : 'Reviewed'}</button>)}</div><label><span className="sr-only">Revision category</span><select aria-label="Revision category" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label></div>
      {!rows.length && <div className="pl-empty"><RotateCcw size={32}/><h3>{filter === 'due' ? 'No reviews due in this view.' : filter === 'upcoming' ? 'Nothing scheduled ahead in this view.' : 'No recorded reviews in this view.'}</h3><p>{categories.length ? 'Change the filter or return after your next practice session.' : 'Attempt questions to build a revision queue from your own records.'}</p><Link className="pl-primary" to="/gk/quiz?mode=random">Open MCQ practice</Link></div>}
      <ol className="pl-review-items">{rows.slice(0, 30).map(review => <li key={review.id}><span className="pl-review-symbol"><RotateCcw size={17}/></span><div><h3>{review.cat || 'Question'} revision</h3><p>{filter === 'reviewed' ? `Last reviewed ${new Date(review.lastReviewedAt).toLocaleDateString()}` : `Due ${new Date(review.dueAt).toLocaleString()}`} · {review.intervalDays} day interval</p><small>{review.streak} correct review{review.streak === 1 ? '' : 's'} in a row · {review.lapses} lapse{review.lapses === 1 ? '' : 's'}</small></div><Link className="pl-secondary" to={review.id.startsWith('gv5-') ? '/grammar-course?view=lab' : '/gk/quiz?mode=revision'}>{review.id.startsWith('gv5-') ? 'Grammar lab' : 'Due MCQ queue'}<ArrowUpRight size={15}/></Link></li>)}</ol>
      {rows.length > 30 && <p className="pl-note">Showing the first 30 of {rows.length} records in this view. <Link to="/exam-intelligence?section=revision">Open revision analysis</Link> for the established revision tools.</p>}
    </section>
    <aside className="pl-mistake-review"><p className="pl-kicker">A SECOND LOOK</p><h2>Mistakes to revisit</h2><p className="pl-muted">{mistakes.length} unresolved recorded mistakes. A manual review check stays separate from successful assessed retries.</p><ul>{mistakes.slice(0, 6).map(mistake => <li key={mistake.id}><button className="pl-check" aria-pressed={mistake.revised} aria-label={`Mark ${mistake.cat} mistake ${mistake.revised ? 'unreviewed' : 'reviewed'}`} onClick={() => markReviewed(mistake.id)}>{mistake.revised ? <Check size={16}/> : <span/>}</button><div><strong>{mistake.cat}</strong><small>{mistake.count} recorded error{mistake.count === 1 ? '' : 's'} · {mistake.revised ? 'Reviewed' : 'To review'}</small></div></li>)}</ul>{!mistakes.length && <p className="pl-note">No unresolved mistakes saved.</p>}<Link className="pl-secondary" to="/mistakes">Open mistake notebook <ArrowUpRight size={15}/></Link><Link className="pl-text-button" to="/exam-intelligence?section=revision">Revision analysis <ArrowUpRight size={15}/></Link>{error && <p className="pl-error" role="alert">{error}</p>}</aside>
  </div>
}
