import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { PageHeader, Section, Badge } from '@/components/shared'
import { examAnalyses as analyses, successHabits as habits } from '@/data/examAnalysis'

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
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                {a.tools.map((tool) => (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-xs font-bold text-pine hover:bg-secondary"
                  >
                    {tool.label} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ))}
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
