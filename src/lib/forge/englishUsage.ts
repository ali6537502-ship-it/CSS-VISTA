import { wrongOptions, type ForgeGenerator } from './item'

// English usage generators for the MPT English portion.
//
// Vocabulary, idioms and comprehension are *recall* items: inventing them
// mechanically would mean inventing meanings, so those keep coming from the
// verified bank. Grammar, by contrast, is rule-driven - agreement, voice,
// narration, tags and degrees all follow from the rule and the slot words, so
// they are generated here and are genuinely new on every paper.

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const PLURAL_NOUNS = ['students', 'candidates', 'officers', 'teachers', 'players', 'engineers', 'delegates', 'journalists', 'farmers', 'volunteers']
const SINGULAR_NOUNS = ['committee', 'report', 'proposal', 'machine', 'application', 'certificate', 'contract', 'manuscript']
const MASS_NOUNS = ['information', 'furniture', 'luggage', 'advice', 'machinery', 'evidence', 'equipment']

const subjectVerbAgreement: ForgeGenerator = (rng) => {
  const patterns = [
    () => {
      const noun = rng.pick(PLURAL_NOUNS)
      return {
        sentence: `Neither of the ${noun} ___ submitted the form on time.`,
        answer: 'has',
        distractors: ['have', 'are', 'were'],
        reason: `"Neither of ..." is singular, so it takes the singular verb "has" even though "${noun}" is plural.`,
      }
    },
    () => {
      const noun = rng.pick(PLURAL_NOUNS)
      return {
        sentence: `Each of the ${noun} ___ been given a separate seat.`,
        answer: 'has',
        distractors: ['have', 'is', 'were'],
        reason: '"Each of ..." is always singular and takes "has".',
      }
    },
    () => {
      const noun = rng.pick(PLURAL_NOUNS)
      return {
        sentence: `The list of ${noun} ___ on the notice board.`,
        answer: 'is',
        distractors: ['are', 'were', 'have been'],
        reason: `The subject is "the list", not "${noun}"; a phrase between the subject and the verb does not change the number of the verb.`,
      }
    },
    () => ({
      sentence: `The ${rng.pick(MASS_NOUNS)} you asked for ___ already been sent.`,
      answer: 'has',
      distractors: ['have', 'are', 'were'],
      reason: 'This is an uncountable noun, so it behaves as singular and takes "has".',
    }),
    () => {
      const noun = rng.pick(PLURAL_NOUNS)
      return {
        sentence: `Not only the chairman but also the ${noun} ___ present at the meeting.`,
        answer: 'were',
        distractors: ['was', 'is', 'has been'],
        reason: `With "not only ... but also", the verb agrees with the nearer subject, which here is the plural "${noun}".`,
      }
    },
    () => ({
      sentence: `Ten kilometres ___ a long distance to walk in this heat.`,
      answer: 'is',
      distractors: ['are', 'were', 'have been'],
      reason: 'A measure of distance taken as a single quantity is treated as singular.',
    }),
    () => {
      const noun = rng.pick(SINGULAR_NOUNS)
      return {
        sentence: `Neither the members nor the ${noun} ___ ready for scrutiny.`,
        answer: 'is',
        distractors: ['are', 'were', 'have been'],
        reason: `With "neither ... nor", the verb agrees with the nearer subject, which here is the singular "${noun}".`,
      }
    },
  ]
  const built = rng.pick(patterns)()
  return {
    q: `Fill in the blank with the correct option: "${built.sentence}"`,
    answer: built.answer,
    distractors: wrongOptions(built.answer, rng.shuffle(built.distractors), rng),
    explanation: built.reason,
    topic: 'Subject–Verb Agreement',
    difficulty: 'Intermediate',
  }
}

