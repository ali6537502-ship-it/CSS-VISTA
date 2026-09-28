// Keep-or-replace review of the questions already frozen in the live MPT series.
//
// A live question is kept unless it has a concrete defect a careful editor would reject.
// Every rule names the defect; nothing is replaced for being merely different.
import {
  CATCH_ALL_OPTION, ISLAMIC_TRIVIA, TEMPLATE_WORDING, URDU_LITERATURE, SCIENCE_TOO_ADVANCED, NEWS_TRIVIA,
  canonical, surfaceTemplate,
} from './bank-lib.mjs'

// Machine-template wording from the old generated shards.
const TEMPLATE_EXTRA = [
  /date[- ](?:and[- ])?place pair/i, /correctly match(?:es|ed)?\b/i, /period[- ]and[- ]place/i, /\bprincipal (?:geographical )?(?:association|significance|location|actor)\b/i,
  /\bbest (?:explains|classified|characteri[sz]es|describes|fits|illustrates|defines)\b/i, /\blabel most appropriately\b/i,
  /\bstatement about .+ is not correct\b/i, /\bassociated with\b/i, /\bleading figure or institution\b/i, /\bwho led, founded or represented\b/i,
  /\bcentred\?/i, /\bwhere did .+ take place\?/i, /\btextual or historical basis\b/i, /\breference is especially associated\b/i,
  /\bwhich (?:date|dates|location|place|year) (?:or period )?(?:correctly|is correctly|corresponds)\b/i, /\bhow is .+ best classified\b/i,
  /\bchoose the (?:correct|statement)\b.*\b(?:association|characteri[sz]es)\b/i, /\bin the historical sequence\b/i,
  /\bcorrect (?:chronological|geographical) (?:and geographical )?(?:profile|setting)\b/i, /\bwhich option\b/i,
  /\bscientific term matches\b/i, /\bwhich (?:person|body) .* chiefly identified\b/i, /\bidentify the (?:correct|incorrect|official)\b/i,
  /\bcentral person or group\b/i, /\blinked with the following\b/i, /\bis titled\b/i, /\bwhich example best\b/i,
  /\bmost directly connected\b/i, /\bwhich revision is grammatical\b/i, /\bin the english reference\b/i, /\bwhich rule is associated\b/i,
  /\bwhich type is associated\b/i, /\bis associated with example\b/i,
  /\bIn [A-Z][\w ,&-]+, which\b/, /\bcorresponds to (?:rule|type|tense|indirect|direct|example|formula)\b/i, /\bassociation is accurate\b/i,
  /\bpair(?:ing)?\b/i, /\bchronological relationship\b/i, /\bmost precisely denotes\b/i, /\bmatches this description\b/i,
  /\bwhich (?:year or period|year|period) marks\b/i, /\bis headed\b/i, /\bPart [IVX]+,? Chapter\b/i, /\bcompiled or authored\b/i,
  /\bselect the (?:person|group|place|date|term)\b/i, /\bwhich statement about\b/i, /\bwhich [a-z]+ or [a-z]+ term\b/i,
  /\bwhich (?:classical|fiscal|economic|legal|juristic|scientific|climate|atmospheric) [a-z ]*term means\b/i, /\bwhich [a-z]+ concept means\b/i,
  /\bwhich (?:atmospheric|pollutant|biological|chemical|physical|geological) [a-z ]*(?:feature|indicator|or [a-z]+)\b/i,
  /\bwhich article\b/i, /\barticle \d+\b/i, /\bwhen .+ had occurred\b/i, /\bcorrectly identifies\b/i, /\bassociation-description\b/i,
  /\bwhich [a-z ]+ is correct for\b/i, /\bwhat was the (?:immediate|principal|main) (?:significance|relationship|consequence)\b/i,
  /\bselect the (?:statement|false|true|correct|most|incorrect|right)\b/i, /\bmost precise answer\b/i, /-science term means\b/i,
  /\b(?:time or )?chronological (?:placement|reference|position)\b/i, /\bbelongs to which period\b/i, /\bwhich period\b.*\?$/i,
  /\bbest captures\b/i, /\bmost appropriate(?:ly)? (?:description|label|answer)\b/i, /جوڑا منتخب کریں/,
  /\bis principally linked with\b/i, /\bis correctly dated\b/i, /\bis best placed under\b/i, /^within [A-Z][\w ]+,/i,
  /\bcorrectly identified\b/i, /\bwhich [a-z-]+(?: [a-z-]+)? term (?:means|denotes|refers)\b/i, /\bwhich [a-z-]+ concept\b/i,
  /\bprincipal(?:ly)?\b/i, /\bcombination is correct\b/i, /\bhistorically accurate\b/i, /\bchiefly includes\b/i, /\bofficial heading\b/i,
  /\bmost beautiful\b/i, /\bsecond (?:most|largest|highest|biggest)\b/i, /\b(?:loacated|occurence|recieve|seperate|goverment|inaugration|pakisatn)\b/i,
  /\bcorresponding to this description\b/i, /\bidentify the\b/i, /\bbest understood as\b/i, /\bhistorically (?:situated|important|placed|significant)\b/i,
  /\bdefining feature of\b/i, /\bwhich quranic (?:figure|category)\b/i, /\bin which region is [A-Z].* situated\?/, /\bon what date\b/i,
  /\bis important primarily because of\b/i, /\bwhich of the following dates corresponds to\b/i, /\bprimarily because of which point\b/i,
  /تعریف .* اور مثال .* کس اصطلاح/, /یہ تعریف کس اصطلاح کی ہے/, /کی درست تعریف منتخب کریں/,
]
// Numbers that only an FPSC paper-setter would never use: long decimals, percentages with decimals.
const UGLY_NUMBER = /\b\d+\.\d{2,}\b|\d+\.\d+%/
// A generated case-study prefix such as "Survey-unit review — …".
const CASE_PREFIX = /^[A-Z][\w-]*(?: [\w-]+){0,3} (?:review|report|worksheet|exercise|case|brief|note|log|file|record|plan|study|audit|memo|sheet|check|task) — /
const SCIENCE_CALC = (text) => SCIENCE_TOO_ADVANCED.test(text)
  || ((text.match(/\d+(?:\.\d+)?/g) || []).length >= 2 && /\b(?:voltage|resistance|current|power|speed|velocity|acceleration|momentum|energy|work|pressure|density|wavelength|mass|weight|temperature|heat) (?:is|will be)\b/i.test(text))
  || ((text.match(/\d+(?:\.\d+)?/g) || []).length >= 2 && /\b(?:is approximately|is about|expected|output is|efficiency|ratio is|ratio of|magnification is|force is|current is|power is|final (?:count|concentration)|clearance is|is =>|resolution|harmonic|frequency is|density is|intake is|removal is|warming is|NPP|GPP)\b/i.test(text))
  || /\b(?:mL|kJ|mg\/L|W\/m2|GtC|μC|Ω|mol|Hz|g C m)\b/.test(text)
