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
  topics: string[]
  pricing: {
    regularPrice: number
    offerPrice: number
  }
}

const currentPakistanAffairsTopics = [
  'India-China Maritime Relations',
  'AI Governance, Cybersecurity & Digital Economy',
  'Civil-Military Relations in Pakistan',
  'Azm-e-Istehkam',
  'Climate Change & Pakistan’s Vulnerability',
  'CPEC',
  'CPEC Phase II',
  'Crisis of Multilateralism & UN Reform',
  'Multipolar World & Pakistan’s Balancing Strategy',
  'Sovereignty',
  'De-Dollarization',
  'BRICS, SCO & Regional Connectivity',
  'IMF, Taxation & Fiscal Sovereignty',
  'Energy Security & Renewable Transition in Pakistan',
  'Ethnicity & National Integration in Pakistan',
  'Ethnicity',
  'Evolution in Warfare & Use of AI',
  'Geo-Strategic Location of Pakistan',
  'Global South, BRICS & Tianjin',
  'Hybrid Democracy in Pakistan',
  'Hybrid Warfare Against Pakistan',
  'Ideology of Pakistan',
  'Indo-Pacific Dynamics, Maritime Expansion & Indian Ocean',
  'Indo-Pacific: India-China Maritime Competition',
  'Indus Waters Dispute',
  'Israel-Palestine Conflict',
  'Middle East Power Vacuum',
  'Mineral Diplomacy & Reko Diq',
  'National Interests of Pakistan',
  'New Cold War: US-China Rivalry',
  'Non-Traditional Security Threats to Pakistan',
  'National Security Policy',
  'Pakistan Constitutional & Legal Cases',
  'Pakistan-Afghanistan Relations',
  'Pakistan-China Relations',
  'Pakistan Economy 2026–27',
  'Pakistan Foreign Policy',
  'Pakistan-India Relations',
  'Initial Problems of Pakistan',
  'Pakistan’s Mediatory Diplomacy 2026',
  'Pakistan Nuclear Programme',
  'Pakistan-Russia Relations',
  'Pakistan-Saudi Arabia Relations 2026',
  'Pakistan-Iran Relations',
  'Pakistan-US Relations',
  'Political Polarization & Governance Crisis in Pakistan',
  'Pre-Partition',
  'Pre-Partition Muslim India',
  'Provinces of Pakistan',
  'Proxy Wars',
  'Red Sea Crisis',
  'Regional Cooperation: SAARC, ECO, SCO & Pakistan',
  'Russia-Ukraine War',
  'Shah Waliullah',
  'Sheikh Ahmad Sirhindi',
  'Sir Syed Ahmad Khan',
  'Sufism in India',
  'Syed Ahmad Shaheed Barelvi',
  'Weaponization of Trade',
  'Youth Bulge, Demographic Dividend & Employment Crisis',
  'Accountability & Corruption',
  'Agriculture Sector of Pakistan',
  'Bureaucracy & Civil Service Reforms',
  'Democracy & Democratic Consolidation in Pakistan',
  'Digital Economy & Financial Technology',
  'Economic Challenges of Pakistan 2026',
  'Education Crisis in Pakistan',
  'Federalism & Centre-Province Relations',
  'Global Development & Globalisation',
  'Governance & Institutional Capacity',
  'IMF Programmes & Economic Sovereignty',
  'Industrial Sector of Pakistan 2026',
  'International Trade: Doha & Bali',
  'Judiciary, Judicial Independence & Reforms',
  'Local Government',
  'National Action Plan',
  'Nuclear Proliferation & Nuclear Security',
  'Population Explosion in Pakistan',
  'Terrorism & Counter-Terrorism in Pakistan',
  'Water Scarcity & Hydro-Politics in Pakistan',
  'Youth Issues',
  'Child Rights & Child Protection',
  'Global Energy Politics',
  'Internal Security & Political Order',
  'Media & Social Media Problems',
  'Population: World Trends & Policies',
]

const politicalScienceTopics = [
  'Al-Mawardi', 'Al-Farabi', 'Allama Iqbal', 'Ibn Khaldun', 'Imam Al-Ghazali',
  'Shah Waliullah', 'Aristotle', 'Francis Fukuyama',
  'Thomas Hobbes, John Locke & Jean-Jacques Rousseau', 'Jeremy Bentham',
  'John Stuart Mill', 'Karl Marx', 'Lenin', 'Machiavelli', 'Mao Zedong',
  'Marx’s Theory of the State', 'Montesquieu', 'Plato', 'Hegel', 'Kant',
  'Marx: Socialism, Communism, Class Struggle & Revolution', 'Comparative Politics',
  'Local Government', 'Major Political Ideologies', 'Political Participation',
  'Political Concepts', 'Political Institutions', 'State System',
  'Political System of China', 'Constitution of Germany', 'Constitution of Malaysia',
  'Constitution of India', 'Constitution of France', 'Political System of Iran',
  'Constitution of Turkey', 'Constitution of the United Kingdom',
  'Constitution of the United States', 'Colonial Politics',
  'Constitutional History of Pakistan', 'International Organizations',
  'International Relations', 'Government & Politics of Pakistan',
]