const VOICE_VERBS = [
  { base: 'write', past: 'wrote', participle: 'written' },
  { base: 'build', past: 'built', participle: 'built' },
  { base: 'sign', past: 'signed', participle: 'signed' },
  { base: 'reject', past: 'rejected', participle: 'rejected' },
  { base: 'translate', past: 'translated', participle: 'translated' },
  { base: 'destroy', past: 'destroyed', participle: 'destroyed' },
  { base: 'award', past: 'awarded', participle: 'awarded' },
  { base: 'repair', past: 'repaired', participle: 'repaired' },
  { base: 'discover', past: 'discovered', participle: 'discovered' },
  { base: 'approve', past: 'approved', participle: 'approved' },
]
const VOICE_AGENTS = ['the committee', 'the engineer', 'the government', 'the principal', 'the editor', 'the contractor', 'the scientist', 'the assembly']
const VOICE_OBJECTS = [
  { text: 'the report', plural: false }, { text: 'the bridge', plural: false }, { text: 'the agreement', plural: false },
  { text: 'the proposals', plural: true }, { text: 'the documents', plural: true }, { text: 'the letter', plural: false },
  { text: 'the buildings', plural: true }, { text: 'the manuscript', plural: false },
]

const activePassive: ForgeGenerator = (rng) => {
  const verb = rng.pick(VOICE_VERBS)
  const agent = rng.pick(VOICE_AGENTS)
  const object = rng.pick(VOICE_OBJECTS)
  const be = object.plural ? 'were' : 'was'
  const active = `${capitalise(agent)} ${verb.past} ${object.text}.`
  const answer = `${capitalise(object.text)} ${be} ${verb.participle} by ${agent}.`
  return {
    q: `Choose the correct passive form of: "${active}"`,
    answer,
    distractors: wrongOptions(answer, [
      `${capitalise(object.text)} ${be} ${verb.past} by ${agent}.`,
      `${capitalise(object.text)} ${object.plural ? 'are' : 'is'} ${verb.participle} by ${agent}.`,
      `${capitalise(object.text)} ${object.plural ? 'have' : 'has'} been ${verb.participle} by ${agent}.`,
      `${capitalise(agent)} ${be} ${verb.participle} by ${object.text}.`,
    ], rng),
    explanation: `The active sentence is in the simple past, so the passive takes "${be} + past participle": "${answer}" The past participle of "${verb.base}" is "${verb.participle}", not "${verb.past}".`,
    topic: 'Active and Passive Voice',
    difficulty: 'Intermediate',
  }
}

const NARRATION_CASES = [
  { quoted: 'We are ready for the test', reported: 'they were ready for the test' },
  { quoted: 'We have finished the work', reported: 'they had finished the work' },
  { quoted: 'We will appeal against the decision', reported: 'they would appeal against the decision' },
  { quoted: 'We can solve this problem', reported: 'they could solve this problem' },
  { quoted: 'We know the answer', reported: 'they knew the answer' },
  { quoted: 'We are working on the draft', reported: 'they were working on the draft' },
  { quoted: 'We must submit the file today', reported: 'they had to submit the file that day' },
  { quoted: 'We saw the notification', reported: 'they had seen the notification' },
]
const NARRATION_SPEAKERS = ['The students', 'The delegates', 'The officers', 'The candidates', 'The members', 'The teachers']

const reportedSpeech: ForgeGenerator = (rng) => {
  const caseItem = rng.pick(NARRATION_CASES)
  const speaker = rng.pick(NARRATION_SPEAKERS)
  const answer = `${speaker} said that ${caseItem.reported}.`
  const unshifted = caseItem.quoted.replace(/^We /, 'we ')
  return {
    q: `Choose the correct indirect form of: ${speaker} said, “${caseItem.quoted}.”`,
    answer,
    distractors: wrongOptions(answer, [
      `${speaker} said that ${unshifted}.`,
      `${speaker} told that ${caseItem.reported}.`,
      `${speaker} says that ${caseItem.reported}.`,
      `${speaker} said that ${caseItem.reported} or not.`,
    ], rng),
    explanation: `In indirect speech the reporting verb "said" is in the past, so the tense of the reported clause shifts back one step and the first-person pronoun "we" changes to "they": ${answer}`,
    topic: 'Direct and Reported Speech',
    difficulty: 'Advanced',
  }
}

