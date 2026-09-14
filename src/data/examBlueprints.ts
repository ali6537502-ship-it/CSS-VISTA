import type { ForgeTopic } from '@/lib/forge'

/**
 * The official paper patterns, in one place.
 *
 * Every count below traces to a published scheme rather than to what the
 * question bank happens to hold:
 *
 * - CSS MPT (FPSC): 200 MCQs / 200 marks / 200 minutes, no negative marking,
 *   33% qualifying. English 50, General Abilities 60, General Knowledge 50,
 *   Islamic Studies 20 (Civics for non-Muslims), Urdu 20. FPSC lists the
 *   General Knowledge portion as everyday science, current affairs, Pakistan
 *   affairs and geography, and the General Abilities portion as quantitative
 *   ability/reasoning, analytical reasoning and mental abilities.
 * - PMS General Knowledge (PPSC, objective paper): 100 MCQs / 100 marks /
 *   90 minutes with 0.25 negative marking. PPSC publishes the paper as eight
 *   named parts - Current Affairs, Physical Sciences, Biological Sciences,
 *   Environment, Food Sciences, Computer Science & IT, Basic Mathematics and a
 *   General part (scientists, inventions, scientific laws, units) - without
 *   per-part marks, so the weighting below spreads 100 questions over those
 *   eight parts in past-paper proportions. Note that Pakistan Affairs is NOT
 *   part of this paper: PMS examines it separately as Pakistan Studies.
 * - One-paper competitive (PPSC/FPSC single-paper posts): 100 MCQs /
 *   90 minutes with 0.25 negative marking, spread over the ten standard
 *   subjects with English, Current Affairs and Pakistan Studies weighted
 *   highest.
 *
 * Section counts are the contract: the builder fails loudly rather than ship a
 * paper that does not match them.
 */

export type CompetitiveMockKind = 'mpt' | 'pms-gk' | 'one-paper'

/** A slice of the shipped MCQ bank, narrowed by its subcategory tag. */
export interface BankSource {
  /** Category slug under public/mcq. */
  slug: string
  /** Keep only questions whose subcategory matches. */
  include?: RegExp
  /** Drop questions whose subcategory matches, applied after `include`. */
  exclude?: RegExp
}

export type CuratedPool = 'english-usage' | 'english-comprehension' | 'urdu-translation' | 'ability' | 'current-affairs'

export interface TopicSpec {
  /** Stable key; also the seed salt, so one topic's draw cannot shift another's. */
  id: string
  /** Shown in the answer review. */
  label: string
  count: number
  /** Generate part of this topic rather than drawing it all from the bank. */
  forge?: ForgeTopic
  /**
   * How much of `count` is generated. Defaults to 1 when a topic has no bank
   * sources. Recall-heavy topics keep this low or unset: a generator can create
   * a fresh percentage question safely, but not a fresh fact.
   */
  forgeShare?: number
  sources?: BankSource[]
  curated?: CuratedPool[]
}

export interface SectionSpec {
  label: string
  /** Official marks for the section; equals the number of MCQs in it. */
  count: number
  topics: TopicSpec[]
}

export interface ExamBlueprint {
  kind: CompetitiveMockKind
  title: string
  authority: string
  totalQuestions: number
  timeSec: number
  /** Marks deducted for each wrong answer; 0 where the commission does not deduct. */
  negativeMarkPerWrong: number
  /** Qualifying percentage, where the commission publishes one. */
  passPercentage?: number
  patternNote: string
  sections: SectionSpec[]
}

// ---------------------------------------------------------------------------
// Shared bank slices
// ---------------------------------------------------------------------------

const PHYSICAL_SCIENCE = /Physics|Chemistry|Chemical|Atomic|Electricity|Magnetism|Optics|Thermodynamics|Thermochemistry|Mechanics|Kinematics|Forces|Fluids|Waves|Sound|Heat|Nuclear|Stoichiometry|Electrochemistry|Acids|Gases|Metals|Materials|Solar System|The Sun|Stars|Stellar|Galaxies|Cosmology|Exoplanets|Spaceflight|Observational Astronomy|Earth Structure|Rocks|Plate Tectonics|Atmosphere|Climate|Hydrology|Oceanography|Earth–Moon–Sun|Units & Measurements|Physical Science Fundamentals|Astronomy/i
const BIOLOGICAL_SCIENCE = /Biology|Biochemistry|Microbiology|Genetics|Physiology|Human Body|Human Anatomy|Cell|Molecular|Plant|Zoology|Botany|Evolution|Reproduction|Diseases|Medicine|Immunity|Ecology/i
const FOOD_SCIENCE = /Food Science|Nutrition|Vitamin|Agriculture, Biotechnology/i
const ENVIRONMENT_SCIENCE = /Environment|Ecolog|Pollution|Climate|Conservation|Sustainab|Biogeochem|Waste|Species|Land degradation|Forest|Natural Hazards|Energy Resources|Resources and Sustainability/i
const COMPUTER_SCIENCE = /Computer|Software|Hardware|Networking|Internet|Memory|Storage|Operating System|Programming|Cybersecurity|Security|Database|Web|Microsoft|MS |Data Representation|Input & Output|Keyboard|File Format|Telecommunications|Information Technology|Artificial Intelligence/i
const INVENTIONS_AND_UNITS = /Discover|Invent|Scientist|Physics|Chemistry|Medicine|Engineering|Computing|Communication|Astronomy|Biology|Units & Measurements|Measurement/i

