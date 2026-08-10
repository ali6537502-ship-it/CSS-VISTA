import { useState } from 'react'
import { Link } from 'react-router'
import { MessageCircle, PenLine, Award } from 'lucide-react'
import { PageHeader, Section, Badge } from '@/components/shared'
import { essayThemes, essayGuides, essayRubric, practiceTopics } from '@/data/essay'
import { mentors, waLink } from '@/data/site'

export default function EssayModule() {
  const [guide, setGuide] = useState(essayGuides[0].slug)
  const [theme, setTheme] = useState(essayThemes[0].slug)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const activeGuide = essayGuides.find((g) => g.slug === guide)!
  const activeTheme = essayThemes.find((t) => t.slug === theme)!
  const progress = Math.round((Object.values(checked).filter(Boolean).length / essayRubric.length) * 100)
  const sadia = mentors[0]

  return (
    <div>
      <PageHeader
        title="Learn English Essay with Miss Sadia Zahoor, PAS"
        description="A structured essay-learning module with a CSS position holder: understand the paper, build theses and outlines, master paragraph craft, practise theme-wise and measure yourself against a progress checklist."
      />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10">
        {/* Mentor intro card */}
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="grid gap-6 p-6 sm:grid-cols-[200px_1fr] sm:p-8">
            <div className="mx-auto w-44 overflow-hidden rounded-xl sm:w-full">
              <img src={sadia.photo} alt="Miss Sadia Zahoor, PAS" className="aspect-[4/5] w-full object-cover" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold text-pine">Miss Sadia Zahoor, PAS</h2>
                <Badge tone="gold"><Award className="mr-1 h-3 w-3" /> 5th Position in CSS 2024</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sadia.credentials.slice(1).map((c) => (
                  <span key={c} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900">{c}</span>
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Miss Sadia Zahoor, PAS provides structured English Essay preparation for CSS aspirants - from topic interpretation and thesis development to evaluated, timed practice.
              </p>
              <h3 className="mt-4 text-sm font-semibold text-pine">Services</h3>
              <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-sm text-foreground/85 sm:grid-cols-2">
                {['English Essay preparation', 'Essay outlines', 'Thesis-statement development', 'Introductions and conclusions', 'Argument development', 'Individual mentorship', 'Personalised evaluation', 'CSS 2027 Test Series', 'CSS 2027 Grand Mocks'].map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
              <a
                href={waLink(sadia.whatsapp, sadia.message)}
                target="_blank" rel="noopener noreferrer"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-pine px-5 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-900"
              >
                <MessageCircle className="h-4 w-4" /> Contact Miss Sadia Zahoor, PAS - {sadia.whatsappDisplay}
              </a>
            </div>
          </div>
        </div>

        <Section title="Essay skill guides">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="space-y-1.5">
              {essayGuides.map((g) => (
                <button
                  key={g.slug}
                  onClick={() => setGuide(g.slug)}
                  className={`block w-full rounded-md px-3.5 py-2.5 text-left text-sm transition-colors ${guide === g.slug ? 'bg-pine font-medium text-emerald-50' : 'bg-secondary hover:bg-emerald-100'}`}
                >
                  {g.title}
                </button>
              ))}
            </div>
            <div className="rounded-lg border bg-white p-5 lg:col-span-3">
              <h3 className="font-display text-lg font-bold text-pine">{activeGuide.title}</h3>
              <ul className="mt-3 space-y-2.5">
                {activeGuide.body.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section title="Theme-wise preparation" description="Recurring themes with angles, sample topics and evidence sources.">
          <div className="flex flex-wrap gap-2">
            {essayThemes.map((t) => (
              <button key={t.slug} onClick={() => setTheme(t.slug)} className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${theme === t.slug ? 'border-emerald-700 bg-emerald-50 font-medium text-emerald-900' : 'hover:bg-secondary'}`}>
                {t.name}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 rounded-lg border bg-white p-5 md:grid-cols-3">
            <div>
              <h4 className="text-sm font-semibold text-pine">Angles to prepare</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-foreground/85">{activeTheme.angles.map((a) => <li key={a}>· {a}</li>)}</ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-pine">Sample practice topics</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-foreground/85">{activeTheme.sampleTopics.map((t) => <li key={t}>· {t}</li>)}</ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-pine">Evidence to collect</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-foreground/85">{activeTheme.evidenceHints.map((e) => <li key={e}>· {e}</li>)}</ul>
            </div>
          </div>
        </Section>

        <div className="grid gap-8 lg:grid-cols-2">
          <Section title="Practice topic bank" description={`${practiceTopics.length} original practice topics across themes.`}>
            <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-lg border bg-white p-3">
              {practiceTopics.map((p) => (
                <div key={p.topic} className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary/60">
                  <span>{p.topic}</span>
                  <Badge tone="gray">{p.theme}</Badge>
                </div>
              ))}
            </div>
            <Link to="/answer-writing" className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
              <PenLine className="h-4 w-4" /> Timed essay practice
            </Link>
          </Section>

          <Section title="Progress checklist" description={`Your essay readiness: ${progress}%`}>
            <div className="space-y-1.5">
              {essayRubric.map((r) => (
                <label key={r} className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-sm transition-colors ${checked[r] ? 'border-emerald-700 bg-emerald-50' : 'hover:bg-secondary/60'}`}>
                  <input type="checkbox" checked={!!checked[r]} onChange={(e) => setChecked((c) => ({ ...c, [r]: e.target.checked }))} className="h-4 w-4 accent-emerald-800" />
                  I can consistently demonstrate: <strong>{r}</strong>
                </label>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
