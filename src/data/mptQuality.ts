import type { BankQuestion } from './mcq'

// The public subject banks also power broad GK practice. This gate is specific
// to the MPT paper: it excludes source-identification drills, literary trivia,
// news-publication dates and mechanically worded prompts that do not resemble
// an exam question. It does not claim to fact-check an unsupported answer.
const metaQuestion = /(?:which|what) (?:source|basis|historical basis|source or historical basis)|historical identification|correct chronological placement|correctly placed\?|which (?:option|answer|statement|pair|description) (?:best |correctly |accurately )?(?:identifies|describes|matches|characterizes)|identify the (?:correctly matched|principal location|person or group)|most directly associated with|which term means|which option best defines|select the correct (?:association|period)|in the .* section|news agency|Reuters|publication date|report .* published|published .* report|on which date did Reuters|what date did Reuters/i
const trivialQuestion = /^(?:What is \d+% of \d+|The (?:powerhouse of the cell|SI unit of force|chemical formula of common table salt)|Which surah is number \d+|How many Surahs are there)/i
const brokenOption = /\b(?:and|or|the|of|from|at|for|in|to|with)\s*$/i

export function eligibleMptIslamic(question: BankQuestion) {
  if (metaQuestion.test(question.q) || trivialQuestion.test(question.q)) return false
  if (/How many verses are listed for Surah|standard Kufan numbering|source citation|source or historical basis|hadith\s*(?:number|no\.?|count)|how many ahadith|book\s*number.*(?:bukhari|muslim)/i.test(question.q)) return false
  // Neither literary history nor obscure source citations are part of the
  // Islamic Studies/Civics & Ethics section of the MPT rules.
  if (/^(?:Civilisation - (?:Architecture|Cities|Scholars)|Quran - Surah identification)/i.test(question.s ?? '')) return false
  return true
}

export function eligibleMptUrdu(question: BankQuestion) {
  return /^(?:قواعد و زبان|الفاظ و معانی|محاورات و امثال|ترجمہ)$/.test(question.s ?? '')
    && !/تذکرہ|ادیب|شاعر|ناول|غزل|مرثیہ|مصنف|تصنیف/.test(question.q)
}

// A small set of actual MPT-style Urdu practice questions is available in a
// legacy shard. Keep only grammar, vocabulary and translation, and reject its
// "none of these" distractors, which conflict with the mock's four choices.
export function eligibleMptUrduPastPaper(question: BankQuestion) {
  return !/رسم الخط|صنعت |شاعر|ادب|غزل|مصرع/.test(question.q)
    && !question.o.some((option) => /ان میں سے کوئی نہیں|none of these/i.test(option))
}

export function eligibleMptEnglish(question: BankQuestion) {
  if (/^Analogies$/.test(question.s ?? '')) return false
  if (/^(?:Choose analogous pair|.+:.+::.+:\s*_+)/i.test(question.q)) return false
  if (/traitors should be shot dead|the .* should be hanged/i.test(question.q)) return false
  return !metaQuestion.test(question.q)
}

export function eligibleMptAbility(question: BankQuestion) {
  if (metaQuestion.test(question.q) || trivialQuestion.test(question.q)) return false
  return !/^(?:What is the value of \(\d+ [+-] \d+\)|Which item is the odd one out among)/i.test(question.q)
}

export function eligibleMptScience(question: BankQuestion) {
  if (metaQuestion.test(question.q) || trivialQuestion.test(question.q)) return false
  if (/^(?:Which term|What is|Which option) (?:best |most )?(?:defines?|means)\b/i.test(question.q)) return false
  // The rules specify everyday science. University physics and population
  // genetics calculations are not a harder version of that syllabus.
  if (/\b(?:first-order reactant|Arrhenius equation|S–P arrival lag|Schrödinger|Lorentz factor|radiative flux|blackbody|Hardy–Weinberg|induced emf|\bRLC\b|escape speed|molar base neutralis|Stefan.Boltzmann|Kepler’s third law|environmental lapse rate|exponential pressure|p=p0e|semimajor axis)\b/i.test(question.q)) return false
  if (/^(?:Exoplanets|Cosmology|Spaceflight and Missions|Stellar Evolution|Modern and Nuclear Physics|Chemical Kinetics|Thermochemistry|Electrochemistry|Stoichiometry|Observational Astronomy)/i.test(question.s ?? '')) return false
  return /^(?:Everyday Science|Human Body|Human Physiology|Genetics|Ecology|Solar System|The Sun|Earth Structure|Atmosphere|Climate|Hydrology|Pollution|Resources|Electricity|Work, Energy|Waves and Sound|Plant Biology|Microbiology|Cell Biology|Nutrition|Vitamins|Diseases|Biology|Chemistry|Physics|Units|Acids|Mechanics|Heat|Magnetism|Water|Solar|Earth–Moon|Energy|Elements & Chemical Properties|Optics)/i.test(question.s ?? '')
}

const primaryCurrentAffairsHosts = [
  'weforum.org', 'imf.org', 'unfccc.int', 'who.int', 'fifa.com',
  'olympics.com', 'un.org',
]

function hasPrimaryCurrentAffairsSource(sourceUrl: string | undefined) {
  if (!sourceUrl) return false
  try {
    const host = new URL(sourceUrl).hostname.toLocaleLowerCase('en').replace(/^www\./, '')
    return primaryCurrentAffairsHosts.some((domain) => host === domain || host.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

export function eligibleMptCurrent(question: BankQuestion) {
  if (metaQuestion.test(question.q)) return false
  if (/\b(?:scheduled|expected|hoped to|would|planned)\b/i.test(question.q)) return false
  return hasPrimaryCurrentAffairsSource(question.sourceUrl)
}

export function eligibleMptPakistan(question: BankQuestion) {
  if (metaQuestion.test(question.q) || trivialQuestion.test(question.q)) return false
  if (/correct account of|accepted date of|leading role in|central purpose or significance|which person or institution|which city or region is linked|actor-description combination/i.test(question.q)) return false
  if (question.o.some((answer) => brokenOption.test(answer.trim()))) return false
  return true
}
