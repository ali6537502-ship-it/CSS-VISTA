import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronDown, Clock3, FileText, Search, TrendingUp, Video } from 'lucide-react'
import { PageHeader, EmptyState, SourceNote } from '@/components/shared'
import { lectureCourses, lectureSyllabusSource, type LectureCourse } from '@/data/lectures'

type Kind = 'all' | 'Compulsory' | 'Optional'

function normalise(value: string) {
  return value.toLocaleLowerCase().trim()
}

function CourseCard({ course, expanded, onToggle }: { course: LectureCourse; expanded: boolean; onToggle: () => void }) {
  const panelId = `lecture-topics-${course.slug}`
  return (
    <article id={`course-${course.slug}`} className="scroll-mt-28 rounded-xl border bg-white">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
          <Video className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-pine sm:text-[15px]">{course.title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {course.kind} · {course.marks} marks · {course.paperLabel} · {course.topics.length} topics
          </span>
        </span>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div id={panelId} className="border-t px-4 pb-4 pt-3 sm:px-5">
          <ol className="space-y-2">
            {course.topics.map((topic, index) => (
              <li key={topic.slug} className="rounded-md border bg-secondary/30 px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">
                  <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>{topic.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{topic.summary}</p>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/fpsc-syllabus?subject=${encodeURIComponent(course.slug)}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-xs font-bold text-pine hover:bg-secondary"
            >
              <FileText className="h-3.5 w-3.5" /> Official syllabus &amp; planner
            </Link>
            <Link
              to={`/css-past-paper-analysis?subject=${encodeURIComponent(course.slug)}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-xs font-bold text-pine hover:bg-secondary"
            >
              <TrendingUp className="h-3.5 w-3.5" /> What has been asked before
            </Link>
            {course.kind === 'Compulsory' && (
              <Link
                to={`/subjects/compulsory/${course.slug}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-pine px-3 text-xs font-bold text-white hover:bg-emerald-900"
              >
                Subject guide
              </Link>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

export default function Lectures() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [kind, setKind] = useState<Kind>('all')
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const requested = params.get('course')
    return new Set(requested ? [requested] : [])
  })

  // Search results and the mega-menu deep-link to a single course.
  useEffect(() => {
    const requested = params.get('course')
    if (!requested) return
    const timeout = window.setTimeout(() => {
      document.getElementById(`course-${requested}`)?.scrollIntoView({ block: 'start', behavior: 'auto' })
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [params])

  useEffect(() => {
    const next = new URLSearchParams(params)
    if (query.trim()) next.set('q', query.trim())
    else next.delete('q')
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
    // params is intentionally read once per query change to avoid a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const filtered = useMemo(() => {
    const needle = normalise(query)
    return lectureCourses.filter((course) => {
      if (kind !== 'all' && course.kind !== kind) return false
      if (!needle) return true
      if (normalise(course.title).includes(needle)) return true
      return course.topics.some((topic) => (
        normalise(topic.title).includes(needle) || normalise(topic.summary).includes(needle)
      ))
    })
  }, [kind, query])

  const topicCount = useMemo(
    () => filtered.reduce((total, course) => total + course.topics.length, 0),
    [filtered],
  )

  function toggle(slug: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  return (
    <div>
      <PageHeader
        title="CSS Vista Lectures"
        description="The topic map for every compulsory and optional subject, with the official syllabus and past-paper evidence for each one. Recorded lectures are still being prepared."
      />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="flex gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Recorded video lectures are in preparation. Until they are published, every topic below links to the
            official FPSC syllabus entry and to the past questions actually asked on it.
          </span>
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a subject or topic…"
              aria-label="Search lecture subjects and topics"
              className="h-11 w-full rounded-md border border-input pl-9 pr-3 text-sm"
            />
          </div>
          {(['all', 'Compulsory', 'Optional'] as Kind[]).map((option) => (
            <button
              key={option}
              onClick={() => setKind(option)}
              aria-pressed={kind === option}
              className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold ${kind === option ? 'bg-pine text-emerald-50' : 'border bg-white text-pine hover:bg-secondary'}`}
            >
              {option === 'all' ? 'All subjects' : option}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'subject' : 'subjects'} · {topicCount} topics
        </p>

        <div className="mt-3 space-y-2.5">
          {filtered.map((course) => (
            <CourseCard
              key={course.slug}
              course={course}
              expanded={expanded.has(course.slug)}
              onToggle={() => toggle(course.slug)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <EmptyState
            title="No subject or topic matches that search"
            hint="Try a shorter phrase, or clear the filter to see all 58 subjects."
          />
        )}

        <SourceNote source={lectureSyllabusSource.name} url={lectureSyllabusSource.url} />
      </main>
    </div>
  )
}