const GEOGRAPHY_SOURCES: BankSource[] = [
  { slug: 'capitals' }, { slug: 'countries-continents' }, { slug: 'rivers' }, { slug: 'mountains' },
  { slug: 'oceans-seas' }, { slug: 'deserts' }, { slug: 'straits-canals' }, { slug: 'international-borders' },
  { slug: 'famous-places' }, { slug: 'largest-longest' }, { slug: 'currencies' },
]

const ENGLISH_VOCAB_SOURCES: BankSource[] = [
  { slug: 'english-grammar', include: /Vocabulary|Synonym|Antonym/i },
]
const ENGLISH_GRAMMAR_SOURCES: BankSource[] = [
  { slug: 'english-grammar', exclude: /Vocabulary|Synonym|Antonym|Analog|Idiom|One-Word/i },
]
const ENGLISH_FIGURATIVE_SOURCES: BankSource[] = [
  { slug: 'english-grammar', include: /Analog|Idiom|One-Word|Phrase/i },
]

const CURRENT_AFFAIRS_SOURCES: BankSource[] = [
  { slug: 'current-affairs' }, { slug: 'politics-government' },
]

// ---------------------------------------------------------------------------
// CSS MPT - FPSC, 200 MCQs / 200 marks / 200 minutes
// ---------------------------------------------------------------------------

