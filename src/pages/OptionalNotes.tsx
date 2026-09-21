import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import {
  optionalGroupsWithNotes, optionalSubjectTotal, optionalTopicTotal, optionalWordTotal,
} from '@/data/optionalNotes'

export default function OptionalNotes() {
  const groups = optionalGroupsWithNotes()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return groups
    return groups
      .map((group) => ({
        ...group,
        subjects: group.subjects.filter((subject) =>
          subject.subject.toLowerCase().includes(needle)
          || subject.topics.some((topic) => topic.title.toLowerCase().includes(needle))),
      }))
      .filter((group) => group.subjects.length > 0)
  }, [groups, query])

  return (
    <div>
      <PageHeader
        title="CSS Optional Subject Notes"
        description={`Topic-wise study notes for ${optionalSubjectTotal()} CSS optional subjects across all seven FPSC groups — ${optionalTopicTotal()} topics and roughly ${Math.round(optionalWordTotal() / 1000)},000 words. Choose your group, then your subject, then the topic you are studying today.`}
      />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a subject or a topic…"
            aria-label="Search optional subjects and topics"
            className="h-10 w-full rounded-lg border border-input bg-white pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {filtered.length === 0 && (
          <p className="mt-6 rounded-lg border border-dashed bg-secondary/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No subject or topic matches “{query}”.
          </p>
        )}

        {filtered.map((group) => (
          <section key={group.group} className="mt-7">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="font-display text-lg font-bold text-pine">Group {group.group}</h2>
              <p className="text-[12px] text-muted-foreground">{group.rule}</p>
            </div>
            <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {group.subjects.map((subject) => (
                <Link
                  key={subject.slug}
                  to={`/study-material/optional/${subject.slug}`}
                  className="group flex gap-3 rounded-xl border bg-white p-3.5 transition-colors hover:border-emerald-700/50 hover:bg-emerald-50/30"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold leading-snug text-pine group-hover:underline underline-offset-2">
                      {subject.subject}
                    </span>
                    <span className="mt-1 block text-[12px] font-medium tabular-nums text-muted-foreground">
                      {subject.topicCount} topics · {subject.marks} marks
                    </span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </section>
        ))}

        <p className="mt-8 rounded-xl border bg-white p-4 text-[13px] leading-relaxed text-muted-foreground">
          These notes follow the FPSC optional-subject syllabus. Confirm the current syllabus and
          paper pattern on the official FPSC notice before finalising your subject combination —
          the <Link to="/subjects/selector" className="font-semibold text-emerald-800 hover:underline underline-offset-2">Subject Selection Tool</Link> checks the group rules for you.
        </p>
      </div>
    </div>
  )
}
