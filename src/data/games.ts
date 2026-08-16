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
      { concept: 'Article 17', match: 'Freedom of association' },
      { concept: 'Council of Common Interests', match: 'Federal–provincial coordination' },
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
      { concept: 'Monetary policy', match: 'Central-bank demand management' },
      { concept: 'Current account', match: 'External transactions balance' },
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
      { concept: 'WTO', match: 'Multilateral trade rules' },
      { concept: 'IMF', match: 'Balance-of-payments support' },
    ],
  },
  {
    title: 'Political Thinkers',
    pairs: [
      { concept: 'Thomas Hobbes', match: 'Leviathan' },
      { concept: 'John Locke', match: 'Two Treatises of Government' },
      { concept: 'Jean-Jacques Rousseau', match: 'The Social Contract' },
      { concept: 'Plato', match: 'The Republic' },
      { concept: 'Aristotle', match: 'Politics' },
      { concept: 'Machiavelli', match: 'The Prince' },
      { concept: 'John Stuart Mill', match: 'On Liberty' },
      { concept: 'Allama Muhammad Iqbal', match: 'Reconstruction of Religious Thought in Islam' },
    ],
  },
  {
    title: 'Criminology Theories',
    pairs: [
      { concept: 'Cesare Lombroso', match: 'Biological positivism' },
      { concept: 'Edwin Sutherland', match: 'Differential association' },
      { concept: 'Robert Merton', match: 'Strain theory' },
      { concept: 'Travis Hirschi', match: 'Social bond theory' },
      { concept: 'Howard Becker', match: 'Labelling theory' },
      { concept: 'Jeremy Bentham', match: 'Classical deterrence' },
      { concept: 'Shaw and McKay', match: 'Social disorganization' },
      { concept: 'Lawrence Cohen and Marcus Felson', match: 'Routine activity theory' },
    ],
  },
  {
    title: 'European History',
    pairs: [
      { concept: 'Tennis Court Oath', match: '20 June 1789' },
      { concept: 'Storming of the Bastille', match: '14 July 1789' },
      { concept: 'Congress of Vienna', match: '1814–1815' },
      { concept: 'Metternich', match: 'Austrian statesman' },
      { concept: 'Napoleon Bonaparte', match: 'French emperor' },
      { concept: 'Treaty of Versailles', match: '1919' },
      { concept: 'Revolutions of 1848', match: 'Springtime of Nations' },
      { concept: 'Otto von Bismarck', match: 'German unification' },
    ],
  },
]
