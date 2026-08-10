// Grammar centre structure. The owner-provided grammar book will supply the authorised lesson
// order once uploaded; until then these original lessons cover the standard CSS grammar syllabus.
export interface GrammarTopic {
  slug: string
  name: string
  summary: string
  rules: { rule: string; example: string }[]
  commonErrors: { wrong: string; right: string; note: string }[]
  source: 'CSS Vista original' | 'Owner-provided grammar book'
}

export const grammarTopics: GrammarTopic[] = [
  {
    slug: 'tenses',
    name: 'Tenses',
    summary: 'Tense locates an action in time. CSS correction questions test sequence, consistency and the exact use of perfect and continuous forms.',
    rules: [
      { rule: 'Present perfect is used for past actions with a present result; it is never used with a finished time expression.', example: 'I have finished the report. (not “I have finished it yesterday”)' },
      { rule: 'Past perfect marks the earlier of two past actions.', example: 'The train had left before we reached the station.' },
      { rule: 'Use “since” with a point of time and “for” with a duration.', example: 'She has lived here since 2015 / for nine years.' },
      { rule: 'Keep one consistent tense framework within a paragraph.', example: 'He said that the policy was failing. (not “is failing” after past reporting verb)' },
    ],
    commonErrors: [
      { wrong: 'I am working here since 2020.', right: 'I have been working here since 2020.', note: 'Duration up to the present needs present perfect (continuous).' },
      { wrong: 'He did not went to office.', right: 'He did not go to office.', note: 'After did, use the base form of the verb.' },
    ],
    source: 'CSS Vista original',
  },
  {
    slug: 'subject-verb-agreement',
    name: 'Subject–Verb Agreement',
    summary: 'The verb must agree with the true subject in number, not with the nearest noun.',
    rules: [
      { rule: 'Words between subject and verb do not change agreement.', example: 'The quality of the answers was impressive.' },
      { rule: '“Each”, “every”, “either”, “neither” take singular verbs.', example: 'Neither of the candidates was late.' },
      { rule: 'Subjects joined by “and” are plural; joined by “or/nor”, the verb agrees with the nearer subject.', example: 'The teacher and the student were present. / Either the students or the teacher was wrong.' },
      { rule: 'Collective nouns take singular verbs when the group acts as one.', example: 'The committee has submitted its report.' },
    ],
    commonErrors: [
      { wrong: 'The list of items are on the desk.', right: 'The list of items is on the desk.', note: 'The subject is “list”, not “items”.' },
      { wrong: 'Everyone have their own opinion.', right: 'Everyone has his or her own opinion.', note: '“Everyone” is singular in formal writing.' },
    ],
    source: 'CSS Vista original',
  },
  {
    slug: 'articles',
    name: 'Articles (a, an, the)',
    summary: 'Articles signal whether a noun is specific. Missing or extra articles are among the most frequent errors in CSS scripts.',
    rules: [
      { rule: 'Use “a/an” for a non-specific singular countable noun.', example: 'She wrote an essay on a global issue.' },
      { rule: 'Use “the” when the noun is specific or already mentioned.', example: 'The essay she wrote won praise.' },
      { rule: 'No article before most uncountable and plural nouns used generally.', example: 'Education is essential. / Books inform us.' },
      { rule: 'Use “the” with superlatives and unique nouns.', example: 'The best policy; the United Nations.' },
    ],
    commonErrors: [
      { wrong: 'He is best player in team.', right: 'He is the best player in the team.', note: 'Superlatives need “the”.' },
      { wrong: 'The honesty is a virtue.', right: 'Honesty is a virtue.', note: 'Abstract nouns used generally take no article.' },
    ],
    source: 'CSS Vista original',
  },
  {
    slug: 'prepositions',
    name: 'Prepositions',
    summary: 'Preposition choice is idiomatic; CSS tests fixed verb/adjective + preposition combinations.',
    rules: [
      { rule: 'Learn prepositions as part of the verb or adjective, not separately.', example: 'rely on, insist on, consist of, different from' },
      { rule: '“Good at”, “interested in”, “afraid of”, “dependent on”.', example: 'She is good at analysis and interested in policy.' },
      { rule: '“Arrive at” a place (small), “arrive in” a country/city.', example: 'They arrived in Lahore on Monday.' },
    ],
    commonErrors: [
      { wrong: 'He is capable to do this.', right: 'He is capable of doing this.', note: '“Capable” takes “of + gerund”.' },
      { wrong: 'She married with him.', right: 'She married him. / She got married to him.', note: '“Marry” takes no preposition in active use.' },
    ],
    source: 'CSS Vista original',
  },
  {
    slug: 'active-passive',
    name: 'Active & Passive Voice',
    summary: 'Use active voice for clarity; use passive when the doer is unknown or the result matters more than the actor.',
    rules: [
      { rule: 'Passive = be + past participle; the object becomes the subject.', example: 'The policy was announced by the ministry.' },
      { rule: 'Only transitive verbs form the passive.', example: 'The accident happened at dawn. (no passive)' },
      { rule: 'In precis and reports, prefer active voice for directness.', example: 'The committee rejected the proposal.' },
    ],
    commonErrors: [
      { wrong: 'The work was been done.', right: 'The work was being done. / The work had been done.', note: 'Do not stack “was” with “been” without “being/had”.' },
    ],
    source: 'CSS Vista original',
  },
  {
    slug: 'direct-indirect',
    name: 'Direct & Indirect Speech',
    summary: 'Reported speech shifts tense, pronouns and time expressions; the precis paper demands confident control of it.',
    rules: [
      { rule: 'Present becomes past when the reporting verb is past.', example: 'He said, “I am ready.” → He said that he was ready.' },
      { rule: 'Time/place words shift: now→then, today→that day, here→there.', example: 'She said she would submit the form that day.' },
      { rule: 'Questions in reported speech take statement order.', example: 'He asked where I lived. (not “where did I live”)' },
    ],
    commonErrors: [
      { wrong: 'He asked me that where do I live.', right: 'He asked me where I lived.', note: 'No “that” in wh-questions; use statement order.' },
    ],
    source: 'CSS Vista original',
  },
  {
    slug: 'punctuation',
    name: 'Punctuation',
    summary: 'Punctuation errors distort meaning and cost marks in both English papers.',
    rules: [
      { rule: 'A semicolon joins two closely related independent clauses.', example: 'The data was incomplete; the conclusion was withdrawn.' },
      { rule: 'Use a comma after introductory phrases.', example: 'Having reviewed the evidence, the committee adjourned.' },
      { rule: 'Apostrophes mark possession or contraction - never simple plurals.', example: 'the candidate’s answer; the candidates’ answers; its (possessive) vs it’s (it is)' },
    ],
    commonErrors: [
      { wrong: 'Its a difficult paper.', right: 'It’s a difficult paper.', note: 'Contraction of “it is” needs the apostrophe.' },
    ],
    source: 'CSS Vista original',
  },
  {
    slug: 'parallelism',
    name: 'Parallelism & Modifiers',
    summary: 'Items in a list or comparison must share the same grammatical form; modifiers must sit next to what they describe.',
    rules: [
      { rule: 'Keep list items in the same form.', example: 'The course covers reading, writing and analysing. (not “and to analyse”)' },
      { rule: 'Place “only”, “almost”, “nearly” next to the word they limit.', example: 'He answered only four questions. (not “He only answered…”)' },
      { rule: 'Opening participial phrases must describe the subject.', example: 'Walking to the hall, she reviewed her notes. (not “…her notes fell”)' },
    ],
    commonErrors: [
      { wrong: 'He likes reading, swimming and to cycle.', right: 'He likes reading, swimming and cycling.', note: 'All items must take the gerund form.' },
    ],
    source: 'CSS Vista original',
  },
]

