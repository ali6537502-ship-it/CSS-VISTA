// Fact-checked game data for the CSS Games centre
export interface MatchPair {
  concept: string
  match: string
  /** Set when the pair came from a real MCQ, so attempts can be recorded. */
  questionId?: string
  /** Category the question belongs to, for attempt records. */
  category?: string
}
export interface TimelineItem { event: string; year: number }
export interface CountryFact { country: string; clue: string }

export const constitutionTimeline: TimelineItem[] = [
  { event: 'Pakistan gains independence', year: 1947 },
  { event: 'Objectives Resolution passed', year: 1949 },
  { event: 'First Constitution enforced', year: 1956 },
  { event: 'Second Constitution (presidential)', year: 1962 },
  { event: 'Third (current) Constitution enforced', year: 1973 },
  { event: '8th Amendment', year: 1985 },
  { event: '18th Amendment', year: 2010 },
  { event: '25th Amendment (FATA merger)', year: 2018 },
]

export const pakistanMovementTimeline: TimelineItem[] = [
  { event: 'War of Independence', year: 1857 },
  { event: 'All-India Muslim League founded', year: 1906 },
  { event: 'Lucknow Pact', year: 1916 },
  { event: 'Nehru Report', year: 1928 },
  { event: 'Allama Iqbal’s Allahabad Address', year: 1930 },
  { event: 'Lahore Resolution', year: 1940 },
  { event: 'Simla Conference', year: 1945 },
  { event: '3rd June Plan', year: 1947 },
]

