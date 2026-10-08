import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock3,
  History as HistoryIcon,
  LockKeyhole,
  Search,
} from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { useLearning } from '@/features/learning/api'
import { field, secondary } from '@/features/preparation/api'
import { useMembershipExpired } from '@/features/membership/api'
import TopicLesson from './Lesson'
import { topicPanel } from './styles'
import { categories, checkLabels, stateLabels, type Catalog, type History } from './types'

function TopicHistory({ attempt }: { attempt: string }) {
  const [params, setParams] = useSearchParams(),
    offset = Math.max(0, Number(params.get('topicPage')) || 0)
  const load = useLearning<History>(`topics.php?view=history&attempt=${attempt}&offset=${offset}`)
  if (!load.data)
    return (
      <div role={load.error ? 'alert' : 'status'} className={topicPanel}>
        {load.error || 'Loading your saved topic work…'}
        {load.error && (
          <button className={`${secondary} mt-3`} onClick={load.refresh}>
            Try again
          </button>
        )}
      </div>
    )
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">Your topic history</h3>
        <button className={secondary} onClick={load.refresh}>
          Refresh history
        </button>
      </div>
      <p className="text-sm leading-6 text-slate-600">
        Your notes, independent writing and earned check results remain readable after Pro expires.
        Earlier lesson editions keep their own progress.
      </p>
      {!load.data.records.length && (
        <p className={`${topicPanel} text-sm text-slate-500`}>
          No topic work saved to this attempt yet.
        </p>
      )}
      {load.data.records.map((record) => (
        <details className={topicPanel} key={record.topic_version_id}>
          <summary className="min-h-11 cursor-pointer font-semibold">
            <span className="mr-3">{record.title}</span>
            <span className="text-xs font-normal text-slate-500">
              {stateLabels[record.state]} · source checked {record.as_of}
            </span>
          </summary>
          <div className="mt-4 space-y-5 text-sm leading-7">
            <p>
              {record.completed.length} sections recorded · {record.draft_words} words of
              independent writing · {record.review_count} revisions
            </p>
            <div>
              <h4 className="font-semibold">Saved notes</h4>
              <p className="mt-2 whitespace-pre-wrap break-words">
                {record.notes || 'No notes saved.'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Independent writing</h4>
              <p className="mt-2 whitespace-pre-wrap break-words">
                {record.draft || 'No writing saved.'}
              </p>
            </div>
            <Link
              className={secondary}
              to={`/account/preparation?attempt=${attempt}&view=topics&topic=${record.topic_id}`}
            >
              Open current lesson
            </Link>
          </div>
        </details>
      ))}
      {load.data.checks.map((check) => (
        <details key={check.id} className={topicPanel}>
          <summary className="min-h-11 cursor-pointer text-sm font-semibold">
            {checkLabels[check.mode]} · {check.result.correct}/{check.result.total} correct ·{' '}
            {check.created_at.slice(0, 10)}
          </summary>
          <div className="mt-4 space-y-5">
            {check.result.results.map((result) => (
              <div key={result.id} className="text-sm leading-7">
                <p className="font-semibold">{result.prompt}</p>
                <p className="mt-2">Your answer: {result.options[result.choice]}</p>
                <p className="mt-1">
                  {result.correct ? 'Correct' : `Correct answer: ${result.options[result.answer]}`}
                </p>
                <p className="mt-2 text-slate-600">{result.explanation}</p>
              </div>
            ))}
          </div>
        </details>
      ))}
      <nav className="flex gap-3" aria-label="Topic history pages">
        <button
          className={secondary}
          disabled={offset === 0}
          onClick={() => {
            const next = new URLSearchParams(params)
            next.set('topicPage', String(Math.max(0, offset - 20)))
            setParams(next)
          }}
        >
          Previous
        </button>
        <button
          className={secondary}
          disabled={!load.data.has_more}
          onClick={() => {
            const next = new URLSearchParams(params)
            next.set('topicPage', String(offset + 20))
            setParams(next)
          }}
        >
          Next
        </button>
      </nav>
    </section>
  )
}
export default function TopicWorkspace({
  attempt = '',
  attempts = [],
}: {
  attempt?: string
  attempts?: { id: string; target_year: number }[]
}) {
  const { user } = useAccount(),
    [params, setParams] = useSearchParams()
  const category = params.get('topicCategory') || '',
    search = params.get('topicSearch') || '',
    offset = Math.max(0, Number(params.get('topicPage')) || 0)
  const [query, setQuery] = useState(search),
    topic = params.get('topic'),
    history = params.get('topicHistory') === '1'
  const load = useLearning<Catalog>(
    `topics.php?offset=${offset}&category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}${attempt ? `&attempt=${attempt}` : ''}`,
  )
  const expired = useMembershipExpired(load.data?.membership.expires_at),
    active = load.data?.membership.status === 'active' && !expired
  function nav(fields: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    next.set('view', 'topics')
    Object.entries(fields).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)))
    setParams(next)
  }
  function searchTopics(event: FormEvent) {
    event.preventDefault()
    nav({ topicSearch: query.trim(), topicPage: '0' })
  }
  return (
    <div className="min-w-0 space-y-6">
      <header className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-indigo-200">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          CSS VISTA PRO
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Pakistan & Current Affairs
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          Study the concept, test your understanding and build your own argument. Your topic work
          stays connected to your CSS attempt.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-xs text-slate-300">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            Source-based lessons
          </span>
          <span className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            Scheduled revision
          </span>
          <span className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            Private notes & writing
          </span>
        </div>
      </header>
      {!attempt && (
        <section className={topicPanel}>
          <label className="grid gap-2 text-sm font-semibold">
            Choose your preparation attempt
            <select
              value=""
              className={field}
              onChange={(event) => nav({ attempt: event.target.value })}
            >
              <option value="">Select an attempt</option>
              {attempts.map((a) => (
                <option key={a.id} value={a.id}>
                  My CSS Attempt — CSS {a.target_year}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Choose an attempt to open a lesson and save your work.
          </p>
          <Link
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline"
            to="/account/preparation?new=attempt"
          >
            Create a preparation attempt
          </Link>
        </section>
      )}
      <nav className="flex flex-wrap gap-3" aria-label="Topic workspace">
        <button
          className={secondary}
          aria-current={!topic && !history ? 'page' : undefined}
          onClick={() => nav({ topic: null, topicHistory: null, topicPage: '0' })}
        >
          Topic library
        </button>
        {attempt && (
          <button
            className={secondary}
            aria-current={history ? 'page' : undefined}
            onClick={() => nav({ topic: null, topicHistory: '1', topicPage: '0' })}
          >
            <HistoryIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            My topic history
          </button>
        )}
      </nav>
      {attempt && history ? (
        <TopicHistory key={`${user?.id}:${attempt}`} attempt={attempt} />
      ) : attempt && topic ? (
        <TopicLesson
          key={`${user?.id}:${attempt}:${topic}`}
          attempt={attempt}
          topic={topic}
          onSaved={load.refresh}
        />
      ) : (
        <>
          {!load.data ? (
            <div className={topicPanel} role={load.error ? 'alert' : 'status'}>
              {load.error || 'Loading the topic library…'}
              {load.error && (
                <button className={`${secondary} mt-3`} onClick={load.refresh}>
                  Try again
                </button>
              )}
            </div>
          ) : (
            <>
              {!active && (
                <aside className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                  <p className="flex items-start gap-3 text-sm leading-6 text-indigo-950">
                    <LockKeyhole className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
                    Active Pro opens these lessons and their practice. Your own saved work remains
                    available in topic history.
                  </p>
                  <Link className={secondary} to="/account/membership">
                    Explore Pro
                  </Link>
                </aside>
              )}
              {attempt && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Started', load.data.stats.started],
                    ['Practised', load.data.stats.practised],
                    ['Revision due', load.data.stats.due],
                    ['Mastered', load.data.stats.mastered],
                  ].map(([label, count]) => (
                    <div key={label} className="rounded-2xl border bg-white p-4">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{count}</p>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={searchTopics} className="grid gap-3 sm:grid-cols-[1fr_230px_auto]">
                <label className="grid gap-2 text-xs font-semibold text-slate-600">
                  Find a topic
                  <input
                    value={query}
                    maxLength={120}
                    onChange={(e) => setQuery(e.target.value)}
                    className={field}
                    placeholder="Search topics"
                  />
                </label>
                <label className="grid gap-2 text-xs font-semibold text-slate-600">
                  Study area
                  <select
                    value={category}
                    className={field}
                    onChange={(e) => nav({ topicCategory: e.target.value, topicPage: '0' })}
                  >
                    <option value="">All areas</option>
                    {load.data.categories.map((c) => (
                      <option key={c.category} value={c.category}>
                        {categories[c.category]} ({c.count})
                      </option>
                    ))}
                  </select>
                </label>
                <button className={`${secondary} self-end`}>
                  <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                  Search
                </button>
              </form>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  {load.data.total} published topic{load.data.total === 1 ? '' : 's'}
                </p>
                <button className={secondary} onClick={load.refresh}>
                  Refresh
                </button>
              </div>
              {load.data.items.length === 0 ? (
                <div className={`${topicPanel} text-sm leading-7 text-slate-600`}>
                  {search || category
                    ? 'No published topics match these filters.'
                    : 'No topics have been published in this library yet.'}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {load.data.items.map((item) => (
                    <article
                      key={item.id}
                      className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-indigo-300 sm:p-6"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-indigo-700">
                          {categories[item.category]}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${item.state === 'revision_due' ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {stateLabels[item.state]}
                        </span>
                      </div>
                      <h3 className="mt-4 text-xl font-semibold leading-7 text-slate-950">
                        {item.title}
                      </h3>
                      <p className="mt-3 grow text-sm leading-7 text-slate-600">{item.summary}</p>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                        {item.bookmarked && (
                          <span className="flex items-center gap-2 text-xs text-slate-500">
                            <Bookmark className="h-4 w-4" aria-hidden="true" />
                            Bookmarked
                          </span>
                        )}
                        {attempt ? (
                          <button
                            className="ml-auto inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700"
                            onClick={() =>
                              nav({
                                topic: item.id,
                                topicHistory: null,
                                topicMode: 'read',
                                topicSection: null,
                              })
                            }
                          >
                            Open topic
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Choose an attempt above to open
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <nav className="flex flex-wrap gap-3" aria-label="Topic library pages">
                <button
                  className={secondary}
                  disabled={offset === 0}
                  onClick={() => nav({ topicPage: String(Math.max(0, offset - 20)) })}
                >
                  Previous
                </button>
                <button
                  className={secondary}
                  disabled={!load.data.has_more}
                  onClick={() => nav({ topicPage: String(offset + 20) })}
                >
                  Next
                </button>
              </nav>
            </>
          )}
        </>
      )}
    </div>
  )
}
