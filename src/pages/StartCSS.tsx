import { useState } from 'react'
import { ChevronDown, CheckCircle2, AlertCircle, ExternalLink, FileText } from 'lucide-react'
import { PageHeader, Section, OfficialNotice, SourceNote, Badge } from '@/components/shared'
import { examFacts, allocationQuotaNote, syllabusSource } from '@/data/syllabus'
import { typicalCycle } from '@/data/updates'
import { mptChecklist, writtenChecklist } from '@/data/checklists'
import { mptFacts, mptOfficialSources, mptSyllabusSubjects } from '@/data/mptSyllabus'
import ConsultationCard from '@/components/ConsultationCard'

const stages = [
  { name: 'MPT - MCQ-based Preliminary Test', detail: 'A screening MCQ paper conducted before the written exam (introduced from CSS 2022). Only candidates who qualify the MPT may appear in the written examination. Qualifying threshold and pattern are set in the official notice.' },
  { name: 'Written Examination - 1200 marks', detail: 'Twelve papers: six compulsory (600 marks) and six optional (600 marks). Pass rule: 40% in each compulsory subject, 33% in each optional subject, and 50% aggregate (verify current rule from FPSC).' },
  { name: 'Medical Examination', detail: 'Conducted per FPSC rules to confirm fitness for service. Certain services have specific physical standards (e.g. PSP); check the current rules.' },
  { name: 'Psychological Assessment', detail: 'Written exercises, group tasks and an interview assessing personality, aptitude and suitability for the civil services.' },
  { name: 'Viva Voce - 300 marks', detail: 'A structured interview before the FPSC panel covering personality, general awareness, optional subjects and service preferences.' },
  { name: 'Allocation', detail: 'Final merit = written (1200) + viva (300) = 1500. Allocation to the twelve occupational groups follows merit-cum-quota rules.' },
]

const documents = [
  'CNIC (valid)', 'Domicile certificate', 'Bachelor degree and transcripts (HEC-recognised)',
  'Recent photographs as specified', 'Bank challan/treasury receipt of the application fee',
  'Equivalence certificate (for foreign degrees, from HEC)', 'Service certificate (for age-relaxation categories, where applicable)',
]

const mistakes = [
  { m: 'Waiting for the last day to apply', fix: 'Server load and document issues peak near deadlines; apply in the first week.' },
  { m: 'Wrong optional-subject combination', fix: 'Validate against the group rules (one subject per group; group-II allows two 100-mark subjects). Use the Subject Selector.' },
  { m: 'Incorrect domicile or category', fix: 'Quota is decided by domicile - ensure it matches your documents exactly.' },
  { m: 'Blurry or wrong-sized uploads', fix: 'Follow the advertisement’s exact photograph/signature specifications.' },
  { m: 'Ignoring the MPT', fix: 'The MPT is a hard screening gate; practise timed MCQs from day one.' },
  { m: 'Fee challan errors', fix: 'Keep the paid challan and enter its details exactly as printed.' },
]

const plans = [
  {
    name: 'Six-month plan',
    rows: [
      ['Month 1', 'Syllabus mapping, subject selection, grammar repair, daily newspaper habit'],
      ['Month 2', 'Compulsory subjects: Pakistan Affairs + Islamic Studies foundations; precis daily'],
      ['Month 3', 'Current Affairs issue files; optional subjects block 1; weekly essay begins'],
      ['Month 4', 'Optional subjects block 2; GSA drills; first full past paper per compulsory subject'],
      ['Month 5', 'Mock cycle: one full paper every 2–3 days; answer-writing feedback; revision notes'],
      ['Month 6', 'Revision only; timed mocks; vocabulary and statistics banks; rest discipline'],
    ],
  },
  {
    name: 'One-year plan',
    rows: [
      ['Months 1–2', 'Orientation, English repair, reading habit, subject selection'],
      ['Months 3–5', 'Compulsory subjects completed topic-wise with notes'],
      ['Months 6–8', 'Optional subjects completed; essay every week; issue files started'],
      ['Months 9–10', 'Past-paper mapping; second revision; answer-writing practice'],
      ['Months 11–12', 'MPT drills, full mocks, revision zone material, rest management'],
    ],
  },
  {
    name: 'Working-professional plan (9–12 months, ~3 hrs/day)',
    rows: [
      ['Daily (Mon–Fri)', '2 focused hours: one subject block; 1 hour newspaper + vocabulary'],
      ['Weekends', '5–6 hours: essay or full paper, review of the week, planning'],
      ['Monthly', 'One full-length timed mock per compulsory subject'],
      ['Last 2 months', 'Revision + MPT drills; use leave strategically before the written exam'],
    ],
  },
]

