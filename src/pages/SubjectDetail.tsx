import { useParams, Link } from 'react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, BookMarked, CheckSquare, Square, Award, Clock, Target } from 'lucide-react'
import { PageHeader, Section, SourceNote, Badge } from '@/components/shared'
import { compulsorySubjects, syllabusSource } from '@/data/syllabus'
import { getChecklistItems, setChecklistItem } from '@/lib/progress'
import NotFound from './NotFound'

export default function SubjectDetail() {
  const { slug } = useParams()
  const subject = compulsorySubjects.find((s) => s.slug === slug)
  const checklistId = `subject:${slug ?? ''}`
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (slug) setChecked(getChecklistItems(`subject:${slug}`))
  }, [slug])

  if (!subject) return <NotFound />

  const toggle = (key: string) => setChecked(setChecklistItem(checklistId, key, !checked[key]))
  const doneCount = subject.checklist.filter((c) => checked[c]).length

  return (
    <div>
      <PageHeader title={subject.name} description={subject.overview}>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link to="/subjects/compulsory" className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:underline">
            <ArrowLeft className="h-4 w-4" /> All compulsory subjects
          </Link>
          <span className="inline-flex items-center gap-1"><Award className="h-4 w-4" /> {subject.marks} marks</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {subject.time}</span>
          <Badge>Pass: {subject.passMarks}</Badge>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10">
        <Section title="Paper structure">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subject.structure.map((p) => (
              <div key={p.part} className="rounded-lg border bg-white p-4">
                <div className="text-sm font-semibold text-pine">{p.part}</div>
                <p className="mt-1 text-sm text-muted-foreground">{p.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Topic-wise syllabus breakdown">
          <div className="grid gap-4 md:grid-cols-2">
            {subject.topics.map((t) => (
              <div key={t.title} className="rounded-lg border bg-white p-5">
                <h3 className="font-semibold text-foreground">{t.title}</h3>
                <ul className="mt-2 space-y-1.5">
                  {t.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-foreground/85">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" /> {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            For the binding, detailed syllabus, always consult the official FPSC syllabus document. Past-paper questions for this subject appear in the{' '}
            <Link to="/past-papers" className="font-medium text-emerald-800 underline underline-offset-2">past-paper archive</Link> once the owner uploads the papers.
          </p>
        </Section>

        <Section title="Recommended preparation sequence">
          <ol className="space-y-2">
            {subject.sequence.map((s, i) => (
              <li key={s} className="flex items-start gap-3 rounded-md border bg-secondary/50 px-4 py-2.5 text-sm">
                <span className="font-display font-bold text-pine">{i + 1}.</span> {s}
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Recommended books - and why" description="Books are recommended for specific syllabus areas, not as a shopping list.">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {subject.books.map((b) => (
              <div key={b.title} className="rounded-lg border bg-white p-4">
                <div className="flex items-start gap-2">
                  <BookMarked className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{b.title}</div>
                    {b.author && <div className="text-xs text-muted-foreground">{b.author}</div>}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{b.why}</p>
                <div className="mt-2 text-xs"><Badge>Covers: {b.covers}</Badge></div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Answer-writing guidance">
          <ul className="grid gap-2 sm:grid-cols-2">
            {subject.answerTips.map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-md border bg-white px-4 py-3 text-sm text-foreground/85">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" /> {t}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Revision checklist" description="Tick items off as you prepare - stored in your browser.">
          <p className="mb-3 text-sm font-semibold text-emerald-800">{doneCount} of {subject.checklist.length} done</p>
          <ul className="space-y-2">
            {subject.checklist.map((c) => {
              const on = !!checked[c]
              return (
                <li key={c}>
                  <button
                    onClick={() => toggle(c)}
                    className={`flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors ${on ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'bg-white hover:bg-secondary/60'}`}
                    aria-pressed={on}
                  >
                    {on ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    {c}
                  </button>
                </li>
              )
            })}
          </ul>
        </Section>

        <SourceNote source={syllabusSource.name} url={syllabusSource.url} date={syllabusSource.lastUpdated} />
      </div>
    </div>
  )
}