const TAG_CASES = [
  { statement: 'The train is late', tag: "isn't it" },
  { statement: 'They have completed the survey', tag: "haven't they" },
  { statement: 'We should inform the office', tag: "shouldn't we" },
  { statement: 'You did not attend the seminar', tag: 'did you' },
  { statement: 'It rarely rains here', tag: 'does it' },
  { statement: 'Let us begin the session', tag: 'shall we' },
  { statement: 'Nobody objected to the proposal', tag: 'did they' },
  { statement: 'Open the window', tag: 'will you' },
  { statement: 'I am on the list', tag: "aren't I" },
  { statement: 'The results were announced yesterday', tag: "weren't they" },
  { statement: 'Everyone has signed the register', tag: "haven't they" },
  { statement: 'There is no other option', tag: 'is there' },
  { statement: 'She hardly ever complains', tag: 'does she' },
  { statement: 'You had better leave now', tag: "hadn't you" },
  { statement: 'Neither of them replied', tag: 'did they' },
  { statement: 'Do not touch the wires', tag: 'will you' },
  { statement: 'We used to meet every Friday', tag: "didn't we" },
  { statement: 'He can hardly walk', tag: 'can he' },
]

const questionTag: ForgeGenerator = (rng) => {
  const chosen = rng.pick(TAG_CASES)
  const pool = TAG_CASES.filter((entry) => entry.tag !== chosen.tag).map((entry) => entry.tag)
  return {
    q: `Choose the correct question tag: "${chosen.statement}, ___?"`,
    answer: chosen.tag,
    distractors: wrongOptions(chosen.tag, rng.shuffle(pool), rng),
    explanation: `A statement takes a tag of the opposite polarity that repeats its auxiliary and subject, which gives "${chosen.tag}".`,
    topic: 'Questions, Tags and Inversion',
    difficulty: 'Advanced',
  }
}

const ARTICLE_CASES = [
  { phrase: 'honest officer', article: 'an', reason: 'the "h" in "honest" is silent, so the word begins with a vowel sound' },
  { phrase: 'university degree', article: 'a', reason: '"university" begins with the consonant sound /juː/' },
  { phrase: 'hour of rest', article: 'an', reason: 'the "h" in "hour" is silent, so the word begins with a vowel sound' },
  { phrase: 'European delegate', article: 'a', reason: '"European" begins with the consonant sound /j/' },
  { phrase: 'M.A. degree', article: 'an', reason: 'the letter "M" is read "em", which begins with a vowel sound' },
  { phrase: 'one-rupee coin', article: 'a', reason: '"one" begins with the consonant sound /w/' },
  { phrase: 'unique opportunity', article: 'a', reason: '"unique" begins with the consonant sound /j/' },
  { phrase: 'umbrella stand', article: 'an', reason: '"umbrella" begins with a vowel sound' },
  { phrase: 'useful suggestion', article: 'a', reason: '"useful" begins with the consonant sound /j/' },
  { phrase: 'X-ray report', article: 'an', reason: 'the letter "X" is read "eks", which begins with a vowel sound' },
  { phrase: 'union leader', article: 'a', reason: '"union" begins with the consonant sound /j/' },
  { phrase: 'honourable exception', article: 'an', reason: 'the "h" in "honourable" is silent, so the word begins with a vowel sound' },
  { phrase: 'LLB degree', article: 'an', reason: 'the letter "L" is read "el", which begins with a vowel sound' },
  { phrase: 'heir to the estate', article: 'an', reason: 'the "h" in "heir" is silent, so the word begins with a vowel sound' },
  { phrase: 'one-sided account', article: 'a', reason: '"one" begins with the consonant sound /w/' },
  { phrase: 'universal truth', article: 'a', reason: '"universal" begins with the consonant sound /j/' },
  { phrase: 'MBA scholarship', article: 'an', reason: 'the letter "M" is read "em", which begins with a vowel sound' },
  { phrase: 'historic decision', article: 'a', reason: 'the "h" in "historic" is pronounced, so the word begins with a consonant sound' },
]

