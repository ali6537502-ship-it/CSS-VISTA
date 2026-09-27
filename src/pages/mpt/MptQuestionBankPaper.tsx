import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Search } from 'lucide-react'
import { mptApi } from '@/lib/mpt/api'
import { pktDate } from '@/lib/mpt/copy'
import { AccountPage } from '@/pages/account/shared'
import { ErrorNote, MptGate, PageSkeleton, secondaryButton, useMptLoad } from './common'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function QuestionBankPaper({ slug }: { slug: string }) {
  const load = useMptLoad((signal) => mptApi.questionBankPaper(slug, signal), [slug])
  const [subject, setSubject] = useState('ALL')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const questions = load.data?.questions ?? []
    const needle = search.trim().toLocaleLowerCase()
    return questions.filter((question) => {
      if (subject !== 'ALL' && question.section !== subject) return false
      if (!needle) return true
      return [question.q, ...question.o].some((value) => value.toLocaleLowerCase().includes(needle))
    })
  }, [load.data?.questions, search, subject])

  if (load.loading && !load.data) return <PageSkeleton />
  if (load.error && !load.data) return <ErrorNote error={load.error} onRetry={load.reload} />
  const data = load.data
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-900">{pktDate(data.mock.exam_open_at)}</p>
          <h2 className="mt-1 break-words text-xl font-bold text-slate-950">{data.mock.title}</h2>
          <p className="mt-1 text-sm text-slate-600">Completed · {data.mock.question_count} questions</p>
        </div>
        <Link to="/account/mpt/question-bank" className={secondaryButton}>Back to Question Bank</Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <label className="relative block">
          <span className="sr-only">Search Questions</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Questions"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1">
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            <button type="button" onClick={() => setSubject('ALL')}
              className={`min-h-10 whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${subject === 'ALL' ? 'border-emerald-800 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-700'}`}>
              All Questions
            </button>
            {data.subjects.map((item) => (
              <button key={item.subject} type="button" onClick={() => setSubject(item.subject)}
                className={`min-h-10 whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${subject === item.subject ? 'border-emerald-800 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-700'}`}>
                {item.subject} ({item.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-600">{filtered.length} question{filtered.length === 1 ? '' : 's'} shown</p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">No questions match this filter.</div>
      ) : (
        <ol className="space-y-4">
          {filtered.map((question) => (
            <li key={question.p} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">{question.section}</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900">Question No. {question.p}</h3>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-slate-950 sm:text-base" dir="auto">{question.q}</p>
              <ol className="mt-3 space-y-2">
                {question.o.map((option, index) => {
                  const isCorrect = question.correct === index
                  return (
                    <li key={index} dir="auto" className={`rounded-xl border px-3 py-2 text-sm leading-6 ${isCorrect ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-950' : 'border-slate-100 bg-slate-50/60 text-slate-800'}`}>
                      <span className="mr-1 font-bold">{LETTERS[index] ?? String(index + 1)}.</span> {option}
                    </li>
                  )
                })}
              </ol>
              {question.correct !== null && (
                <p className="mt-3 text-sm font-semibold text-emerald-900">Correct Answer: {LETTERS[question.correct] ?? String(question.correct + 1)}</p>
              )}
              {question.explanation && <p className="mt-2 text-sm leading-6 text-slate-600" dir="auto">{question.explanation}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function MptQuestionBankPaper() {
  const { mock = '' } = useParams()
  return (
    <AccountPage title="Previous MPT Question Bank" intro="Review-only access to an eligible completed MPT Mock.">
      <MptGate><QuestionBankPaper slug={mock} /></MptGate>
    </AccountPage>
  )
}