const faqs = [
  { q: 'How many attempts are allowed?', a: examFacts.attempts },
  { q: 'What is the age limit?', a: examFacts.ageLimit },
  { q: 'What qualification is required?', a: examFacts.qualification },
  { q: 'Is the MPT the same as the written exam?', a: 'No. The MPT is an MCQ screening test held months before the written examination. Qualifying it only earns you the right to sit the written papers; its marks are not carried forward.' },
  { q: 'Can I change optional subjects after applying?', a: 'Subject changes follow the deadlines and procedure in the official advertisement. Do not assume changes are possible after submission - choose carefully using the group rules.' },
  { q: 'How are services allocated?', a: allocationQuotaNote },
  { q: 'Is coaching compulsory?', a: 'No. With the official syllabus, past papers, disciplined answer-writing practice and credible sources, self-preparation is entirely viable. Coaching is a personal choice, not a requirement.' },
  { q: 'Where do I verify rules?', a: 'Only from FPSC (fpsc.gov.pk) and the current advertisement. CSS Vista links official sources but FPSC remains the final authority.' },
]

function Checklist({ data, title, warning }: { data: typeof mptChecklist; title: string; warning: string }) {
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const total = data.reduce((a, g) => a + g.steps.length, 0)
  const done = Object.values(ticks).filter(Boolean).length
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-pine">{title}</h3>
        <Badge tone={done === total ? 'green' : 'gray'}>{done}/{total} done</Badge>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-emerald-700 transition-all duration-300" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <div className="mt-4 space-y-5">
        {data.map((g, gi) => (
          <div key={g.group}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {gi + 1} - {g.group}</h4>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {g.steps.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setTicks((t) => ({ ...t, [`${title}-${s.id}`]: !t[`${title}-${s.id}`] }))}
                    className={`flex w-full items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-left text-sm transition-colors ${ticks[`${title}-${s.id}`] ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'bg-white hover:bg-secondary/60'}`}
                    aria-pressed={!!ticks[`${title}-${s.id}`]}
                  >
                    {ticks[`${title}-${s.id}`] ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/40" />}
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {warning}
      </p>
    </div>
  )
}

export default function StartCSS() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [openMptSubject, setOpenMptSubject] = useState<string | null>('islamic-civics')
  const [plan, setPlan] = useState(0)
  const [applyTab, setApplyTab] = useState<'mpt' | 'written'>('mpt')

  return (
    <div>
      <PageHeader
        title="Start CSS"
        description="A beginner-friendly map of the CSS examination: what it is, who can apply, how it works, and how to plan your first year of preparation."
      />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10">
        <OfficialNotice />

        <Section title="What is CSS?">
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-foreground/90">
            <p>
              The Central Superior Services (CSS) Competitive Examination is Pakistan’s federal recruitment examination for the twelve occupational groups of the civil services - conducted annually by the Federal Public Service Commission (FPSC).
            </p>
            <p>
              Its purpose is to select, through open competition, the officers who will run federal administration, policing, diplomacy, taxation, audit and related functions. The examination tests breadth (six compulsory subjects), depth (six optional subjects), and finally personality through psychological assessment and viva voce.
            </p>
          </div>
        </Section>

        <Section title="Eligibility at a glance">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Age', value: '21–30 years', note: 'Cut-off per advertisement; limited relaxation categories exist' },
              { label: 'Qualification', value: 'Bachelor (≥ 2nd Div.)', note: 'HEC-recognised university' },
              { label: 'Attempts', value: 'Three', note: 'An MPT-only appearance does not consume a written attempt' },
              { label: 'Nationality', value: 'Pakistani citizen', note: 'Domicile decides provincial/regional quota' },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</div>
                <div className="mt-1 font-display text-lg font-bold text-pine">{c.value}</div>
                <div className="mt-1 text-xs leading-snug text-muted-foreground">{c.note}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border bg-secondary/50 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Age relaxation:</strong> the CSS Rules provide limited relaxation (commonly up to two years) for specified categories such as certain government servants, recognised tribal areas, AJK/GB and others. The exact categories and conditions exist only in the current Rules and advertisement - verify before relying on any relaxation.
          </div>
          <SourceNote source={syllabusSource.name} url={syllabusSource.url} date={syllabusSource.lastUpdated} />
        </Section>

        <Section title="Examination stages">
          <ol className="relative space-y-4 border-l-2 border-emerald-800/20 pl-6">
            {stages.map((s, i) => (
              <li key={s.name} className="relative">
                <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-pine text-xs font-bold text-emerald-50">{i + 1}</span>
                <h3 className="font-semibold text-foreground">{s.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          title="Official CSS MPT syllabus"
          description="Subject distribution and syllabus areas verified from the FPSC MPT Rules, FPSC MPT Syllabus and the compulsory-subject syllabus adopted by the MPT syllabus."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {mptFacts.map((fact) => (
              <div key={fact.label} className="rounded-lg border bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{fact.label}</div>
                <div className="mt-1 font-display text-lg font-bold text-pine">{fact.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 divide-y rounded-lg border bg-white">
            {mptSyllabusSubjects.map((subject) => {
              const isOpen = openMptSubject === subject.id
              return (
                <div key={subject.id}>
                  <button
                    type="button"
                    onClick={() => setOpenMptSubject(isOpen ? null : subject.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60"
                    aria-expanded={isOpen}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-800">{subject.marks}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{subject.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{subject.note}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <div className="grid gap-4 border-t bg-secondary/20 px-4 py-4 md:grid-cols-2">
                        {subject.sections.map((section) => (
                          <div key={section.title} dir={section.rtl ? 'rtl' : undefined} className={section.rtl ? 'text-right' : undefined}>
                            <h4 className="text-sm font-semibold text-pine">{section.title}</h4>
                            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground/85">
                              {section.items.map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 rounded-lg border border-emerald-700/20 bg-emerald-50/60 p-4 text-sm">
            <p className="font-medium text-pine">Official FPSC sources</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[mptOfficialSources.rules, mptOfficialSources.mptSyllabus, mptOfficialSources.compulsorySyllabus].map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
                  {source.label} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Last verified from fpsc.gov.pk on {mptOfficialSources.lastVerified}. FPSC remains the final authority for later amendments.</p>
          </div>
        </Section>

        <Section title="Typical annual cycle" description="The usual pattern of a CSS year - binding dates exist only in the official advertisement.">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-2.5">Stage</th><th className="px-4 py-2.5">Typical window</th><th className="px-4 py-2.5">Note</th></tr>
              </thead>
              <tbody>
                {typicalCycle.map((r) => (
                  <tr key={r.stage} className="border-t">
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.stage}</td>
                    <td className="px-4 py-2.5 text-emerald-900">{r.typicalWindow}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Application procedure & documents" description="Applications are submitted online through the FPSC portal when the advertisement opens, followed by the hard-copy submission where required.">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border bg-white p-5">
              <h3 className="flex items-center gap-2 font-semibold text-foreground"><FileText className="h-4 w-4 text-emerald-800" /> Documents checklist</h3>
              <ul className="mt-3 space-y-2">
                {documents.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-foreground/85">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border bg-white p-5">
              <h3 className="flex items-center gap-2 font-semibold text-foreground"><AlertCircle className="h-4 w-4 text-amber-600" /> Common application mistakes</h3>
              <ul className="mt-3 space-y-2.5">
                {mistakes.map((x) => (
                  <li key={x.m} className="text-sm">
                    <span className="font-medium text-foreground">{x.m}.</span>{' '}
                    <span className="text-muted-foreground">{x.fix}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section title="Preparation roadmaps">
          <div className="flex flex-wrap gap-2">
            {plans.map((p, i) => (
              <button
                key={p.name}
                onClick={() => setPlan(i)}
                className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${plan === i ? 'bg-pine text-emerald-50' : 'bg-secondary text-foreground hover:bg-emerald-100'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <tbody>
                {plans[plan].rows.map(([k, v]) => (
                  <tr key={k} className="border-t first:border-0">
                    <td className="w-40 bg-secondary/60 px-4 py-2.5 font-semibold text-pine">{k}</td>
                    <td className="px-4 py-2.5 text-foreground/85">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <ConsultationCard variant="compact" heading="Unsure how to start CSS?" description="Discuss your preparation roadmap, optional subjects, resources and study plan privately with Sir Ali Hassan or Ms. Sadia Zahoor." />

        <Section title="Application checklists" description="Step-by-step, tick-off checklists for the MPT and the written application.">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setApplyTab('mpt')} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${applyTab === 'mpt' ? 'bg-pine text-emerald-50' : 'bg-secondary hover:bg-emerald-100'}`}>
              CSS MPT Application Checklist
            </button>
            <button onClick={() => setApplyTab('written')} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${applyTab === 'written' ? 'bg-pine text-emerald-50' : 'bg-secondary hover:bg-emerald-100'}`}>
              CSS Written Application & Documents Checklist
            </button>
          </div>
          <div className="mt-4">
            {applyTab === 'mpt' ? (
              <Checklist
                data={mptChecklist}
                title="CSS MPT Application Checklist"
                warning="Candidates must check the latest official FPSC advertisement before applying - requirements, fees and dates are binding only as published by FPSC."
              />
            ) : (
              <Checklist
                data={writtenChecklist}
                title="CSS Written Application & Documents Checklist"
                warning="Document requirements may change. Follow the latest official FPSC advertisement for the exact list, attestation rules and submission method."
              />
            )}
          </div>
        </Section>

        <Section title="Frequently asked questions">
          <div className="divide-y rounded-lg border bg-white">
            {faqs.map((f, i) => (
              <div key={f.q}>
                <button
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {f.q}
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-200 ${openFaq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Badge tone="gold">Guidance content - FPSC remains the final authority for all rules</Badge>
          </div>
        </Section>
      </div>
    </div>
  )
}
