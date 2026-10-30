import PerformanceVisual from '@/features/workspace/PerformanceVisual'
import AccountGSATutorCard from '@/features/gsa-tutor/AccountGSATutorCard'
import AccountGSATutorCard from '@/features/gsa-tutor/AccountGSATutorCard'
import { SubjectOverview } from './Subjects'
import AttemptContinuation from '@/features/preparation/Continuation'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { AccountPage, EmptyNote, Metric, SectionTitle, daysRemaining, formatStudyTime, useAccountSnapshot } from './shared'

export default function AccountProgress() {
  const { snapshot } = useAccountSnapshot()
  const examDays = daysRemaining(snapshot.state.studyPlanner?.examDate)
  const examYear = examDays !== null && snapshot.state.studyPlanner?.examDate
    ? Number(snapshot.state.studyPlanner.examDate.slice(0, 4))
    : null
  const latestMockPct = snapshot.latestMock
    ? Math.round((snapshot.latestMock.score / Math.max(1, snapshot.latestMock.total)) * 100)
    : null

  return (
    <AccountPage
      title="My Performance"
      intro="Everything you have measured so far: preparation, practice, revision and recorded mock attempts."
      action={
        <Link to="/exam-intelligence" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800">
          Exam Intelligence <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <PerformanceVisual />
      <div className="my-6"><AccountGSATutorCard /></div>
      <div className="my-6"><AccountGSATutorCard /></div>
      <div className="ws-panel mb-6"><div className="flex flex-wrap gap-4 text-sm font-semibold"><a className="underline min-h-11 inline-flex items-center" href="#attempts">All recorded attempts</a><Link className="underline min-h-11 inline-flex items-center" to="/mistakes">Recorded errors & revision</Link><Link className="underline min-h-11 inline-flex items-center" to="/account/subjects">Selected subject coverage</Link></div></div>
      <AttemptContinuation />
      <SectionTitle>Where you stand</SectionTitle>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Target exam" value={examYear ? `CSS ${examYear}` : 'Not set'} detail={examYear ? 'From your planner date' : 'Set an exam date in Planner'} />
        <Metric label="Days remaining" value={examDays ?? '—'} detail={examDays === null ? 'Set your exam date first' : 'Based on your planner date'} />
        <Metric label="Syllabus progress" value={snapshot.syllabusCompleted} detail="Manually completed tracked items; not assessed mastery" />
        <Metric label="Visit streak" value={`${snapshot.stats.streak}d`} detail={snapshot.stats.attempted ? `${snapshot.stats.accuracy}% overall MCQ accuracy` : 'No recorded MCQ attempts'} />
        <Metric label="MCQs attempted" value={snapshot.stats.attempted.toLocaleString()} detail={snapshot.stats.attempted ? `${snapshot.stats.accuracy}% accuracy` : 'No recorded MCQ attempts'} />
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
            <Link to="/account/practice" className="ws-action">Open available practice</Link>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle>Subject progress</SectionTitle>
        <div className="mt-4 rounded-2xl border border-slate-200 p-5 sm:p-6">
          <p className="ws-muted mb-5">Manual completion of tracked syllabus items for your current subjects. Reading and assessment scores remain separate.</p>
          <SubjectOverview compact />
          <Link to="/fpsc-syllabus" className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-emerald-800">
            Open My Syllabus <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section id="attempts" className="ws-panel mt-8"><h2 className="font-bold text-lg">Recorded practice history</h2>{snapshot.state.quizResults.length ? <ul className="divide-y">{snapshot.state.quizResults.map(result => <li key={result.id} className="py-4 text-sm"><strong>{result.category}</strong><p>{result.score} / {result.total} · {new Date(result.date).toLocaleDateString('en-PK')}</p></li>)}</ul> : <p className="ws-muted mt-3">No practice results recorded yet. <Link to="/account/practice" className="underline">Choose a practice tool</Link>.</p>}</section>

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
