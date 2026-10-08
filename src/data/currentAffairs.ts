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

// Full issue files are delivered by the native Pro endpoint, never bundled.
export interface CAIssueSummary { slug: string; title: string; category: string; lastUpdated: string }
export { default as caIssueIndex } from './bundled/current-affairs-issues-index.json'
export async function loadCaIssues(signal?: AbortSignal): Promise<CAIssue[]> {
  const response = await fetch('/api/student/premium-content.php?file=current-affairs-issues', { signal })
  if (!response.ok) throw new Error('Current Affairs requires active Pro access.')
  return response.json() as Promise<CAIssue[]>
}
