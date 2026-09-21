import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, ChevronDown, Info, ShieldCheck } from 'lucide-react'
import {
  chapterName, findChapterSummary, islamicChapters, loadChapter, chapterNow,
  type ChapterPayload,
} from '@/data/islamicReferences'
import { BilingualRow, LanguageSwitch, type LanguageView } from '@/features/islamic-references/Bilingual'

/** The compiler's guidance and audit: collapsed, because it is reference, not reading. */
function Disclosure({
  icon: Icon, title, blocks, view,
}: {
  icon: typeof Info
  title: string
  blocks: ChapterPayload['frontMatter']
  view: LanguageView
}) {
  const [open, setOpen] = useState(false)
  if (blocks.length === 0) return null
  return (
    <div className="rounded-xl border bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        <Icon className="h-4 w-4 shrink-0 text-emerald-800" />
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-pine">{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3.5 border-t px-3.5 py-3">
          {blocks.map((block, index) => <BilingualRow key={index} block={block} view={view} />)}
        </div>
      )}
    </div>
  )
}

export default function IslamicReferenceChapter() {
  const { chapter: slug = '' } = useParams()
  const summary = findChapterSummary(slug)
  const [payload, setPayload] = useState<ChapterPayload | null>(() => chapterNow(slug))
  const [view, setView] = useState<LanguageView>('both')

  useEffect(() => {
    if (!summary) return
    const controller = new AbortController()
    loadChapter(slug, controller.signal).then(setPayload).catch(() => { /* guidance is optional */ })
    return () => controller.abort()
  }, [slug, summary])

  if (!summary) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-pine">Chapter not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This chapter is not part of the Islamic Studies reference bank.</p>
        <Link to="/study-material/islamic-studies" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-emerald-50">
          <ArrowLeft className="h-4 w-4" /> All chapters
        </Link>
      </main>
    )
  }

  const all = islamicChapters()
  const position = all.findIndex((item) => item.slug === slug)
  const previous = position > 0 ? all[position - 1] : null
  const next = position >= 0 && position < all.length - 1 ? all[position + 1] : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <Link to="/study-material/islamic-studies" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-800 hover:underline underline-offset-2">
        <ArrowLeft className="h-3.5 w-3.5" /> Islamic Studies reference bank
      </Link>

      <header className="mt-3 rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[12px] font-bold text-muted-foreground">Chapter {summary.numeral}</span>
            <h1 className="mt-0.5 font-display text-xl font-bold leading-tight text-pine sm:text-2xl">
              {chapterName(summary)}
            </h1>
            <p dir="rtl" lang="ur" className="urdu-text mt-1.5 text-right text-[16px] leading-loose text-foreground/80">
              {summary.titleUr}
            </p>
          </div>
          <LanguageSwitch view={view} onChange={setView} />
        </div>
        <p className="mt-3 text-[12px] font-medium tabular-nums text-muted-foreground">
          {summary.referenceCount} references · {summary.topics.length} topics
        </p>
      </header>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-[.12em] text-muted-foreground">Topics</h2>
      <div className="mt-3 grid gap-2.5 md:grid-cols-2">
        {summary.topics.map((topic) => (
          <Link
            key={topic.slug}
            to={`/study-material/islamic-studies/${slug}/${topic.slug}`}
            className="group flex gap-3 rounded-xl border bg-white p-3.5 transition-colors hover:border-emerald-700/50 hover:bg-emerald-50/30"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold leading-snug text-pine group-hover:underline underline-offset-2">
                {topic.titleEn}
              </span>
              <span dir="rtl" lang="ur" className="urdu-text mt-1 block text-right text-[14px] leading-loose text-foreground/75">
                {topic.titleUr}
              </span>
              <span className="mt-1.5 block text-[11px] font-medium tabular-nums text-muted-foreground">
                {topic.count} references · {topic.first}–{topic.last}
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      {payload && (
        <div className="mt-6 space-y-2.5">
          <Disclosure icon={Info} title="Scope, evidence rules and how to read an entry" blocks={payload.frontMatter} view={view} />
          <Disclosure icon={ShieldCheck} title="Verification audit: what was checked and what was not" blocks={payload.audit} view={view} />
        </div>
      )}

      <nav aria-label="Adjacent chapters" className="mt-6 flex items-stretch justify-between gap-3">
        {previous ? (
          <Link to={`/study-material/islamic-studies/${previous.slug}`} className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-3 py-2.5 hover:border-emerald-700/50">
            <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Chapter {previous.numeral}</span>
              <span className="block truncate text-[13px] font-semibold text-pine">{chapterName(previous)}</span>
            </span>
          </Link>
        ) : <span className="flex-1" />}
        {next ? (
          <Link to={`/study-material/islamic-studies/${next.slug}`} className="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded-lg border bg-white px-3 py-2.5 text-right hover:border-emerald-700/50">
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Chapter {next.numeral}</span>
              <span className="block truncate text-[13px] font-semibold text-pine">{chapterName(next)}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ) : <span className="flex-1" />}
      </nav>
    </div>
  )
}
