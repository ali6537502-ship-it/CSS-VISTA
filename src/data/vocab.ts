export interface VocabWord {
  word: string
  pos: string
  meaning: string
  synonyms: string[]
  antonyms: string[]
  sentence: string
}

export const vocabulary: VocabWord[] = [
  { word: 'Aberration', pos: 'noun', meaning: 'A departure from what is normal or expected', synonyms: ['anomaly', 'deviation'], antonyms: ['norm', 'regularity'], sentence: 'The low turnout was an aberration in an otherwise highly participatory election.' },
  { word: 'Abate', pos: 'verb', meaning: 'To become less intense or widespread', synonyms: ['subside', 'diminish'], antonyms: ['intensify', 'escalate'], sentence: 'Flood waters began to abate after three days of continuous rain.' },
  { word: 'Alleviate', pos: 'verb', meaning: 'To make suffering or a problem less severe', synonyms: ['ease', 'mitigate'], antonyms: ['aggravate', 'worsen'], sentence: 'Targeted subsidies can alleviate the burden of inflation on low-income households.' },
  { word: 'Ambivalent', pos: 'adjective', meaning: 'Having mixed or contradictory feelings about something', synonyms: ['uncertain', 'conflicted'], antonyms: ['certain', 'decisive'], sentence: 'Public opinion remains ambivalent about rapid privatisation.' },
  { word: 'Ameliorate', pos: 'verb', meaning: 'To make something bad or unsatisfactory better', synonyms: ['improve', 'enhance'], antonyms: ['worsen', 'deteriorate'], sentence: 'Land reforms were introduced to ameliorate rural poverty.' },
  { word: 'Arduous', pos: 'adjective', meaning: 'Involving or requiring strenuous effort; difficult', synonyms: ['strenuous', 'gruelling'], antonyms: ['easy', 'effortless'], sentence: 'Preparing for the written examination is an arduous but rewarding journey.' },
  { word: 'Austere', pos: 'adjective', meaning: 'Severe or strict in manner; without luxuries', synonyms: ['stern', 'frugal'], antonyms: ['indulgent', 'luxurious'], sentence: 'The government announced an austere budget amid the fiscal deficit.' },
  { word: 'Bolster', pos: 'verb', meaning: 'To support or strengthen', synonyms: ['reinforce', 'fortify'], antonyms: ['undermine', 'weaken'], sentence: 'Foreign exchange reserves were bolstered by rising remittances.' },
  { word: 'Candid', pos: 'adjective', meaning: 'Truthful and straightforward; frank', synonyms: ['frank', 'forthright'], antonyms: ['evasive', 'guarded'], sentence: 'The report offers a candid assessment of governance failures.' },
  { word: 'Coerce', pos: 'verb', meaning: 'To persuade by force or threats', synonyms: ['compel', 'intimidate'], antonyms: ['persuade', 'encourage'], sentence: 'Voters must never be coerced into supporting a candidate.' },
  { word: 'Complacent', pos: 'adjective', meaning: 'Self-satisfied and unaware of potential dangers', synonyms: ['smug', 'contented'], antonyms: ['vigilant', 'concerned'], sentence: 'A single good mock score should not make an aspirant complacent.' },
  { word: 'Conducive', pos: 'adjective', meaning: 'Making a certain outcome likely or possible', synonyms: ['favourable', 'beneficial'], antonyms: ['unfavourable', 'hostile'], sentence: 'A quiet study environment is conducive to deep reading.' },
  { word: 'Conscientious', pos: 'adjective', meaning: 'Careful, thorough and guided by a sense of duty', synonyms: ['diligent', 'meticulous'], antonyms: ['careless', 'negligent'], sentence: 'Conscientious revision is what separates consistent candidates from the rest.' },
  { word: 'Debilitate', pos: 'verb', meaning: 'To make weak or feeble', synonyms: ['weaken', 'enfeeble'], antonyms: ['strengthen', 'invigorate'], sentence: 'Chronic load-shedding debilitates small industries.' },
  { word: 'Deplete', pos: 'verb', meaning: 'To use up the supply of; exhaust', synonyms: ['exhaust', 'drain'], antonyms: ['replenish', 'augment'], sentence: 'Groundwater reserves are being depleted faster than they recharge.' },
  { word: 'Deterrent', pos: 'noun', meaning: 'A thing that discourages an action', synonyms: ['disincentive', 'restraint'], antonyms: ['incentive', 'encouragement'], sentence: 'Credible accountability acts as a deterrent against corruption.' },
  { word: 'Disseminate', pos: 'verb', meaning: 'To spread information widely', synonyms: ['circulate', 'propagate'], antonyms: ['withhold', 'suppress'], sentence: 'Digital platforms disseminate information faster than any traditional medium.' },
  { word: 'Eloquent', pos: 'adjective', meaning: 'Fluent and persuasive in speech or writing', synonyms: ['articulate', 'expressive'], antonyms: ['inarticulate', 'hesitant'], sentence: 'An eloquent introduction sets the tone for the entire essay.' },
  { word: 'Empirical', pos: 'adjective', meaning: 'Based on observation or experiment rather than theory', synonyms: ['observed', 'evidence-based'], antonyms: ['theoretical', 'speculative'], sentence: 'Policy claims should be supported by empirical evidence.' },
  { word: 'Exacerbate', pos: 'verb', meaning: 'To make a problem worse', synonyms: ['aggravate', 'worsen'], antonyms: ['alleviate', 'ameliorate'], sentence: 'Populist spending can exacerbate the fiscal deficit.' },
  { word: 'Fastidious', pos: 'adjective', meaning: 'Very attentive to accuracy and detail', synonyms: ['meticulous', 'exacting'], antonyms: ['careless', 'sloppy'], sentence: 'Fastidious attention to grammar is essential for the precis paper.' },
  { word: 'Feasible', pos: 'adjective', meaning: 'Possible and practical to achieve', synonyms: ['viable', 'practicable'], antonyms: ['impossible', 'impractical'], sentence: 'A ten-hour daily plan is not feasible for working professionals.' },
  { word: 'Futile', pos: 'adjective', meaning: 'Incapable of producing any useful result; pointless', synonyms: ['vain', 'fruitless'], antonyms: ['fruitful', 'effective'], sentence: 'Last-minute cramming without revision is largely futile.' },
  { word: 'Imminent', pos: 'adjective', meaning: 'About to happen very soon', synonyms: ['impending', 'approaching'], antonyms: ['distant', 'remote'], sentence: 'With the exam imminent, revision should replace new reading.' },
  { word: 'Imperative', pos: 'adjective', meaning: 'Of vital importance; crucial', synonyms: ['essential', 'vital'], antonyms: ['optional', 'trivial'], sentence: 'It is imperative that candidates verify dates from FPSC notices.' },
  { word: 'Inevitable', pos: 'adjective', meaning: 'Certain to happen; unavoidable', synonyms: ['unavoidable', 'inescapable'], antonyms: ['avoidable', 'preventable'], sentence: 'Some mistakes in early mock tests are inevitable and instructive.' },
  { word: 'Lucid', pos: 'adjective', meaning: 'Expressed clearly; easy to understand', synonyms: ['clear', 'coherent'], antonyms: ['obscure', 'confusing'], sentence: 'Examiners reward a lucid argument over ornamental prose.' },
  { word: 'Meticulous', pos: 'adjective', meaning: 'Showing great attention to detail; very careful', synonyms: ['thorough', 'precise'], antonyms: ['careless', 'hasty'], sentence: 'Meticulous note-making saves weeks during final revision.' },
  { word: 'Mitigate', pos: 'verb', meaning: 'To make less severe or harmful', synonyms: ['reduce', 'alleviate'], antonyms: ['aggravate', 'intensify'], sentence: 'Early warning systems mitigate the impact of natural disasters.' },
  { word: 'Pragmatic', pos: 'adjective', meaning: 'Dealing with problems in a practical rather than theoretical way', synonyms: ['practical', 'realistic'], antonyms: ['idealistic', 'impractical'], sentence: 'A pragmatic study plan leaves room for revision and rest.' },
  { word: 'Prolific', pos: 'adjective', meaning: 'Producing a great number or amount', synonyms: ['productive', 'fertile'], antonyms: ['unproductive', 'barren'], sentence: 'A prolific reading habit feeds both Essay and Current Affairs answers.' },
  { word: 'Resilient', pos: 'adjective', meaning: 'Able to recover quickly from difficulties', synonyms: ['tough', 'adaptable'], antonyms: ['fragile', 'vulnerable'], sentence: 'A resilient economy absorbs external shocks without collapsing.' },
  { word: 'Scrutinise', pos: 'verb', meaning: 'To examine carefully and critically', synonyms: ['inspect', 'examine'], antonyms: ['overlook', 'glance'], sentence: 'Candidates should scrutinise the syllabus before choosing optional subjects.' },
  { word: 'Sporadic', pos: 'adjective', meaning: 'Occurring at irregular intervals', synonyms: ['intermittent', 'occasional'], antonyms: ['regular', 'continuous'], sentence: 'Sporadic study sessions cannot replace a disciplined routine.' },
  { word: 'Tangible', pos: 'adjective', meaning: 'Clear and definite; real enough to be measured', synonyms: ['concrete', 'measurable'], antonyms: ['intangible', 'abstract'], sentence: 'Weekly mock tests provide tangible evidence of progress.' },
  { word: 'Tenacious', pos: 'adjective', meaning: 'Holding firmly to a purpose; persistent', synonyms: ['persistent', 'determined'], antonyms: ['yielding', 'irresolute'], sentence: 'Tenacious candidates improve with every failed attempt.' },
  { word: 'Ubiquitous', pos: 'adjective', meaning: 'Present or found everywhere', synonyms: ['omnipresent', 'pervasive'], antonyms: ['rare', 'scarce'], sentence: 'Smartphones have become ubiquitous in urban Pakistan.' },
  { word: 'Viable', pos: 'adjective', meaning: 'Capable of working successfully', synonyms: ['workable', 'feasible'], antonyms: ['unworkable', 'impossible'], sentence: 'Local manufacturing is a viable path to reduce import dependence.' },
  { word: 'Volatile', pos: 'adjective', meaning: 'Liable to change rapidly and unpredictably', synonyms: ['unstable', 'unpredictable'], antonyms: ['stable', 'steady'], sentence: 'Volatile exchange rates complicate trade planning.' },
  { word: 'Zealous', pos: 'adjective', meaning: 'Showing great energy and enthusiasm for a cause', synonyms: ['ardent', 'fervent'], antonyms: ['apathetic', 'indifferent'], sentence: 'Zealous preparation must still leave space for sleep and health.' },
]