export const pairOfWords: { a: string; b: string; aMeaning: string; bMeaning: string; aSentence: string; bSentence: string }[] = [
  { a: 'Accept', b: 'Except', aMeaning: 'to receive or agree to', bMeaning: 'excluding; but', aSentence: 'The committee accepted the report.', bSentence: 'All candidates passed except two.' },
  { a: 'Affect', b: 'Effect', aMeaning: 'to influence (verb)', bMeaning: 'result (noun)', aSentence: 'Inflation affects purchasing power.', bSentence: 'The effect of inflation is visible in prices.' },
  { a: 'Advice', b: 'Advise', aMeaning: 'guidance (noun)', bMeaning: 'to recommend (verb)', aSentence: 'Her advice proved useful.', bSentence: 'I advise daily revision.' },
  { a: 'Born', b: 'Borne', aMeaning: 'given birth to', bMeaning: 'carried or endured', aSentence: 'He was born in Lahore.', bSentence: 'The costs were borne by the state.' },
  { a: 'Compliment', b: 'Complement', aMeaning: 'praise', bMeaning: 'that which completes', aSentence: 'She received a compliment on her essay.', bSentence: 'Current Affairs complements Pakistan Affairs.' },
  { a: 'Council', b: 'Counsel', aMeaning: 'an advisory body', bMeaning: 'advice or a lawyer', aSentence: 'The council met on Monday.', bSentence: 'The counsel argued the case.' },
  { a: 'Elicit', b: 'Illicit', aMeaning: 'to draw out', bMeaning: 'unlawful', aSentence: 'The question elicited a strong response.', bSentence: 'Illicit trade harms the economy.' },
  { a: 'Principal', b: 'Principle', aMeaning: 'head; main', bMeaning: 'a rule or belief', aSentence: 'The principal addressed the college.', bSentence: 'He stood by his principles.' },
  { a: 'Stationary', b: 'Stationery', aMeaning: 'not moving', bMeaning: 'writing materials', aSentence: 'The truck remained stationary.', bSentence: 'She bought stationery for the exam.' },
  { a: 'Practice', b: 'Practise', aMeaning: 'noun form', bMeaning: 'verb form (British)', aSentence: 'Daily practice builds skill.', bSentence: 'Practise one precis every day.' },
]