const articles: ForgeGenerator = (rng) => {
  const chosen = rng.pick(ARTICLE_CASES)
  return {
    q: `Fill in the blank with the correct article: "He was given ___ ${chosen.phrase}."`,
    answer: chosen.article,
    distractors: wrongOptions(chosen.article, [chosen.article === 'a' ? 'an' : 'a', 'the', 'no article is needed'], rng),
    explanation: `The choice between "a" and "an" depends on sound, not spelling: ${chosen.reason}, so "${chosen.article}" is correct.`,
    topic: 'Articles and Determiners',
    difficulty: 'Intermediate',
  }
}

const PREPOSITION_CASES = [
  { sentence: 'She is good ___ mathematics', answer: 'at', wrong: ['in', 'on', 'for'] },
  { sentence: 'He was accused ___ negligence', answer: 'of', wrong: ['for', 'with', 'about'] },
  { sentence: 'The minister insisted ___ an inquiry', answer: 'on', wrong: ['at', 'for', 'about'] },
  { sentence: 'They are not entitled ___ any compensation', answer: 'to', wrong: ['for', 'of', 'with'] },
  { sentence: 'The report is based ___ field data', answer: 'on', wrong: ['in', 'at', 'from'] },
  { sentence: 'He has been suffering ___ malaria since Monday', answer: 'from', wrong: ['of', 'with', 'by'] },
  { sentence: 'The committee comprises ___ seven members', answer: 'of', wrong: ['in', 'with', 'from'] },
  { sentence: 'She is married ___ a civil servant', answer: 'to', wrong: ['with', 'of', 'by'] },
  { sentence: 'We must abide ___ the rules', answer: 'by', wrong: ['with', 'to', 'on'] },
  { sentence: 'The policy is conducive ___ growth', answer: 'to', wrong: ['for', 'of', 'with'] },
  { sentence: 'He was deprived ___ his rights', answer: 'of', wrong: ['from', 'with', 'to'] },
  { sentence: 'The teacher was pleased ___ the result', answer: 'with', wrong: ['on', 'of', 'from'] },
  { sentence: 'Do not interfere ___ my affairs', answer: 'in', wrong: ['on', 'to', 'about'] },
  { sentence: 'This medicine is a remedy ___ headache', answer: 'for', wrong: ['of', 'to', 'from'] },
  { sentence: 'He is devoid ___ any sense of responsibility', answer: 'of', wrong: ['from', 'in', 'with'] },
  { sentence: 'The village was cut ___ by the floods', answer: 'off', wrong: ['out', 'down', 'away'] },
  { sentence: 'She prevailed ___ him to reconsider', answer: 'upon', wrong: ['over', 'against', 'to'] },
  { sentence: 'The court acquitted him ___ all charges', answer: 'of', wrong: ['from', 'against', 'for'] },
  { sentence: 'He is indifferent ___ criticism', answer: 'to', wrong: ['of', 'from', 'against'] },
  { sentence: 'They were charged ___ corruption', answer: 'with', wrong: ['of', 'for', 'in'] },
  { sentence: 'This rule is applicable ___ all employees', answer: 'to', wrong: ['for', 'on', 'with'] },
  { sentence: 'He has no aptitude ___ mathematics', answer: 'for', wrong: ['of', 'in', 'to'] },
  { sentence: 'The proposal was met ___ stiff resistance', answer: 'with', wrong: ['by', 'against', 'from'] },
  { sentence: 'She was oblivious ___ the danger', answer: 'to', wrong: ['of', 'from', 'about'] },
  { sentence: 'We should refrain ___ hasty judgement', answer: 'from', wrong: ['of', 'against', 'to'] },
  { sentence: 'He was congratulated ___ his success', answer: 'on', wrong: ['for', 'about', 'of'] },
]

