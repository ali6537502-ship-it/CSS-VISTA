import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Activity, AlertTriangle, CalendarDays, CheckCircle2, Clock3, Cloud, Gauge, History, LogIn,
  Minus, Target, Trash2, TrendingDown, TrendingUp, UserRound,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts'
import { PageHeader, Section, Badge } from '@/components/shared'
import { getState, getStats, type QuizResult, type ScheduledMockKind } from '@/lib/store'
import { getStudyAnalytics, recentActivities } from '@/lib/progress'
import { useAccount } from '@/lib/accountContext'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'
import PrintMenu from '@/components/PrintMenu'

function formatStudyTime(seconds: number) {
  if (seconds < 60) return seconds > 0 ? '<1m' : '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

function trendLabel(value: number | null, positiveWord: string, negativeWord: string) {
  if (value === null) return 'Building your comparison baseline'
  if (value === 0) return 'No change from the previous 7 days'
  return value > 0 ? `${value}% ${positiveWord}` : `${Math.abs(value)}% ${negativeWord}`
}

function mockLabel(kind: ScheduledMockKind) {
  return kind === 'mpt' ? 'CSS MPT Grand Mock' : 'PMS GK Grand Mock'
}

function mockDuration(seconds?: number) {
  if (!seconds) return '—'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

function weaknessCounts(result?: QuizResult): Record<string, number> {
  if (!result) return {}
  if (result.wrongTopicCounts && Object.keys(result.wrongTopicCounts).length) return result.wrongTopicCounts
  return Object.fromEntries((result.wrongTopics ?? []).map((topic) => [topic, 1]))
}

function MockRecord({ results }: { results: QuizResult[] }) {
  const sorted = [...results].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <section className="mock-record-print-area overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-emerald-950 px-5 py-5 text-white sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-200">Permanent performance record</p>
          <h2 className="mt-1 font-display text-2xl font-bold">Mock history &amp; weakness comparison</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-emerald-100/80">Every completed PMS GK and MPT mock is retained. Compare the latest paper with the previous attempt to see recurring, improving and newly emerging weak areas.</p>
        </div>
        <PrintMenu answersAvailable={false} label="Print mock record" targetSelector=".mock-record-print-area" />
      </div>

      {sorted.length === 0 ? (
        <div className="p-6 text-center sm:p-10">
          <History className="mx-auto h-8 w-8 text-emerald-700" />
          <h3 className="mt-3 font-bold text-pine">No completed mock record yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your first completed mock will establish the comparison baseline.</p>
          <div className="no-print mt-4 flex flex-wrap justify-center gap-2">
            <Link to="/gk/quiz?mode=pms-mock" className="rounded-md bg-pine px-4 py-2 text-sm font-bold text-white">PMS GK Mock</Link>
            <Link to="/gk/quiz?mode=mpt-mock" className="rounded-md border px-4 py-2 text-sm font-bold text-pine">MPT Mock</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-7 p-4 sm:p-6">
          {(['gk', 'mpt'] as const).map((kind) => {
            const attempts = sorted.filter((result) => result.mockKind === kind)
            if (!attempts.length) return null
            const latest = attempts[0]
            const previous = attempts[1]
            const latestPct = Math.round(latest.score / Math.max(1, latest.total) * 100)
            const previousPct = previous ? Math.round(previous.score / Math.max(1, previous.total) * 100) : null
            const scoreChange = previousPct === null ? null : latestPct - previousPct
            const latestWeakness = weaknessCounts(latest)
            const previousWeakness = weaknessCounts(previous)
            const weaknessAreas = [...new Set([...Object.keys(latestWeakness), ...Object.keys(previousWeakness)])]
              .sort((a, b) => (latestWeakness[b] ?? 0) - (latestWeakness[a] ?? 0) || (previousWeakness[b] ?? 0) - (previousWeakness[a] ?? 0))
            const chart = [...attempts].reverse().map((attempt, index) => ({
              attempt: index + 1,
              score: Math.round(attempt.score / Math.max(1, attempt.total) * 100),
            }))

            return (
              <article key={kind} className="rounded-xl border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/35 px-4 py-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-pine">{mockLabel(kind)}</h3>
                    <p className="text-xs text-muted-foreground">{attempts.length} recorded attempt{attempts.length === 1 ? '' : 's'}{latest.studentName ? ` · ${latest.studentName}` : ''}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">Latest: {latestPct}%</span>
                </div>

                <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
                  <div className="bg-white p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Latest score</p><p className="mt-1 text-xl font-bold text-pine">{latest.score}/{latest.total}</p></div>
                  <div className="bg-white p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Previous score</p><p className="mt-1 text-xl font-bold text-pine">{previous ? `${previous.score}/${previous.total}` : 'Baseline'}</p></div>
                  <div className="bg-white p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Score change</p><p className={`mt-1 text-xl font-bold ${(scoreChange ?? 0) >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{scoreChange === null ? '—' : `${scoreChange > 0 ? '+' : ''}${scoreChange} pts`}</p></div>
                  <div className="bg-white p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Completion time</p><p className="mt-1 text-xl font-bold text-pine">{mockDuration(latest.durationSeconds)}</p></div>
                </div>

                <div className="grid gap-5 p-4 lg:grid-cols-[.8fr_1.2fr]">
                  <div>
                    <h4 className="text-sm font-bold text-pine">Score progression</h4>
                    <p className="text-xs text-muted-foreground">Every attempt is retained in chronological order.</p>
                    <div className="mt-3 h-52 rounded-lg border bg-secondary/15 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chart} margin={{ top: 8, right: 14, left: -24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
                          <XAxis dataKey="attempt" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value) => [`${Number(value)}%`, 'Score']} labelFormatter={(value) => `Attempt ${value}`} />
                          <Line type="monotone" dataKey="score" stroke="#0f6a45" strokeWidth={2.5} dot={{ r: 3.5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-pine">Latest vs previous weaknesses</h4>
                    <p className="text-xs text-muted-foreground">Missed questions in each area; a lower number indicates improvement.</p>
                    {weaknessAreas.length ? (
                      <div className="mt-3 overflow-hidden rounded-lg border">
                        <div className="grid grid-cols-[1fr_58px_58px_92px] gap-2 bg-secondary px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          <span>Area</span><span>Previous</span><span>Latest</span><span>Trend</span>
                        </div>
                        {weaknessAreas.slice(0, 10).map((area) => {
                          const before = previousWeakness[area] ?? 0
                          const current = latestWeakness[area] ?? 0
                          const change = current - before
                          const cleared = before > 0 && current === 0
                          const improved = change < 0
                          const worsened = change > 0
                          return (
                            <div key={area} className="grid grid-cols-[1fr_58px_58px_92px] items-center gap-2 border-t px-3 py-2.5 text-xs">
                              <span className="min-w-0 truncate font-semibold text-foreground" title={area}>{area}</span>
                              <span>{previous ? before : '—'}</span>
                              <span className="font-bold">{current}</span>
                              <span className={`inline-flex items-center gap-1 font-bold ${cleared || improved ? 'text-emerald-700' : worsened ? 'text-amber-700' : 'text-muted-foreground'}`}>
                                {cleared ? <CheckCircle2 className="h-3.5 w-3.5" /> : improved ? <TrendingDown className="h-3.5 w-3.5" /> : worsened ? <AlertTriangle className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                                {cleared ? 'Cleared' : !previous ? 'Baseline' : improved ? `${Math.abs(change)} better` : worsened ? `+${change} missed` : 'Same'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : <p className="mt-3 rounded-lg border bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">No weakness areas recorded in the latest attempt.</p>}
                  </div>
                </div>
              </article>
            )
          })}

          <div>
            <h3 className="font-display text-lg font-bold text-pine">Complete mock record</h3>
            <p className="text-xs text-muted-foreground">Newest attempt first. Signed-in students can sync this record across devices.</p>
            <div className="mt-3 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-secondary text-pine"><tr><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Student</th><th className="px-3 py-2.5">Mock</th><th className="px-3 py-2.5">Score</th><th className="px-3 py-2.5">Accuracy</th><th className="px-3 py-2.5">Time</th><th className="px-3 py-2.5">Weak areas</th></tr></thead>
                <tbody>
                  {sorted.map((attempt) => (
                    <tr key={attempt.id} className="border-t align-top">
                      <td className="whitespace-nowrap px-3 py-2.5">{new Date(attempt.date).toLocaleDateString('en-PK')}</td>
                      <td className="px-3 py-2.5 font-semibold">{attempt.studentName || 'Student'}</td>
                      <td className="px-3 py-2.5">{mockLabel(attempt.mockKind!)}</td>
                      <td className="px-3 py-2.5 font-bold">{attempt.score}/{attempt.total}</td>
                      <td className="px-3 py-2.5">{Math.round(attempt.score / Math.max(1, attempt.total) * 100)}%</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{mockDuration(attempt.durationSeconds)}</td>
                      <td className="max-w-[280px] px-3 py-2.5 text-muted-foreground">{attempt.wrongTopics?.length ? attempt.wrongTopics.join(', ') : 'None recorded'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default function Dashboard() {
  const [, setRefresh] = useState(0)
  const stats = getStats()
  const state = getState()
  const study = getStudyAnalytics(7)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetError, setResetError] = useState('')
  const { user, configured, syncStatus, resetProgress } = useAccount()

  const chartData = stats.categories.map((c) => ({ name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name, Accuracy: c.pct }))
  const recentScores = state.quizResults.slice(0, 10).reverse().map((r, i) => ({ n: i + 1, pct: Math.round((r.score / Math.max(1, r.total)) * 100) }))
  const dailyGoalHours = state.studyPlanner?.dailyHours ?? 2
  const dailyGoalSeconds = dailyGoalHours * 3600
  const dailyGoalProgress = Math.min(100, Math.round((study.today.seconds / dailyGoalSeconds) * 100))
  const mockResults = state.quizResults.filter((result) => result.mockKind === 'gk' || result.mockKind === 'mpt')

  useEffect(() => {
    const refresh = () => setRefresh((value) => value + 1)
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
  }, [])

  return (
    <div>
      <PageHeader title="Performance Dashboard" description="Your progress centre - scores, accuracy, strong and weak areas, streaks and recent learning activity." />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
        {/* Guest mode + continue */}
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-pine">
              {user ? <Cloud className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
              {user ? `Signed in as ${user.email ?? 'CSS aspirant'}` : 'You are using Guest Mode'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {user
                ? `Your progress is saved locally and ${syncStatus === 'syncing' ? 'is syncing now' : 'can sync securely across your signed-in devices'}.`
                : 'Everything works without an account. Your progress is saved privately in this browser until you choose to sign in.'}
            </p>
            <Link
              to="/account"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline"
            >
              {user ? <Cloud className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {user ? 'Manage account and sync' : configured ? 'Sign in to sync progress' : 'Account setup status'}
            </Link>
            <div className="mt-4 border-t pt-4">
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Reset progress
                </button>
              ) : (
                <span className="inline-flex flex-wrap items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                  Delete all saved progress?
                  <button
                    onClick={async () => {
                      const result = await resetProgress()
                      if (result.error) {
                        setResetError(result.error)
                        return
                      }
                      setResetError('')
                      setConfirmReset(false)
                      setRefresh((value) => value + 1)
                    }}
                    className="font-bold underline"
                  >
                    Yes, reset
                  </button>
                  <button onClick={() => setConfirmReset(false)} className="underline">Cancel</button>
                </span>
              )}
              {resetError && <p className="mt-2 text-xs font-medium text-red-700">{resetError}</p>}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-pine">
              <History className="h-4 w-4" /> Continue where you left off
            </h2>
            {recentActivities(4).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No recent activity yet. Attempt a quiz, open a GK category or use a study tool - your last stop will appear here.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {recentActivities(4).map((a, i) => (
                  <li key={i}>
                    <Link to={a.path} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                      <span className="truncate">{a.label}</span>
                      <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">{new Date(a.ts).toLocaleDateString()}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Daily and weekly study report */}
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b bg-gradient-to-r from-emerald-950 to-emerald-800 px-5 py-5 text-white sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">
                  <Activity className="h-4 w-4" /> Daily progress report
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">Today’s focused preparation</h2>
                <p className="mt-1 text-xs text-emerald-100/80">
                  Only visible, active study time counts. Tracking pauses after 90 seconds without activity.
                </p>
              </div>
              <Link to="/study-planner" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white ring-1 ring-white/20 hover:bg-white/15">
                <Target className="h-4 w-4" /> {state.studyPlanner ? 'Edit daily goal' : 'Set your own goal'}
              </Link>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15" aria-label={`${dailyGoalProgress}% of today's study goal complete`}>
              <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${dailyGoalProgress}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-emerald-100">
              <span>{formatStudyTime(study.today.seconds)} focused</span>
              <span>{dailyGoalProgress}% of {dailyGoalHours}h {state.studyPlanner ? 'planner goal' : 'starter goal'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
            {[
              { icon: Clock3, label: 'Active study', value: formatStudyTime(study.today.seconds) },
              { icon: CalendarDays, label: 'Questions today', value: study.today.questions },
              { icon: Gauge, label: 'Avg. response', value: study.today.avgQuestionSeconds ? `${study.today.avgQuestionSeconds}s` : '—' },
              { icon: Target, label: 'Question accuracy', value: study.today.questions ? `${study.today.accuracy}%` : '—' },
            ].map((item) => (
              <div key={item.label} className="bg-white px-4 py-4">
                <item.icon className="h-4 w-4 text-emerald-700" />
                <div className="mt-2 font-display text-xl font-bold text-pine">{item.value}</div>
                <div className="text-[11px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.25fr_.75fr]">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-pine">Last 7 days</h3>
                  <p className="text-xs text-muted-foreground">{formatStudyTime(study.currentWeekSeconds)} of active preparation</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                  {trendLabel(study.studyChangePercent, 'more study', 'less study')}
                </span>
              </div>
              <div className="h-56 rounded-xl border bg-secondary/20 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={study.daily} margin={{ top: 8, right: 4, bottom: 0, left: -26 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`${Number(value)} min`, 'Focused study']} />
                    <Bar dataKey="minutes" name="Focused study" fill="#0f6a45" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border bg-emerald-50/60 p-4">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800">
                  <TrendingUp className="h-4 w-4" /> Improvement record
                </p>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Answer speed</span>
                    <span className={`font-bold ${(study.speedImprovementPercent ?? 0) >= 0 ? 'text-emerald-800' : 'text-amber-700'}`}>
                      {trendLabel(study.speedImprovementPercent, 'faster', 'slower')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <span className="text-muted-foreground">Accuracy</span>
                    <span className={`font-bold ${(study.accuracyChange ?? 0) >= 0 ? 'text-emerald-800' : 'text-amber-700'}`}>
                      {study.accuracyChange === null ? 'Building baseline' : `${study.accuracyChange > 0 ? '+' : ''}${study.accuracyChange} points`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-pine">Top study areas this week</h3>
                {study.topAreas.length ? (
                  <div className="mt-3 space-y-2">
                    {study.topAreas.slice(0, 4).map((area) => (
                      <div key={area.area} className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-muted-foreground">{area.area}</span>
                        <span className="shrink-0 font-bold text-pine">{formatStudyTime(area.seconds)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Your study areas will appear as you use CSS Vista.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <MockRecord results={mockResults} />

        {/* All-time cards */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">All-time performance</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Tests taken', value: stats.totalQuizzes },
            { label: 'Questions attempted', value: stats.attempted },
            { label: 'Accuracy', value: `${stats.accuracy}%` },
            { label: 'Avg. score', value: `${stats.avgScore}%` },
            { label: 'Practice streak', value: `${stats.streak}d` },
            { label: 'Challenges done', value: stats.challenges },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border bg-white p-4 text-center">
              <div className="font-display text-2xl font-bold text-pine">{c.value}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>
        </div>

        {stats.totalQuizzes === 0 ? (
          <div className="rounded-lg border border-dashed bg-secondary/40 p-10 text-center">
            <p className="text-sm text-muted-foreground">No data yet. Attempt a mock test, game or the daily challenge and this dashboard comes alive.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link to="/mpt" className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">Take an MPT test</Link>
              <Link to="/daily-challenge" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary">Daily challenge</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Accuracy by category">
              <div className="h-64 rounded-lg border bg-white p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="Accuracy" fill="#0d4d33" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
            <Section title="Recent scores (%)">
              <div className="h-64 rounded-lg border bg-white p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={recentScores} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="n" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="pct" stroke="#0d4d33" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <Section title="Strong areas">
            {stats.strong.length ? (
              <div className="space-y-1.5">{stats.strong.map((s) => <div key={s.name} className="flex items-center justify-between rounded-md border bg-white px-4 py-2.5 text-sm"><span>{s.name}</span><Badge tone="green">{s.pct}%</Badge></div>)}</div>
            ) : <p className="text-sm text-muted-foreground">Take a few tests to reveal strengths.</p>}
          </Section>
          <Section title="Weak areas - recommended focus">
            {stats.weak.length ? (
              <div className="space-y-1.5">
                {stats.weak.map((w) => (
                  <div key={w.name} className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm">
                    <div className="flex items-center justify-between"><span className="font-medium">{w.name}</span><Badge tone="gold">{w.pct}%</Badge></div>
                    <Link to="/mpt" className="mt-1 inline-block text-xs font-semibold text-emerald-800 hover:underline">Practise this category →</Link>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Weak areas appear after 5+ questions per category.</p>}
          </Section>
          <Section title="Recent activity">
            {state.quizResults.length ? (
              <ul className="space-y-1.5">
                {state.quizResults.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-md border bg-white px-4 py-2 text-sm">
                    <span className="truncate">{r.category}</span>
                    <span className="ml-2 shrink-0 font-semibold text-pine">{r.score}/{r.total}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nothing yet.</p>}
          </Section>
        </div>

      </div>
    </div>
  )
}
