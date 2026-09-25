import { Link } from 'react-router'
import { mptApi } from '@/lib/mpt/api'
import { copy } from '@/lib/mpt/copy'
import { AccountPage, SectionTitle } from '@/pages/account/shared'
import { ScoreChart } from '@/components/mpt/ScoreChart'
import { ErrorNote, MptGate, PageSkeleton, secondaryButton, useMptLoad } from './common'

const fmt = (value: number | null, suffix = '') => (value === null ? '—' : `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`)

function Performance() {
  const load = useMptLoad((signal) => mptApi.performance(signal), [])
  if (load.loading && !load.data) return <PageSkeleton />
  if (load.error && !load.data) return <ErrorNote error={load.error} onRetry={load.reload} />
  const data = load.data
  if (!data) return null
  const { stats, trend, series, subjects } = data
  if (stats.attempts_completed === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">{copy.dashboard.scoreEmpty} Only completed, server-scored mocks count; absences never count as zero.</p>
  }
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <SectionTitle>Overview</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[['Completed mocks', String(stats.attempts_completed)], ['Average', fmt(stats.avg_percentage, '%')], ['Highest', fmt(stats.highest_percentage, '%')], ['Latest', fmt(stats.latest_percentage, '%')], ['Average accuracy', fmt(stats.avg_accuracy, '%')], ['Correct / incorrect', `${stats.total_correct} / ${stats.total_incorrect}`]].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>
          ))}
        </div>
        {trend.label && <p className="text-sm font-semibold text-slate-800">Trend: {copy.dashboard.trend[trend.label]} <span className="font-normal text-slate-500">— {copy.dashboard.trendRule}</span></p>}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <ScoreChart title="Score over time (completed mocks)" points={series.map((row) => ({ label: `Mock ${row.mock_number}`, value: row.percentage, detail: `${fmt(row.score)} / ${fmt(row.total_marks)}` }))} />
      </section>

      <section className="space-y-3">
        <SectionTitle>Subjects</SectionTitle>
        {data.strongest && data.weakest
          ? <p className="text-sm text-slate-700">Strongest: <strong>{data.strongest}</strong> · Needs most work: <strong>{data.weakest}</strong></p>
          : <p className="text-sm text-slate-600">Strongest and weakest subjects appear once at least two subjects each have {data.subject_threshold} or more answered questions.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <div key={subject.subject} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-slate-900">{subject.subject}</p>
                <p className="text-sm tabular-nums text-slate-700">{fmt(subject.accuracy, '%')} accuracy</p>
              </div>
              <p className="text-xs text-slate-500">{subject.correct} correct of {subject.attempted} answered{subject.reliable ? '' : ` · below the ${data.subject_threshold}-question threshold`}</p>
              {subject.points.length >= 2 && <ScoreChart compact title={`${subject.subject} accuracy by mock`} points={subject.points.map((point) => ({ label: `Mock ${point.mock_number}`, value: point.accuracy }))} />}
            </div>
          ))}
        </div>
      </section>
      <Link to="/account/mpt/history" className={secondaryButton}>{copy.dashboard.viewAll}</Link>
    </div>
  )
}

export default function MptPerformance() {
  return (
    <AccountPage title="My MPT Performance" intro="Calculated only from your completed, server-scored MPT Mocks.">
      <MptGate><Performance /></MptGate>
    </AccountPage>
  )
}