const criminologyTopics = [
  'Biological Theory of Crime', 'Criminals & Types of Criminals',
  'Introduction to Criminology', 'Islamic Criminal Law',
  'Psychological Theory of Crime', 'Social Control & Strain Theory',
  'Social Disorganisation Theory', 'Criminal Justice System of Pakistan',
  'Juvenile Justice System', 'Juvenile Delinquency', 'Criminal Investigation',
  'International Organizations in Criminology', 'Investigative Interviewing',
  'Legal & Ethical Guidelines for Investigators in Pakistan',
  'Community Policing & Public-Private Partnership', 'Media & Crime in Pakistan',
  'Cybercrime', 'Gender & Crime in Pakistan', 'ILP', 'Money Laundering',
  'Sabaoon Model of Deradicalization', 'Terrorism & Radicalism',
  'Urban & Rural Crime',
]

export const notesPurchaseActionLabel = 'Contact to purchase'

export const noteProducts: NoteProduct[] = [
  {
    id: 'ca-pa',
    subject: 'Current Affairs and Pakistan Affairs',
    description: 'Issue-wise current-affairs analysis and broad Pakistan Affairs coverage with background, evidence, quotations and answer-writing angles.',
    topics: currentPakistanAffairsTopics,
    pricing: { regularPrice: 7000, offerPrice: 5250 },
    samples: [
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
    topics: criminologyTopics,
    pricing: { regularPrice: 3600, offerPrice: 2700 },
    samples: [
      { id: 'psychological-theory-crime', title: 'Psychological Theory of Crime', kind: 'pdf', url: '/samples/psychological-theory-of-crime-criminology-sample.pdf', pages: 45, sizeBytes: 29760155 },
      { id: 'cybercrime', title: 'Cybercrime', kind: 'pdf', url: '/samples/cybercrime-criminology-sample.pdf', pages: 49, sizeBytes: 40115324 },
    ],
  },
  {
    id: 'political-science',
    subject: 'Political Science',
    description: 'Paper I and II coverage, including Western and Muslim political thought, constitutions, political systems and comparative politics.',
    topics: politicalScienceTopics,
    pricing: { regularPrice: 4000, offerPrice: 3000 },
    samples: [
      { id: 'state-system-pages', title: 'The State System and Islamic State', kind: 'pdf', url: '/samples/state-system-political-science-sample.pdf', pages: 33, sizeBytes: 30000398 },
      { id: 'forms-of-government', title: 'Forms of Government', kind: 'pdf', url: '/samples/forms-of-government-political-science-sample.pdf', pages: 21, sizeBytes: 14829678 },
      { id: 'aristotle-political-theories', title: 'Aristotle: Political Theories', kind: 'pdf', url: '/samples/aristotle-political-theories-political-science-sample.pdf', pages: 28, sizeBytes: 19039245 },
    ],
  },
  {
    id: 'european-history',
    subject: 'European History',
    description: 'Structured European History material covering major events, personalities, ideologies and analytical examination themes.',
    topics: [],
    pricing: { regularPrice: 0, offerPrice: 0 },
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
}

// The owner asked for the European History notes card to be hidden today.
// It restores itself at the next Pakistan midnight after this release, so this
// temporary editorial change cannot accidentally become permanent.
export const europeanHistoryHiddenUntil = Date.parse('2026-09-01T00:00:00+05:00')
export const notesDiscountEndsAt = Date.parse('2026-09-13T00:00:00+05:00')
const discountedNoteProductIds = new Set(['ca-pa', 'criminology', 'political-science'])

export function isNotesDiscountActive(now = Date.now()) {
  return now < notesDiscountEndsAt
}

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

export function getNoteDisplayPrice(product: NoteProduct, now = Date.now()) {
  const hasPrice = product.pricing.regularPrice > 0
  const hasActiveOffer = hasPrice && discountedNoteProductIds.has(product.id) && isNotesDiscountActive(now)
  const price = hasActiveOffer ? product.pricing.offerPrice : product.pricing.regularPrice
  const discountPercent = hasActiveOffer
    ? Math.round((1 - product.pricing.offerPrice / product.pricing.regularPrice) * 100)
    : 0

  return { hasPrice, hasActiveOffer, price, discountPercent }
}

export function findNoteDocument(productId: string | undefined, documentId: string | undefined) {
  const product = noteProducts.find((item) => item.id === productId)
  const resolvedDocumentId = productId === 'political-science' && documentId === 'state-system-pdf'
    ? 'state-system-pages'
    : documentId
  const document = product?.samples.find((item) => item.id === resolvedDocumentId)
  return product && document ? { product, document } : null
}
