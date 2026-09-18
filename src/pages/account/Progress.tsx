import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { AccountPage, EmptyNote, Metric, SectionTitle, daysRemaining, formatStudyTime, useAccountSnapshot, useSyllabusTotal } from './shared'

export default function AccountProgress() {
  const { snapshot } = useAccountSnapshot()
  const syllabusTotal = useSyllabusTotal()
  const syllabusPercent = syllabusTotal ? Math.round((snapshot.syllabusCompleted / syllabusTotal) * 100) : 0
  const examDays = daysRemaining(snapshot.state.studyPlanner?.examDate)
  const examYear = snapshot.state.studyPlanner?.examDate
    ? new Date(`${snapshot.state.studyPlanner.examDate}T12:00:00`).getFullYear()
    : null
  const latestMockPct = snapshot.latestMock
    ? Math.round((snapshot.latestMock.score / Math.max(1, snapshot.latestMock.total)) * 100)
    : null

  return (
    <AccountPage
      title="Progress & Mocks"
      intro="Everything you have measured so far: preparation, practice, revision and recorded mock attempts."
      action={
        <Link to="/exam-intelligence" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800">
          Exam Intelligence <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <SectionTitle>Where you stand</SectionTitle>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Target exam" value={examYear ? `CSS ${examYear}` : 'Not set'} detail={examYear ? 'From your planner date' : 'Set an exam date in Planner'} />
        <Metric label="Days remaining" value={examDays ?? '—'} detail={examDays === null ? 'Set your exam date first' : 'Based on your planner date'} />
        <Metric label="Syllabus progress" value={`${syllabusPercent}%`} detail={`${snapshot.syllabusCompleted} topics completed`} />
        <Metric label="Study streak" value={`${snapshot.stats.streak}d`} detail={`${snapshot.stats.accuracy}% overall MCQ accuracy`} />
        <Metric label="MCQs attempted" value={snapshot.stats.attempted.toLocaleString()} detail={`${snapshot.stats.accuracy}% accuracy`} />
        <Metric label="Saved resources" value={snapshot.savedResources} detail="Bookmarks and saved answers" />
      </div>

      <section className="mt-12">
        <SectionTitle>This week</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Study today" value={formatStudyTime(snapshot.study.today.seconds)} detail={`${snapshot.study.today.questions} questions practised`} />
          <Metric label="Revision due" value={snapshot.revision.due} detail={`${snapshot.revision.mature} mature revision items`} />
          <Metric label="Active tasks" value={snapshot.activeTasks.length} detail={`${snapshot.due.overdue.length} overdue`} />
          <Metric label="Mocks attempted" value={snapshot.mockResults.length} detail={latestMockPct === null ? 'No mock completed yet' : `Latest score ${latestMockPct}%`} />
        </div>
      </section>

      <section id="mocks" className="mt-12 scroll-mt-24">
        <SectionTitle>Mock record</SectionTitle>
        <div className="mt-4 rounded-2xl border border-slate-200 p-5 sm:p-6">
          <p className="text-sm text-slate-600">
            {snapshot.mockResults.length
              ? `${snapshot.mockResults.length} mock attempt${snapshot.mockResults.length === 1 ? '' : 's'} recorded.`
              : 'No mock attempt recorded yet.'}
          </p>
          {snapshot.latestMock && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Latest result</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {snapshot.latestMock.score}/{snapshot.latestMock.total}
                <span className="text-sm font-semibold text-slate-500"> ({latestMockPct}%)</span>
              </p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/gk/quiz?mode=mpt-mock" className="inline-flex min-h-11 items-center rounded-lg bg-emerald-900 px-4 text-xs font-bold text-white">CSS MPT Mock</Link>
            <Link to="/gk/quiz?mode=pms-mock" className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700">PMS GK Mock</Link>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle>Subject progress</SectionTitle>
        <div className="mt-4 rounded-2xl border border-slate-200 p-5 sm:p-6">
          {snapshot.subjectProgress.length
            ? (
              <div className="space-y-4">
                {snapshot.subjectProgress.map(([subject, value]) => (
                  <div key={subject}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{subject}</span><span className="text-slate-500">{value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-emerald-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )
            : <p className="text-sm text-slate-500">Mark topics in the syllabus to build your subject progress.</p>}
          <Link to="/fpsc-syllabus" className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-emerald-800">
            Open My Syllabus <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle>Recent learning</SectionTitle>
        <div className="mt-4">
          {snapshot.activities.length
            ? (
              <div className="divide-y divide-slate-100 border-y border-slate-100">
                {snapshot.activities.map((activity, index) => (
                  <div key={`${activity.label}-${index}`} className="py-4">
                    <p className="text-sm font-semibold text-slate-900">{activity.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(activity.ts).toLocaleString('en-PK')}</p>
                  </div>
                ))}
              </div>
            )
            : <EmptyNote>Your recent study activity will appear here.</EmptyNote>}
        </div>
      </section>
    </AccountPage>
  )
}
