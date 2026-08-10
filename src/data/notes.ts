// Notes Library products - owner-provided pricing. Paid notes are never publicly downloadable.
export interface NoteProduct {
  id: string
  subject: string
  description: string
  price: string | null // null = price to be announced
  sampleUrl?: string // public sample PDF
  sampleLabel?: string
  samples?: { title: string; url: string }[]
}

export const noteProducts: NoteProduct[] = [
  {
    id: 'ca-pa',
    subject: 'Current Affairs and Pakistan Affairs',
    description:
      'A combined notes package: issue-wise current affairs analysis and complete Pakistan Affairs coverage - background, data, quotations and Pakistan-focused angles for CSS and PMS papers.',
    price: 'PKR 7,000',
    sampleLabel: 'Sample notes available',
    samples: [
      { title: 'Proxy Wars (sample)', url: '/samples/proxy-wars-ca-pa.pdf' },
      { title: 'Multipolar World Order - Pakistan’s Balancing Strategy (sample)', url: '/samples/multipolar-world-ca-pa.pdf' },
      { title: 'Pakistan–India Relations (sample)', url: '/samples/pakistan-india-relations-ca-pa.pdf' },
    ],
  },
  {
    id: 'criminology',
    subject: 'Criminology',
    description:
      'Complete criminology notes: theories of crime, criminal justice system, investigation, forensics, juvenile justice and CSS-focused practice material.',
    price: 'PKR 6,000',
    sampleLabel: 'Sample notes available',
    samples: [
      { title: 'Psychological Theory of Crime (sample)', url: '/samples/psychological-theory-of-crime-criminology-sample.pdf' },
      { title: 'Cybercrime (sample)', url: '/samples/cybercrime-criminology-sample.pdf' },
    ],
  },
  {
    id: 'political-science',
    subject: 'Political Science',
    description:
      'Political Science Paper I and II coverage: Western and Muslim political thought, constitutions, political systems and comparative politics with solved outlines.',
    price: 'PKR 6,000',
    sampleLabel: 'Sample notes available',
    samples: [
      { title: 'The State System & Islamic State (sample)', url: '/samples/state-system-political-science-sample.pdf' },
      { title: 'Forms of Government (sample)', url: '/samples/forms-of-government-political-science-sample.pdf' },
      { title: 'Aristotle: Political Theories (sample)', url: '/samples/aristotle-political-theories-political-science-sample.pdf' },
    ],
  },
]

export const bundle = {
  title: 'Complete Notes Bundle',
  includes: 'Current Affairs + Pakistan Affairs + Criminology + Political Science',
  price: 'PKR 12,000',
  badge: 'Special Bundle Discount',
  note: 'Contact Sir Ali Hassan Sargana for samples and purchasing details.',
}
