import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, ChevronDown, FileText } from 'lucide-react'
import {
  findOptionalSubject, loadOptionalSubject, optionalSubjectNow, type SubjectPayload,
} from '@/data/optionalNotes'
import { NoteBlocks } from '@/features/optional-notes/Blocks'

export default function OptionalSubjectNotes() {
  const { subject: slug = '' } = useParams()
  const summary = findOptionalSubject(slug)
  const [payload, setPayload] = useState<SubjectPayload | null>(() => optionalSubjectNow(slug))
  const [introOpen, setIntroOpen] = useState(false)

  useEffect(() => {
    if (!summary) return
    const controller = new AbortController()
    loadOptionalSubject(slug, controller.signal).then(setPayload).catch(() => { /* guidance is optional */ })
    return () => controller.abort()
  }, [slug, summary])

  if (!summary) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-pine">Subject not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">No notes are published for this optional subject yet.</p>
        <Link to="/study-material/optional" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-emerald-50">
          <ArrowLeft className="h-4 w-4" /> All optional subjects
        </Link>
      </main>
    )
  }

  const totalWords = summary.topics.reduce((total, topic) => total + topic.words, 0)

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
        <Link to="/study-material/optional" className="font-medium text-emerald-800 hover:underline underline-offset-2">Optional subject notes</Link>
        <span aria-hidden="true">/</span>
        <span>Group {summary.group}</span>
      </nav>

      <header className="mt-3 rounded-xl border bg-white p-4">
        <h1 className="font-display text-xl font-bold leading-tight text-pine sm:text-2xl">{summary.subject}</h1>
        <p className="mt-1.5 text-[12px] font-medium tabular-nums text-muted-foreground">
          Group {summary.group} · {summary.marks} marks · {summary.topicCount} topics · {totalWords.toLocaleString()} words
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">{summary.rule}</p>
      </header>

      {payload && payload.intro.length > 0 && (
        <div className="mt-3 rounded-xl border bg-white">
          <button
            type="button"
            onClick={() => setIntroOpen((value) => !value)}
            aria-expanded={introOpen}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
          >
            <FileText className="h-4 w-4 shrink-0 text-emerald-800" />
            <span className="min-w-0 flex-1 text-[13px] font-semibold text-pine">
              How to study this subject, syllabus map and references
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${introOpen ? 'rotate-180' : ''}`} />
          </button>
          {introOpen && <div className="border-t px-3.5 py-3"><NoteBlocks blocks={payload.intro} /></div>}
        </div>
      )}

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-[.12em] text-muted-foreground">Topics</h2>
      <ol className="mt-3 grid gap-2.5 md:grid-cols-2">
        {summary.topics.map((topic, position) => (
          <li key={topic.slug}>
            <Link
              to={`/study-material/optional/${slug}/${topic.slug}`}
              className="group flex h-full gap-3 rounded-xl border bg-white p-3.5 transition-colors hover:border-emerald-700/50 hover:bg-emerald-50/30"
            >
              <span className="flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded bg-secondary px-1 text-[11px] font-bold tabular-nums text-pine">
                {position + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-snug text-pine group-hover:underline underline-offset-2">
                  {topic.title}
                </span>
                <span className="mt-1 block text-[11px] font-medium tabular-nums text-muted-foreground">
                  {topic.words.toLocaleString()} words · about {Math.max(1, Math.round(topic.words / 200))} min read
                </span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
