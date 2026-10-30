import { allOptionalSubjects } from '../../lib/studyPlanner.ts'
import { defaultHomeCards } from '../../data/homeCards.ts'
import { isProDestination } from '../membership/proDestinations.ts'
import { MPT_HIBERNATED } from '../../lib/featureHibernation.ts'

export const sections = [
  { id: 'overview', title: 'Overview', to: '/account/dashboard' },
  { id: 'plan', title: 'My Study Plan', to: '/account/tasks' },
  { id: 'subjects', title: 'Subjects', to: '/account/subjects' },
  { id: 'practice', title: 'Practice', to: '/account/practice' },
  { id: 'performance', title: 'My Performance', to: '/account/progress' },
  { id: 'library', title: 'My Library', to: '/account/library' },
  { id: 'settings', title: 'Account & Settings', to: '/account/settings' },
] as const
export function activeSection(path: string) {
  if (/^\/account\/(tasks|plan|preparation)/.test(path)) return 'plan'
  if (path.startsWith('/account/subjects')) return 'subjects'
  if (/^\/account\/(progress|answer-performance|mpt\/performance|mpt\/history)/.test(path)) return 'performance'
  if (/^\/account\/(library|directory|resources|saved|factbook|search|vistagram|current-affairs)/.test(path)) return 'library'
  if (/^\/account\/(settings|membership|ai-usage|more)/.test(path)) return 'settings'
  if (path !== '/account/dashboard') return 'practice'
  return 'overview'
}
export type Feature = { id: string; title: string; description: string; to: string; category: string; keywords: string }
const extra: Feature[] = [
  { id: 'daily-pdfs', title: 'Current Affairs Daily PDFs', description: 'Browse published daily PDF editions.', to: '/current-affairs-daily', category: 'Current Affairs', keywords: 'news newspaper pdf' },
  { id: 'daily-english', title: 'Daily English', description: 'Your daily language activities.', to: '/account/english', category: 'Grammar', keywords: 'vocabulary english' },
  { id: 'vista-resources', title: 'My Vista Resources', description: 'Your account resource shelves, free books and downloads.', to: '/account/resources', category: 'Resources', keywords: 'books downloads library' },
  { id: 'membership', title: 'Membership & Payments', description: 'Review your existing membership and account orders.', to: '/account/membership', category: 'Workspace', keywords: 'pro subscription membership orders' },
  { id: 'vistagram', title: 'Vistagram', description: 'Concepts, articles and explainers.', to: '/account/vistagram', category: 'Resources', keywords: 'reading' },
  ...allOptionalSubjects.map(name => ({ id:'subject-'+name, title:name, description:'Open the subject syllabus and linked planning resources.', to:'/fpsc-syllabus?subject='+({'History of Pakistan & India':'history-pakistan-india','History of USA':'history-usa'}[name] || name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')), category:'Subjects', keywords:name })),
  ...sections.map(s => ({ id: s.id, title: s.title, description: s.id === 'plan' ? 'Manage daily tasks, weekly scheduling, syllabus planning, revision, study goals and settings.' : `Open ${s.title.toLowerCase()}.`, to: s.to, category: 'Workspace', keywords: s.id === 'plan' ? 'study planner timetable calendar schedule revision personal goals notes optional subjects settings import archive' : s.title })),
  ...[
    ['precis', 'Précis Course', '/account/precis'], ['ability', 'General Ability', '/account/general-ability'],
    ['answers', 'My Answer Performance', '/account/answer-performance'], ['affairs-desk', 'My Current Affairs Desk', '/account/current-affairs'],
    ['expression', 'English Expression Lab', '/account/expression'], ['handwriting', 'Handwritten Paragraph', '/account/handwriting'],
    ['tutor', 'Ask VISTA', '/account/ask-vista'], ['essay-builder', 'Essay Themes Builder', '/account/essay-builder'],
    ['argumentation', 'Argumentation Skills Builder', '/account/argumentation'], ['analysis-builder', 'Analytical Skills Builder', '/account/analytical-skills'],
    ['preparation', 'My Preparation', '/account/preparation'], ['ai-usage', 'AI Usage', '/account/ai-usage'],
  ].map(([id,title,to]) => ({ id,title,to,description: `Open ${title.toLowerCase()}.`, category: 'Preparation', keywords: 'writing practice learning' })),
]
export const features: Feature[] = [...extra, ...defaultHomeCards.map(f => ({ id:f.id, title: f.title, description:f.desc, to:f.to, category: /quiz|mcq|gk|mock|writing|timer|challenge|mistake|essay|grammar|test/i.test(f.id) ? 'Practice' : 'Resources', keywords:f.id.replaceAll('-', ' ') }))]
  .filter((f,i,all) => all.findIndex(x => x.to === f.to) === i)
export function featureState(feature: Feature, paused: boolean): 'paused' | 'pro' | 'free' {
  if (MPT_HIBERNATED && /^\/mpt(?:\/|$)/.test(feature.to)) return 'paused'
  return isProDestination(feature.to) ? paused ? 'paused' : 'pro' : 'free'
}
export function searchFeatures(query: string) {
  const words = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/)
  return features.filter(f => words.every(w => `${f.title} ${f.description} ${f.category} ${f.keywords}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(w)))
}
