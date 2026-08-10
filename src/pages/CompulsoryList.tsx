import { Link } from 'react-router'
import { ArrowRight, Clock, Award } from 'lucide-react'
import { PageHeader, SourceNote } from '@/components/shared'
import { compulsorySubjects, syllabusSource } from '@/data/syllabus'
import { getState, setSubjectProgress } from '@/lib/store'
import { useState } from 'react'

export default function CompulsoryList() {
  const [progress, setProgress] = useState(() => getState().subjectProgress)

  return (
    <div>
      <PageHeader
        title="Compulsory Subjects"
        description="Six papers, 600 marks. These decide whether you clear the written stage - every subject page includes the syllabus map, preparation sequence, recommended books with reasons, answer-writing guidance and a revision checklist."
      />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-2">
          {compulsorySubjects.map((s) => {
            const pct = progress[s.slug] ?? 0
            return (
              <div key={s.slug} className="flex flex-col rounded-lg border bg-white p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-bold text-pine">{s.name}</h2>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Award className="h-3.5 w-3.5" /> {s.marks} marks</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {s.time}</span>
                  </div>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{s.overview}</p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Your syllabus progress (self-tracked)</span>
                    <span className="font-semibold text-pine">{pct}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5} value={pct}
                    aria-label={`Progress for ${s.name}`}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setProgress((p) => ({ ...p, [s.slug]: v }))
                      setSubjectProgress(s.slug, v)
                    }}
                    className="mt-1.5 w-full accent-emerald-800"
                  />
                </div>
                <Link to={`/subjects/compulsory/${s.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline underline-offset-2">
                  Open subject guide <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )
          })}
        </div>
        <SourceNote source={syllabusSource.name} url={syllabusSource.url} date={syllabusSource.lastUpdated} />
      </div>
    </div>
  )
}
