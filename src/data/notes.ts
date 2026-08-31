// Public catalogue of owner-authorised note samples. The complete paid notes
// are delivered privately and are never bundled into the public application.
export interface NoteDocument {
  id: string
  title: string
  kind: 'image-pages' | 'pdf' | 'docx'
  url?: string
  previewFolder?: string
  pages: number
  sizeBytes: number
}

export interface NoteProduct {
  id: string
  subject: string
  description: string
  samples: NoteDocument[]
}

export const notesPurchaseActionLabel = 'Contact to purchase'

export const noteProducts: NoteProduct[] = [
  {
    id: 'ca-pa',
    subject: 'Current Affairs and Pakistan Affairs',
    description: 'Issue-wise current-affairs analysis and broad Pakistan Affairs coverage with background, evidence, quotations and answer-writing angles.',
    samples: [
      { id: 'internal-security', title: 'Internal Security and Political Order', kind: 'image-pages', previewFolder: 'internal-security', pages: 3, sizeBytes: 164534 },
      { id: 'cpec', title: 'China–Pakistan Economic Corridor (CPEC)', kind: 'docx', url: '/samples/cpec-css-notes-with-maps.docx', pages: 19, sizeBytes: 1608084 },
      { id: 'pakistan-india-relations-pages', title: 'Pakistan–India Relations and Kashmir', kind: 'pdf', url: '/samples/pakistan-india-relations-kashmir-ca-pa.pdf', pages: 36, sizeBytes: 274098 },
      { id: 'proxy-wars', title: 'Proxy Wars', kind: 'pdf', url: '/samples/proxy-wars-ca-pa.pdf', pages: 64, sizeBytes: 7702693 },
      { id: 'multipolar-world', title: 'Multipolar World Order — Pakistan’s Balancing Strategy', kind: 'pdf', url: '/samples/multipolar-world-ca-pa.pdf', pages: 34, sizeBytes: 4577651 },
      { id: 'pakistan-india-relations-pdf', title: 'Pakistan–India Relations', kind: 'pdf', url: '/samples/pakistan-india-relations-ca-pa.pdf', pages: 27, sizeBytes: 2916013 },
    ],
  },
  {
    id: 'criminology',
    subject: 'Criminology',
    description: 'Theories of crime, criminal justice, investigation, forensics, juvenile justice and examination-focused practice material.',
    samples: [
      { id: 'biological-theory-crime', title: 'Biological Theory of Crime', kind: 'image-pages', previewFolder: 'biological-theory-crime', pages: 3, sizeBytes: 234836 },
      { id: 'legal-ethical-investigation', title: 'Legal and Ethical Guidelines for Investigators', kind: 'image-pages', previewFolder: 'legal-ethical-investigation', pages: 3, sizeBytes: 304310 },
      { id: 'psychological-theory-crime', title: 'Psychological Theory of Crime', kind: 'pdf', url: '/samples/psychological-theory-of-crime-criminology-sample.pdf', pages: 45, sizeBytes: 29760155 },
      { id: 'cybercrime', title: 'Cybercrime', kind: 'pdf', url: '/samples/cybercrime-criminology-sample.pdf', pages: 49, sizeBytes: 40115324 },
    ],
  },
  {
    id: 'political-science',
    subject: 'Political Science',
    description: 'Paper I and II coverage, including Western and Muslim political thought, constitutions, political systems and comparative politics.',
    samples: [
      { id: 'iqbal-political-thought', title: 'Allama Muhammad Iqbal: Political Thought', kind: 'image-pages', previewFolder: 'iqbal-political-thought', pages: 3, sizeBytes: 222854 },
      { id: 'social-contract-theorists', title: 'Social Contract Theorists: Hobbes, Locke and Rousseau', kind: 'image-pages', previewFolder: 'social-contract-theorists', pages: 3, sizeBytes: 266344 },
      { id: 'state-system-pages', title: 'The State System and Islamic State', kind: 'pdf', url: '/samples/state-system-political-science-sample.pdf', pages: 33, sizeBytes: 30000398 },
      { id: 'forms-of-government', title: 'Forms of Government', kind: 'pdf', url: '/samples/forms-of-government-political-science-sample.pdf', pages: 21, sizeBytes: 14829678 },
      { id: 'aristotle-political-theories', title: 'Aristotle: Political Theories', kind: 'pdf', url: '/samples/aristotle-political-theories-political-science-sample.pdf', pages: 28, sizeBytes: 19039245 },
    ],
  },
  {
    id: 'european-history',
    subject: 'European History',
    description: 'Structured European History material covering major events, personalities, ideologies and analytical examination themes.',
    samples: [
      { id: 'french-revolution', title: 'Events of the French Revolution (1789–1799)', kind: 'image-pages', previewFolder: 'french-revolution', pages: 3, sizeBytes: 310490 },
      { id: 'metternich-era', title: 'Metternich’s Era', kind: 'image-pages', previewFolder: 'metternich-era', pages: 3, sizeBytes: 206526 },
    ],
  },
]

export const notesCoverageStatement = 'Complete subject coverage designed to reduce dependence on multiple books and scattered preparation material.'

export const bundle = {
  title: 'Complete Notes Bundle',
  includes: 'Current Affairs + Pakistan Affairs + Criminology + Political Science + European History',
  badge: 'Combined subject package',
  note: 'Contact Sir Ali Hassan Sargana for authorised samples, current availability and purchase details.',
}

// The owner asked for the European History notes card to be hidden today.
// It restores itself at the next Pakistan midnight after this release, so this
// temporary editorial change cannot accidentally become permanent.
export const europeanHistoryHiddenUntil = Date.parse('2026-09-01T00:00:00+05:00')

export function isEuropeanHistoryTemporarilyHidden(now = Date.now()) {
  return now < europeanHistoryHiddenUntil
}

export function getVisibleNoteProducts(now = Date.now()) {
  return isEuropeanHistoryTemporarilyHidden(now)
    ? noteProducts.filter((product) => product.id !== 'european-history')
    : noteProducts
}

export function getVisibleBundleIncludes(now = Date.now()) {
  return isEuropeanHistoryTemporarilyHidden(now)
    ? bundle.includes.replace(' + European History', '')
    : bundle.includes
}

export function findNoteDocument(productId: string | undefined, documentId: string | undefined) {
  const product = noteProducts.find((item) => item.id === productId)
  const resolvedDocumentId = productId === 'political-science' && documentId === 'state-system-pdf'
    ? 'state-system-pages'
    : documentId
  const document = product?.samples.find((item) => item.id === resolvedDocumentId)
  return product && document ? { product, document } : null
}
