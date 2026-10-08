import ProGate from '@/features/membership/ProGate'
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BookOpen, Bookmark, Check, RotateCcw } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { useLearning } from '@/features/learning/api'
import { field, primary, secondary, usePreparationAction, type PreparationAction } from './api'

type ReadingKind = 'current_affairs' | 'vistagram'
type ReadingSource = {
  kind: ReadingKind
  source_id: string
  title: string
  summary: string
  category: string
  topic: string
  date: string
  to: string
  sources: { label: string; url: string; date: string | null }[]
  source_hash: string
  source_changed: boolean
  available: boolean
  version: number
  saved: boolean
  read_date: string | null
  last_review: string | null
  next_revision: string | null
  review_count: number
}
type ReadingData = { items: ReadingSource[]; has_more: boolean; today: string }
const label = (kind: ReadingKind) => (kind === 'vistagram' ? 'Vistagram' : 'Current Affairs')
function sourcePath(source: ReadingSource, attempt: string) {
  return `${source.to}?attempt=${encodeURIComponent(attempt)}`
}
function ReadingControls({
  source,
  action,
  today,
}: {
  source: ReadingSource
  action: PreparationAction
  today: string
}) {
  const send = (operation: string, outcome?: string) =>
    action.send({
      action: 'reading_save',
      kind: source.kind,
      source_id: source.source_id,
      source_hash: source.source_hash,
      expected_version: source.version,
      operation,
      ...(outcome ? { outcome } : {}),
    })
  const due = source.next_revision && source.next_revision <= today
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          className={secondary}
          disabled={action.blocked || !source.available}
          aria-pressed={source.saved}
          onClick={() => void send(source.saved ? 'unsave' : 'save')}
        >
          <Bookmark size={16} className="mr-2" aria-hidden="true" />
          {source.saved ? 'Remove attempt bookmark' : 'Save to attempt'}
        </button>
        <button
          className={primary}
          disabled={
            action.blocked || !source.available || (!!source.read_date && !source.source_changed)
          }
          onClick={() => void send('read')}
        >
          <Check size={16} className="mr-2" aria-hidden="true" />
          {source.read_date && !source.source_changed
            ? 'Marked read'
            : 'Mark read for this attempt'}
        </button>
      </div>
      {due && source.available && !source.source_changed && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-sm font-semibold">Recall before rereading</p>
          <p className="mt-1 text-sm text-slate-600">
            Try to recall its key points, source date and Pakistan implications. Record your own
            recall outcome.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={secondary}
              disabled={action.blocked}
              onClick={() => void send('review', 'needs_review')}
            >
              Review again tomorrow
            </button>
            <button
              className={secondary}
              disabled={action.blocked}
              onClick={() => void send('review', 'recalled')}
            >
              Recalled independently
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
function ReadingCard({
  source,
  attempt,
  today,
  action,
  compact = false,
}: {
  source: ReadingSource
  attempt: string
  today: string
  action: PreparationAction
  compact?: boolean
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
        <span>{label(source.kind)}</span>
        <span>{source.category}</span>
        <span>Published {source.date}</span>
      </div>
      {!compact && (
        <>
          <h3 className="mt-3 text-lg font-semibold leading-7">{source.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{source.summary}</p>
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
        {source.read_date && <span>First marked read {source.read_date}</span>}
        {source.next_revision && (
          <span>
            Revision {source.next_revision <= today ? 'due' : 'on'} {source.next_revision}
          </span>
        )}
        {source.review_count > 0 && <span>{source.review_count} recall reviews</span>}
      </div>
      {source.source_changed && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">
          The published source has changed since your earlier record. Read the updated article
          before marking this version read. Earlier reading evidence remains saved.
        </p>
      )}
      {!source.available && (
        <p className="mt-3 text-sm text-amber-900">
          This source is no longer published. Your earlier record is preserved.
        </p>
      )}
      <div className="mt-4 space-y-4">
        {source.available && !compact && (
          <Link className={secondary} to={sourcePath(source, attempt)}>
            <BookOpen size={16} className="mr-2" aria-hidden="true" /> Read {label(source.kind)}
          </Link>
        )}
        <ReadingControls source={source} today={today} action={action} />
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-3 text-indigo-700">
            Published references
          </summary>
          <ul className="space-y-2 break-words">
            {source.sources.map((s, i) => (
              <li key={`${s.url}:${i}`}>
                <a
                  className="text-indigo-700 underline"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.label}
                </a>
                {s.date && <span className="ml-2 text-slate-500">{s.date}</span>}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </article>
  )
}
function ReadingContent({
  attempt,
  action,
  generation,
}: {
  attempt: string
  action: PreparationAction
  generation: number
}) {
  const [params, setParams] = useSearchParams()
  const kind: ReadingKind = params.get('kind') === 'vistagram' ? 'vistagram' : 'current_affairs'
  const requestedFilter = params.get('filter') ?? 'all'
  const filter = ['saved', 'read', 'revision'].includes(requestedFilter) ? requestedFilter : 'all'
  const requestedRange = params.get('range') ?? 'all'
  const range = ['7', '30'].includes(requestedRange) ? requestedRange : 'all'
  const requestedOffset = Number(params.get('offset') ?? 0)
  const offset =
    Number.isInteger(requestedOffset) &&
    requestedOffset >= 0 &&
    requestedOffset <= 100000 &&
    requestedOffset % 20 === 0
      ? requestedOffset
      : 0
  function change(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.set(key, value)
    if (key !== 'offset') next.delete('offset')
    setParams(next)
  }
  const load = useLearning<ReadingData>(
    `planner.php?attempt=${attempt}&view=reading&kind=${kind}&filter=${filter}&range=${range}&offset=${offset}`,
  )
  const refresh = load.refresh
  useEffect(() => {
    refresh()
  }, [generation, refresh])
  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">
          Reading & revision
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Connect what you read</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Read in Vistagram or Current Affairs, keep what matters for this attempt and return for
          revision. Publication dates stay visible as you build your reading record.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Reading area
          <select
            aria-label="Reading area"
            className={field}
            value={kind}
            onChange={(e) => {
              change('kind', e.target.value)
            }}
          >
            <option value="current_affairs">★ Pro · Current Affairs</option>
            <option value="vistagram">Vistagram</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Show
          <select
            aria-label="Reading filter"
            className={field}
            value={filter}
            onChange={(e) => {
              change('filter', e.target.value)
            }}
          >
            <option value="all">Published articles</option>
            <option value="saved">Attempt bookmarks</option>
            <option value="read">Marked read</option>
            <option value="revision">Revision due</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Publication window
          <select
            aria-label="Publication window"
            className={field}
            value={range}
            onChange={(e) => {
              change('range', e.target.value)
            }}
          >
            <option value="all">All publication dates</option>
            <option value="7">Last 7 Pakistan dates</option>
            <option value="30">Last 30 Pakistan dates</option>
          </select>
        </label>
      </div>
      {load.error ? (
        <div role="alert" className="rounded-xl border border-red-200 p-4">
          {load.error}
          <button className={`${secondary} mt-3`} onClick={load.refresh}>
            Retry reading records
          </button>
        </div>
      ) : !load.data ? (
        <p role="status">Loading your reading records…</p>
      ) : (
        <>
          {load.data.items.length === 0 && (
            <p className="rounded-2xl border bg-white p-6 text-sm text-slate-600">
              No articles match these filters. Try another publication window or reading area.
            </p>
          )}
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {load.data.items.map((source) => (
              <ReadingCard
                key={`${source.kind}:${source.source_id}`}
                source={source}
                attempt={attempt}
                today={load.data!.today}
                action={action}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className={secondary}
              disabled={offset === 0 || action.blocked}
              onClick={() => change('offset', String(Math.max(0, offset - 20)))}
            >
              Previous articles
            </button>
            <span className="text-sm text-slate-500">Page {offset / 20 + 1}</span>
            <button
              className={secondary}
              disabled={!load.data.has_more || action.blocked}
              onClick={() => change('offset', String(offset + 20))}
            >
              Next articles
            </button>
          </div>
        </>
      )}
      <p className="text-xs leading-5 text-slate-500">
        Edition windows use Pakistan Standard Time. Existing general bookmarks, collections and
        reading history stay intact. This attempt keeps its own explicit records; opening a page
        adds no reading credit. Recall outcomes are self-reported.
      </p>
    </section>
  )
}
export function AttemptReadingConnection({
  kind,
  sourceId,
}: {
  kind: ReadingKind
  sourceId: string
}) {
  const [params] = useSearchParams(),
    { user } = useAccount(),
    attempt = params.get('attempt')
  if (!user || !attempt) return null
  return (
    <ReadingConnection
      key={`${user.id}:${attempt}:${kind}:${sourceId}`}
      attempt={attempt}
      kind={kind}
      sourceId={sourceId}
    />
  )
}
function ReadingConnection({
  attempt,
  kind,
  sourceId,
}: {
  attempt: string
  kind: ReadingKind
  sourceId: string
}) {
  const load = useLearning<ReadingData>(
    `planner.php?attempt=${encodeURIComponent(attempt)}&view=reading&kind=${kind}&source_id=${encodeURIComponent(sourceId)}`,
  )
  const action = usePreparationAction(attempt, load.refresh)
  const source = load.data?.items[0]
  return (
    <section
      className="my-6 min-w-0 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 sm:p-5"
      aria-label="This attempt’s reading record"
    >
      <h2 className="text-lg font-semibold text-slate-950">Your attempt’s reading record</h2>
      <Link
        className={`${secondary} my-3`}
        to={`/account/preparation?attempt=${encodeURIComponent(attempt)}&view=reading&kind=${kind}`}
      >
        <RotateCcw size={16} className="mr-2" aria-hidden="true" /> Back to attempt reading
      </Link>
      {action.pending && (
        <div className="mb-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm">
            An attempt action awaits confirmation. Check its receipt before saving again.
          </p>
          <button
            className={secondary}
            disabled={action.busy}
            onClick={() => void action.recover()}
          >
            Check saved action
          </button>
          {action.unaccepted && (
            <div className="flex flex-wrap gap-2">
              <button
                className={secondary}
                disabled={action.busy}
                onClick={() => void action.recover(true)}
              >
                Retry exact action
              </button>
              <button className={secondary} disabled={action.busy} onClick={action.discard}>
                Discard unaccepted action
              </button>
            </div>
          )}
        </div>
      )}
      {action.error && (
        <p className="mb-3 text-sm text-red-900" role="alert">
          {action.error}
        </p>
      )}
      {action.message && (
        <p className="mb-3 text-sm text-indigo-900" role="status">
          {action.message}
        </p>
      )}
      {source ? (
        <ReadingCard
          compact
          source={source}
          attempt={attempt}
          today={load.data!.today}
          action={action}
        />
      ) : (
        <div role={load.error ? 'alert' : 'status'}>
          <p className="text-sm">{load.error ?? 'Loading this attempt’s reading record…'}</p>
          {load.error && (
            <button className={secondary} onClick={load.refresh}>
              Retry reading record
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default function ConnectedReading(props: Parameters<typeof ReadingContent>[0]) {
  const [params] = useSearchParams()
  const vistaParams = new URLSearchParams(params); vistaParams.set('kind', 'vistagram'); vistaParams.delete('offset')
  return params.get('kind') === 'vistagram' ? <ReadingContent {...props} /> : <ProGate feature="Current Affairs reading & revision" fallbackAction={<Link className="mt-4 block min-h-11 py-3 text-sm font-semibold text-emerald-900" to={`/account/preparation?${vistaParams}`}>Open free Vistagram reading</Link>}><ReadingContent {...props} /></ProGate>
}
