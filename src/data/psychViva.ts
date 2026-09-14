/**
 * Guidance for the CSS psychological assessment and viva stages. Held outside
 * the page component so the prerendered /psych-viva page publishes the same
 * material the application shows — the page is advertising-eligible, and an
 * ad-bearing page has to carry its content in the HTML.
 */
export const psychVivaSections = [
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

export const psychVivaMockQuestions = [
  'Introduce yourself in two minutes.',
  'Why the civil services, and why this service preference order?',
  'What is the biggest governance problem in your district, and how would you address it?',
  'Explain one concept from your favourite optional subject as if to a layperson.',
  'A subordinate refuses your lawful order in front of others. What do you do?',
  'Defend or critique one recent government policy - with evidence.',
  'What did you learn from your biggest failure?',
  'Which book influenced you recently, and why?',
]

export const psychVivaServicePreferences = ['Pakistan Administrative Service', 'Police Service of Pakistan', 'Foreign Service of Pakistan', 'Inland Revenue Service', 'Pakistan Customs Service', 'Audit & Accounts', 'Information Group', 'Office Management Group', 'Commerce & Trade', 'ML&C', 'Postal', 'Railways (C&T)']
