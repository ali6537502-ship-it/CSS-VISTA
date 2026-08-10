import { useMemo, useState } from 'react'
import {
  BookOpen, ChevronDown, CirclePlay, Search, Video,
} from 'lucide-react'
import { PageHeader, SourceNote } from '@/components/shared'
import {
  compulsoryLectureCourses,
  lectureSyllabusSource,
  optionalLectureCourses,
  type LectureCourse,
} from '@/data/lectures'

function CourseCard({ course, query }: { course: LectureCourse; query: string }) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleTopics = normalizedQuery
    ? course.topics.filter((topic) => (
      `${topic.title} ${topic.summary}`.toLocaleLowerCase().includes(normalizedQuery)
    ))
    : course.topics

  return (
    <details
      className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow open:shadow-md"
      open={Boolean(normalizedQuery)}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pine text-white">
          <Video className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-bold text-pine">{course.title}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              {course.kind}
            </span>
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {course.marks} marks · {course.paperLabel} · {course.topics.length} syllabus units
          </span>
        </span>
        <ChevronDown className="mt-2 h-5 w-5 shrink-0 text-emerald-800 transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t bg-secondary/25 p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {visibleTopics.map((topic, index) => (
            <div key={topic.slug} className="rounded-lg border bg-white p-3">
              <div className="flex items-start gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{topic.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{topic.summary}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    <CirclePlay className="h-3.5 w-3.5" /> Lecture upload pending
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}

export default function Lectures() {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase()

  const filterCourses = (courses: LectureCourse[]) => courses.filter((course) => (
    !normalizedQuery
    || `${course.title} ${course.kind} ${course.paperLabel}`.toLocaleLowerCase().includes(normalizedQuery)
    || course.topics.some((topic) => (
      `${topic.title} ${topic.summary}`.toLocaleLowerCase().includes(normalizedQuery)
    ))
  ))

  const compulsory = useMemo(
    () => filterCourses(compulsoryLectureCourses),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalizedQuery],
  )
  const optional = useMemo(
    () => filterCourses(optionalLectureCourses),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalizedQuery],
  )
  const totalTopics = [...compulsoryLectureCourses, ...optionalLectureCourses]
    .reduce((total, course) => total + course.topics.length, 0)

  return (
    <div>
      <PageHeader
        title="Free CSS Vista Lectures"
        description="A syllabus-organised lecture centre for all compulsory CSS subjects plus Political Science, Criminology, Environmental Science and European History."
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="vista-card p-4">
            <BookOpen className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-2xl font-bold text-pine">{compulsoryLectureCourses.length}</p>
            <p className="text-xs text-muted-foreground">Compulsory subject courses</p>
          </div>
          <div className="vista-card p-4">
            <Video className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-2xl font-bold text-pine">{optionalLectureCourses.length}</p>
            <p className="text-xs text-muted-foreground">Optional subject courses</p>
          </div>
          <div className="vista-card p-4">
            <CirclePlay className="h-5 w-5 text-amber-700" />
            <p className="mt-2 text-2xl font-bold text-pine">{totalTopics}</p>
            <p className="text-xs text-muted-foreground">Lecture subcategories prepared</p>
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-4">
          <label className="relative block">
            <span className="sr-only">Search lectures and syllabus units</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a subject or lecture topic..."
              className="h-11 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Course structures are ready. Videos will appear inside the relevant units after the owner uploads them.
          </p>
        </section>

        {compulsory.length > 0 && (
          <section className="mt-8" aria-labelledby="compulsory-lectures">
            <h2 id="compulsory-lectures" className="font-display text-xl font-bold text-pine sm:text-2xl">
              Compulsory CSS subjects
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">All six compulsory papers, organised into study units.</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {compulsory.map((course) => <CourseCard key={course.slug} course={course} query={query} />)}
            </div>
          </section>
        )}

        {optional.length > 0 && (
          <section className="mt-9" aria-labelledby="optional-lectures">
            <h2 id="optional-lectures" className="font-display text-xl font-bold text-pine sm:text-2xl">
              Optional subject lectures
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">The four requested optional subjects, arranged according to FPSC syllabus headings.</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {optional.map((course) => <CourseCard key={course.slug} course={course} query={query} />)}
            </div>
          </section>
        )}

        {compulsory.length === 0 && optional.length === 0 && (
          <p className="mt-8 rounded-xl border border-dashed bg-white px-4 py-10 text-center text-sm text-muted-foreground">
            No lecture subject or topic matches this search.
          </p>
        )}

        <SourceNote source={lectureSyllabusSource.name} url={lectureSyllabusSource.url} date="27 July 2026" />
      </main>
    </div>
  )
}
