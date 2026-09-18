export interface MptQuestionBankDefinition {
  id: string
  name: string
  directPath?: string
  centralSlugs?: string[]
  cssSubjectSlug?: string
  topicNeedles?: string[]
  expectedCount?: number
}

const reasoningTopics = [
  'analytical constraints', 'calendar reasoning', 'clock reasoning', 'data interpretation',
  'decision analysis', 'deductive reasoning', 'mechanical ability', 'number patterns',
  'random sampling', 'relations and directions', 'sets and probability',
  'social ability and psychometrics', 'verbal ability',
]

export const mptQuestionBanks: Record<string, MptQuestionBankDefinition> = {
  english: { id: 'english', name: 'English', centralSlugs: ['english-grammar'] },
  vocabulary: { id: 'vocabulary', name: 'English Vocabulary', centralSlugs: ['english-grammar'] },
  grammar: { id: 'grammar', name: 'English Grammar', centralSlugs: ['english-grammar'] },
  correction: {
    id: 'correction',
    name: 'Sentence Correction',
    centralSlugs: ['english-grammar'],
    topicNeedles: ['sentence structure, fragments and parallelism'],
    expectedCount: 10,
  },
  abilities: {
    id: 'abilities',
    name: 'General Abilities',
    centralSlugs: ['general-ability'],
    expectedCount: 900,
  },
  reasoning: {
    id: 'reasoning',
    name: 'Logical & Analytical Reasoning',
    cssSubjectSlug: 'general-science-and-ability',
    topicNeedles: reasoningTopics,
    expectedCount: 120,
  },
  science: {
    id: 'science',
    name: 'Everyday Science',
    directPath: '/gk/cat/everyday-science',
    centralSlugs: ['everyday-science'],
  },
  'mpt-gk': {
    id: 'mpt-gk',
    name: 'MPT General Knowledge',
    centralSlugs: [
      'everyday-science', 'science', 'solar-system', 'environment', 'computer-basics',
      'current-affairs', 'pakistan-affairs', 'pakistan-history', 'pakistan-geography',
    ],
  },
  gk: {
    id: 'gk',
    name: 'General Knowledge',
    centralSlugs: ['capitals', 'currencies', 'countries-continents', 'first-world', 'largest-longest', 'important-personalities', 'discoveries-inventions', 'awards-honours'],
  },
  current: { id: 'current', name: 'Current Affairs', centralSlugs: ['current-affairs'] },
  pakistan: {
    id: 'pakistan',
    name: 'Pakistan Affairs',
    centralSlugs: ['pakistan-affairs', 'pakistan-history', 'pakistan-geography'],
  },
  islamiat: { id: 'islamiat', name: 'Islamic Studies', centralSlugs: ['islamic-gk'] },
  urdu: { id: 'urdu', name: 'Urdu', centralSlugs: ['urdu-language'] },
  geography: {
    id: 'geography',
    name: 'Geography',
    centralSlugs: ['pakistan-geography', 'mountains', 'rivers', 'oceans-seas', 'deserts', 'straits-canals', 'countries-continents'],
  },
  history: {
    id: 'history',
    name: 'History',
    centralSlugs: ['pakistan-history', 'first-world', 'important-personalities'],
  },
  organisations: {
    id: 'organisations',
    name: 'International Organisations',
    centralSlugs: ['international-organisations', 'united-nations'],
  },
  // Recalled MPT past-paper questions. Every answer was verified against the
  // question itself rather than taken from the source key, which was wrong in
  // 34 places; questions that could not be answered are not in the bank.
  'past-papers': {
    id: 'past-papers',
    name: 'MPT Past Papers',
    directPath: '/gk/cat/mpt-past-papers',
    centralSlugs: ['mpt-past-papers'],
    expectedCount: 534,
  },
}

export function mptQuestionBankPath(id: string) {
  return mptQuestionBanks[id]?.directPath ?? `/mpt/bank/${id}`
}

export function matchesMptBankTopic(topic: string | undefined, definition: MptQuestionBankDefinition) {
  if (!definition.topicNeedles?.length) return true
  const normalised = (topic ?? '').trim().toLocaleLowerCase()
  return definition.topicNeedles.some((needle) => normalised.includes(needle))
}
