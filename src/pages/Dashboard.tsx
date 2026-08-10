import { useState } from 'react'
import { Link } from 'react-router'
import { Cloud, History, LogIn, Trash2, UserRound } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts'
import { PageHeader, Section, Badge } from '@/components/shared'
import { getState, getStats } from '@/lib/store'
import { recentActivities } from '@/lib/progress'
import { useAccount } from '@/lib/accountContext'

export default function Dashboard() {
  const [, setRefresh] = useState(0)
  const stats = getStats()
  const state = getState()
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetError, setResetError] = useState('')
  const { user, configured, syncStatus, resetProgress } = useAccount()

  const chartData = stats.categories.map((c) => ({ name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name, Accuracy: c.pct }))
  const recentScores = state.quizResults.slice(0, 10).reverse().map((r, i) => ({ n: i + 1, pct: Math.round((r.score / Math.max(1, r.total)) * 100) }))

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
                  Delete all progress on this device?
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

        {/* Cards */}
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
