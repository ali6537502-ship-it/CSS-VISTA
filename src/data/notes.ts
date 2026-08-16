export interface NoteSample {
  title: string
  previewFolder: string
  pages: number
}

export interface NoteProduct {
  id: string
  subject: string
  description: string
  samples: NoteSample[]
  price?: string | null
}

export const noteProducts: NoteProduct[] = [
  {
    id: 'ca-pa',
    subject: 'Pakistan Affairs / Current Affairs',
    description: 'Issue-focused Pakistan and current-affairs notes prepared by Ali Hassan Sargana.',
    samples: [
      { title: 'Internal Security and Political Order', previewFolder: 'internal-security', pages: 3 },
      { title: 'China–Pakistan Economic Corridor (CPEC): A Strategic Lifeline', previewFolder: 'cpec', pages: 3 },
      { title: 'The Indus Waters Dispute & Water Security', previewFolder: 'indus-waters', pages: 3 },
      { title: 'Pakistan–India Relations & The Kashmir Conflict', previewFolder: 'pakistan-india-relations', pages: 3 },
    ],
  },
  {
    id: 'criminology',
    subject: 'Criminology',
    description: 'CSS-focused criminology theory and investigation material prepared by Ali Hassan Sargana.',
    samples: [
      { title: 'Biological Theory of Crime: Biological Positivism', previewFolder: 'biological-theory-crime', pages: 3 },
      { title: 'Legal and Ethical Guidelines for Investigators in Pakistan', previewFolder: 'legal-ethical-investigation', pages: 3 },
    ],
  },
  {
    id: 'political-science',
    subject: 'Political Science',
    description: 'Political thought and state-system notes for Political Science Paper I and II.',
    samples: [
      { title: 'Allama Muhammad Iqbal: Political Thought', previewFolder: 'iqbal-political-thought', pages: 3 },
      { title: 'Social Contract Theorists: Hobbes • Locke • Rousseau', previewFolder: 'social-contract-theorists', pages: 3 },
      { title: 'The State System & Islamic State', previewFolder: 'state-system', pages: 3 },
    ],
  },
  {
    id: 'european-history',
    subject: 'European History',
    description: 'European History material supplied for CSS preparation.',
    samples: [
      { title: 'Events of the French Revolution (1789–1799)', previewFolder: 'french-revolution', pages: 3 },
    ],
  },
]

export const notesCoverageStatement = 'These notes cover all major areas of the subject. You do not need to purchase another book for the preparation of this subject.'

// Kept for the existing admin editor; no outdated fixed public price is supplied.
export const bundle = { title: 'Complete Notes Bundle', price: '' }
