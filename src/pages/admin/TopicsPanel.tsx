import { useEffect, useId, useRef, useState } from 'react'
import { ownerRequest, HostingerApiError } from '@/lib/hostingerApi'
import { field, primary, secondary } from '@/features/preparation/api'
import { topicPanel } from '@/features/topics/styles'
import type { Definition, Question } from '@/features/topics/types'

type AdminDefinition = Omit<Definition, 'questions'> & {
  questions: (Question & { answer: number; explanation: string })[]
}
type Row = {
  id: string
  title: string
  category: string
  revision: number
  published_version_id: string | null
  latest_version_id: string
  versions: number
}
type Queue = { admin_id: string; topics: Row[]; has_more: boolean }
type Version = {
  id: string
  topic_id: string
  revision: number
  content_hash: string
  published_version_id: string | null
  content: AdminDefinition
}
type Result = { topic_id: string; version_id: string; revision: number; publication: string }
function TopicEditor({ data, refresh }: { data: Queue; refresh: () => void }) {
  const reviewNoteId = useId()
  const cacheKey = `cssvista:topic-editor:${data.admin_id}`
  const [pending, setPending] = useState<Record<string, unknown> | null>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(cacheKey) || 'null') as {
        admin: string
        body: Record<string, unknown>
      } | null
      return saved?.admin === data.admin_id && typeof saved.body?.request_id === 'string'
        ? saved.body
        : null
    } catch {
      return null
    }
  })
  const running = useRef(false),
    [busy, setBusy] = useState(false),
    [unaccepted, setUnaccepted] = useState(false)
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [imports, setImports] = useState<AdminDefinition[]>([])
  const [selected, setSelected] = useState(''),
    [preview, setPreview] = useState<Version>(),
    [reviewed, setReviewed] = useState(false),
    [reviewNote, setReviewNote] = useState('')
  const [versions, setVersions] = useState<{ id: string; title: string; as_of: string }[]>([])
  const [importing, setImporting] = useState(false)
  const batchRunning = useRef(false),
    [previewGeneration, setPreviewGeneration] = useState(0)
  useEffect(() => {
    if (!selected) return
    const controller = new AbortController()
    void ownerRequest<{ version: Version }>(`admin/topics.php?version_id=${selected}`, {
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) {
          setPreview(value.version)
          setReviewed(false)
          setReviewNote('')
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Topic preview could not be loaded.')
      })
    return () => controller.abort()
  }, [selected, previewGeneration])
  const current = preview?.id === selected ? preview : undefined
  function accepted(result: Result) {
    sessionStorage.removeItem(cacheKey)
    setPending(null)
    setUnaccepted(false)
    setMessage(`${result.topic_id}: ${result.publication}.`)
    setError('')
    setPreviewGeneration((g) => g + 1)
    refresh()
    return result
  }
  async function mutate(body: Record<string, unknown>): Promise<Result | undefined> {
    if (running.current || pending) return
    running.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const request = { ...body, request_id: crypto.randomUUID() }
      sessionStorage.setItem(cacheKey, JSON.stringify({ admin: data.admin_id, body: request }))
      setPending(request)
      setUnaccepted(false)
      return accepted(
        await ownerRequest<Result>('admin/topics.php', {
          method: 'POST',
          body: JSON.stringify(request),
        }),
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Publication could not be confirmed. Check its receipt before retrying.',
      )
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  async function recover(retry = false) {
    if (!pending || running.current) return
    running.current = true
    setBusy(true)
    setError('')
    try {
      accepted(
        await ownerRequest<Result>(`admin/topics.php?request_id=${String(pending.request_id)}`),
      )
    } catch (cause) {
      if (cause instanceof HostingerApiError && cause.status === 404) {
        setUnaccepted(true)
        if (retry) {
          try {
            accepted(
              await ownerRequest<Result>('admin/topics.php', {
                method: 'POST',
                body: JSON.stringify(pending),
              }),
            )
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : 'The exact publication request was not accepted.',
            )
          }
        } else
          setMessage(
            'No accepted receipt was found. Retry the exact request, or discard it and refresh the publication state.',
          )
      } else
        setError(
          cause instanceof Error ? cause.message : 'Publication receipt could not be checked.',
        )
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  async function importFile(file?: File) {
    if (!file) return
    setError('')
    try {
      if (file.size > 8 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.json'))
        throw new Error('Choose a native topic JSON package under 8 MiB.')
      const parsed = JSON.parse(await file.text()) as
        AdminDefinition | { topics: AdminDefinition[] }
      const topics = 'topics' in parsed ? parsed.topics : [parsed]
      if (
        !Array.isArray(topics) ||
        topics.length < 1 ||
        topics.length > 200 ||
        topics.some((t) => typeof t?.id !== 'string' || typeof t?.title !== 'string')
      )
        throw new Error('Provide a native topic object or a package containing 1–200 topics.')
      setImports(topics)
      setMessage(
        `${topics.length} native topic${topics.length === 1 ? '' : 's'} ready to import as drafts.`,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import package could not be read.')
    }
  }
  async function importTopics(topics: AdminDefinition[]) {
    if (batchRunning.current || busy || pending) return
    batchRunning.current = true
    setImporting(true)
    try {
      for (const topic of topics) {
        const fresh = await ownerRequest<{ topic: { revision: number } | null }>(
          `admin/topics.php?topic=${encodeURIComponent(topic.id)}`,
        )
        const result = await mutate({
          action: 'import',
          expected_revision: fresh.topic?.revision || 0,
          topic,
        })
        if (!result) break
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Topic import stopped. Earlier accepted imports remain saved.',
      )
    } finally {
      batchRunning.current = false
      setImporting(false)
    }
  }
  async function open(row: Row) {
    setSelected(row.latest_version_id)
    setPreviewGeneration((g) => g + 1)
    setError('')
    try {
      const response = await ownerRequest<{
        versions: { id: string; title: string; as_of: string }[]
      }>(`admin/topics.php?topic=${row.id}`)
      setVersions(response.versions)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Topic versions could not be loaded.')
    }
  }
  const blocked = busy || !!pending || importing
  return (
    <div className="space-y-6">
      <section className={topicPanel}>
        <h2 className="text-xl font-semibold">Import native topic drafts</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Upload the prepared lesson package. Lesson content and answer keys go into the private
          database. Importing does not publish it, replace a published edition or reset student
          history.
        </p>
        <label className="mt-4 grid gap-2 text-sm font-semibold">
          Native topic JSON
          <input
            type="file"
            accept=".json,application/json"
            disabled={blocked}
            onChange={(event) => void importFile(event.target.files?.[0])}
            className="min-h-11 max-w-full rounded-xl border p-3 text-sm"
          />
        </label>
        {imports.length > 0 && (
          <div className="mt-4 space-y-3">
            <button
              className={primary}
              disabled={blocked}
              onClick={() => void importTopics(imports)}
            >
              Import {imports.length} topic draft{imports.length === 1 ? '' : 's'}
            </button>
            <ul className="max-h-52 space-y-2 overflow-y-auto text-sm text-slate-600">
              {imports.map((topic) => (
                <li key={topic.id}>{topic.title}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
      {pending && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h3 className="font-semibold">Confirm the pending publication action</h3>
          <p className="mt-2 text-sm leading-7">
            Its exact request is retained. Check the saved receipt before sending another action.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button disabled={busy} className={secondary} onClick={() => void recover()}>
              Check publication receipt
            </button>
            {unaccepted && (
              <>
                <button disabled={busy} className={secondary} onClick={() => void recover(true)}>
                  Retry exact request
                </button>
                <button
                  disabled={busy}
                  className={secondary}
                  onClick={() => {
                    sessionStorage.removeItem(cacheKey)
                    setPending(null)
                    setUnaccepted(false)
                    refresh()
                    setError('')
                    setMessage('Unaccepted request discarded. Review fresh publication details.')
                  }}
                >
                  Discard unaccepted request
                </button>
              </>
            )}
          </div>
        </section>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-900"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-7 text-indigo-950"
        >
          {message}
        </p>
      )}
      <section className={topicPanel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Topic publications</h2>
          <button className={secondary} disabled={blocked} onClick={refresh}>
            Refresh publications
          </button>
        </div>
        {data.topics.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">No native topics imported yet.</p>
        )}
        <ul className="mt-4 divide-y">
          {data.topics.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <h3 className="break-words text-sm font-semibold">{row.title}</h3>
                <p className="mt-2 text-xs text-slate-500">
                  {row.published_version_id ? 'Published' : 'Unpublished'} · {row.versions} retained
                  version{row.versions === 1 ? '' : 's'} · revision {row.revision}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={secondary} disabled={blocked} onClick={() => void open(row)}>
                  Review versions
                </button>
                {row.published_version_id && (
                  <button
                    className={secondary}
                    disabled={blocked}
                    onClick={() =>
                      void mutate({
                        action: 'unpublish',
                        topic_id: row.id,
                        expected_revision: row.revision,
                      })
                    }
                  >
                    Unpublish · keep history
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      {selected && (
        <section className={`${topicPanel} space-y-5`}>
          <h2 className="text-xl font-semibold">Review the native lesson</h2>
          {versions.length > 0 && (
            <label className="grid gap-2 text-sm font-semibold">
              Retained source version
              <select
                className={field}
                value={selected}
                disabled={blocked}
                onChange={(event) => setSelected(event.target.value)}
              >
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.title} · checked {version.as_of} · {version.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!current ? (
            <p role="status">Loading the selected source version…</p>
          ) : (
            <>
              <p className="text-sm font-semibold">{current.content.title}</p>
              <p className="text-xs leading-6 text-slate-500">
                {current.content.author} · reviewed through {current.content.as_of} ·{' '}
                {current.content.sections.length} sections · {current.content.questions.length}{' '}
                questions
              </p>
              <p className="break-all text-xs text-slate-500">
                Content checksum: {current.content_hash}
              </p>
              {current.content.sections.map((section) => (
                <details key={section.id} className="rounded-xl border p-4">
                  <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                    {section.title}
                  </summary>
                  <div className="mt-3 space-y-4">
                    {section.blocks.map((block, i) => (
                      <p key={i} className="whitespace-pre-line break-words text-sm leading-7">
                        {block}
                      </p>
                    ))}
                  </div>
                </details>
              ))}
              <details className="rounded-xl border p-4">
                <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                  Review fixed questions & answer keys
                </summary>
                <div className="mt-3 space-y-5">
                  {current.content.questions.map((question) => (
                    <div key={question.id} className="text-sm leading-7">
                      <p className="font-semibold">
                        {question.mode}: {question.prompt}
                      </p>
                      <ol className="ml-5 list-[upper-alpha]">
                        {question.options.map((option, i) => (
                          <li key={i}>{option}</li>
                        ))}
                      </ol>
                      <p className="mt-2 font-semibold">
                        Correct: {question.options[question.answer]}
                      </p>
                      <p className="mt-2 text-slate-600">{question.explanation}</p>
                    </div>
                  ))}
                </div>
              </details>
              <div className="space-y-2 text-sm leading-7">
                {current.content.references.map((reference) => (
                  <a
                    className="block break-words text-indigo-700 underline"
                    key={reference.id}
                    href={reference.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {reference.label} · checked {reference.accessed_on}
                  </a>
                ))}
              </div>
              <div className="grid gap-2 text-sm font-semibold">
                <label htmlFor={reviewNoteId}>Publication review note</label>
                <textarea
                  id={reviewNoteId}
                  className={`${field} min-h-24`}
                  maxLength={1000}
                  value={reviewNote}
                  disabled={blocked}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Record the sources and corrections you checked."
                />
              </div>
              <label className="flex items-start gap-3 text-sm leading-7">
                <input
                  type="checkbox"
                  checked={reviewed}
                  disabled={blocked}
                  onChange={(event) => setReviewed(event.target.checked)}
                  className="mt-1.5 h-5 w-5 shrink-0 accent-indigo-700"
                />
                I reviewed source fidelity, dated factual claims, references, question wording and
                every answer key.
              </label>
              <button
                className={primary}
                disabled={blocked || !reviewed || !reviewNote.trim()}
                onClick={() =>
                  void mutate({
                    action: 'publish',
                    topic_id: current.topic_id,
                    version_id: current.id,
                    expected_revision: current.revision,
                    reviewed,
                    review_note: reviewNote,
                  })
                }
              >
                Publish this reviewed version
              </button>
            </>
          )}
        </section>
      )}
    </div>
  )
}
export default function TopicsPanel() {
  const [data, setData] = useState<Queue>(),
    [error, setError] = useState(''),
    [generation, setGeneration] = useState(0),
    [offset, setOffset] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void ownerRequest<Queue>(`admin/topics.php?offset=${offset}`, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value)
          setError('')
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : 'Topic publications could not be loaded.',
          )
      })
    return () => controller.abort()
  }, [generation, offset])
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Pro Topic Learning</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Native source-based lessons, fixed practice and retained student progress.
        </p>
      </header>
      {error && (
        <div className={topicPanel} role="alert">
          {error}
          <button className={`${secondary} ml-3`} onClick={() => setGeneration((g) => g + 1)}>
            Try again
          </button>
        </div>
      )}
      {!data && !error ? (
        <p role="status">Loading private topic publications…</p>
      ) : data ? (
        <>
          <TopicEditor
            key={data.admin_id}
            data={data}
            refresh={() => setGeneration((g) => g + 1)}
          />
          <nav className="flex gap-3" aria-label="Publication pages">
            <button
              className={secondary}
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - 50))}
            >
              Previous
            </button>
            <button
              className={secondary}
              disabled={!data.has_more}
              onClick={() => setOffset((o) => o + 50)}
            >
              Next
            </button>
          </nav>
        </>
      ) : null}
    </main>
  )
}