export const idioms: { idiom: string; meaning: string; sentence: string }[] = [
  { idiom: 'To bite the dust', meaning: 'to fail or be defeated', sentence: 'Weak time management made his attempt bite the dust.' },
  { idiom: 'To burn the midnight oil', meaning: 'to study or work late into the night', sentence: 'She burned the midnight oil before the written examination.' },
  { idiom: 'A blessing in disguise', meaning: 'something that seems bad but turns out well', sentence: 'Failing the first attempt was a blessing in disguise; it exposed his weak areas.' },
  { idiom: 'To hit the nail on the head', meaning: 'to say exactly the right thing', sentence: 'Her thesis statement hit the nail on the head.' },
  { idiom: 'Once in a blue moon', meaning: 'very rarely', sentence: 'He studies without a plan once in a blue moon - which is the problem.' },
  { idiom: 'To leave no stone unturned', meaning: 'to try every possible means', sentence: 'The aspirant left no stone unturned in her preparation.' },
  { idiom: 'At the eleventh hour', meaning: 'at the last possible moment', sentence: 'Submitting documents at the eleventh hour risks rejection.' },
  { idiom: 'To take with a grain of salt', meaning: 'to view with scepticism', sentence: 'Take unverified “scoring trend” lists with a grain of salt.' },
  { idiom: 'The ball is in your court', meaning: 'it is your turn to act', sentence: 'The syllabus is public - the ball is in your court now.' },
  { idiom: 'To cut corners', meaning: 'to do something hastily to save effort', sentence: 'Cutting corners in grammar preparation shows in the precis paper.' },
]

export const oneWordSubstitutions: { phrase: string; word: string }[] = [
  { phrase: 'A person who speaks many languages', word: 'Polyglot' },
  { phrase: 'A government by the people', word: 'Democracy' },
  { phrase: 'One who believes in fate', word: 'Fatalist' },
  { phrase: 'A person who eats only plants', word: 'Vegetarian' },
  { phrase: 'Fear of heights', word: 'Acrophobia' },
  { phrase: 'A list of books available in a library', word: 'Catalogue' },
  { phrase: 'One who looks at the bright side of things', word: 'Optimist' },
  { phrase: 'The scientific study of elections and voting', word: 'Psephology' },
  { phrase: 'A word having the same meaning as another', word: 'Synonym' },
  { phrase: 'Murder of one’s own brother', word: 'Fratricide' },
]
