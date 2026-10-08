// Current Affairs issue files. These are background/structural analyses of continuing issues,
// not breaking news. Each file is dated and sourced; update regularly.
export interface CAIssue {
  slug: string
  title: string
  category: 'Pakistan Domestic' | 'Pakistan External' | 'Global' | 'Economy' | 'Governance' | 'Security' | 'Environment' | 'Science & Tech' | 'International Organisations' | 'Regional'
  background: string
  actors: string[]
  causes: string[]
  developments: string[]
  pakistanImplications: string[]
  globalImplications: string[]
  challenges: string[]
  opportunities: string[]
  policyOptions: string[]
  statistics: { figure: string; source: string }[]
  timeline: { year: string; event: string }[]
  pastPaperAngles: string[]
  analyticalQuestions: string[]
  sources: { name: string; url: string }[]
  lastUpdated: string
}

export const caIssues: CAIssue[] = [
  {
    slug: 'climate-vulnerability',
    title: 'Climate Change and Pakistan’s Vulnerability',
    category: 'Environment',
    background: 'Pakistan is among the countries most exposed to climate risk despite contributing a small fraction of global emissions. Extreme heat, glacial melt, erratic monsoons and the catastrophic 2022 floods have made adaptation a national priority.',
    actors: ['Government of Pakistan (Ministry of Climate Change)', 'NDMA/PDMAs', 'UNFCCC and COP process', 'Multilateral climate funds', 'Provincial governments'],
    causes: ['Rising global temperatures and changing monsoon patterns', 'Glacial lake outburst flood (GLOF) risk in the north', 'Water-management and infrastructure deficits', 'Rapid unplanned urbanisation'],
    developments: ['Loss and Damage fund operationalised through the COP process', 'Pakistan’s updated Nationally Determined Contributions (NDCs)', 'Post-2022 reconstruction and resilience planning'],
    pakistanImplications: ['Food and water security stress', 'Fiscal burden of disaster response', 'Climate-induced displacement', 'Energy-planning pressure'],
    globalImplications: ['Test case for climate justice and adaptation finance', 'Regional water-sharing questions', 'Migration pressures'],
    challenges: ['Financing gap for adaptation', 'Institutional coordination across provinces', 'Data and early-warning coverage'],
    opportunities: ['Green finance and carbon markets', 'Renewable energy expansion', 'Climate-resilient agriculture'],
    policyOptions: ['Accelerate adaptation planning and early-warning systems', 'Expand mangrove and watershed restoration', 'Reform water pricing and conservation', 'Pursue adaptation finance through multilateral channels'],
    statistics: [
      { figure: 'The 2022 floods affected around 33 million people and caused damage and losses assessed above $30 billion.', source: 'Government of Pakistan / World Bank / ADB / EU Post-Disaster Needs Assessment (2022)' },
      { figure: 'Pakistan contributes well under 1% of global greenhouse-gas emissions.', source: 'Pakistan’s national communications to the UNFCCC' },
    ],
    timeline: [
      { year: '2015', event: 'Paris Agreement adopted; Pakistan later ratifies and submits NDCs' },
      { year: '2022', event: 'Catastrophic monsoon floods; Loss and Damage fund agreed at COP27' },
      { year: '2023', event: 'COP28 operationalises the Loss and Damage fund' },
    ],
    pastPaperAngles: ['Climate justice', 'Water security', 'Disaster governance'],
    analyticalQuestions: ['Is Pakistan’s climate challenge primarily one of adaptation or mitigation?', 'Evaluate the adequacy of international climate finance for Pakistan.'],
    sources: [
      { name: 'Pakistan PDNA 2022 (GoP/WB/ADB/EU/UN)', url: 'https://www.worldbank.org/' },
      { name: 'UNFCCC - Pakistan NDCs', url: 'https://unfccc.int/' },
      { name: 'IPCC Assessment Reports', url: 'https://www.ipcc.ch/' },
    ],
    lastUpdated: '2026-07-17',
  },
  {
    slug: 'cpec-connectivity',
    title: 'CPEC and Regional Connectivity',
    category: 'Pakistan External',
    background: 'The China–Pakistan Economic Corridor, a flagship of the Belt and Road Initiative, links Gwadar to western China through energy, infrastructure and industrial-cooperation projects. Its second phase emphasises industrialisation, agriculture and socio-economic development.',
    actors: ['Government of Pakistan', 'Government of China', 'CPEC Authority / ministries', 'Provincial governments', 'Private sector'],
    causes: ['Energy shortages and infrastructure gaps', 'Pakistan’s geo-economic pivot', 'China’s westward connectivity strategy'],
    developments: ['Phase-II focus on special economic zones and agriculture', 'Gwadar port and airport projects progressing', 'ML-1 railway project under phased planning'],
    pakistanImplications: ['Energy and logistics capacity gains', 'Debt-servicing and project-execution questions', 'Balochistan development and security considerations'],
    globalImplications: ['A pillar of the Belt and Road Initiative', 'Regional trade-route diversification'],
    challenges: ['Security of projects and personnel', 'Financing and repayment capacity', 'Local employment expectations'],
    opportunities: ['Transit trade with Central Asia', 'Industrial relocation into SEZs', 'Agricultural modernisation'],
    policyOptions: ['Prioritise completion of core infrastructure', 'Strengthen SEZ incentives and one-window operations', 'Ensure provincial ownership and local employment'],
    statistics: [{ figure: 'CPEC early-harvest energy projects added several thousand MW to the national grid.', source: 'Official CPEC portal / Ministry of Planning' }],
    timeline: [
      { year: '2013', event: 'Belt and Road Initiative announced' },
      { year: '2015', event: 'CPEC formally launched during the Chinese President’s visit to Pakistan' },
      { year: '2020s', event: 'Shift toward Phase-II industrial and agricultural cooperation' },
    ],
    pastPaperAngles: ['Geo-economics', 'Pakistan–China relations', 'Gwadar’s strategic role'],
    analyticalQuestions: ['CPEC: corridor of opportunity or over-expectation?', 'How can Pakistan maximise local value from CPEC Phase II?'],
    sources: [
      { name: 'Official CPEC portal', url: 'http://cpec.gov.pk/' },
      { name: 'Ministry of Planning, Development & Special Initiatives', url: 'https://www.pc.gov.pk/' },
    ],
    lastUpdated: '2026-07-17',
  },
  {
    slug: 'fiscal-economy',
    title: 'Pakistan’s Fiscal and External-Sector Challenges',
    category: 'Economy',
    background: 'Pakistan’s economy has moved through repeated boom-bust cycles driven by consumption-led growth, a narrow tax base, energy-sector arrears and external financing gaps, leading to recurrent IMF programmes.',
    actors: ['Ministry of Finance', 'State Bank of Pakistan', 'FBR', 'IMF', 'World Bank and ADB'],
    causes: ['Low tax-to-GDP ratio', 'Import-led growth and low exports', 'Circular debt in energy', 'Political-economy resistance to reform'],
    developments: ['Stand-By and Extended Fund Facility arrangements with the IMF', 'Tax-base broadening measures in federal budgets', 'Remittances as a key external support'],
    pakistanImplications: ['Inflation and cost-of-living pressure', 'Development-spending compression', 'Exchange-rate volatility'],
    globalImplications: ['Creditor and investor confidence in emerging markets', 'Regional trade and remittance corridors'],
    challenges: ['Broadening taxation without growth shock', 'Energy-sector reform', 'Sustaining export growth'],
    opportunities: ['IT and services exports', 'Agricultural productivity', 'Documenting the informal economy'],
    policyOptions: ['Tax-base broadening and withdrawal of exemptions', 'Energy pricing and loss reduction', 'Export competitiveness through productivity, not subsidies'],
    statistics: [
      { figure: 'Pakistan’s tax-to-GDP ratio has remained around 9–11% in recent years, among the lowest regionally.', source: 'FBR / World Bank / IMF country documents' },
      { figure: 'Worker remittances exceed $30 billion annually in recent years.', source: 'State Bank of Pakistan' },
    ],
    timeline: [
      { year: '2019', event: 'IMF Extended Fund Facility approved' },
      { year: '2023', event: 'IMF Stand-By Arrangement agreed amid external pressure' },
      { year: '2024', event: 'New IMF Extended Fund Facility approved' },
    ],
    pastPaperAngles: ['Economic stabilisation vs growth', 'Tax reform', 'IMF conditionality'],
    analyticalQuestions: ['Why does Pakistan repeatedly return to the IMF?', 'Can Pakistan tax its way out of the fiscal trap without hurting growth?'],
    sources: [
      { name: 'State Bank of Pakistan', url: 'https://www.sbp.org.pk/' },
      { name: 'Pakistan Economic Survey (Ministry of Finance)', url: 'https://www.finance.gov.pk/' },
      { name: 'IMF Pakistan page', url: 'https://www.imf.org/en/Countries/PAK' },
    ],
    lastUpdated: '2026-07-17',
  },
  {
    slug: 'ai-governance',
    title: 'Artificial Intelligence and Governance',
    category: 'Science & Tech',
    background: 'Artificial intelligence is reshaping public administration, economies and labour markets worldwide. For Pakistan, the question is how to harness AI for service delivery and exports while managing workforce disruption and the digital divide.',
    actors: ['Ministry of IT & Telecom', 'PSEB and tech industry', 'Regulators worldwide (EU AI Act, others)', 'Universities and research bodies'],
    causes: ['Rapid advances in machine learning', 'Global competition over AI capability', 'Falling cost of computing'],
    developments: ['Pakistan’s national AI policy discussions', 'Growth of freelancing and IT exports', 'Global regulatory frameworks emerging'],
    pakistanImplications: ['Productivity potential in governance and agriculture', 'Job-displacement risk in routine work', 'Data-protection and surveillance questions'],
    globalImplications: ['Shifts in outsourcing and services trade', 'Regulatory fragmentation across jurisdictions'],
    challenges: ['Skills gap and brain drain', 'Compute and data infrastructure', 'Ethical and regulatory readiness'],
    opportunities: ['AI-enabled public services', 'Higher-value IT exports', 'Agri-tech and climate applications'],
    policyOptions: ['Invest in AI-relevant education and upskilling', 'Adopt risk-based regulation with data protection', 'Pilot AI in public service delivery'],
    statistics: [{ figure: 'Pakistan’s IT exports have crossed $3 billion annually in recent years.', source: 'State Bank of Pakistan / PSEB' }],
    timeline: [
      { year: '2023', event: 'EU finalises the AI Act, the first comprehensive AI law' },
      { year: '2024–25', event: 'Pakistan advances a national AI policy framework' },
    ],
    pastPaperAngles: ['Technology and employment', 'Digital governance', 'Ethics of AI'],
    analyticalQuestions: ['Is AI a development opportunity or a disruption for Pakistan?', 'What regulatory model suits Pakistan’s AI ambitions?'],
    sources: [
      { name: 'Ministry of IT & Telecom Pakistan', url: 'https://moitt.gov.pk/' },
      { name: 'EU AI Act (official)', url: 'https://digital-strategy.ec.europa.eu/' },
    ],
    lastUpdated: '2026-07-17',
  },
  {
    slug: 'afghanistan-regional',
    title: 'Afghanistan and Regional Security',
    category: 'Regional',
    background: 'Developments in Afghanistan directly affect Pakistan’s security, trade and refugee situation. Border management, cross-border militancy and transit trade define the relationship.',
    actors: ['Government of Pakistan', 'Afghan authorities in Kabul', 'Regional states', 'UN agencies'],
    causes: ['Legacy of four decades of conflict', 'Cross-border militant sanctuaries', 'Unresolved border-management disputes'],
    developments: ['Repatriation of undocumented foreign nationals from Pakistan', 'Fluctuating border-crossing arrangements', 'Regional connectivity projects dependent on stability'],
    pakistanImplications: ['Security burden of cross-border militancy', 'Refugee management', 'Trade-route potential to Central Asia'],
    globalImplications: ['Counter-terrorism concerns', 'Humanitarian situation in Afghanistan'],
    challenges: ['Attacks inside Pakistan attributed to groups across the border', 'Humanitarian obligations vs enforcement', 'Diplomatic engagement dilemmas'],
    opportunities: ['Transit trade agreements', 'Regional economic corridors'],
    policyOptions: ['Combine border management with diplomatic engagement', 'Document and regulate cross-border movement', 'Pursue regional economic incentives for stability'],
    statistics: [{ figure: 'Pakistan has hosted millions of Afghan refugees over four decades, one of the largest protracted situations worldwide.', source: 'UNHCR' }],
    timeline: [
      { year: '2021', event: 'Change of authority in Kabul' },
      { year: '2023', event: 'Pakistan’s repatriation plan for undocumented foreigners announced' },
    ],
    pastPaperAngles: ['Pakistan–Afghanistan relations', 'Refugees and security', 'Regional connectivity'],
    analyticalQuestions: ['How should Pakistan balance security and humanitarian obligations on the western border?'],
    sources: [
      { name: 'UNHCR', url: 'https://www.unhcr.org/' },
      { name: 'Ministry of Foreign Affairs Pakistan', url: 'https://mofa.gov.pk/' },
    ],
    lastUpdated: '2026-07-17',
  },
  {
    slug: 'water-security',
    title: 'Water Security and the Indus Basin',
    category: 'Environment',
    background: 'Pakistan’s water availability per capita has fallen sharply since independence. The Indus Basin system faces storage limits, groundwater depletion and climate-driven variability, while the Indus Waters Treaty with India frames transboundary cooperation.',
    actors: ['IRSA', 'WAPDA', 'Ministry of Water Resources', 'Provincial governments', 'World Bank (IWT role)'],
    causes: ['Population growth', 'Falling storage capacity and sedimentation', 'Inefficient flood-irrigation practices', 'Groundwater over-extraction'],
    developments: ['National Water Policy adopted in 2018', 'Debates over new storage projects', 'IWT-related diplomatic exchanges'],
    pakistanImplications: ['Agricultural output and food security', 'Inter-provincial water-sharing tensions', 'Urban water stress'],
    globalImplications: ['A prominent case of treaty-based water cooperation under climate stress'],
    challenges: ['Financing large storage', 'Consensus among provinces', 'Modernising irrigation'],
    opportunities: ['Drip/sprinkler efficiency', 'Groundwater regulation', 'Hydropower expansion'],
    policyOptions: ['Implement the National Water Policy', 'Price and measure water use', 'Build consensus on storage through benefit-sharing'],
    statistics: [
      { figure: 'Per-capita water availability has fallen from over 5,000 m³ in 1951 to around or below 1,000 m³ - the scarcity threshold.', source: 'Pakistan Council of Research in Water Resources (PCRWR)' },
    ],
    timeline: [
      { year: '1960', event: 'Indus Waters Treaty signed (Karachi), brokered by the World Bank' },
      { year: '2018', event: 'National Water Policy approved' },
    ],
    pastPaperAngles: ['Water scarcity', 'Indus Waters Treaty', 'Agriculture and irrigation'],
    analyticalQuestions: ['Is Pakistan’s water crisis one of scarcity or of management?', 'Evaluate the resilience of the Indus Waters Treaty under climate stress.'],
    sources: [
      { name: 'PCRWR', url: 'https://pcrwr.gov.pk/' },
      { name: 'World Bank - Indus Waters Treaty', url: 'https://www.worldbank.org/' },
    ],
    lastUpdated: '2026-07-17',
  },
]

export const caCategories = ['Pakistan Domestic', 'Pakistan External', 'Global', 'Economy', 'Governance', 'Security', 'Environment', 'Science & Tech', 'International Organisations', 'Regional'] as const
