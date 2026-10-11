export type ResourceCategory = "Daily reading" | "Pakistan statistics" | "Global data" | "Research & journals" | "Governance & law" | "Climate & environment";
export type ResearchResource = { id: string; title: string; description: string; category: ResourceCategory; url: string; cadence: 'Daily section' | 'Updated by publisher' | 'Reference archive'; tags: string; featured?: boolean };
export const resourceCategories: ResourceCategory[] = ["Daily reading","Pakistan statistics","Global data","Research & journals","Governance & law","Climate & environment"];
export const researchResources: ResearchResource[] = [
  {
    "id": "dawn-editorials",
    "title": "Dawn — Daily Editorials",
    "description": "Editorials on Pakistan, governance, economy and international affairs.",
    "category": "Daily reading",
    "url": "https://www.dawn.com/newspaper/editorial",
    "cadence": "Daily section",
    "tags": "editorial opinion argument essay pakistan",
    "featured": true
  },
  {
    "id": "dawn-opinion",
    "title": "Dawn — Opinion",
    "description": "Current opinion articles for analysis, examples and balanced reading.",
    "category": "Daily reading",
    "url": "https://www.dawn.com/opinion",
    "cadence": "Daily section",
    "tags": "opinion column current affairs analysis",
    "featured": true
  },
  {
    "id": "dawn-columns",
    "title": "Dawn — Newspaper Columns",
    "description": "Regular newspaper columns on national and world issues.",
    "category": "Daily reading",
    "url": "https://www.dawn.com/newspaper/column",
    "cadence": "Daily section",
    "tags": "column politics diplomacy economy",
    "featured": false
  },
  {
    "id": "dawn-news",
    "title": "Dawn — News",
    "description": "Pakistan and international reporting from the main news desk.",
    "category": "Daily reading",
    "url": "https://www.dawn.com/",
    "cadence": "Daily section",
    "tags": "latest headlines pakistan world",
    "featured": false
  },
  {
    "id": "pbs",
    "title": "Pakistan Bureau of Statistics",
    "description": "National indicators on population, employment, prices and the economy.",
    "category": "Pakistan statistics",
    "url": "https://www.pbs.gov.pk/",
    "cadence": "Updated by publisher",
    "tags": "pbs inflation cpi labour census population national income",
    "featured": true
  },
  {
    "id": "census",
    "title": "Pakistan Census 2023 Dashboard",
    "description": "District-level population, housing and demographic indicators.",
    "category": "Pakistan statistics",
    "url": "https://census23.pbos.gov.pk/",
    "cadence": "Reference archive",
    "tags": "seventh digital census demography literacy",
    "featured": false
  },
  {
    "id": "economicsurvey",
    "title": "Pakistan Economic Survey 2025–26",
    "description": "Official chapter-wise economic and social review for the latest published fiscal survey.",
    "category": "Pakistan statistics",
    "url": "https://www.finance.gov.pk/survey_2026.html",
    "cadence": "Reference archive",
    "tags": "finance gdp budget agriculture education health",
    "featured": false
  },
  {
    "id": "sbp-data",
    "title": "State Bank — Economic Data",
    "description": "Monetary, banking, external and macroeconomic time series.",
    "category": "Pakistan statistics",
    "url": "https://www.sbp.org.pk/economic-data",
    "cadence": "Updated by publisher",
    "tags": "sbp reserves inflation policy monetary trade",
    "featured": false
  },
  {
    "id": "sbp-easydata",
    "title": "State Bank — EasyData",
    "description": "Interactive charts and downloads for Pakistan's economic indicators.",
    "category": "Pakistan statistics",
    "url": "https://easydata.sbp.org.pk/",
    "cadence": "Updated by publisher",
    "tags": "sbp interactive charts downloads macroeconomic",
    "featured": false
  },
  {
    "id": "wb-pdu",
    "title": "World Bank — Pakistan Development Update",
    "description": "Pakistan-focused economic assessments and development reports.",
    "category": "Pakistan statistics",
    "url": "https://www.worldbank.org/en/brief/2024/10/10/pakistan-development-update-knowledge-products",
    "cadence": "Updated by publisher",
    "tags": "pakistan economy policy poverty development",
    "featured": false
  },
  {
    "id": "worldbank",
    "title": "World Bank — Pakistan Data",
    "description": "Country-level social, economic and environmental indicators.",
    "category": "Global data",
    "url": "https://data.worldbank.org/country/pk",
    "cadence": "Updated by publisher",
    "tags": "world development indicators wdi poverty gdp",
    "featured": true
  },
  {
    "id": "un-sdgs",
    "title": "United Nations — SDG Indicators",
    "description": "Official monitoring framework and reports for the 17 goals.",
    "category": "Global data",
    "url": "https://unstats.un.org/sdgs",
    "cadence": "Updated by publisher",
    "tags": "un united nations sustainable development goals",
    "featured": false
  },
  {
    "id": "un-sdg-data",
    "title": "UN — Global SDG Database",
    "description": "Explore indicators and metadata across countries and goals.",
    "category": "Global data",
    "url": "https://unstats.un.org/sdgs/indicators/en/",
    "cadence": "Updated by publisher",
    "tags": "poverty gender climate inequality",
    "featured": false
  },
  {
    "id": "undp",
    "title": "UNDP — Human Development Data",
    "description": "HDI, inequality, gender and multidimensional poverty measures.",
    "category": "Global data",
    "url": "https://hdr.undp.org/data-center",
    "cadence": "Updated by publisher",
    "tags": "hdi mpi human development index",
    "featured": false
  },
  {
    "id": "imf-pk",
    "title": "IMF — Pakistan Country Page",
    "description": "Country reports, economic projections and IMF-related documents.",
    "category": "Global data",
    "url": "https://www.imf.org/en/Countries/PAK",
    "cadence": "Updated by publisher",
    "tags": "international monetary fund loan programme gdp economy",
    "featured": false
  },
  {
    "id": "unodc",
    "title": "UNODC — Crime Data Portal",
    "description": "Official international indicators on homicide, prisons and crime.",
    "category": "Global data",
    "url": "https://data.unodc.org/",
    "cadence": "Updated by publisher",
    "tags": "criminology homicide trafficking drugs crime justice",
    "featured": false
  },
  {
    "id": "unicef",
    "title": "UNICEF — Pakistan Data",
    "description": "Child health, education, nutrition and demographic indicators.",
    "category": "Global data",
    "url": "https://data.unicef.org/country/pak/",
    "cadence": "Updated by publisher",
    "tags": "child mortality nutrition education pakistan",
    "featured": false
  },
  {
    "id": "unesco",
    "title": "UNESCO — Education Statistics",
    "description": "Compare education, literacy and learning indicators by country.",
    "category": "Global data",
    "url": "https://databrowser.uis.unesco.org/",
    "cadence": "Updated by publisher",
    "tags": "uis school literacy education learning",
    "featured": false
  },
  {
    "id": "who",
    "title": "WHO — Global Health Observatory",
    "description": "Health indicators on disease, mortality and health systems.",
    "category": "Global data",
    "url": "https://www.who.int/data/gho",
    "cadence": "Updated by publisher",
    "tags": "health disease deaths public health",
    "featured": false
  },
  {
    "id": "faostat",
    "title": "FAOSTAT — Food & Agriculture",
    "description": "International statistics on food security, crops, livestock and agriculture.",
    "category": "Global data",
    "url": "https://www.fao.org/faostat/",
    "cadence": "Updated by publisher",
    "tags": "fao agriculture food insecurity crops",
    "featured": false
  },
  {
    "id": "unhcr",
    "title": "UNHCR — Refugee Data Finder",
    "description": "Explore refugee, displacement and asylum statistics.",
    "category": "Global data",
    "url": "https://refugeedata.unhcr.org/en/data-finder/",
    "cadence": "Updated by publisher",
    "tags": "refugees migration afghanistan asylum displacement",
    "featured": false
  },
  {
    "id": "ilo",
    "title": "ILOSTAT — Labour Statistics",
    "description": "Compare employment, unemployment and labour-market indicators.",
    "category": "Global data",
    "url": "https://ilostat.ilo.org/data/",
    "cadence": "Updated by publisher",
    "tags": "labour employment unemployment wages",
    "featured": false
  },
  {
    "id": "unwomen",
    "title": "UN Women — Gender Data",
    "description": "Gender-related SDG indicators and thematic datasets.",
    "category": "Global data",
    "url": "https://data.unwomen.org/data-portal",
    "cadence": "Updated by publisher",
    "tags": "gender women equality discrimination",
    "featured": false
  },
  {
    "id": "pjc",
    "title": "Pakistan Journal of Criminology — Archive",
    "description": "Browse published research issues and downloadable academic papers.",
    "category": "Research & journals",
    "url": "https://nja.pastic.gov.pk/journals/index.php/PJC/issue/archive",
    "cadence": "Updated by publisher",
    "tags": "pjc criminology criminal justice research youth crime",
    "featured": true
  },
  {
    "id": "pide-reports",
    "title": "PIDE — Research Reports",
    "description": "Policy studies on Pakistan's economy, institutions and governance.",
    "category": "Research & journals",
    "url": "https://pide.org.pk/research-category/research-reports/",
    "cadence": "Updated by publisher",
    "tags": "pakistan institute development economics",
    "featured": false
  },
  {
    "id": "pide-recent",
    "title": "PIDE — Recent Publications",
    "description": "Recent policy viewpoints, knowledge briefs and research.",
    "category": "Research & journals",
    "url": "https://pide.org.pk/research-sub-category/recent-publications/",
    "cadence": "Updated by publisher",
    "tags": "research briefs macroeconomy policy",
    "featured": false
  },
  {
    "id": "sdpi",
    "title": "SDPI — Research & Policy",
    "description": "Pakistan-centred studies on sustainable development and public policy.",
    "category": "Research & journals",
    "url": "https://sdpi.org/",
    "cadence": "Updated by publisher",
    "tags": "sustainable development pakistan think tank",
    "featured": false
  },
  {
    "id": "issi",
    "title": "ISSI — Strategic Studies",
    "description": "Research journal and analysis of foreign policy and international relations.",
    "category": "Research & journals",
    "url": "https://issi.org.pk/category/issi-publications/strategic-studies/",
    "cadence": "Updated by publisher",
    "tags": "political science foreign policy international relations",
    "featured": false
  },
  {
    "id": "pips",
    "title": "PIPS — Peace and Security Research",
    "description": "Pakistan conflict, peace, extremism and security research.",
    "category": "Research & journals",
    "url": "https://www.pakpips.com/",
    "cadence": "Updated by publisher",
    "tags": "terrorism security crime pakistan",
    "featured": false
  },
  {
    "id": "na-acts",
    "title": "National Assembly — Acts of Parliament",
    "description": "Original legislation passed by Pakistan's Parliament.",
    "category": "Governance & law",
    "url": "https://www.na.gov.pk/en/acts-tenure.php",
    "cadence": "Updated by publisher",
    "tags": "constitution act law parliament governance",
    "featured": false
  },
  {
    "id": "cpi",
    "title": "Transparency International — CPI",
    "description": "Corruption Perceptions Index report and methodology.",
    "category": "Governance & law",
    "url": "https://www.transparency.org/en/publications/corruption-perceptions-index-2025",
    "cadence": "Reference archive",
    "tags": "governance corruption integrity transparency 2025",
    "featured": false
  },
  {
    "id": "freedom",
    "title": "Freedom House — Pakistan Profile",
    "description": "Country assessment of political rights and civil liberties.",
    "category": "Governance & law",
    "url": "https://freedomhouse.org/country/pakistan",
    "cadence": "Updated by publisher",
    "tags": "political science freedom democracy rights",
    "featured": false
  },
  {
    "id": "ipcc",
    "title": "IPCC — Climate Assessment Reports",
    "description": "Scientific assessments of climate causes, impacts and responses.",
    "category": "Climate & environment",
    "url": "https://www.ipcc.ch/reports/",
    "cadence": "Updated by publisher",
    "tags": "global warming greenhouse emissions adaptation",
    "featured": false
  },
  {
    "id": "wb-climate",
    "title": "World Bank — Pakistan Climate Portal",
    "description": "Pakistan climate-risk resources, assessments and policy documents.",
    "category": "Climate & environment",
    "url": "https://climateknowledgeportal.worldbank.org/country/pakistan/resources",
    "cadence": "Updated by publisher",
    "tags": "pakistan floods temperatures climate risk",
    "featured": false
  },
  {
    "id": "ourworld-population",
    "title": "Our World in Data — Pakistan Population",
    "description": "Charts and historical data on population and demography.",
    "category": "Climate & environment",
    "url": "https://ourworldindata.org/profile/population-demography/pakistan",
    "cadence": "Updated by publisher",
    "tags": "demographics population growth fertility urbanisation",
    "featured": false
  }
];