const TIME_WORDS = /\b(?:present|current(?:ly)?|incumbent|newly (?:appointed|elected)|recently|at present|serving|this year|next leap year|will be|would be)\b/i
const CA_MINUTIAE = /\b(?:index|score|ranked|ranking|report|survey|as discussed in|according to)\b.*\b20(?:2[0-6])\b|\b20(?:2[0-6])\b.*\b(?:index|score|ranked|ranking)\b/i
const POP_TRIVIA = /\b(?:private (?:airplane|aeroplane|jet)|sleeps the most|celebrity|actor|actress|film star|movie|singer|pop star|trump force)\b/i
const unbalancedQuotes = (text) => (text.match(/“/g) ?? []).length !== (text.match(/”/g) ?? []).length
const GARBLED = /^[a-z]|\s{2,}\S|\?\s*\?|^[^A-Za-z0-9؀-ۿ“"‘'(_«]|_{2,}\?\s*$|\b(?:b\/w|wht|whch)\b/

/** The question frame with quoted words and numbers masked (e.g. «X» کی درست جمع کون سی ہے؟). */
export function questionFrame(stem) {
  return canonical(String(stem).replace(/«[^»]*»|“[^”]*”|"[^"]*"|‘[^’]*’/g, '#')).replace(/\d+(?:\s\d+)*/g, '#')
}
/** At most this many questions of one frame in a paper. */
export const MAX_FRAME_PER_PAPER = 4

export function liveHeading(q) {
  const s = `${q.s ?? ''}`
  if (q.paperSection === 'General Knowledge') {
    if (q.sourceUrl || /^mpt-current/.test(q.id)) return 'Current Affairs'
    if (/^(?:science|everyday)/.test(q.id)) return 'Everyday Science'
    if (/international|organi[sz]ation|world|united nations|global/i.test(s) && !/pakistan/i.test(s)) return 'Current Affairs'
    return 'Pakistan Affairs'
  }
  if (q.paperSection === 'General Abilities') {
    return /series|analog|reason|coding|direction|relation|logic|verbal|odd|classif|order|rank|seat|syllog|statement|clock|calendar|mental|puzzle/i.test(`${s} ${q.id}`) ? 'Reasoning' : 'Quantitative Ability'
  }
  if (q.paperSection === 'English') return 'vocabulary and grammar'
  return q.paperSection
}

/** Reasons to replace a live question (empty = keep). `context` carries series-wide state. */
export function liveDefects(q, context) {
  const reasons = []
  const text = `${q.q} ${q.o.join(' ')}`
  const section = q.paperSection
  if (!Array.isArray(q.o) || q.o.length !== 4 || new Set(q.o.map((o) => canonical(o))).size !== 4) reasons.push('options malformed or repeated')
  if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) reasons.push('answer key invalid')
  if (q.o?.some((o) => CATCH_ALL_OPTION.test(String(o).trim()) || /^(?:all|none|both) of (?:the )?(?:above|these)$/i.test(String(o).trim()))) reasons.push('catch-all option (None/All of these)')
  if ([...TEMPLATE_WORDING, ...TEMPLATE_EXTRA].some((re) => re.test(q.q)) || q.o?.some((o) => /\bis associated with\b|^it (?:is|was) (?:linked|connected)/i.test(String(o)))) reasons.push('machine-template wording')
  if (GARBLED.test(q.q.trim()) || unbalancedQuotes(q.q) || /\bi\.e\.\s/.test(q.q)) reasons.push('garbled or broken stem')
  if (context.servedStems.has(canonical(q.q))) reasons.push('already used in Mocks 1–4')
  if (Array.isArray(q.o) && q.o.every((o) => /^(?:\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|[a-z]+teenth|twentieth)$/i.test(String(o).trim()))) reasons.push('ordinal-number trivia')
  if (context.seenStems.has(canonical(q.q))) reasons.push('repeats a question from an earlier paper')
  if (section === 'Islamic Studies') {
    if (ISLAMIC_TRIVIA.some((re) => re.test(text)) || /\b\d{1,3}:\d{1,3}\b/.test(text)
      || /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|[a-z]+teen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|\d+)[- ]?(?:\w+ )?(?:verses|ayat|ayahs|rukus|surahs)\b/i.test(q.q)) reasons.push('Qur’an numbering / verse-count trivia')
    if (/\b\d{3,4} CE\b/.test(q.q)) reasons.push('obscure dating trivia')
  }
  if (section === 'Urdu' && (URDU_LITERATURE.test(text) || /استعارہ|تشبیہ|کنایہ|مجاز مرسل|تلمیح|صنعت|بدیع|بیان/.test(text))) reasons.push('Urdu literature/rhetoric, not language')
  if (section === 'General Knowledge') {
    if (SCIENCE_CALC(text)) reasons.push('calculation / university-level science')
    if (NEWS_TRIVIA.test(q.q) || CA_MINUTIAE.test(q.q) || /\bWEF\b|gender[- ]gap|\bindex\b/i.test(q.q)) reasons.push('news or index minutiae')
    if (UGLY_NUMBER.test(q.q) || (/\d+(?:\.\d+)?%.*\d+(?:\.\d+)?%/.test(q.q))) reasons.push('arithmetic inside a GK question')
    if (TIME_WORDS.test(q.q)) reasons.push('time-bound fact that may be out of date')
    if (POP_TRIVIA.test(q.q)) reasons.push('celebrity or pop trivia, not MPT General Knowledge')
    if (/\b(?:medal events?|olympics?|world cup|grand slam|trophy|tournament|ski|championship|league)\b/i.test(q.q)) reasons.push('sports minutiae')
    if (/\b(?:headsm[ae]n|jalad|jails?)\b/i.test(q.q)) reasons.push('junk trivia')
  }
  if (section === 'General Abilities') {
    if (/^mpt-advanced-ability/.test(q.id)) reasons.push('code-generated template repeated across every paper')
    if (CASE_PREFIX.test(q.q)) reasons.push('artificial case-study wording')
    if (UGLY_NUMBER.test(text)) reasons.push('awkward numbers (calculator arithmetic)')
    const t = surfaceTemplate(q.q)
    if (context.gaTemplates.has(t)) reasons.push('same question with numbers changed')
  }
  return reasons
}
