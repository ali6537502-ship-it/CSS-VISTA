// Owner-provided notes catalogue. Paid notes remain privately delivered;
// only the supplied sample pages and existing sample PDFs are public.
export interface NoteSample {
  title: string
  url?: string
  previewFolder?: string
  pages?: number
}

export interface NoteProduct {
  id: string
  subject: string
  description: string
  price: string | null
  samples: NoteSample[]
}

export const noteProducts: NoteProduct[] = [
  {
    id: 'ca-pa',
    subject: 'Current Affairs and Pakistan Affairs',
    description: 'Issue-wise current-affairs analysis and broad Pakistan Affairs coverage with background, evidence, quotations and answer-writing angles.',
    price: 'PKR 6,000',
    samples: [
      { title: 'Internal Security and Political Order', previewFolder: 'internal-security', pages: 3 },
      { title: 'China–Pakistan Economic Corridor (CPEC)', previewFolder: 'cpec', pages: 3 },
      { title: 'Pakistan–India Relations and Kashmir', previewFolder: 'pakistan-india-relations', pages: 3 },
      { title: 'Proxy Wars', url: '/samples/proxy-wars-ca-pa.pdf' },
      { title: 'Multipolar World Order — Pakistan’s Balancing Strategy', url: '/samples/multipolar-world-ca-pa.pdf' },
      { title: 'Pakistan–India Relations', url: '/samples/pakistan-india-relations-ca-pa.pdf' },
    ],
  },
  {
    id: 'criminology',
    subject: 'Criminology',
    description: 'Theories of crime, criminal justice, investigation, forensics, juvenile justice and examination-focused practice material.',
    price: 'PKR 3,600',
    samples: [
      { title: 'Biological Theory of Crime', previewFolder: 'biological-theory-crime', pages: 3 },
      { title: 'Legal and Ethical Guidelines for Investigators', previewFolder: 'legal-ethical-investigation', pages: 3 },
      { title: 'Psychological Theory of Crime', url: '/samples/psychological-theory-of-crime-criminology-sample.pdf' },
      { title: 'Cybercrime', url: '/samples/cybercrime-criminology-sample.pdf' },
    ],
  },
  {
    id: 'political-science',
    subject: 'Political Science',
    description: 'Paper I and II coverage, including Western and Muslim political thought, constitutions, political systems and comparative politics.',
    price: 'PKR 5,000',
    samples: [
      { title: 'Allama Muhammad Iqbal: Political Thought', previewFolder: 'iqbal-political-thought', pages: 3 },
      { title: 'Social Contract Theorists: Hobbes, Locke and Rousseau', previewFolder: 'social-contract-theorists', pages: 3 },
      { title: 'The State System and Islamic State', previewFolder: 'state-system', pages: 3 },
      { title: 'The State System and Islamic State', url: '/samples/state-system-political-science-sample.pdf' },
      { title: 'Forms of Government', url: '/samples/forms-of-government-political-science-sample.pdf' },
      { title: 'Aristotle: Political Theories', url: '/samples/aristotle-political-theories-political-science-sample.pdf' },
    ],
  },
  {
    id: 'european-history',
    subject: 'European History',
    description: 'Structured European History material covering major events, personalities, ideologies and analytical examination themes.',
    price: 'PKR 5,000',
    samples: [
      { title: 'Events of the French Revolution (1789–1799)', previewFolder: 'french-revolution', pages: 3 },
      { title: 'Metternich’s Era', previewFolder: 'metternich-era', pages: 3 },
    ],
  },
]

export const notesCoverageStatement = 'Complete subject coverage designed to reduce dependence on multiple books and scattered preparation material.'

export const bundle = {
  title: 'Complete Notes Bundle',
  includes: 'Current Affairs + Pakistan Affairs + Criminology + Political Science + European History',
  price: 'PKR 12,000',
  badge: 'Special Bundle Discount',
  note: 'Contact Sir Ali Hassan Sargana for samples and purchasing details.',
}
