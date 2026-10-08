import { Link, useSearchParams } from 'react-router'
import {
  ArrowRight,
  BookOpen,
  FilePenLine,
  History as HistoryIcon,
  ShieldCheck,
} from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { useLearning } from '@/features/learning/api'
import { panelStyle, primaryStyle, secondaryStyle, inputStyle } from '@/features/handwriting/styles'
import { pakistanTime } from '@/features/membership/api'
import { AccountPage } from './shared'
import Course from '@/features/precis/Course'
import Practice, { SkillProfile } from '@/features/precis/Practice'
import Composer from '@/features/precis/Composer'
import History from '@/features/precis/History'
import type { Detail, Overview, Progress } from '@/features/precis/api'
const views = [
  ['home', 'Overview'],
  ['course', 'Guided course'],
  ['skills', 'Skill practice'],
  ['write', 'Full practice'],
  ['timed', 'Timed practice'],
  ['review', 'Error review'],
]
function Workspace() {
  const [params, setParams] = useSearchParams(),
    writing = params.get('writing'),
    version = params.get('version'),
    offset = Math.max(0, Number(params.get('offset')) || 0)
  const overview = useLearning<Overview>(`precis.php?offset=${offset}`),
    detail = useLearning<Detail>(
      writing
        ? `precis.php?writing_id=${encodeURIComponent(writing)}${version ? `&version_id=${encodeURIComponent(version)}` : ''}`
        : undefined,
    )
  const requested = params.get('attempt') || '',
    attempt = writing ? detail.data?.writing.attempt_id || '' : requested,
    progress = useLearning<Progress>(
      attempt ? `precis.php?attempt_id=${encodeURIComponent(attempt)}` : undefined,
    )
  const view = params.get('view') || 'home',
    data = overview.data,
    active = !!data?.catalog
  function nav(fields: Record<string, string>) {
    const next = new URLSearchParams(params)
    Object.entries(fields).forEach(([k, v]) => next.set(k, v))
    next.delete('writing')
    next.delete('version')
    setParams(next)
  }
  function saved(id: string, versionId: string) {
    setParams({ writing: id, version: versionId })
    overview.refresh()
    detail.refresh()
  }
  const error = overview.error || detail.error
  if (!data || (writing && !detail.data))
    return (
      <section role={error ? 'alert' : 'status'} className={panelStyle}>
        {error || 'Opening your Précis workspace…'}
        {error && (
          <button
            className={`${secondaryStyle} mt-4`}
            onClick={() => {
              overview.refresh()
              detail.refresh()
            }}
          >
            Try again
          </button>
        )}
      </section>
    )
  const source =
    data.catalog?.passages.find((p) => p.id === params.get('passage')) || data.catalog?.passages[0]
  return (
    <div className="precis-workspace space-y-7">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white">
        <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_230px]">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-indigo-200">
              <FilePenLine className="h-4 w-4" aria-hidden="true" />
              Précis Mastery Lab
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Understand the argument.
              <br />
              <span className="text-indigo-200">Keep its meaning.</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              Read, map and compress before writing. A guided workspace based on the Master Précis
              Writing Handbook, with independent drafts and a clear path to revision.
            </p>
            <p className="mt-5 flex items-center gap-2 text-xs leading-6 text-slate-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
              Your passage, notes and saved versions stay linked to your preparation attempt.
            </p>
          </div>
          <div className="self-center rounded-2xl border border-white/15 p-5">
            <p className="text-xs text-slate-300">Full evaluation</p>
            <p className="mt-3 text-xl font-semibold">Not open yet</p>
            <p className="mt-3 text-xs leading-6 text-slate-300">
              Use the course, drills and saved drafts now. Personal meaning and title feedback is
              not available yet.
            </p>
          </div>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 px-6 py-4 text-xs text-slate-300 sm:px-8">
          <span>Read</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          <span>Identify</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          <span>Compress</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          <span>Write</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          <span>Revise</span>
        </p>
      </section>
      <nav aria-label="Précis modes" className="flex flex-wrap gap-2">
        {views.map(([id, label]) => (
          <Link
            key={id}
            to={`/account/precis?view=${id}${attempt ? `&attempt=${attempt}` : ''}`}
            aria-current={!writing && view === id ? 'page' : undefined}
            className={`${secondaryStyle} ${!writing && view === id ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : ''}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {!writing && (
        <section className={panelStyle}>
          <label className="grid gap-2 text-sm font-semibold">
            Preparation attempt
            <select
              value={attempt}
              className={inputStyle}
              onChange={(e) => nav({ attempt: e.target.value })}
            >
              <option value="">Choose an attempt</option>
              {data.attempts.map((a) => (
                <option key={a.id} value={a.id}>
                  My CSS Attempt — CSS {a.target_year}
                </option>
              ))}
            </select>
          </label>
          {data.has_more_attempts && (
            <p className="mt-3 text-xs text-slate-500">
              Your latest 1,000 attempts are shown. Earlier saved writing can still be opened from
              its history.
            </p>
          )}
          <Link
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline"
            to="/account/preparation?new=attempt"
          >
            Create a preparation attempt
          </Link>
          {progress.error && (
            <p role="alert" className="mt-3 text-sm text-red-800">
              {progress.error}
              <button className={`${secondaryStyle} ml-3`} onClick={progress.refresh}>
                Reload progress
              </button>
            </p>
          )}
        </section>
      )}
      {!active && (
        <section className={panelStyle}>
          <h2 className="text-xl font-semibold">
            {data.membership.status === 'expired'
              ? 'Your history is preserved'
              : 'Explore Précis Mastery'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            New course lessons, drills and Précis Lab saves require active Pro access. Your
            previously saved passages, versions, notes and revealed comparisons remain readable.
            Existing free Précis and Composition resources remain available.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className={secondaryStyle} to="/account/membership?returnTo=%2Faccount%2Fprecis">
              Membership and access
            </Link>
            <Link className={secondaryStyle} to="/subjects/compulsory/precis-composition">
              Free Précis resources
            </Link>
          </div>
          <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {data.course
              .filter((d, i, list) => i === 0 || d.title !== list[i - 1].title)
              .map((d) => (
                <li key={d.day} className="rounded-xl border border-slate-200 p-4">
                  Day {d.day} onward · {d.title}
                </li>
              ))}
          </ul>
        </section>
      )}
      {writing && detail.data ? (
        <>
          <History
            key={detail.data.version.id}
            detail={detail.data}
            rubric={data.rubric}
            active={active}
            refresh={() => {
              detail.refresh()
              overview.refresh()
            }}
            onVersion={(id) => setParams({ writing, version: id })}
          />
          {active && (
            <Composer
              key={`${writing}:${detail.data.version.id}`}
              data={data}
              attempt={detail.data.writing.attempt_id}
              source={detail.data.source}
              detail={detail.data}
              timed={false}
              onSaved={saved}
            />
          )}
        </>
      ) : active && view === 'course' ? (
        <Course data={data} attempt={attempt} progress={progress.data} refresh={progress.refresh} />
      ) : active && ['skills', 'review'].includes(view) ? (
        <Practice
          data={data}
          attempt={attempt}
          progress={progress.data}
          refresh={progress.refresh}
          review={view === 'review'}
        />
      ) : active && ['write', 'timed'].includes(view) && source ? (
        <>
          <section className={panelStyle}>
            <label className="grid gap-2 text-sm font-semibold">
              Practice passage
              <select
                value={params.get('passage') === 'custom' ? 'custom' : source.id || ''}
                className={inputStyle}
                onChange={(e) => nav({ passage: e.target.value })}
              >
                {data.catalog?.passages.map((p) => (
                  <option key={p.id} value={p.id!}>
                    {p.label} · handbook teaching example
                  </option>
                ))}
                <option value="custom">Add my own sourced passage</option>
              </select>
            </label>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              These examples are instructional passages, not official past questions or full
              exam-length simulations.
            </p>
          </section>
          <Composer
            key={`${attempt}:${params.get('passage') === 'custom' ? 'custom' : source.id}`}
            data={data}
            attempt={attempt}
            source={
              params.get('passage') === 'custom'
                ? { id: null, label: 'Your sourced passage', text: '', source: '', limit: null }
                : source
            }
            timed={view === 'timed'}
            onSaved={saved}
          />
        </>
      ) : null}
      {!writing && (view === 'home' || !active) && (
        <>
          <section className={panelStyle}>
            <h2 className="flex items-center gap-3 text-xl font-semibold">
              <BookOpen className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              Your next practice
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {progress.data
                ? `${progress.data.completed.length} course days marked complete. Continue from Day ${progress.data.current_day}, or practise an individual skill.`
                : 'Choose a preparation attempt to keep the course and drill evidence together.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className={primaryStyle}
                to={`/account/precis?view=course${attempt ? `&attempt=${attempt}` : ''}`}
              >
                Continue course
              </Link>
              <Link
                className={secondaryStyle}
                to={`/account/precis?view=review${attempt ? `&attempt=${attempt}` : ''}`}
              >
                Review recorded errors
              </Link>
            </div>
          </section>
          <section className={panelStyle}>
            <h2 className="flex items-center gap-3 text-xl font-semibold">
              <HistoryIcon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              Précis writing history
            </h2>
            {data.writing.length ? (
              <ul className="mt-5 divide-y divide-slate-200">
                {data.writing.map((w) => (
                  <li key={w.id}>
                    <Link
                      to={`/account/precis?writing=${w.id}`}
                      className="flex min-h-20 items-center justify-between gap-3 py-4 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block break-words font-semibold">{w.title}</span>
                        <span className="mt-1 block text-xs leading-6 text-slate-500">
                          {w.version} saved version{Number(w.version) === 1 ? '' : 's'} ·{' '}
                          {pakistanTime(w.updated_at)}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-500">
                No Précis Lab versions saved yet. Your existing writing remains in My Preparation.
              </p>
            )}
            <nav aria-label="Précis writing history pages" className="mt-4 flex flex-wrap gap-3">
              <button
                disabled={offset === 0}
                className={secondaryStyle}
                onClick={() => setParams({ offset: String(Math.max(0, offset - 50)) })}
              >
                Previous page
              </button>
              <button
                disabled={!data.has_more}
                className={secondaryStyle}
                onClick={() => setParams({ offset: String(offset + 50) })}
              >
                Next page
              </button>
              <button className={secondaryStyle} onClick={overview.refresh}>
                Refresh history
              </button>
            </nav>
          </section>
        </>
      )}
      {!writing && (view === 'home' || !active) && progress.data && (
        <SkillProfile progress={progress.data} attempt={attempt} />
      )}
      <div className="flex flex-wrap gap-4 border-t border-slate-200 pt-5 text-sm">
        <Link
          className="inline-flex min-h-11 items-center font-semibold text-indigo-700 underline"
          to={attempt ? `/grammar-course?attempt=${attempt}` : '/grammar-course'}
        >
          Grammar course
        </Link>
        <Link
          className="inline-flex min-h-11 items-center font-semibold text-indigo-700 underline"
          to="/account/preparation"
        >
          My preparation and all writing
        </Link>
        <Link
          className="inline-flex min-h-11 items-center font-semibold text-indigo-700 underline"
          to="/subjects/compulsory/precis-composition"
        >
          Free Précis and Composition
        </Link>
      </div>
    </div>
  )
}
export default function PrecisPage() {
  const { user } = useAccount()
  return (
    <AccountPage
      title="Précis Mastery Lab"
      intro="Understand, compress and revise with the original argument in view."
    >
      <Workspace key={user?.id} />
    </AccountPage>
  )
}
