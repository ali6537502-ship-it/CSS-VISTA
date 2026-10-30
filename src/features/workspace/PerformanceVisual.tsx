import { Link } from 'react-router'
import { ArrowUpRight, ChartNoAxesCombined } from 'lucide-react'
import { useAccountSnapshot } from '@/pages/account/shared'
import { ProgressRing } from './Visuals'
export default function PerformanceVisual() {
  const { snapshot } = useAccountSnapshot()
  const categories = snapshot.stats.categories.slice(0,6)
  return <section className="ws-performance-overview">
    <div className="ws-performance-score"><span className="ws-eyebrow">YOUR RECORDED PRACTICE</span><div className="ws-score-body"><ProgressRing value={snapshot.stats.attempted ? snapshot.stats.accuracy : 0} total={snapshot.stats.attempted ? 100 : 0} label="Recorded MCQ accuracy percentage"/><div><strong>{snapshot.stats.attempted ? `${snapshot.stats.accuracy}%` : 'A fresh start'}</strong><p>{snapshot.stats.attempted ? `Accuracy across ${snapshot.stats.attempted} recorded questions` : 'Your first practice session starts the story.'}</p></div></div><Link to="/account/practice">Choose a practice session <ArrowUpRight size={16}/></Link></div>
    <div className="ws-category-chart"><h2><ChartNoAxesCombined size={19}/> Practice by category</h2>{categories.length ? <dl>{categories.map(category => <div key={category.name}><dt>{category.name}<small>{category.attempts} questions</small></dt><dd><span style={{width:`${category.pct}%`}}/><b>{category.pct}%</b></dd></div>)}</dl> : <div className="ws-chart-empty"><ChartNoAxesCombined size={38} strokeWidth={1}/><p>Your category results will appear here after practice.</p></div>}<p className="ws-muted">Recorded accuracy. Syllabus completion is measured separately.</p></div>
  </section>
}
