import { Link } from 'react-router'
import { mptApi, type MptCard, type MptHistoryRow } from '@/lib/mpt/api'
import { ACTION_LABEL, copy, mockSlotLabel, pktDate } from '@/lib/mpt/copy'
import { formatRollNumber } from '@/lib/mpt/rollNumber'
import { useServerClock } from '@/lib/mpt/useServerClock'
import { AccountPage, SectionTitle } from '@/pages/account/shared'
import { MptHeroCard, actionHref, pickCurrentCard } from '@/components/mpt/MptHeroCard'
import { StatusBadge } from '@/components/mpt/StatusBadge'
import { ScoreChart } from '@/components/mpt/ScoreChart'
import { ErrorNote, MptGate, PageSkeleton, secondaryButton, useMptLoad } from './common'
import { MockSlot } from '@/components/mpt/MockSlot'
import { MptMenu } from '@/components/mpt/MptMenu'

const fmt = (value: number | null, suffix = '') => (value === null ? '—' : `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`)

export function HistoryRows({ rows }: { rows: MptHistoryRow[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[.08em] text-slate-500">
            <tr><th scope="col" className="px-3 py-2">Mock</th><th scope="col" className="px-3 py-2">Roll No.</th><th scope="col" className="px-3 py-2">Date</th><th scope="col" className="px-3 py-2">Status</th><th scope="col" className="px-3 py-2">Score</th><th scope="col" className="px-3 py-2"><span className="sr-only">Action</span></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.application_code}>
                <th scope="row" className="px-3 py-2 font-semibold text-slate-900">{row.title}<span className="block text-xs font-bold text-emerald-900">{mockSlotLabel(row)}</span></th>
                <td className="px-3 py-2 font-mono">{row.roll_number ? formatRollNumber(row.roll_number) : '—'}</td>
                <td className="px-3 py-2">{pktDate(row.exam_open_at)}</td>
                <td className="px-3 py-2"><StatusBadge phase={row.phase} /></td>
                <td className="px-3 py-2 tabular-nums">{row.score === null ? '—' : `${fmt(row.score)} / ${fmt(row.total_marks)}`}</td>
                <td className="px-3 py-2 text-right"><Link className="font-semibold text-emerald-800 underline-offset-4 hover:underline" to={row.phase === 'RESULT_AVAILABLE' || row.phase === 'SUBMITTED_PENDING_RESULT' ? `/account/mpt/results/${row.application_code}` : `/account/mpt/applications/${row.application_code}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <li key={row.application_code}>
            <Link to={row.phase === 'RESULT_AVAILABLE' || row.phase === 'SUBMITTED_PENDING_RESULT' ? `/account/mpt/results/${row.application_code}` : `/account/mpt/applications/${row.application_code}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">{row.title}</p><MockSlot mock={row} withDate={false} /></div><StatusBadge phase={row.phase} /></div>
              <p className="mt-1 text-sm text-slate-600">{pktDate(row.exam_open_at)}{row.roll_number ? ` · Roll ${formatRollNumber(row.roll_number)}` : ''}</p>
              {row.score !== null && <p className="mt-1 text-sm font-semibold tabular-nums">{fmt(row.score)} / {fmt(row.total_marks)}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

function UpcomingList({ cards }: { cards: MptCard[] }) {
  return (
    <ul className="space-y-2">
      {cards.map((card) => {
        const href = actionHref(card)
        return (
          <li key={card.mock.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{card.mock.title}</p>
              <MockSlot mock={card.mock} withWindow />
              <p className="text-sm text-slate-600">{card.mock.duration_minutes} min{card.application?.roll_number ? ` · Roll ${formatRollNumber(card.application.roll_number)}` : card.application ? ' · Applied ✓' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge phase={card.state.phase} />
              {href && card.state.primary_action && <Link to={href} className={secondaryButton}>{ACTION_LABEL[card.state.primary_action]}</Link>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Area() {
  const load = useMptLoad((signal) => mptApi.dashboard(signal), [])
  const now = useServerClock()
  if (load.loading && !load.data) return <PageSkeleton />
  if (load.error && !load.data) return <ErrorNote error={load.error} onRetry={load.reload} />
  const data = load.data
  if (!data) return null
  const current = pickCurrentCard(data.cards)
  const others = data.cards.filter((card) => card !== current && ['APPLICATIONS_OPEN', 'NOT_YET_OPEN', 'ROLL_NUMBER_PENDING', 'SLOT_RESERVED', 'ENTRY_OPEN', 'IN_PROGRESS', 'SLOTS_FULL'].includes(card.state.phase))
  const { stats, trend, latest, history } = data
  return (
    <div className="space-y-10">
      <MptMenu current="/account/mpt" />
      {current
        ? <MptHeroCard card={current} now={now} onBoundary={load.reload} />
        : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">{copy.hub.noMocks}</p>}

      <section className="space-y-3">
        <SectionTitle>{copy.dashboard.scoreTitle}</SectionTitle>
        {latest ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{latest.mock.title}</p>
            <MockSlot mock={latest.mock} withWindow />
            <p className="mt-1 text-4xl font-bold tabular-nums text-slate-950">{fmt(latest.result.score)}<span className="text-xl text-slate-400"> / {fmt(latest.result.total_marks)}</span> <span className="text-lg font-semibold text-emerald-900">{fmt(latest.result.percentage, '%')}</span></p>
            <p className="mt-2 text-sm text-slate-700">Correct {latest.result.correct} · Incorrect {latest.result.incorrect} · Unattempted {latest.result.unanswered}
              {latest.result.rank ? ` · Rank ${latest.result.rank.position} of ${latest.result.rank.candidates}` : ''}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/account/mpt/results/${latest.application_code}`} className={secondaryButton}>{copy.dashboard.viewResult}</Link>
              <Link to="/account/mpt/mistakes" className={secondaryButton}>{copy.dashboard.mistakesTitle}</Link>
            </div>
          </div>
        ) : <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">{copy.dashboard.scoreEmpty}</p>}
      </section>

      {stats.attempts_completed > 0 && (
        <section className="space-y-3">
          <SectionTitle>{copy.dashboard.performanceTitle}</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[['Attempts', String(stats.attempts_completed)], ['Average', fmt(stats.avg_percentage, '%')], ['Highest', fmt(stats.highest_percentage, '%')], ['Latest', fmt(stats.latest_percentage, '%')], ['Avg accuracy', fmt(stats.avg_accuracy, '%')]].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>
            ))}
          </div>
          {trend.points.length >= 2 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <ScoreChart compact title="Score trend, recent completed mocks" points={trend.points.map((point) => ({ label: `Mock ${point.mock_number}`, value: point.percentage }))} />
              {trend.label && <p className="mt-2 text-sm font-semibold text-slate-800">{copy.dashboard.trend[trend.label]} <span className="font-normal text-slate-500">— {copy.dashboard.trendRule}</span></p>}
            </div>
          )}
          <Link to="/account/mpt/performance" className={secondaryButton}>{copy.dashboard.viewPerformance}</Link>
        </section>
      )}

      <section className="space-y-3">
        <SectionTitle>{copy.dashboard.historyTitle}</SectionTitle>
        {history.rows.length ? <HistoryRows rows={history.rows} /> : <p className="text-sm text-slate-600">Your applications and results will be listed here.</p>}
        {history.legacy.length > 0 && <p className="text-xs text-slate-500">{history.legacy.length} legacy self-scored result{history.legacy.length === 1 ? '' : 's'} are kept in your full history.</p>}
        {(history.total > history.rows.length || history.legacy.length > 0) && <Link to="/account/mpt/history" className={secondaryButton}>{copy.dashboard.viewAll}</Link>}
      </section>

      {others.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>{copy.dashboard.upcomingTitle}</SectionTitle>
          <UpcomingList cards={others} />
        </section>
      )}
    </div>
  )
}

export default function MptArea() {
  return (
    <AccountPage title="My MPT Mocks" intro="Apply, receive your Roll Number, sit the mock and track every official result.">
      <MptGate><Area /></MptGate>
    </AccountPage>
  )
}
