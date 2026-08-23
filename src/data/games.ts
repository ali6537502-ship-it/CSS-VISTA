// Fact-checked game data for the CSS Games centre
export interface MatchPair { concept: string; match: string }
export interface TimelineItem { event: string; year: number }
export interface CountryFact { country: string; clue: string }

export const pakistanGeography: { question: string; options: string[]; answer: number; explanation: string }[] = [
  { question: 'Which is the northernmost administrative region of Pakistan?', options: ['Khyber Pakhtunkhwa', 'Gilgit-Baltistan', 'Azad Jammu & Kashmir', 'Balochistan'], answer: 1, explanation: 'Gilgit-Baltistan lies in Pakistan’s far north and contains K2.' },
  { question: 'The Khyber Pass connects Pakistan with which country?', options: ['Iran', 'China', 'Afghanistan', 'India'], answer: 2, explanation: 'The Khyber Pass links Peshawar with Afghanistan.' },
  { question: 'Which river is called the lifeline of Pakistan’s agriculture?', options: ['Chenab', 'Indus', 'Jhelum', 'Ravi'], answer: 1, explanation: 'The Indus and its tributaries sustain the canal system.' },
  { question: 'Gwadar is located on the coast of which sea?', options: ['Red Sea', 'Arabian Sea', 'Bay of Bengal', 'Caspian Sea'], answer: 1, explanation: 'Gwadar is a deep-sea port on the Arabian Sea in Balochistan.' },
  { question: 'Which province shares its border with Iran?', options: ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan'], answer: 3, explanation: 'Balochistan forms Pakistan’s western frontier with Iran.' },
  { question: 'The Thar Desert lies mostly in which province?', options: ['Punjab', 'Sindh', 'Balochistan', 'Khyber Pakhtunkhwa'], answer: 1, explanation: 'Tharparkar district in Sindh contains most of the Thar.' },
  { question: 'Which city is known as the "City of Saints"?', options: ['Multan', 'Lahore', 'Peshawar', 'Quetta'], answer: 0, explanation: 'Multan is famed for its Sufi shrines.' },
  { question: 'The Bolan Pass connects Quetta with which region?', options: ['Sindh plains', 'Punjab', 'Gilgit', 'Kashmir'], answer: 0, explanation: 'The Bolan Pass links Quetta to Sibi and the Sindh plains.' },
  { question: 'Which is the highest peak of the Hindu Kush in Pakistan?', options: ['Nanga Parbat', 'Tirich Mir', 'Rakaposhi', 'K2'], answer: 1, explanation: 'Tirich Mir (7,708 m) is the Hindu Kush’s highest peak.' },
  { question: 'The Karakoram Highway connects Pakistan to China via which pass?', options: ['Khunjerab Pass', 'Khyber Pass', 'Lowari Pass', 'Shandur Pass'], answer: 0, explanation: 'The KKH crosses into China at Khunjerab Pass.' },
]

export const worldGeography: { question: string; options: string[]; answer: number; explanation: string }[] = [
  { question: 'Which country is separated from Pakistan by the Durand Line?', options: ['Iran', 'Afghanistan', 'India', 'China'], answer: 1, explanation: 'The Durand Line is the Pakistan–Afghanistan boundary.' },
  { question: 'The Strait of Hormuz connects the Persian Gulf with:', options: ['Red Sea', 'Gulf of Oman', 'Mediterranean Sea', 'Black Sea'], answer: 1, explanation: 'Hormuz links the Persian Gulf to the Gulf of Oman and the Arabian Sea.' },
  { question: 'Which sea lies between Saudi Arabia and Africa?', options: ['Arabian Sea', 'Red Sea', 'Caspian Sea', 'Dead Sea'], answer: 1, explanation: 'The Red Sea separates the Arabian Peninsula from Africa.' },
  { question: 'The Bosphorus Strait divides which city?', options: ['Cairo', 'Istanbul', 'Athens', 'Beirut'], answer: 1, explanation: 'Istanbul straddles the Bosphorus between Europe and Asia.' },
  { question: 'Which country has the longest coastline in the world?', options: ['Russia', 'Australia', 'Canada', 'Indonesia'], answer: 2, explanation: 'Canada’s coastline is the world’s longest.' },
  { question: 'The Sahel region lies south of which desert?', options: ['Gobi', 'Sahara', 'Kalahari', 'Atacama'], answer: 1, explanation: 'The Sahel is the transition zone south of the Sahara.' },
  { question: 'Which country is landlocked?', options: ['Iran', 'Afghanistan', 'Turkey', 'Iraq'], answer: 1, explanation: 'Afghanistan has no coastline.' },
  { question: 'The Strait of Malacca connects the Indian Ocean with:', options: ['Atlantic Ocean', 'Pacific Ocean', 'Arctic Ocean', 'Southern Ocean'], answer: 1, explanation: 'Malacca links the Indian Ocean to the South China Sea (Pacific).' },
  { question: 'Which African country was never formally colonised?', options: ['Kenya', 'Ethiopia', 'Nigeria', 'Ghana'], answer: 1, explanation: 'Ethiopia resisted colonisation (except Italian occupation 1936–41).' },
  { question: 'The Kashmir region is administered in parts by Pakistan, India and:', options: ['Nepal', 'China', 'Afghanistan', 'Bhutan'], answer: 1, explanation: 'China administers Aksai Chin and the Trans-Karakoram tract.' },
]

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

export const internationalOrgs: { question: string; options: string[]; answer: number; explanation: string }[] = [
  { question: 'How many permanent members does the UN Security Council have?', options: ['5', '10', '15', '20'], answer: 0, explanation: 'Five permanent members: China, France, Russia, UK, USA.' },
  { question: 'The IMF is headquartered in:', options: ['Geneva', 'Washington D.C.', 'New York', 'London'], answer: 1, explanation: 'The IMF is based in Washington D.C.' },
  { question: 'Pakistan joined the SCO as a full member in:', options: ['2001', '2010', '2017', '2021'], answer: 2, explanation: 'Pakistan and India became full SCO members in 2017.' },
  { question: 'The OIC has how many member states?', options: ['27', '42', '57', '65'], answer: 2, explanation: 'The OIC comprises 57 member states.' },
  { question: 'The World Bank’s soft-loan arm is called:', options: ['IBRD', 'IDA', 'IFC', 'MIGA'], answer: 1, explanation: 'IDA provides concessional lending to the poorest countries.' },
  { question: 'SAARC has how many member states?', options: ['6', '7', '8', '9'], answer: 2, explanation: 'Eight members: Afghanistan, Bangladesh, Bhutan, India, Maldives, Nepal, Pakistan, Sri Lanka.' },
  { question: 'The ICJ sits in:', options: ['Geneva', 'The Hague', 'Vienna', 'Paris'], answer: 1, explanation: 'The International Court of Justice is in The Hague.' },
  { question: 'The UN was founded in:', options: ['1919', '1945', '1950', '1939'], answer: 1, explanation: 'The UN Charter was signed in San Francisco in 1945.' },
  { question: 'Which agency deals with refugees?', options: ['UNICEF', 'UNHCR', 'UNESCO', 'FAO'], answer: 1, explanation: 'UNHCR is the UN refugee agency.' },
  { question: 'The WTO is headquartered in:', options: ['New York', 'Geneva', 'Brussels', 'Paris'], answer: 1, explanation: 'The WTO is based in Geneva, Switzerland.' },
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
