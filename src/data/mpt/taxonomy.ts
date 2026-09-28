// Editorial taxonomy for the CSS Vista MPT release bank.
//
// Every question in src/data/mpt/bank/**.json carries one `subtopic` key from
// this file. The keys are CSS Vista's own classification of the FPSC MPT
// syllabus headings (src/data/mptSyllabus.ts); they are not FPSC terminology
// and FPSC does not publish sub-allocations below the five broad sections.

export type MptSection = 'Islamic Studies' | 'Urdu' | 'English' | 'General Abilities' | 'General Knowledge'
export type MptSubject = 'Islamic Studies' | 'Urdu' | 'English' | 'Quantitative Ability' | 'Reasoning'
  | 'Everyday Science' | 'Current Affairs' | 'Pakistan Affairs'

export interface SubtopicDefinition {
  section: MptSection
  subject: MptSubject
  label: string
  /** Groups used by paper-level balance rules. */
  group?: string
}

const d = (section: MptSection, subject: MptSubject, label: string, group?: string): SubtopicDefinition => ({ section, subject, label, group })
const IS = 'Islamic Studies' as const
const UR = 'Urdu' as const
const EN = 'English' as const
const GA = 'General Abilities' as const
const GK = 'General Knowledge' as const

export const MPT_SUBTOPICS: Record<string, SubtopicDefinition> = {
  // Islamic Studies / Civics & Ethics (FPSC MPT syllabus headings in brackets)
  'isl.beliefs': d(IS, IS, 'Islamic beliefs and fundamentals'),
  'isl.quran': d(IS, IS, 'The Qur’an: revelation, compilation, themes'),
  'isl.hadith': d(IS, IS, 'Hadith and Sunnah'),
  'isl.worship': d(IS, IS, 'Worship and its moral and social impact'),
  'isl.seerah-makkah': d(IS, IS, 'Seerah: Makkan period'),
  'isl.seerah-madinah': d(IS, IS, 'Seerah: Madinan period, treaties and battles'),
  'isl.personalities': d(IS, IS, 'Prophets, Companions and major personalities'),
  'isl.caliphate': d(IS, IS, 'Governance under the Rightly Guided Caliphs'),
  'isl.law': d(IS, IS, 'Sources of Islamic law, Ijma, Ijtihad, Fiqh'),
  'isl.governance': d(IS, IS, 'Public administration, Shura, accountability (Hisbah)'),
  'isl.social': d(IS, IS, 'Human rights, family, social justice and ethics'),
  'isl.economy': d(IS, IS, 'Islamic economic system'),
  'isl.civilization': d(IS, IS, 'Islamic civilization, institutions and scholars'),
  'isl.modern': d(IS, IS, 'Islam and the modern world'),

  // Urdu (FPSC MPT syllabus: صرف و نحو کا استعمال، ترجمہ)
  'urdu.grammar': d(UR, UR, 'قواعد: اقسامِ کلمہ، اسم، فعل، حروف، زمانے، مرکبات', 'grammar'),
  'urdu.plural': d(UR, UR, 'واحد جمع', 'grammar'),
  'urdu.gender': d(UR, UR, 'مذکر مونث', 'grammar'),
  'urdu.synonym': d(UR, UR, 'مترادف', 'vocabulary'),
  'urdu.antonym': d(UR, UR, 'متضاد', 'vocabulary'),
  'urdu.sentence': d(UR, UR, 'درست جملہ / جملے کی ساخت', 'grammar'),
  'urdu.usage': d(UR, UR, 'درست استعمال، املا، الفاظ کے جوڑے', 'vocabulary'),
  'urdu.idiom': d(UR, UR, 'محاورہ و روزمرہ (زبان کے استعمال کی حد تک)', 'vocabulary'),
  'urdu.translation': d(UR, UR, 'ترجمہ: جملہ', 'translation'),
  'urdu.office-terms': d(UR, UR, 'ترجمہ: دفتری اصطلاحات', 'translation'),

  // English (FPSC MPT syllabus: vocabulary, grammar usage, comprehension)
  'eng.comprehension': d(EN, EN, 'Unseen passage comprehension', 'comprehension'),
  'eng.synonym': d(EN, EN, 'Synonyms', 'vocabulary'),
  'eng.antonym': d(EN, EN, 'Antonyms', 'vocabulary'),
  'eng.vocab-context': d(EN, EN, 'Vocabulary in context (sentence completion)', 'vocabulary'),
  'eng.idiom': d(EN, EN, 'Idioms and expressions', 'vocabulary'),
  'eng.phrasal-verb': d(EN, EN, 'Phrasal verbs', 'vocabulary'),
  'eng.confused-words': d(EN, EN, 'Commonly confused words', 'vocabulary'),
  'eng.preposition': d(EN, EN, 'Prepositions', 'grammar'),
  'eng.article': d(EN, EN, 'Articles and determiners', 'grammar'),
  'eng.tense': d(EN, EN, 'Tenses', 'grammar'),
  'eng.conjunction': d(EN, EN, 'Conjunctions and connectors', 'grammar'),
  'eng.sva': d(EN, EN, 'Subject–verb agreement', 'grammar'),
  'eng.pronoun': d(EN, EN, 'Pronouns', 'grammar'),
  'eng.modifier': d(EN, EN, 'Modifiers (misplaced/dangling)', 'grammar'),
  'eng.parts-of-speech': d(EN, EN, 'Parts of speech', 'grammar'),
  'eng.punctuation': d(EN, EN, 'Punctuation', 'grammar'),
  'eng.sentence-correction': d(EN, EN, 'Choose the correct sentence', 'grammar'),
  'eng.error-identification': d(EN, EN, 'Identify the erroneous sentence', 'grammar'),
  'eng.sentence-structure': d(EN, EN, 'Sentence structure, clauses, voice and narration', 'grammar'),

  // General Abilities (FPSC MPT syllabus: SSC-level arithmetic, algebra, geometry; reasoning; mental abilities)
  'ga.percentage': d(GA, 'Quantitative Ability', 'Percentages', 'quant'),
  'ga.ratio': d(GA, 'Quantitative Ability', 'Ratio and proportion', 'quant'),
  'ga.average': d(GA, 'Quantitative Ability', 'Averages', 'quant'),
  'ga.profit-loss': d(GA, 'Quantitative Ability', 'Profit, loss and discount', 'quant'),
  'ga.speed-time': d(GA, 'Quantitative Ability', 'Rates, speed, time and distance', 'quant'),
  'ga.work-time': d(GA, 'Quantitative Ability', 'Work and time', 'quant'),
  'ga.fractions': d(GA, 'Quantitative Ability', 'Fractions, decimals, indices and number operations', 'quant'),
  'ga.algebra': d(GA, 'Quantitative Ability', 'Algebraic expressions and identities', 'quant'),
  'ga.equations': d(GA, 'Quantitative Ability', 'Equations and word problems', 'quant'),
  'ga.sets': d(GA, 'Quantitative Ability', 'Sets and Venn problems', 'quant'),
  'ga.number-properties': d(GA, 'Quantitative Ability', 'Number properties, remainders, HCF/LCM, rounding', 'quant'),
  'ga.geometry': d(GA, 'Quantitative Ability', 'Angles, triangles and polygons', 'quant'),
  'ga.mensuration': d(GA, 'Quantitative Ability', 'Perimeter, area and volume', 'quant'),
  'ga.data': d(GA, 'Quantitative Ability', 'Data interpretation and basic statistics', 'quant'),
  'ga.probability': d(GA, 'Quantitative Ability', 'Basic probability', 'quant'),
  'ga.series': d(GA, 'Reasoning', 'Number and letter series', 'reasoning'),
  'ga.directions': d(GA, 'Reasoning', 'Direction sense', 'reasoning'),
  'ga.blood-relations': d(GA, 'Reasoning', 'Family and blood relations', 'reasoning'),
  'ga.ordering': d(GA, 'Reasoning', 'Ordering and ranking', 'reasoning'),
  'ga.seating': d(GA, 'Reasoning', 'Seating and arrangement', 'reasoning'),
  'ga.deduction': d(GA, 'Reasoning', 'Logical deduction and syllogisms', 'reasoning'),
  'ga.analytical': d(GA, 'Reasoning', 'Analytical puzzles with conditions', 'reasoning'),
  'ga.coding': d(GA, 'Reasoning', 'Coding and decoding', 'reasoning'),
  'ga.verbal-reasoning': d(GA, 'Reasoning', 'Verbal reasoning: classification, analogy, statements', 'reasoning'),
  'ga.clock-calendar': d(GA, 'Reasoning', 'Clocks and calendars', 'reasoning'),
  'ga.mental-ability': d(GA, 'Reasoning', 'Mental, mechanical and numerical ability', 'reasoning'),

  // General Knowledge: Everyday Science
  'sci.human-body': d(GK, 'Everyday Science', 'Human body and physiology', 'science'),
  'sci.health': d(GK, 'Everyday Science', 'Health and common diseases', 'science'),
  'sci.nutrition': d(GK, 'Everyday Science', 'Nutrition, vitamins and food science', 'science'),
  'sci.biology': d(GK, 'Everyday Science', 'Cells, genetics and basic biology', 'science'),
  'sci.plants-ecology': d(GK, 'Everyday Science', 'Plants and ecology', 'science'),
  'sci.environment': d(GK, 'Everyday Science', 'Environment, pollution and water', 'science'),
  'sci.climate': d(GK, 'Everyday Science', 'Atmosphere, weather and climate', 'science'),
  'sci.energy': d(GK, 'Everyday Science', 'Energy resources', 'science'),
  'sci.chemistry': d(GK, 'Everyday Science', 'Basic chemistry and materials', 'science'),
  'sci.physics': d(GK, 'Everyday Science', 'Electricity, sound, light, heat and force', 'science'),
  'sci.units': d(GK, 'Everyday Science', 'Units, measurement and instruments', 'science'),
  'sci.earth-space': d(GK, 'Everyday Science', 'Earth science, solar system and natural phenomena', 'science'),
  'sci.it': d(GK, 'Everyday Science', 'Computers, internet and telecommunications', 'science-it'),
  'sci.ai-digital': d(GK, 'Everyday Science', 'AI, GIS/remote sensing and digital technology', 'science-it'),

  // General Knowledge: Current Affairs
  'ca.recent': d(GK, 'Current Affairs', 'Recent verified developments (time-sensitive)', 'current'),
  'ca.organisations': d(GK, 'Current Affairs', 'International and regional organisations', 'current'),
  'ca.global-issues': d(GK, 'Current Affairs', 'Global issues, agreements and geopolitics', 'current'),
  'ca.pakistan-external': d(GK, 'Current Affairs', 'Pakistan’s external relations', 'current'),

  // General Knowledge: Pakistan Affairs
  'pa.movement': d(GK, 'Pakistan Affairs', 'Muslim rule, reform movements and the Pakistan Movement', 'pakistan'),
  'pa.constitution': d(GK, 'Pakistan Affairs', 'Constitutional development and provisions', 'pakistan'),
  'pa.political-history': d(GK, 'Pakistan Affairs', 'Political history since 1947', 'pakistan'),
  'pa.geography': d(GK, 'Pakistan Affairs', 'Geography, land and people', 'pakistan'),
  'pa.economy': d(GK, 'Pakistan Affairs', 'Economy, agriculture and industry', 'pakistan'),
  'pa.resources': d(GK, 'Pakistan Affairs', 'Water, energy and natural resources', 'pakistan'),
  'pa.institutions': d(GK, 'Pakistan Affairs', 'State institutions and governance', 'pakistan'),
  'pa.foreign-policy': d(GK, 'Pakistan Affairs', 'Foreign policy and regional organisations', 'pakistan'),
  'pa.security': d(GK, 'Pakistan Affairs', 'Security, nuclear programme and defence', 'pakistan'),
  'pa.society': d(GK, 'Pakistan Affairs', 'Society, culture, education and demography', 'pakistan'),
}

