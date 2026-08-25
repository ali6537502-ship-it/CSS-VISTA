import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Search, Target } from 'lucide-react'
import { PageHeader, SourceNote, Badge } from '@/components/shared'
import { optionalGroups, syllabusSource, examFacts } from '@/data/syllabus'
import ConsultationCard from '@/components/ConsultationCard'

export default function OptionalSubjects() {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<number | 0>(0)

  const filtered = useMemo(() => {
    return optionalGroups
      .filter((g) => group === 0 || g.group === group)
      .map((g) => ({
        ...g,
        subjects: g.subjects.filter(
          (s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.nature.toLowerCase().includes(q.toLowerCase()) || s.overlap.toLowerCase().includes(q.toLowerCase())
        ),
      }))
      .filter((g) => g.subjects.length > 0)
  }, [q, group])

  return (
    <div>
      <PageHeader
        title="Optional Subjects Directory"
        description={`Choose 600 marks from seven groups under the official grouping rules. For every subject: nature, background required, overlap, difficulty, preparation time and risks. Total optional marks: ${examFacts.optionalTotal}.`}
      />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by subject, nature or overlap…"
              className="h-9 w-full rounded-md border border-input pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              aria-label="Search optional subjects"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setGroup(0)} className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${group === 0 ? 'bg-pine text-emerald-50' : 'bg-secondary'}`}>All groups</button>
            {optionalGroups.map((g) => (
              <button key={g.group} onClick={() => setGroup(g.group)} className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${group === g.group ? 'bg-pine text-emerald-50' : 'bg-secondary'}`}>
                Group {g.group}
              </button>
            ))}
          </div>
          <Link to="/subjects/selector" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-pine px-3.5 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
            <Target className="h-4 w-4" /> Subject Selector
          </Link>
        </div>

        <div className="mt-6 space-y-8">
          {filtered.map((g) => (
            <div key={g.group}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 className="font-display text-xl font-bold text-pine">Group {g.group}</h2>
                <span className="text-sm text-muted-foreground">Rule: {g.rule}</span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {g.subjects.map((s) => (
                  <div key={s.name} className="rounded-lg border bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{s.name}</h3>
                      <div className="flex gap-1.5">
                        <Badge>{s.marks} marks</Badge>
                        <Badge tone={s.difficulty === 'Moderate' ? 'green' : s.difficulty === 'Demanding' ? 'gold' : 'red'}>{s.difficulty}</Badge>
                      </div>
                    </div>
                    <dl className="mt-3 space-y-1.5 text-[13px]">
                      <div className="flex gap-2"><dt className="w-24 shrink-0 font-medium text-muted-foreground">Nature</dt><dd>{s.nature}</dd></div>
                      <div className="flex gap-2"><dt className="w-24 shrink-0 font-medium text-muted-foreground">Background</dt><dd>{s.background}</dd></div>
                      <div className="flex gap-2"><dt className="w-24 shrink-0 font-medium text-muted-foreground">Overlap</dt><dd>{s.overlap}</dd></div>
                      <div className="flex gap-2"><dt className="w-24 shrink-0 font-medium text-muted-foreground">Prep time</dt><dd>{s.prepTime}</dd></div>
                      <div className="flex gap-2"><dt className="w-24 shrink-0 font-medium text-muted-foreground">Suited for</dt><dd>{s.suitedFor}</dd></div>
                      <div className="flex gap-2"><dt className="w-24 shrink-0 font-medium text-muted-foreground">Risks</dt><dd className="text-amber-800">{s.risks}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No subjects match your filters. Try clearing the search or choosing another group.
            </p>
          )}
        </div>
        <div className="mt-8">
          <ConsultationCard variant="compact" heading="Need help choosing optional subjects?" description="Book private guidance to discuss subject suitability, preparation time, overlap, risks and your academic background." />
        </div>
        <SourceNote source={syllabusSource.name} url={syllabusSource.url} date={syllabusSource.lastUpdated} />
      </div>
    </div>
  )
}
