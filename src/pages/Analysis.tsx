import { PageHeader, Section, Badge } from '@/components/shared'

const analyses: { title: string; causes: string[]; fixes: string[] }[] = [
  {
    title: 'Why candidates fail Essay',
    causes: ['Misinterpreting the topic and writing a memorised essay instead', 'No thesis - descriptive narration without a position', 'Weak outlines that examiners cannot follow', 'Error-prone ornamental English', 'No counterargument or evidence'],
    fixes: ['Interpret the exact wording; test your thesis on rough paper', 'Practise 5-minute outlines weekly across themes', 'Write simple, correct English under time', 'Study examiner feedback themes in official reports when published'],
  },
  {
    title: 'Why candidates fail Precis & Composition',
    causes: ['Unrepaired grammar fundamentals (tenses, articles, prepositions)', 'Precis that copies sentences instead of compressing ideas', 'Weak vocabulary repertoire - idioms and pairs guessed wrong', 'No timed practice of the full paper'],
    fixes: ['One precis daily from editorials; count words honestly', 'Work through a standard grammar reference topic-wise', 'Maintain idiom/pair lists and revise weekly'],
  },
  {
    title: 'Why candidates underperform in General Science & Ability',
    causes: ['Treating it as trivial and under-preparing', 'Slow quantitative section eating the paper’s time', 'Outdated science concepts'],
    fixes: ['Drill quantitative questions daily in 20-minute sets', 'Revise secondary-level science concepts topic-wise', 'Take mixed timed tests from the MPT bank'],
  },
  {
    title: 'Why candidates fail Current Affairs',
    causes: ['Headline knowledge without background, causes or policy options', 'Unsourced or invented statistics', 'One-sided opinions presented as analysis'],
    fixes: ['Build issue files: background → actors → developments → implications → policy options', 'Keep a dated statistics bank from official sources', 'Present multiple viewpoints before concluding'],
  },
  {
    title: 'Why candidates fail Pakistan Affairs',
    causes: ['Confused chronology of 1857–1947 and constitutional development', 'Narrative answers with no analysis or present-day linkage', 'Inaccurate dates, articles and document names'],
    fixes: ['Master the timeline first, then themes', 'Anchor every answer in documents, dates and events', 'Link history questions to contemporary relevance'],
  },
  {
    title: 'Why candidates fail Islamic Studies',
    causes: ['Invented or inaccurate Ayat/Hadith references', 'Ignoring the contemporary-application dimension', 'Disorganised presentation of well-known material'],
    fixes: ['Memorise fewer references but cite them accurately', 'Add a present-day section to every prepared topic', 'Practise structured answers from past papers'],
  },
  {
    title: 'Why subject selection fails',
    causes: ['Choosing by rumoured “scoring trends”', 'Ignoring background and interest', 'Underestimating 200-mark syllabi', 'Group-rule violations discovered late'],
    fixes: ['Use the selector tool; validate group rules early', 'Prefer background alignment over trends', 'Read the actual syllabus before committing'],
  },
  {
    title: 'Why preparation plans collapse',
    causes: ['Plans with no revision or rest days', 'Perfectionist first subjects consuming all months', 'No measurement - weeks pass without a single timed test'],
    fixes: ['Generate a realistic schedule with built-in revision', 'Time-box every subject and move on', 'Measure weekly: one test, one essay, tracked on the dashboard'],
  },
]

const habits = [
  'They write daily - reading alone never cleared CSS',
  'They verify every date and rule from FPSC, not from groups',
  'They keep error logs and re-attempt what they got wrong',
  'They protect sleep and treat rest as part of the plan',
  'They finish the syllabus early and spend the last phase only revising and testing',
  'They choose subjects by background and interest, not by herd behaviour',
]

export default function Analysis() {
  return (
    <div>
      <PageHeader
        title="Success & Failure Analysis"
        description="A realistic look at why papers fail and why consistent candidates pass - based on examiner-report themes, credible teacher observation and clearly labelled general guidance. No invented statistics or candidate stories."
      />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
        <div className="grid gap-4 md:grid-cols-2">
          {analyses.map((a) => (
            <div key={a.title} className="rounded-lg border bg-white p-5">
              <h2 className="font-display text-lg font-bold text-pine">{a.title}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <Badge tone="red">Why it happens</Badge>
                  <ul className="mt-2 space-y-1.5 text-sm text-foreground/85">{a.causes.map((c) => <li key={c}>· {c}</li>)}</ul>
                </div>
                <div>
                  <Badge tone="green">What to do instead</Badge>
                  <ul className="mt-2 space-y-1.5 text-sm text-foreground/85">{a.fixes.map((f) => <li key={f}>· {f}</li>)}</ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Section title="Habits of consistent candidates">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {habits.map((h) => (
              <div key={h} className="rounded-md border bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950">{h}</div>
            ))}
          </div>
        </Section>

        <p className="rounded-lg border border-dashed bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          This analysis is general preparation guidance. Where FPSC publishes examiner reports, their themes take precedence - always consult official sources for formal findings.
        </p>
      </div>
    </div>
  )
}