const prepositions: ForgeGenerator = (rng) => {
  const chosen = rng.pick(PREPOSITION_CASES)
  return {
    q: `Choose the correct preposition: "${chosen.sentence}."`,
    answer: chosen.answer,
    distractors: wrongOptions(chosen.answer, rng.shuffle(chosen.wrong), rng),
    explanation: `The fixed collocation is "${chosen.sentence.replace('___', chosen.answer)}".`,
    topic: 'Prepositions',
    difficulty: 'Intermediate',
  }
}

const COMPARISON_CASES = [
  { adjective: 'good', comparative: 'better', superlative: 'best' },
  { adjective: 'bad', comparative: 'worse', superlative: 'worst' },
  { adjective: 'little', comparative: 'less', superlative: 'least' },
  { adjective: 'far', comparative: 'farther', superlative: 'farthest' },
  { adjective: 'many', comparative: 'more', superlative: 'most' },
  { adjective: 'late', comparative: 'later', superlative: 'latest' },
  { adjective: 'old', comparative: 'elder', superlative: 'eldest' },
  { adjective: 'near', comparative: 'nearer', superlative: 'nearest' },
  { adjective: 'out', comparative: 'outer', superlative: 'outermost' },
]

const degreesOfComparison: ForgeGenerator = (rng) => {
  const chosen = rng.pick(COMPARISON_CASES)
  const superlative = rng.chance(0.5)
  const answer = superlative ? chosen.superlative : chosen.comparative
  return {
    q: superlative
      ? `Fill in the blank: "This is the ___ result the department has ever produced." (${chosen.adjective})`
      : `Fill in the blank: "This year's result is ___ than last year's." (${chosen.adjective})`,
    answer,
    distractors: wrongOptions(answer, [
      superlative ? chosen.comparative : chosen.superlative,
      chosen.adjective,
      `more ${chosen.adjective}`,
      `most ${chosen.adjective}`,
    ], rng),
    explanation: `"${chosen.adjective}" is irregular: its comparative is "${chosen.comparative}" and its superlative is "${chosen.superlative}", so forms like "more ${chosen.adjective}" are wrong.`,
    topic: 'Adjectives and Degrees of Comparison',
    difficulty: 'Intermediate',
  }
}

const CONDITIONAL_CASES = [
  { sentence: 'If I ___ you, I would accept the offer', answer: 'were', wrong: ['was', 'am', 'will be'], reason: 'the second conditional uses the subjunctive "were" for every subject' },
  { sentence: 'If it rains tomorrow, the match ___ postponed', answer: 'will be', wrong: ['would be', 'is', 'was'], reason: 'the first conditional pairs a present-tense "if" clause with "will"' },
  { sentence: 'If she had studied harder, she ___ passed', answer: 'would have', wrong: ['would', 'will have', 'had'], reason: 'the third conditional pairs a past-perfect "if" clause with "would have + past participle"' },
  { sentence: 'I wish I ___ more time to prepare', answer: 'had', wrong: ['have', 'will have', 'would have'], reason: '"I wish" about the present takes the past tense' },
  { sentence: 'Unless you ___ hard, you cannot succeed', answer: 'work', wrong: ['will work', 'worked', 'would work'], reason: '"unless" behaves like "if ... not" and takes the present tense for a future meaning' },
  { sentence: 'Had he applied in time, he ___ been selected', answer: 'would have', wrong: ['will have', 'would', 'had'], reason: 'inverted "had + subject" replaces "if" in the third conditional and still pairs with "would have"' },
  { sentence: 'If you heat ice, it ___', answer: 'melts', wrong: ['will melt', 'would melt', 'melted'], reason: 'the zero conditional states a general truth and uses the present tense in both clauses' },
  { sentence: 'It is time we ___ the matter seriously', answer: 'took', wrong: ['take', 'will take', 'have taken'], reason: '"it is time" about the present is followed by the past tense' },
  { sentence: 'He talks as if he ___ the minister', answer: 'were', wrong: ['is', 'was', 'has been'], reason: '"as if" about an unreal situation takes the subjunctive "were"' },
  { sentence: 'Provided that she ___ on time, the interview will proceed', answer: 'arrives', wrong: ['will arrive', 'arrived', 'would arrive'], reason: '"provided that" behaves like "if" and takes the present tense for a future meaning' },
]

