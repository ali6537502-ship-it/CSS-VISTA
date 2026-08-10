// Free CSS Vista lecture centre data. Compulsory courses are derived from the
// official FPSC syllabus structure already in data/syllabus.ts; optional courses
// follow the FPSC syllabus headings. Videos appear only after the owner uploads them.
import { compulsorySubjects } from './syllabus'

export interface LectureTopic {
  slug: string
  title: string
  summary: string
}

export interface LectureCourse {
  slug: string
  title: string
  kind: 'Compulsory' | 'Optional'
  marks: number
  paperLabel: string
  topics: LectureTopic[]
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const compulsoryLectureCourses: LectureCourse[] = compulsorySubjects.map((s) => ({
  slug: s.slug,
  title: s.name,
  kind: 'Compulsory',
  marks: s.marks,
  paperLabel: 'Single 100-mark paper',
  topics: s.topics.map((t) => ({
    slug: slugify(t.title),
    title: t.title,
    summary: t.points.join(', '),
  })),
}))

export const optionalLectureCourses: LectureCourse[] = [
  {
    slug: "political-science",
    title: "Political Science",
    kind: 'Optional',
    marks: 200,
    paperLabel: "Paper I and Paper II",
    topics: [
      { slug: "western-political-thought", title: "Western Political Thought", summary: "Classical, modern and contemporary Western political thinkers." },
      { slug: "muslim-political-thought", title: "Muslim Political Thought", summary: "Major Muslim thinkers and the evolution of Islamic political ideas." },
      { slug: "state-system", title: "State System", summary: "Modern nation-state system, the Islamic state and the concept of Ummah." },
      { slug: "political-concepts", title: "Political Concepts", summary: "Sovereignty, justice, law, liberty, equality, rights, authority and power." },
      { slug: "comparative-politics", title: "Comparative Politics", summary: "Political culture, development, recruitment, civil society, gender and change." },
      { slug: "political-participation", title: "Political Participation", summary: "Revolution, elections, public opinion, parties, pressure groups and lobbies." },
      { slug: "political-institutions", title: "Political Institutions", summary: "Legislature, executive, judiciary, political elites and bureaucracy." },
      { slug: "forms-of-government", title: "Forms of Government", summary: "Democratic, authoritarian, unitary, federal, presidential and parliamentary forms." },
      { slug: "political-ideologies", title: "Political Ideologies", summary: "Capitalism, socialism, communism, fascism, nationalism and Islamic ideology." },
      { slug: "local-government", title: "Local Self Government", summary: "Theory, practice and comparative local governance with reference to Pakistan." },
      { slug: "western-political-systems", title: "Political Systems of USA, UK, France and Germany", summary: "Comparative and analytical study of major Western political systems." },
      { slug: "global-regional-integration", title: "Global and Regional Integration", summary: "Globalisation, European Union, SAARC, ECO, IMF and WTO." },
      { slug: "asian-political-systems", title: "Political Systems of Turkey, Iran, Malaysia, India and China", summary: "Comparative and analytical study of selected Asian political systems." },
      { slug: "pakistan-movement", title: "Political Movements and Pakistan Movement", summary: "Muslim nationalism and the roles of Sir Syed, Iqbal and Quaid-i-Azam." },
      { slug: "government-politics-pakistan", title: "Government and Politics in Pakistan", summary: "Constitutions, federalism, institutions, parties, elections and national integration." },
      { slug: "international-relations", title: "International Relations and Pakistan Foreign Policy", summary: "Post-war international relations and the determinants of Pakistan foreign policy." },
    ],
  },
  {
    slug: "criminology",
    title: "Criminology",
    kind: 'Optional',
    marks: 100,
    paperLabel: "Single 100-mark paper",
    topics: [
      { slug: "introduction", title: "Introduction to Crime and Criminality", summary: "Basic concepts used to understand crime, criminality and criminal behaviour." },
      { slug: "understanding-criminology", title: "Understanding Criminology", summary: "Meaning, scope, criminal law, deviance, norms, values and security." },
      { slug: "crime-criminals", title: "Crime and Criminals", summary: "Occasional, habitual and professional criminals plus white-collar and organised crime." },
      { slug: "theories", title: "Theories of Crime", summary: "Biological, psychological, sociological and Islamic perspectives on crime." },
      { slug: "juvenile-delinquency", title: "Juvenile Delinquency", summary: "Definitions, status offences and official statistics." },
      { slug: "juvenile-justice", title: "Juvenile Justice System", summary: "Police, courts, sentencing, probation and correctional alternatives." },
      { slug: "criminal-justice-system", title: "Criminal Justice System", summary: "Police, courts, prosecution, prisons, probation and parole." },
      { slug: "treatment-offenders", title: "Treatment and Rehabilitation of Offenders", summary: "Punitive and reformative approaches, imprisonment and rehabilitation." },
      { slug: "criminal-investigation", title: "Criminal Investigation", summary: "Investigation principles, intelligence, electronic and forensic investigation." },
      { slug: "investigation-techniques", title: "Investigation Techniques", summary: "Information gathering, interviewing, interrogation and investigative analysis." },
      { slug: "legal-ethical-guidelines", title: "Legal and Ethical Guidelines", summary: "Arrest, search, seizure and investigative safeguards." },
      { slug: "international-policing", title: "International Policing Organisations", summary: "INTERPOL, EUROPOL, UNODC, UNICEF and related monitoring bodies." },
      { slug: "contemporary-criminology", title: "Contemporary Criminology", summary: "Terrorism, policing, gender and crime, human rights, money laundering and cybercrime." },
    ],
  },
  {
    slug: "environmental-science",
    title: "Environmental Science",
    kind: 'Optional',
    marks: 100,
    paperLabel: "Single 100-mark paper",
    topics: [
      { slug: "environmental-thought", title: "History of Environmental Thought", summary: "Environmental movements, sustainable development and major global milestones." },
      { slug: "sustainable-development", title: "Sustainable Development Issues", summary: "Population, poverty, biodiversity, energy, cities, food security and restoration." },
      { slug: "interdisciplinary-nature", title: "Interdisciplinary Environmental Science", summary: "Biology, chemistry, physics, toxicology, economics, geology and sociology." },
      { slug: "pollution", title: "Environmental Pollution", summary: "Air, water, soil and noise pollution plus waste, degradation and global pollution." },
      { slug: "climate-change", title: "Climate Change", summary: "Climate systems, drivers, impacts, adaptation, mitigation and climate politics." },
      { slug: "environmental-governance", title: "Environmental Governance in Pakistan", summary: "Policy, legal and institutional frameworks for environmental governance." },
      { slug: "global-initiatives", title: "Global Environmental Initiatives", summary: "Major agreements on climate, biodiversity, wetlands, wildlife and desertification." },
      { slug: "assessment-management", title: "Environmental Assessment and Management", summary: "EIA, management systems, disaster risk, GIS, remote sensing and resources." },
    ],
  },
  {
    slug: "european-history",
    title: "European History",
    kind: 'Optional',
    marks: 100,
    paperLabel: "Single 100-mark paper",
    topics: [
      { slug: "french-revolution-napoleon", title: "French Revolution and Napoleonic Era, 1789-1815", summary: "Causes, consequences, Napoleon, empire, continental system and decline." },
      { slug: "concert-of-europe", title: "Concert of Europe, 1815-1830", summary: "Vienna settlement, Metternich, congress system and balance of power." },
      { slug: "continuity-change", title: "Forces of Continuity and Change, 1815-1848", summary: "Nationalism, liberalism, socialism, romanticism, industry and colonialism." },
      { slug: "eastern-question", title: "Eastern Question", summary: "Ottoman decline, Crimean War, Russo-Turkish conflict and consequences." },
      { slug: "italian-unification", title: "Unification of Italy", summary: "Obstacles, 1848, Cavour and the process of unification." },
      { slug: "german-unification", title: "Unification of Germany", summary: "Bismarck, diplomacy and the wars of German unification." },
      { slug: "origins-first-world-war", title: "Origins of the First World War", summary: "Alliances, Balkan conflicts and the outbreak of war." },
      { slug: "first-world-war-aftermath", title: "First World War and its Aftermath", summary: "The war, peace treaties and League of Nations." },
      { slug: "dictatorships", title: "Dictatorships in Europe", summary: "Fascism, Nazism, Stalinism, depression, appeasement and pre-war crises." },
      { slug: "second-world-war", title: "Second World War and its Effects", summary: "Main events and the political, economic and social impact on Europe." },
      { slug: "post-war-europe", title: "Post-War Europe", summary: "Settlements, United Nations, Marshall Plan, Germany, NATO and decolonisation." },
      { slug: "cold-war-europe", title: "Cold War Europe, 1955-1991", summary: "Warsaw Pact, EEC, nuclear politics, France and communist regimes." },
      { slug: "europe-since-1991", title: "Europe, 1991-2012", summary: "USSR dissolution, German reunification, Balkan crisis, EU and global challenges." },
    ],
  },
]

export const allLectureCourses: LectureCourse[] = [...compulsoryLectureCourses, ...optionalLectureCourses]

export const lectureSource = {
  name: 'FPSC Revised Scheme and Syllabus for CSS Competitive Examination',
  url: 'https://www.fpsc.gov.pk/uploads/syllabus/1767002683737_Syllabus-for-CE-2016-and-onwards.pdf',
}
