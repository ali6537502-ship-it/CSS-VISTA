import { PageHeader, Section, OfficialNotice } from '@/components/shared'

const sections = [
  {
    title: 'Purpose of the psychological assessment',
    body: ['The assessment evaluates personality, aptitude, emotional stability and suitability for public service - it is not an academic test.', 'Panels look for consistency: between what you write, what you say in the group and what you say in interview.', 'There are no secret or “leaked” questions. Anyone claiming to sell them should not be trusted.'],
  },
  {
    title: 'Common assessment stages',
    body: ['Written psychological exercises: sentence completion, word association and short essay-type responses under time.', 'Group activities: a discussion or task observed for cooperation, initiative and listening.', 'Individual interview: questions on your form, background and opinions.'],
  },
  {
    title: 'Preparing your personal information',
    body: ['Know every entry on your own form: education, family, district, hobbies, service preferences.', 'Prepare honest, specific answers about strengths, weaknesses and motivation for the civil services.', 'Inconsistency between form and interview answers is a classic, avoidable error.'],
  },
  {
    title: 'Viva voce preparation areas',
    body: ['Academic background: be ready to discuss your own degree subjects intelligently.', 'Current affairs: structured opinions on national issues - not memorised headlines.', 'Optional subjects: conceptual questions from your own chosen subjects.', 'Service preferences: know the actual work of your top three occupational groups.', 'Situational questions: judgement calls on administrative and ethical dilemmas.'],
  },
  {
    title: 'Communication & body language',
    body: ['Answer the question asked; stop when you have answered it.', 'Maintain calm posture, natural eye contact and a measured pace.', 'It is acceptable to pause and think; it is not acceptable to bluff. Say “I do not know” plainly when you do not.', 'Dress formally and conservatively; arrive early with documents organised.'],
  },
  {
    title: 'Common mistakes',
    body: ['Memorised, theatrical answers that collapse under follow-up questions.', 'Criticising institutions or individuals instead of analysing issues.', 'Over-talking in group tasks, or disappearing entirely.', 'Contradicting your own written form.'],
  },
]

const mockQuestions = [
  'Introduce yourself in two minutes.',
  'Why the civil services, and why this service preference order?',
  'What is the biggest governance problem in your district, and how would you address it?',
  'Explain one concept from your favourite optional subject as if to a layperson.',
  'A subordinate refuses your lawful order in front of others. What do you do?',
  'Defend or critique one recent government policy - with evidence.',
  'What did you learn from your biggest failure?',
  'Which book influenced you recently, and why?',
]

const servicePrefs = ['Pakistan Administrative Service', 'Police Service of Pakistan', 'Foreign Service of Pakistan', 'Inland Revenue Service', 'Pakistan Customs Service', 'Audit & Accounts', 'Information Group', 'Office Management Group', 'Commerce & Trade', 'ML&C', 'Postal', 'Railways (C&T)']

export default function PsychViva() {
  return (
    <div>
      <PageHeader title="Psychological Assessment & Viva Voce" description="What the final stages actually assess, how to prepare honestly, and how to avoid the classic mistakes. Viva carries 300 marks - it can rescue or sink a written score." />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10">
        <OfficialNotice />
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((s) => (
            <div key={s.title} className="rounded-lg border bg-white p-5">
              <h2 className="font-display text-lg font-bold text-pine">{s.title}</h2>
              <ul className="mt-3 space-y-2">
                {s.body.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Section title="Mock interview questions" description="Practise aloud with a timer; record and review yourself.">
          <div className="grid gap-2 md:grid-cols-2">
            {mockQuestions.map((q, i) => (
              <div key={q} className="rounded-md border bg-white px-4 py-3 text-sm">
                <span className="mr-2 font-display font-bold text-pine">{i + 1}.</span> {q}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Service-group awareness worksheet" description="For your top three preferences, write one line each: role, first posting, one skill you bring.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {servicePrefs.map((s) => (
              <div key={s} className="rounded-md border bg-white p-3.5">
                <div className="text-sm font-medium">{s}</div>
                <input className="mt-2 h-9 w-full rounded-md border border-input px-2 text-sm" placeholder="Your one-line note…" aria-label={`Note for ${s}`} />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
