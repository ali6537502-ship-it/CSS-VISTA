export interface WeeklyMagazine {
  title: string
  issue: string
  publishedDate: string
  description: string
  coverage: string[]
  pdfUrl: string | null
  coverUrl: string | null
  pageCount: number | null
}

const issueOne: WeeklyMagazine = {
  title: 'CSS VISTA Current Affairs Weekly',
  issue: 'Issue No. 01 · 15 August 2026',
  publishedDate: '2026-08-15',
  description: 'A focused weekly journal for current-affairs revision, analysis and examination preparation.',
  coverage: ['Major weekly developments', 'Pakistan & international analysis', 'Exam-focused questions'],
  pdfUrl: '/magazines/css-vista-current-affairs-weekly-15-august-2026.pdf',
  coverUrl: '/magazines/css-vista-current-affairs-weekly-15-august-2026.webp',
  pageCount: 25,
}

const issueTwo: WeeklyMagazine = {
  title: 'CSS VISTA Current Affairs Weekly',
  issue: 'Issue No. 02 · 25 August 2026',
  publishedDate: '2026-08-25',
  description: 'A focused weekly journal covering the major developments from 16 to 24 August 2026 for current-affairs revision, analysis and examination preparation.',
  coverage: ['16–24 August developments', 'Pakistan & international analysis', 'Exam-focused questions'],
  pdfUrl: '/magazines/css-vista-current-affairs-weekly-25-august-2026.pdf',
  coverUrl: '/magazines/css-vista-current-affairs-weekly-25-august-2026.webp',
  pageCount: 23,
}

export const weeklyMagazine: WeeklyMagazine = {
  title: 'CSS VISTA Current Affairs Weekly',
  issue: 'Issue No. 03 · 03 September 2026',
  publishedDate: '2026-09-03',
  description: 'The third edition of CSS VISTA Current Affairs Weekly, covering major developments from 23 August to 3 September 2026 for current-affairs revision, analysis and examination preparation.',
  coverage: ['23 August–3 September developments', 'Pakistan & international analysis', 'Exam-focused questions'],
  pdfUrl: '/magazines/css-vista-current-affairs-weekly-03-september-2026.pdf',
  coverUrl: '/magazines/css-vista-current-affairs-weekly-03-september-2026.webp',
  pageCount: 21,
}

export const weeklyMagazines: WeeklyMagazine[] = [weeklyMagazine, issueTwo, issueOne]