const conditionals: ForgeGenerator = (rng) => {
  const chosen = rng.pick(CONDITIONAL_CASES)
  return {
    q: `Fill in the blank: "${chosen.sentence}."`,
    answer: chosen.answer,
    distractors: wrongOptions(chosen.answer, rng.shuffle(chosen.wrong), rng),
    explanation: `Here ${chosen.reason}, so "${chosen.answer}" is correct.`,
    topic: 'Conditionals, Wishes and Hypothetical Forms',
    difficulty: 'Advanced',
  }
}

const TENSE_CASES = [
  { sentence: 'He has been working in this department ___ 2015', answer: 'since', wrong: ['for', 'from', 'by'], reason: '"since" marks a point in time while "for" marks a length of time' },
  { sentence: 'She has been waiting ___ three hours', answer: 'for', wrong: ['since', 'from', 'during'], reason: '"for" marks a length of time while "since" marks a point in time' },
  { sentence: 'By the time we arrived, the meeting ___', answer: 'had ended', wrong: ['has ended', 'ended', 'was ending'], reason: 'the earlier of two past actions takes the past perfect' },
  { sentence: 'Water ___ at 100 degrees Celsius at sea level', answer: 'boils', wrong: ['is boiling', 'boiled', 'has boiled'], reason: 'a general scientific fact takes the simple present' },
  { sentence: 'Look! The bus ___', answer: 'is coming', wrong: ['comes', 'came', 'has come'], reason: 'an action happening at this moment takes the present continuous' },
  { sentence: 'He ___ the report before the deadline tomorrow', answer: 'will have submitted', wrong: ['will submit', 'has submitted', 'submitted'], reason: 'an action completed before a future point takes the future perfect' },
  { sentence: 'She ___ in this office since her graduation', answer: 'has been working', wrong: ['is working', 'works', 'worked'], reason: 'an action that began in the past and still continues takes the present perfect continuous' },
  { sentence: 'The train ___ before we reached the platform', answer: 'had left', wrong: ['has left', 'left', 'was leaving'], reason: 'the earlier of two past actions takes the past perfect' },
  { sentence: 'He said he ___ the file the previous day', answer: 'had submitted', wrong: ['has submitted', 'submitted', 'would submit'], reason: 'a past action reported after another past action takes the past perfect' },
  { sentence: 'I ___ him only once before yesterday', answer: 'had met', wrong: ['have met', 'meet', 'was meeting'], reason: 'an action completed before a stated past moment takes the past perfect' },
  { sentence: 'The committee ___ its report next Monday', answer: 'will present', wrong: ['presents', 'presented', 'has presented'], reason: 'a planned future action takes the simple future' },
  { sentence: 'While he ___ , the phone rang', answer: 'was writing', wrong: ['wrote', 'has written', 'writes'], reason: 'an action in progress interrupted by another past action takes the past continuous' },
  { sentence: 'The earth ___ round the sun', answer: 'revolves', wrong: ['is revolving', 'revolved', 'has revolved'], reason: 'a permanent truth takes the simple present' },
]