const mptBlueprint: ExamBlueprint = {
  kind: 'mpt',
  title: 'Full CSS MPT Practice Mock',
  authority: 'FPSC',
  totalQuestions: 200,
  timeSec: 200 * 60,
  negativeMarkPerWrong: 0,
  passPercentage: 33,
  patternNote: '200 MCQs · 200 marks · 200 minutes · no negative marking · 33% qualifying. Section marks follow the FPSC MPT scheme: English 50, General Abilities 60, General Knowledge 50, Islamic Studies 20 and Urdu 20.',
  sections: [
    {
      label: 'English',
      count: 50,
      topics: [
        { id: 'eng-vocab', label: 'Vocabulary: synonyms & antonyms', count: 14, sources: ENGLISH_VOCAB_SOURCES },
        {
          id: 'eng-grammar',
          label: 'Grammar, usage & sentence correction',
          count: 16,
          forge: 'english-usage',
          forgeShare: 0.5,
          sources: ENGLISH_GRAMMAR_SOURCES,
        },
        { id: 'eng-idioms', label: 'Idioms, analogies & one-word substitution', count: 10, sources: ENGLISH_FIGURATIVE_SOURCES },
        {
          id: 'eng-comprehension',
          label: 'Comprehension & applied usage',
          count: 10,
          sources: [{ slug: 'english-grammar', include: /General English/i }],
          curated: ['english-comprehension', 'english-usage'],
        },
      ],
    },
    {
      label: 'General Abilities',
      count: 60,
      topics: [
        {
          id: 'ga-quant',
          label: 'Quantitative ability',
          count: 24,
          forge: 'quantitative',
          forgeShare: 0.7,
          sources: [{ slug: 'general-ability', include: /Percent|Ratio|Average|Profit|Discount|interest|work|speed|Train|Fraction|Order of operations|HCF|Remainder|Arithmetic/i }],
          curated: ['ability'],
        },
        { id: 'ga-algebra', label: 'Basic algebra & geometry', count: 8, forge: 'algebra-geometry' },
        {
          id: 'ga-analytical',
          label: 'Analytical reasoning',
          count: 14,
          forge: 'analytical-reasoning',
          forgeShare: 0.6,
          sources: [{ slug: 'general-ability', include: /Series|Coding|Classification|analog/i }],
        },
        {
          id: 'ga-mental',
          label: 'Mental ability & logical deduction',
          count: 14,
          forge: 'mental-ability',
          forgeShare: 0.6,
          sources: [{ slug: 'general-ability', include: /Syllogism|Direction|Family|deduction/i }],
        },
      ],
    },
    {
      label: 'General Knowledge',
      count: 50,
      topics: [
        {
          id: 'gk-science',
          label: 'Everyday science',
          count: 15,
          sources: [{ slug: 'everyday-science' }, { slug: 'science' }],
        },
        {
          id: 'gk-current',
          label: 'Current affairs',
          count: 15,
          sources: CURRENT_AFFAIRS_SOURCES,
          curated: ['current-affairs'],
        },
        { id: 'gk-pakistan', label: 'Pakistan affairs', count: 15, sources: [{ slug: 'pakistan-affairs' }, { slug: 'pakistan-history' }, { slug: 'pakistan-geography' }] },
        {
          id: 'gk-geography',
          label: 'Geography & world awareness',
          count: 5,
          sources: [...GEOGRAPHY_SOURCES, { slug: 'international-organisations' }, { slug: 'united-nations' }],
        },
      ],
    },
    {
      label: 'Islamic Studies',
      count: 20,
      topics: [
        { id: 'isl-quran', label: 'Quran & Hadith', count: 6, sources: [{ slug: 'islamic-gk', include: /uran|Hadith|Revelation|Surah/i }] },
        { id: 'isl-seerah', label: 'Seerah & the Prophets', count: 6, sources: [{ slug: 'islamic-gk', include: /Seerah|Prophet/i }] },
        { id: 'isl-ibadat', label: 'Beliefs, worship & Fiqh', count: 4, sources: [{ slug: 'islamic-gk', include: /belief|worship|Fiqh|Prayer|Purification|Hajj|Zakat|Fasting|Ramadan|Theology|Islamic Law/i }] },
        { id: 'isl-history', label: 'Islamic history & civilisation', count: 4, sources: [{ slug: 'islamic-gk', include: /Khulafa|Caliph|Battle|Civilisation|Civilization|history|Sahaba|Dynast/i }] },
      ],
    },
    {
      label: 'Urdu',
      count: 20,
      topics: [
        { id: 'urdu-grammar', label: 'قواعد و زبان', count: 8, sources: [{ slug: 'urdu-language', include: /قواعد/ }] },
        { id: 'urdu-vocab', label: 'الفاظ و معانی', count: 5, sources: [{ slug: 'urdu-language', include: /الفاظ/ }], curated: ['urdu-translation'] },
        { id: 'urdu-idioms', label: 'محاورات و امثال', count: 4, sources: [{ slug: 'urdu-language', include: /محاورات/ }] },
        { id: 'urdu-adab', label: 'ادب، اصناف و تاریخِ زبان', count: 3, sources: [{ slug: 'urdu-language', include: /ادبا|اصناف|تاریخ/ }] },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// PMS General Knowledge (objective) - PPSC, 100 MCQs / 100 marks / 90 minutes
// ---------------------------------------------------------------------------

const pmsGkBlueprint: ExamBlueprint = {
  kind: 'pms-gk',
  title: 'PMS General Knowledge Grand Mock',
  authority: 'PPSC',
  totalQuestions: 100,
  timeSec: 90 * 60,
  negativeMarkPerWrong: 0.25,
  patternNote: '100 MCQs · 100 marks · 90 minutes · 0.25 marks deducted for each wrong answer. The eight parts are the ones PPSC names in the General Knowledge (Objective) syllabus; Pakistan Affairs is deliberately absent because PMS examines it in a separate Pakistan Studies paper.',
  sections: [
    {
      label: 'Current Affairs',
      count: 20,
      topics: [
        { id: 'pms-current', label: 'National & international current affairs', count: 14, sources: CURRENT_AFFAIRS_SOURCES, curated: ['current-affairs'] },
        { id: 'pms-current-org', label: 'International organisations & agreements', count: 6, sources: [{ slug: 'international-organisations' }, { slug: 'united-nations' }, { slug: 'economics' }] },
      ],
    },
    {
      label: 'Physical Sciences',
      count: 16,
      topics: [
        { id: 'pms-physics', label: 'Physics, chemistry & materials', count: 9, sources: [{ slug: 'science', include: PHYSICAL_SCIENCE, exclude: BIOLOGICAL_SCIENCE }, { slug: 'everyday-science', include: /Physical Science|Chemistry, Atomic/i }] },
        { id: 'pms-astronomy', label: 'Universe, solar system & earth sciences', count: 7, sources: [{ slug: 'solar-system' }, { slug: 'science', include: /Solar System|The Sun|Stars|Stellar|Galaxies|Cosmology|Exoplanets|Spaceflight|Observational Astronomy|Earth Structure|Rocks|Plate Tectonics|Earth–Moon–Sun/i }, { slug: 'everyday-science', include: /Astronomy|Earth, Weather/i }] },
      ],
    },
    {
      label: 'Biological Sciences',
      count: 14,
      topics: [
        { id: 'pms-bio-cell', label: 'Cell, genetics & biomolecules', count: 7, sources: [{ slug: 'science', include: /Cell|Molecular|Genetics|Biochemistry|Microbiology|Evolution|Plant|Botany|Zoology/i }, { slug: 'everyday-science', include: /Cell Biology, Genetics/i }] },
        { id: 'pms-bio-human', label: 'Human body, health & disease', count: 7, sources: [{ slug: 'science', include: /Human Body|Human Anatomy|Physiology|Diseases|Medicine|Immunity|Reproduction/i }, { slug: 'everyday-science', include: /Human Anatomy|Health, Diseases|Everyday Applications and Medical/i }] },
      ],
    },
    {
      label: 'Environmental Science',
      count: 8,
      topics: [
        { id: 'pms-environment', label: 'Ecosystems, pollution & climate', count: 8, sources: [{ slug: 'environment' }, { slug: 'everyday-science', include: /Environment, Ecology|Natural Hazards|Energy Resources/i }, { slug: 'science', include: ENVIRONMENT_SCIENCE }] },
      ],
    },
    {
      label: 'Food Sciences',
      count: 6,
      topics: [
        { id: 'pms-food', label: 'Diet, nutrition, food quality & security', count: 6, sources: [{ slug: 'everyday-science', include: FOOD_SCIENCE }, { slug: 'science', include: /Nutrition|Vitamin/i }] },
      ],
    },
    {
      label: 'Computer Science & Information Technology',
      count: 12,
      topics: [
        { id: 'pms-computer', label: 'Hardware, software & data processing', count: 8, sources: [{ slug: 'computer-basics' }] },
        { id: 'pms-network', label: 'Networking, internet & telecommunications', count: 4, sources: [{ slug: 'computer-basics', include: /Network|Internet|Web|Cyber|Security|Mobile|Telecommunication/i }, { slug: 'everyday-science', include: /Computers, Information Technology|Telecommunications, GPS/i }] },
      ],
    },
    {
      label: 'Basic Mathematics',
      count: 16,
      topics: [
        { id: 'pms-maths', label: 'Arithmetic, algebra & quantitative reasoning', count: 10, forge: 'basic-mathematics' },
        {
          id: 'pms-logic',
          label: 'Logical & analytical reasoning',
          count: 6,
          forge: 'analytical-reasoning',
          forgeShare: 0.6,
          sources: [{ slug: 'general-ability', include: /Series|Coding|Classification|analog|Syllogism|deduction/i }],
        },
      ],
    },
    {
      label: 'General',
      count: 8,
      topics: [
        { id: 'pms-general', label: 'Scientists, inventions, scientific laws & units', count: 8, sources: [{ slug: 'discoveries-inventions' }, { slug: 'important-personalities' }, { slug: 'awards-honours' }, { slug: 'science', include: /Units & Measurements/i }, { slug: 'everyday-science', include: /Measurement, Scientific Instruments|Forensic Science/i }] },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// One-paper competitive - 100 MCQs / 90 minutes across the ten standard subjects
// ---------------------------------------------------------------------------

const onePaperBlueprint: ExamBlueprint = {
  kind: 'one-paper',
  title: 'One-Paper Competitive Mock',
  authority: 'PPSC / FPSC one-paper posts',
  totalQuestions: 100,
  timeSec: 90 * 60,
  negativeMarkPerWrong: 0.25,
  patternNote: '100 MCQs · 100 marks · 90 minutes · 0.25 marks deducted for each wrong answer, spread over the ten subjects a one-paper commission test draws from, with English, Current Affairs and Pakistan Studies weighted highest.',
  sections: [
    {
      label: 'English',
      count: 15,
      topics: [
        { id: 'op-eng-vocab', label: 'Vocabulary & one-word substitution', count: 7, sources: [...ENGLISH_VOCAB_SOURCES, ...ENGLISH_FIGURATIVE_SOURCES] },
        { id: 'op-eng-grammar', label: 'Grammar & usage', count: 8, forge: 'english-usage', forgeShare: 0.5, sources: ENGLISH_GRAMMAR_SOURCES },
      ],
    },
    {
      label: 'Current Affairs',
      count: 15,
      topics: [
        { id: 'op-current', label: 'National & international affairs', count: 11, sources: CURRENT_AFFAIRS_SOURCES, curated: ['current-affairs'] },
        { id: 'op-current-org', label: 'International organisations', count: 4, sources: [{ slug: 'international-organisations' }, { slug: 'united-nations' }] },
      ],
    },
    {
      label: 'Pakistan Studies',
      count: 15,
      topics: [
        { id: 'op-pak-movement', label: 'Pakistan Movement & constitutional history', count: 8, sources: [{ slug: 'pakistan-affairs', include: /Movement|Constitution|British Rule|Reform|Ideolog|State Formation|Political/i }, { slug: 'pakistan-history' }] },
        { id: 'op-pak-today', label: 'Geography, economy & institutions', count: 7, sources: [{ slug: 'pakistan-affairs', include: /Geography|Econom|Population|Society|Foreign Policy|Kashmir|General Knowledge/i }, { slug: 'pakistan-geography' }, { slug: 'national-symbols' }] },
      ],
    },
    {
      label: 'Islamic Studies',
      count: 10,
      topics: [
        { id: 'op-islam', label: 'Quran, Seerah, worship & Islamic history', count: 10, sources: [{ slug: 'islamic-gk' }] },
      ],
    },
    {
      label: 'Everyday Science',
      count: 10,
      topics: [
        { id: 'op-science', label: 'Everyday science & environment', count: 10, sources: [{ slug: 'everyday-science' }, { slug: 'science' }, { slug: 'environment' }] },
      ],
    },
    {
      label: 'Computer Science',
      count: 10,
      topics: [
        { id: 'op-computer', label: 'Computer fundamentals, MS Office & networking', count: 10, sources: [{ slug: 'computer-basics', include: COMPUTER_SCIENCE }] },
      ],
    },
    {
      label: 'Mathematics & Reasoning',
      count: 10,
      topics: [
        { id: 'op-maths', label: 'Basic mathematics', count: 6, forge: 'basic-mathematics' },
        { id: 'op-reasoning', label: 'Logical reasoning', count: 4, forge: 'analytical-reasoning', forgeShare: 0.5, sources: [{ slug: 'general-ability', include: /Series|Coding|Classification|analog|Syllogism|deduction|Direction|Family/i }] },
      ],
    },
    {
      label: 'General Knowledge',
      count: 5,
      topics: [
        { id: 'op-gk', label: 'World facts, inventions, awards & sports', count: 5, sources: [{ slug: 'misc-gk' }, { slug: 'discoveries-inventions', include: INVENTIONS_AND_UNITS }, { slug: 'awards-honours' }, { slug: 'sports' }, { slug: 'books-authors' }, { slug: 'world-history' }] },
      ],
    },
    {
      label: 'Geography',
      count: 5,
      topics: [
        { id: 'op-geography', label: 'World & physical geography', count: 5, sources: GEOGRAPHY_SOURCES },
      ],
    },
    {
      label: 'Urdu',
      count: 5,
      topics: [
        { id: 'op-urdu', label: 'اردو قواعد، الفاظ و محاورات', count: 5, sources: [{ slug: 'urdu-language' }], curated: ['urdu-translation'] },
      ],
    },
  ],
}

export const EXAM_BLUEPRINTS: Record<CompetitiveMockKind, ExamBlueprint> = {
  mpt: mptBlueprint,
  'pms-gk': pmsGkBlueprint,
  'one-paper': onePaperBlueprint,
}

/** Section label + marks, for the pattern shown before a candidate enters. */
export interface MockSection {
  label: string
  count: number
}

export const MOCK_BLUEPRINTS: Record<CompetitiveMockKind, MockSection[]> = {
  mpt: mptBlueprint.sections.map(({ label, count }) => ({ label, count })),
  'pms-gk': pmsGkBlueprint.sections.map(({ label, count }) => ({ label, count })),
  'one-paper': onePaperBlueprint.sections.map(({ label, count }) => ({ label, count })),
}

/** Guards the blueprints themselves: a section must equal its topics, and the sections must equal the paper. */
export function validateBlueprint(blueprint: ExamBlueprint): void {
  const total = blueprint.sections.reduce((sum, section) => {
    const topicTotal = section.topics.reduce((inner, topic) => inner + topic.count, 0)
    if (topicTotal !== section.count) {
      throw new Error(`${blueprint.kind}: section “${section.label}” is ${section.count} marks but its topics add up to ${topicTotal}.`)
    }
    return sum + section.count
  }, 0)
  if (total !== blueprint.totalQuestions) {
    throw new Error(`${blueprint.kind}: sections add up to ${total} but the paper is ${blueprint.totalQuestions} questions.`)
  }
}
