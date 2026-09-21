import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, Search } from 'lucide-react'
import {
  chapterName, findTopicSummary, loadTopic, topicNow, type ReferenceEntry, type TopicPayload,
} from '@/data/islamicReferences'
import { BilingualRow, LanguageSwitch, WideRow, type LanguageView } from '@/features/islamic-references/Bilingual'

/**
 * One reference.
 *
 * The bilingual heading sits on one line, the Arabic source passage spans the
 * full width beneath it, and the compiler's notes follow as English/Urdu
 * pairs. The two languages are never merged into a single line of text.
 */
function Entry({ entry, view }: { entry: ReferenceEntry; view: LanguageView }) {
  return (
    <article id={`reference-${entry.number}`} className="scroll-mt-20 rounded-xl border bg-white">
      <header className="flex gap-3 border-b bg-secondary/40 px-3.5 py-2.5">
        <span className="mt-0.5 flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded bg-pine px-1 text-[11px] font-bold tabular-nums text-emerald-50">
          {entry.number}
        </span>
        <div className="grid min-w-0 flex-1 gap-x-6 gap-y-1 md:grid-cols-2">
          {view !== 'ur' && (
            <div>
              <h2 className="text-[14px] font-semibold leading-snug text-pine">{entry.titleEn}</h2>
              {entry.subtitleEn && <p className="text-[12px] text-muted-foreground">{entry.subtitleEn}</p>}
            </div>
          )}
          {view !== 'en' && (
            <div dir="rtl" lang="ur" className="text-right">
              <h2 className="urdu-text text-[15px] font-semibold leading-loose text-pine">{entry.titleUr}</h2>
              {entry.subtitleUr && <p className="urdu-text text-[13px] leading-loose text-muted-foreground">{entry.subtitleUr}</p>}
            </div>
          )}
        </div>
      </header>

      <div className="space-y-3 px-3.5 py-3">
        {entry.arabic.map((block, index) => <WideRow key={index} block={block} />)}
        {entry.blocks.map((block, index) => <BilingualRow key={index} block={block} view={view} />)}
      </div>
    </article>
  )
}

function entryText(entry: ReferenceEntry): string {
  const parts = [entry.titleEn, entry.titleUr, entry.subtitleEn ?? '']
  for (const block of entry.arabic) {
    for (const paragraph of block.paragraphs) parts.push(paragraph.map((s) => s.text).join(''))
  }
  for (const block of entry.blocks) {
    for (const paragraph of [...block.en, ...block.ur]) parts.push(paragraph.map((s) => s.text).join(''))
  }
  return parts.join(' ').toLowerCase()
}

export default function IslamicReferenceTopic() {
  const { chapter: chapterSlug = '', topic: topicSlug = '' } = useParams()
  const found = findTopicSummary(chapterSlug, topicSlug)
  const [payload, setPayload] = useState<TopicPayload | null>(() => topicNow(chapterSlug, topicSlug))
  const [failed, setFailed] = useState(false)
  const [view, setView] = useState<LanguageView>('both')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!found) return
    const controller = new AbortController()
    setFailed(false)
    setPayload(topicNow(chapterSlug, topicSlug))
    loadTopic(chapterSlug, topicSlug, controller.signal)
      .then(setPayload)
      .catch((error: unknown) => {
        if ((error as Error)?.name !== 'AbortError') setFailed(true)
      })
    return () => controller.abort()
  }, [chapterSlug, topicSlug, found])

  const searchable = useMemo(
    () => (payload?.entries ?? []).map((entry) => ({ entry, haystack: entryText(entry) })),
    [payload],
  )
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return payload?.entries ?? []
    return searchable.filter((row) => row.haystack.includes(needle)).map((row) => row.entry)
  }, [payload, searchable, query])

  if (!found) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-pine">Topic not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This topic is not part of the Islamic Studies reference bank.</p>
        <Link to="/study-material/islamic-studies" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-emerald-50">
          <ArrowLeft className="h-4 w-4" /> All chapters
        </Link>
      </main>
    )
  }

  const { chapter, topic } = found
  const position = chapter.topics.findIndex((item) => item.slug === topicSlug)
  const previous = position > 0 ? chapter.topics[position - 1] : null
  const next = position >= 0 && position < chapter.topics.length - 1 ? chapter.topics[position + 1] : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
        <Link to="/study-material/islamic-studies" className="font-medium text-emerald-800 hover:underline underline-offset-2">Islamic Studies</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/study-material/islamic-studies/${chapter.slug}`} className="font-medium text-emerald-800 hover:underline underline-offset-2">
          {chapter.numeral}. {chapterName(chapter)}
        </Link>
      </nav>

      <header className="mt-3 rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold leading-tight text-pine sm:text-2xl">{topic.titleEn}</h1>
            <p dir="rtl" lang="ur" className="urdu-text mt-1.5 text-right text-[16px] leading-loose text-foreground/80">
              {topic.titleUr}
            </p>
          </div>
          <LanguageSwitch view={view} onChange={setView} />
        </div>
        <p className="mt-3 text-[12px] font-medium tabular-nums text-muted-foreground">
          {topic.count} references · numbered {topic.first}–{topic.last}
        </p>
        {payload && payload.intro.length > 0 && (
          <div className="mt-3 space-y-2.5 border-t pt-3">
            {payload.intro.map((block, index) => <BilingualRow key={index} block={block} view={view} />)}
          </div>
        )}
      </header>

      <div className="relative mt-4">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search inside this topic — English, Urdu or Arabic…"
          aria-label="Search references in this topic"
          className="h-10 w-full rounded-lg border border-input bg-white pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {failed && !payload && (
        <p role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          These references could not be downloaded. Check your connection and reload the page.
        </p>
      )}

      {!payload && !failed && (
        <div className="mt-4 space-y-2.5" aria-hidden="true">
          {Array.from({ length: Math.min(6, topic.count) }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border bg-white/60" />
          ))}
        </div>
      )}

      {payload && (
        <>
          {query && (
            <p role="status" className="mt-3 text-[12px] text-muted-foreground">
              {visible.length} of {payload.entries.length} references match “{query}”.
            </p>
          )}
          <div className="mt-4 space-y-3">
            {visible.map((entry) => <Entry key={entry.number} entry={entry} view={view} />)}
          </div>
        </>
      )}

      <nav aria-label="Adjacent topics" className="mt-6 flex items-stretch justify-between gap-3">
        {previous ? (
          <Link to={`/study-material/islamic-studies/${chapter.slug}/${previous.slug}`} className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-3 py-2.5 hover:border-emerald-700/50">
            <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Previous topic</span>
              <span className="block truncate text-[13px] font-semibold text-pine">{previous.titleEn}</span>
            </span>
          </Link>
        ) : <span className="flex-1" />}
        {next ? (
          <Link to={`/study-material/islamic-studies/${chapter.slug}/${next.slug}`} className="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded-lg border bg-white px-3 py-2.5 text-right hover:border-emerald-700/50">
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Next topic</span>
              <span className="block truncate text-[13px] font-semibold text-pine">{next.titleEn}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ) : <span className="flex-1" />}
      </nav>
    </div>
  )
}
