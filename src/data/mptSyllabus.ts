export interface MptSyllabusSection {
  title: string
  items: string[]
  rtl?: boolean
}

export interface MptSyllabusSubject {
  id: string
  title: string
  marks: number
  note: string
  sections: MptSyllabusSection[]
}

export const mptOfficialSources = {
  rules: {
    label: 'FPSC MPT Rules',
    url: 'https://www.fpsc.gov.pk/assets/media/2024-06-13-MPT-rules.pdf',
  },
  mptSyllabus: {
    label: 'FPSC MPT Syllabus',
    url: 'https://www.fpsc.gov.pk/uploads/syllabus/1767073666057_MPT-Syllabus.pdf',
  },
  compulsorySyllabus: {
    label: 'FPSC CSS compulsory-subject syllabus',
    url: 'https://www.fpsc.gov.pk/uploads/syllabus/1767002683737_Syllabus-for-CE-2016-and-onwards.pdf',
  },
  lastVerified: '18 July 2026',
}

export const mptFacts = [
  { label: 'Paper', value: '200 MCQs' },
  { label: 'Marks', value: '200' },
  { label: 'Duration', value: '200 minutes' },
  { label: 'Qualifying threshold', value: '33%' },
]

export const mptSyllabusSubjects: MptSyllabusSubject[] = [
  {
    id: 'islamic-civics',
    title: 'Islamic Studies / Civics & Ethics',
    marks: 20,
    note: 'Muslim candidates take Islamic Studies. Non-Muslim candidates may opt for either Civics & Ethics or Islamic Studies.',
    sections: [
      {
        title: 'Islamic Studies',
        items: [
          'Introduction to Islam: concept and distinctive aspects of Islam; importance of Din; difference between Din and religion; Islamic beliefs and fundamentals; spiritual, moral and social impact of worship.',
          'Seerah of the Prophet Muhammad (PBUH) as a role model for the individual, diplomat, educator, military strategist and peacemaker.',
          'Human rights and the status and dignity of women and men in Islam.',
          'Islamic civilization and culture: meaning, vital elements, community development, Tawhid, self-purification, human dignity, equality, social justice, moral values, tolerance and rule of law.',
          'Islam and the world: mutual impact of Islamic and Western civilization, Islam in the modern world, contemporary challenges facing the Muslim world and the rise of extremism.',
          'Public administration and governance in Islam: Quranic guidance, Shura, legislation, sources of Islamic law, governance under the Pious Caliphate, responsibilities of civil servants and accountability (Hisbah).',
          'Islamic code of life: social, political, economic, judicial and administrative systems; Ijma and Ijtihad.',
        ],
      },
      {
        title: 'Civics (non-Muslim option)',
        items: [
          'Definition, nature and significance of civics.',
          'The state and its elements; organs of the state.',
          'Fundamental human rights.',
          'Rights and obligations of non-Muslims under the Constitution of Pakistan, 1973.',
          'United Nations aims and objectives, principal organs and agencies.',
        ],
      },
      {
        title: 'Ethics (non-Muslim option)',
        items: [
          'Human values and the role of family, society and educational institutions in inculcating universal moral values.',
          'Integrity, impartiality and non-partisanship; objectivity; dedication to public service; empathy, tolerance and compassion towards weaker sections.',
          'Emotional intelligence: concepts and application in administration and governance.',
        ],
      },
    ],
  },
  {
    id: 'urdu',
    title: 'Urdu',
    marks: 20,
    note: 'Urdu grammar usage and translation, as listed in the official FPSC MPT syllabus.',
    sections: [
      {
        title: 'صرف و نحو کا استعمال',
        rtl: true,
        items: [
          'اقسامِ کلمہ / اجزائے کلام، ترکیبی فعل، زمانے',
          'واحد جمع، جملے کی ساخت، الفاظ کے جوڑے، مذکر و مونث، مترادف اور متضاد الفاظ',
          'ترجمہ',
        ],
      },
    ],
  },
  {
    id: 'english',
    title: 'English',
    marks: 50,
    note: 'The MPT rules specify English vocabulary, grammar usage and comprehension.',
    sections: [
      {
        title: 'Vocabulary and grammar usage',
        items: [
          'Vocabulary in context, synonyms and antonyms, phrasal verbs, grouping of words and commonly confused pairs of words.',
          'Correct use of tenses, articles, prepositions, conjunctions and punctuation.',
          'Sentence structure and sentence correction.',
        ],
      },
      {
        title: 'Comprehension',
        items: ['Understanding the main idea, detail, inference, vocabulary and meaning in an unseen English passage.'],
      },
    ],
  },
  {
    id: 'abilities',
    title: 'General Abilities',
    marks: 60,
    note: 'The official rules set the mathematics standard at Secondary School Certificate (SSC) level.',
    sections: [
      {
        title: 'Quantitative ability',
        items: [
          'Basic arithmetic at SSC level: averages, ratios, rates, percentages, remainders and rounding of numbers.',
          'Algebra at SSC level: equations, symbols, sets and quantitative problem solving.',
          'Geometry at SSC level: angles, triangles and basic geometric problem solving.',
        ],
      },
      {
        title: 'Reasoning and mental ability',
        items: [
          'Logical problem solving using a rational and systematic series of steps.',
          'Analytical ability: interpreting information, visualising relationships and solving simple and complex problems.',
          'Mental abilities, including verbal, mechanical, numerical and social ability.',
        ],
      },
    ],
  },
  {
    id: 'general-knowledge',
    title: 'General Knowledge',
    marks: 50,
    note: 'The MPT rules combine Everyday Science, Current Affairs and Pakistan Affairs within General Knowledge.',
    sections: [
      {
        title: 'Everyday Science',
        items: [
          'Physical science: universe and solar system; natural processes, weather, hazards, energy resources, atomic structure, chemical bonding, radiation and modern materials and chemicals.',
          'Biological science: cells and organelles, biomolecules, plant and animal kingdoms, human physiology, common diseases and epidemics, and biofuel.',
          'Environmental science: atmosphere, hydrosphere, biosphere and lithosphere; air, water and land pollution; climate agreements; GIS and remote sensing; population planning.',
          'Food science: balanced diet and nutrients, food quality, additives, deterioration, adulteration and preservation.',
          'Information technology: hardware and software, input/output and storage, networks and internet standards, applications, social media, information systems, artificial intelligence and telecommunications.',
        ],
      },
      {
        title: 'Current Affairs',
        items: [
          'Pakistan domestic affairs: political, economic and social developments.',
          'Pakistan external affairs: relations with neighbouring states, the Muslim world, the United States, and regional and international organisations including the UN, SAARC, ECO, OIC, WTO and GCC.',
          'Global issues: international security and political economy; human rights; climate and environment; population; terrorism and counter-terrorism; energy politics; nuclear security and South Asian nuclear politics; international trade; Indian, Pacific and Arabian Sea competition; global development goals; globalisation; the Middle East; Kashmir and Palestine.',
        ],
      },
      {
        title: 'Pakistan Affairs',
        items: [
          'Ideology of Pakistan, Muslim rule in the subcontinent, reform movements, educational institutions, and the ideas of Allama Iqbal and Quaid-i-Azam Muhammad Ali Jinnah.',
          'Land and people of Pakistan: geography, society, natural resources, agriculture, industry and education.',
          'Pakistan and the changing regional environment; Pakistan’s role in the region and regional organisations (SAARC, ECO and SCO).',
          'Pakistan’s nuclear programme, safety and security, and international concerns.',
          'Civil-military relations; political evolution since 1971; democratic development; ethnic issues and national integration.',
          'Economic challenges, energy problems, major economic sectors, the latest Economic Survey and federal budgets.',
          'Traditional and non-traditional security threats, national interest, sovereignty, terrorism, proxy wars and external actors.',
          'Foreign policy after 9/11; relations with the United States, India and other neighbours; Afghanistan since 1979; Kashmir and Palestine.',
          'Hydropolitics and water issues in domestic and regional contexts.',
          'Recent constitutional and legal debates, amendments, important legislation, major cases and the role of higher courts.',
          'Social problems and responses, including poverty, education, health and sanitation.',
        ],
      },
    ],
  },
]