const tenses: ForgeGenerator = (rng) => {
  const chosen = rng.pick(TENSE_CASES)
  return {
    q: `Fill in the blank with the correct form: "${chosen.sentence}."`,
    answer: chosen.answer,
    distractors: wrongOptions(chosen.answer, rng.shuffle(chosen.wrong), rng),
    explanation: `Here ${chosen.reason}, so "${chosen.answer}" is correct.`,
    topic: 'Tenses and Verb Forms',
    difficulty: 'Intermediate',
  }
}

const SPELLING_CASES = [
  ['Occurrence', 'Occurence', 'Ocurrence', 'Occurrance'],
  ['Accommodation', 'Accomodation', 'Acommodation', 'Accommadation'],
  ['Embarrassment', 'Embarassment', 'Embarrasment', 'Embarressment'],
  ['Maintenance', 'Maintainance', 'Maintenence', 'Maintanance'],
  ['Questionnaire', 'Questionaire', 'Questionnare', 'Questionnair'],
  ['Privilege', 'Priviledge', 'Privelege', 'Privilage'],
  ['Conscientious', 'Concientious', 'Conscientous', 'Consciencious'],
  ['Millennium', 'Millenium', 'Milennium', 'Milenium'],
  ['Liaison', 'Liason', 'Liaision', 'Liasion'],
  ['Perseverance', 'Perseverence', 'Persaverance', 'Perserverance'],
  ['Committee', 'Commitee', 'Comittee', 'Committe'],
  ['Separate', 'Seperate', 'Sepparate', 'Separete'],
  ['Bureaucracy', 'Beaurocracy', 'Bureacracy', 'Buraeucracy'],
  ['Parliament', 'Parliment', 'Parlaiment', 'Parliamant'],
  ['Definitely', 'Definately', 'Definitly', 'Defenitely'],
  ['Recommend', 'Recomend', 'Reccommend', 'Recommand'],
  ['Acknowledgement', 'Acknowlegement', 'Aknowledgement', 'Acknowledgemant'],
  ['Entrepreneur', 'Entreprenuer', 'Enterpreneur', 'Entrepeneur'],
  ['Harassment', 'Harrassment', 'Harasment', 'Harrasment'],
  ['Supersede', 'Supercede', 'Superceed', 'Supersead'],
  ['Grievance', 'Greivance', 'Grievence', 'Grievanse'],
  ['Colleague', 'Collegue', 'Coleague', 'Colleagu'],
] as const

const spelling: ForgeGenerator = (rng) => {
  const [correct, ...wrong] = rng.pick(SPELLING_CASES)
  return {
    q: 'Identify the correctly spelt word:',
    answer: correct,
    distractors: wrongOptions(correct, rng.shuffle([...wrong]), rng),
    explanation: `“${correct}” is the correct spelling.`,
    topic: 'Spelling',
    difficulty: 'Intermediate',
  }
}

export const englishUsageGenerators: Record<string, ForgeGenerator> = {
  subjectVerbAgreement,
  activePassive,
  reportedSpeech,
  questionTag,
  articles,
  prepositions,
  degreesOfComparison,
  conditionals,
  tenses,
  spelling,
}

/**
 * Weighted by how many distinct items each generator can actually produce.
 *
 * Drawn evenly, the five-entry tables collided constantly and two papers ended
 * up sharing half their English questions. The slot-filling generators - voice,
 * agreement and narration, which multiply out to hundreds of stems - carry most
 * of the draw instead, and the fixed tables appear as the occasional item they
 * should be.
 */
export const englishUsageMix: readonly (readonly [ForgeGenerator, number])[] = [
  [activePassive, 12],
  [subjectVerbAgreement, 8],
  [reportedSpeech, 6],
  [prepositions, 5],
  [tenses, 4],
  [spelling, 4],
  [questionTag, 3],
  [articles, 3],
  [conditionals, 2],
  [degreesOfComparison, 2],
]