export const matchConcepts: { title: string; pairs: MatchPair[] }[] = [
  {
    title: 'Constitutional Concepts',
    pairs: [
      { concept: 'Article 25-A', match: 'Right to education' },
      { concept: 'Article 19', match: 'Freedom of speech' },
      { concept: 'Article 6', match: 'High treason' },
      { concept: '18th Amendment', match: 'Provincial autonomy' },
      { concept: 'Objectives Resolution', match: '1949' },
      { concept: 'Trichotomy of power', match: 'Executive, legislature, judiciary' },
    ],
  },
  {
    title: 'Economic Concepts',
    pairs: [
      { concept: 'GDP', match: 'Total output of an economy' },
      { concept: 'Fiscal deficit', match: 'Spending minus revenue' },
      { concept: 'Circular debt', match: 'Energy-sector arrears' },
      { concept: 'Remittances', match: 'Overseas workers’ transfers' },
      { concept: 'Tax-to-GDP', match: 'Revenue effort measure' },
      { concept: 'Inflation', match: 'General rise in prices' },
    ],
  },
  {
    title: 'IR & Organisations',
    pairs: [
      { concept: 'UNSC', match: '15 members, 5 permanent' },
      { concept: 'SAARC', match: 'South Asian regional body' },
      { concept: 'OIC', match: '57 member states' },
      { concept: 'SCO', match: 'Founded 2001, Shanghai' },
      { concept: 'CPEC', match: 'Flagship of BRI' },
      { concept: 'ICJ', match: 'Principal UN judicial organ' },
    ],
  },
  {
    title: 'Political Thinkers & Works',
    pairs: [
      { concept: 'Plato', match: 'The Republic' },
      { concept: 'Aristotle', match: 'Politics' },
      { concept: 'Niccolò Machiavelli', match: 'The Prince' },
      { concept: 'Thomas Hobbes', match: 'Leviathan' },
      { concept: 'John Locke', match: 'Two Treatises of Government' },
      { concept: 'Jean-Jacques Rousseau', match: 'The Social Contract' },
    ],
  },
  {
    title: 'Criminology Theories',
    pairs: [
      { concept: 'Cesare Beccaria', match: 'Classical school' },
      { concept: 'Cesare Lombroso', match: 'Positivist school' },
      { concept: 'Émile Durkheim', match: 'Anomie' },
      { concept: 'Robert K. Merton', match: 'Strain theory' },
      { concept: 'Edwin Sutherland', match: 'Differential association' },
      { concept: 'Howard Becker', match: 'Labelling theory' },
    ],
  },
  {
    title: 'Environmental Agreements',
    pairs: [
      { concept: 'Ramsar Convention', match: 'Wetlands' },
      { concept: 'Montreal Protocol', match: 'Ozone-depleting substances' },
      { concept: 'UNFCCC', match: 'Global climate framework' },
      { concept: 'Kyoto Protocol', match: 'Emission-reduction commitments' },
      { concept: 'Paris Agreement', match: 'National climate pledges' },
      { concept: 'CITES', match: 'Trade in endangered species' },
    ],
  },
  {
    title: 'Human Biology',
    pairs: [
      { concept: 'Nephron', match: 'Functional unit of the kidney' },
      { concept: 'Neuron', match: 'Nervous-system signalling cell' },
      { concept: 'Alveoli', match: 'Gas exchange in the lungs' },
      { concept: 'Red blood cell', match: 'Oxygen transport' },
      { concept: 'Platelets', match: 'Blood clotting' },
      { concept: 'Insulin', match: 'Lowers blood glucose' },
    ],
  },
  {
    title: 'European History Foundations',
    pairs: [
      { concept: 'Renaissance', match: 'Revival of classical learning' },
      { concept: 'Reformation', match: 'European religious reform movement' },
      { concept: 'Congress of Vienna', match: 'Post-Napoleonic settlement' },
      { concept: 'Concert of Europe', match: 'Great-power consultation system' },
      { concept: 'Industrial Revolution', match: 'Mechanised factory production' },
      { concept: 'Treaty of Versailles', match: 'Peace settlement after World War I' },
    ],
  },
  {
    title: 'Gender Studies Concepts',
    pairs: [
      { concept: 'Patriarchy', match: 'System structured by male dominance' },
      { concept: 'Gender mainstreaming', match: 'Integrating gender impacts into policy' },
      { concept: 'CEDAW', match: 'Convention against discrimination toward women' },
      { concept: 'Intersectionality', match: 'Overlapping systems of disadvantage' },
      { concept: 'Glass ceiling', match: 'Hidden barrier to advancement' },
      { concept: 'Gender parity', match: 'Equal numerical representation' },
    ],
  },
  {
    title: 'Public Administration',
    pairs: [
      { concept: 'Span of control', match: 'Number of subordinates supervised' },
      { concept: 'Delegation', match: 'Transfer of authority to another level' },
      { concept: 'Accountability', match: 'Answerability for decisions and conduct' },
      { concept: 'Decentralisation', match: 'Authority shifted away from the centre' },
      { concept: 'Merit system', match: 'Selection based on competence' },
      { concept: 'Ombudsman', match: 'Investigator of maladministration complaints' },
    ],
  },
  {
    title: 'International Law',
    pairs: [
      { concept: 'Pacta sunt servanda', match: 'Agreements must be kept' },
      { concept: 'Jus cogens', match: 'Peremptory norm of international law' },
      { concept: 'Extradition', match: 'Surrender of an accused or convicted person' },
      { concept: 'Asylum', match: 'Protection granted by a state' },
      { concept: 'Diplomatic immunity', match: 'Protection from host-state jurisdiction' },
      { concept: 'State responsibility', match: 'Consequences of an internationally wrongful act' },
    ],
  },
  {
    title: 'Sociology & Anthropology',
    pairs: [
      { concept: 'Socialisation', match: 'Learning social norms and values' },
      { concept: 'Ethnocentrism', match: 'Judging cultures by one’s own standards' },
      { concept: 'Cultural relativism', match: 'Understanding a culture on its own terms' },
      { concept: 'Kinship', match: 'Relations organised through descent and marriage' },
      { concept: 'Participant observation', match: 'Field research through direct involvement' },
      { concept: 'Social stratification', match: 'Ranked patterns of social inequality' },
    ],
  },
  {
    title: 'Journalism & Communication',
    pairs: [
      { concept: 'Inverted pyramid', match: 'Most important information presented first' },
      { concept: 'Gatekeeping', match: 'Selection of information for publication' },
      { concept: 'Agenda-setting', match: 'Media influence over issue salience' },
      { concept: 'Lead', match: 'Opening of a news story' },
      { concept: 'Byline', match: 'Identification of the writer' },
      { concept: 'Libel', match: 'Published defamatory statement' },
    ],
  },
  {
    title: 'Geography Tools',
    pairs: [
      { concept: 'Isobar', match: 'Line joining equal atmospheric pressure' },
      { concept: 'Contour line', match: 'Line joining equal elevation' },
      { concept: 'Latitude', match: 'Angular distance north or south of the equator' },
      { concept: 'Longitude', match: 'Angular distance east or west of the prime meridian' },
      { concept: 'Watershed', match: 'Divide between drainage basins' },
      { concept: 'Orographic rainfall', match: 'Rainfall caused by air rising over relief' },
    ],
  },
  {
    title: 'Statistics & Research',
    pairs: [
      { concept: 'Mean', match: 'Arithmetic average' },
      { concept: 'Median', match: 'Middle value in ordered data' },
      { concept: 'Mode', match: 'Most frequently occurring value' },
      { concept: 'Standard deviation', match: 'Dispersion around the mean' },
      { concept: 'Correlation', match: 'Degree of association between variables' },
      { concept: 'Simple random sample', match: 'Each unit has an equal selection chance' },
    ],
  },
  {
    title: 'Philosophy',
    pairs: [
      { concept: 'Epistemology', match: 'Study of knowledge' },
      { concept: 'Metaphysics', match: 'Study of being and reality' },
      { concept: 'Ethics', match: 'Study of morality' },
      { concept: 'Logic', match: 'Study of valid reasoning' },
      { concept: 'Empiricism', match: 'Knowledge grounded in sense experience' },
      { concept: 'Rationalism', match: 'Reason as a primary source of knowledge' },
    ],
  },
  {
    title: 'Law Fundamentals',
    pairs: [
      { concept: 'Mens rea', match: 'Guilty mind' },
      { concept: 'Actus reus', match: 'Guilty act' },
      { concept: 'Precedent', match: 'Prior judicial decision used as authority' },
      { concept: 'Tort', match: 'Civil wrong' },
      { concept: 'Habeas corpus', match: 'Judicial review of detention' },
      { concept: 'Ultra vires', match: 'Beyond legal powers' },
    ],
  },
  {
    title: 'Punjabi Language & Literature',
    pairs: [
      { concept: 'Shahmukhi', match: 'Perso-Arabic script used for Punjabi in Pakistan' },
      { concept: 'Gurmukhi', match: 'Script associated with Punjabi in Indian Punjab' },
      { concept: 'Kafi', match: 'Short lyrical form often used by Sufi poets' },
      { concept: 'Qissa', match: 'Narrative romance tradition' },
      { concept: 'Vaar', match: 'Heroic ballad form' },
      { concept: 'Boli', match: 'Short Punjabi folk verse' },
    ],
  },
  {
    title: 'Computer Science Foundations',
    pairs: [
      { concept: 'Algorithm', match: 'Finite step-by-step procedure' },
      { concept: 'Compiler', match: 'Translates source code before execution' },
      { concept: 'DBMS', match: 'Software for managing structured data' },
      { concept: 'Operating system', match: 'Manages hardware and system resources' },
      { concept: 'IP address', match: 'Numeric identifier on an IP network' },
      { concept: 'Binary system', match: 'Base-two number system' },
    ],
  },
  {
    title: 'Physics & Chemistry',
    pairs: [
      { concept: 'Newton', match: 'SI unit of force' },
      { concept: 'Joule', match: 'SI unit of energy' },
      { concept: 'Ampere', match: 'SI base unit of electric current' },
      { concept: 'Mole', match: 'SI base unit of amount of substance' },
      { concept: 'pH', match: 'Measure related to acidity or alkalinity' },
      { concept: 'Catalyst', match: 'Changes reaction rate without being consumed' },
    ],
  },
  {
    title: 'Agriculture & Botany',
    pairs: [
      { concept: 'Xylem', match: 'Transports water and minerals in plants' },
      { concept: 'Phloem', match: 'Transports sugars in plants' },
      { concept: 'Photosynthesis', match: 'Conversion of light into chemical energy' },
      { concept: 'Crop rotation', match: 'Planned sequence of crops on the same land' },
      { concept: 'Pollination', match: 'Transfer of pollen to a receptive stigma' },
      { concept: 'Nitrogen fixation', match: 'Conversion of atmospheric nitrogen into usable compounds' },
    ],
  },
  {
    title: 'Governance & Public Policy',
    pairs: [
      { concept: 'Federalism', match: 'Constitutional division of power between levels' },
      { concept: 'Devolution', match: 'Transfer of authority to subnational units' },
      { concept: 'Public policy', match: 'Course of action adopted by government' },
      { concept: 'Regulatory impact assessment', match: 'Evaluation of a proposed regulation’s effects' },
      { concept: 'Stakeholder consultation', match: 'Input from groups affected by a decision' },
      { concept: 'Transparency', match: 'Openness of decisions and information' },
    ],
  },
  {
    title: 'Language & Linguistics',
    pairs: [
      { concept: 'Phonology', match: 'Study of sound systems' },
      { concept: 'Morphology', match: 'Study of word structure' },
      { concept: 'Syntax', match: 'Study of sentence structure' },
      { concept: 'Semantics', match: 'Study of meaning' },
      { concept: 'Pragmatics', match: 'Study of meaning in context' },
      { concept: 'Prosody', match: 'Rhythm, stress and intonation' },
    ],
  },
]
