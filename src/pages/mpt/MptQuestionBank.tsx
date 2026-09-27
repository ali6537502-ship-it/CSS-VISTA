import { Link } from 'react-router'
import { BookOpen, LockKeyhole } from 'lucide-react'
import { mptApi } from '@/lib/mpt/api'
import { pktDate } from '@/lib/mpt/copy'
import { AccountPage } from '@/pages/account/shared'
import { MptMenu } from '@/components/mpt/MptMenu'
import { ErrorNote, MptGate, PageSkeleton, primaryButton, secondaryButton, useMptLoad } from './common'

function QuestionBankIndex() {
  const load = useMptLoad((signal) => mptApi.questionBank(signal), [])
  if (load.loading && !load.data) return <PageSkeleton />
  if (load.error && !load.data) return <ErrorNote error={load.error} onRetry={load.reload} />
  const data = load.data
  if (!data) return null

  if (!data.has_participation) {
    return (
      <div className="space-y-5">
        <MptMenu />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <LockKeyhole aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-950">Previous MPT Question Bank</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Apply for an MPT Mock to unlock previous mock questions.</p>
            </div>
          </div>
          <Link to="/account/mpt" className={"mt-5 " + primaryButton}>Apply for MPT Mock</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <MptMenu />
      {data.mocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-slate-600">
          <p className="font-semibold text-slate-900">No previous MPT papers are available yet.</p>
          <p>Completed mock papers will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {data.mocks.map((mock) => (
            <article key={mock.slug} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900">
                      <BookOpen aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-bold text-slate-950">{mock.title}</h2>
                      <p className="mt-1 text-sm text-slate-600">{pktDate(mock.exam_open_at)}</p>
                      <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Status:</span> Completed <span aria-hidden="true">·</span> <span className="font-semibold">Questions:</span> {mock.question_count}</p>
                    </div>
                  </div>
                </div>
                <Link to={`/account/mpt/question-bank/${encodeURIComponent(mock.slug)}`} className={secondaryButton}>View Questions</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MptQuestionBank() {
  return (
    <AccountPage title="Previous MPT Question Bank" intro="Review questions from the MPT mocks you were eligible to attempt.">
      <MptGate><QuestionBankIndex /></MptGate>
    </AccountPage>
  )
}
