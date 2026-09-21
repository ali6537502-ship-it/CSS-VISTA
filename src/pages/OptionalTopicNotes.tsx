import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, List } from 'lucide-react'
import {
  findOptionalTopic, loadOptionalTopic, optionalTopicNow, topicOutline, type TopicPayload,
} from '@/data/optionalNotes'
import { NoteBlocks } from '@/features/optional-notes/Blocks'

export default function OptionalTopicNotes() {
  const { subject: subjectSlug = '', topic: topicSlug = '' } = useParams()
  const found = findOptionalTopic(subjectSlug, topicSlug)
  const [payload, setPayload] = useState<TopicPayload | null>(() => optionalTopicNow(subjectSlug, topicSlug))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!found) return
    const controller = new AbortController()
    setFailed(false)
    setPayload(optionalTopicNow(subjectSlug, topicSlug))
    loadOptionalTopic(subjectSlug, topicSlug, controller.signal)
      .then(setPayload)
      .catch((error: unknown) => {
        if ((error as Error)?.name !== 'AbortError') setFailed(true)
      })
    return () => controller.abort()
  }, [subjectSlug, topicSlug, found])

  const outline = useMemo(() => (payload ? topicOutline(payload.blocks) : []), [payload])

  if (!found) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-pine">Topic not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">No notes are published for this topic yet.</p>
        <Link to="/study-material/optional" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-emerald-50">
          <ArrowLeft className="h-4 w-4" /> All optional subjects
        </Link>
      </main>
    )
  }

  const { subject, topic } = found
  const position = subject.topics.findIndex((item) => item.slug === topicSlug)
  const previous = position > 0 ? subject.topics[position - 1] : null
  const next = position >= 0 && position < subject.topics.length - 1 ? subject.topics[position + 1] : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
        <Link to="/study-material/optional" className="font-medium text-emerald-800 hover:underline underline-offset-2">Optional notes</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/study-material/optional/${subject.slug}`} className="font-medium text-emerald-800 hover:underline underline-offset-2">
          {subject.subject}
        </Link>
      </nav>

      <header className="mt-3 rounded-xl border bg-white p-4">
        <h1 className="font-display text-xl font-bold leading-tight text-pine sm:text-2xl">{topic.title}</h1>
        <p className="mt-1.5 text-[12px] font-medium tabular-nums text-muted-foreground">
          {subject.subject} · Group {subject.group} · {topic.words.toLocaleString()} words ·
          about {Math.max(1, Math.round(topic.words / 200))} min read
        </p>
      </header>

      {/* A long unit needs its own contents; a short one does not. */}
      {outline.length > 3 && (
        <nav aria-label="On this page" className="mt-3 rounded-xl border bg-white p-3.5">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <List className="h-3.5 w-3.5" /> On this page
          </p>
          <ul className="mt-2 grid gap-x-5 gap-y-1 sm:grid-cols-2">
            {outline.map((item) => (
              <li key={item.id} style={{ paddingLeft: `${Math.max(0, item.level - 2) * 12}px` }}>
                <a href={`#${item.id}`} className="text-[13px] text-emerald-800 hover:underline underline-offset-2">
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {failed && !payload && (
        <p role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          These notes could not be downloaded. Check your connection and reload the page.
        </p>
      )}

      {!payload && !failed && (
        <div className="mt-4 space-y-2.5" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-lg bg-white/70" />
          ))}
        </div>
      )}

      {payload && (
        <article className="mt-4 rounded-xl border bg-white p-4 sm:p-5">
          <NoteBlocks blocks={payload.blocks} />
        </article>
      )}

      <nav aria-label="Adjacent topics" className="mt-6 flex items-stretch justify-between gap-3">
        {previous ? (
          <Link to={`/study-material/optional/${subject.slug}/${previous.slug}`} className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-3 py-2.5 hover:border-emerald-700/50">
            <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Previous topic</span>
              <span className="block truncate text-[13px] font-semibold text-pine">{previous.title}</span>
            </span>
          </Link>
        ) : <span className="flex-1" />}
        {next ? (
          <Link to={`/study-material/optional/${subject.slug}/${next.slug}`} className="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded-lg border bg-white px-3 py-2.5 text-right hover:border-emerald-700/50">
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Next topic</span>
              <span className="block truncate text-[13px] font-semibold text-pine">{next.title}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ) : <span className="flex-1" />}
      </nav>
    </div>
  )
}