export const MPT_SECTION_ORDER: MptSection[] = ['Islamic Studies', 'Urdu', 'English', 'General Abilities', 'General Knowledge']

export const MPT_SECTION_SIZE: Record<MptSection, number> = {
  'Islamic Studies': 20, Urdu: 20, English: 50, 'General Abilities': 60, 'General Knowledge': 50,
}

export const MPT_SOURCE_TYPES = ['past-paper-reviewed', 'bank-reviewed', 'authored', 'generated-verified', 'current-verified'] as const
export type MptSourceType = typeof MPT_SOURCE_TYPES[number]

/** 1 = accessible, 2 = moderate, 3 = challenging — relative to a prepared CSS candidate. */
export type MptDifficulty = 1 | 2 | 3

export interface MptBankQuestion {
  id: string
  section: MptSection
  subject: MptSubject
  subtopic: string
  pattern_family: string
  /** Canonical key of the fact or skill tested; two items with one concept never share a series. */
  concept: string
  difficulty: MptDifficulty
  source_type: MptSourceType
  past_paper_year: number | null
  verified: true
  q: string
  o: [string, string, string, string]
  a: 0 | 1 | 2 | 3
  explanation: string
  source_url: string | null
  time_sensitive: boolean
  event_date: string | null
  last_verified: string
  quality_grade: 'A' | 'B'
  mpt_relevance: 'core' | 'supporting'
  passage_id?: string
}

export interface MptPassage {
  id: string
  title: string
  text: string
  genre: string
  words: number
}
