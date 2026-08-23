export interface WeeklyMagazine {
  title: string
  issue: string
  description: string
  coverage: string[]
  pdfUrl: string | null
  coverUrl: string | null
  pageCount: number | null
}

export const weeklyMagazine: WeeklyMagazine = {
  title: 'CSS VISTA Current Affairs Weekly',
  issue: 'Issue No. 01 · 15 August 2026',
  description: 'A focused weekly journal for current-affairs revision, analysis and examination preparation.',
  coverage: ['Major weekly developments', 'Pakistan & international analysis', 'Exam-focused questions'],
  pdfUrl: '/magazines/css-vista-current-affairs-weekly-15-august-2026.pdf',
  coverUrl: '/magazines/css-vista-current-affairs-weekly-15-august-2026.webp',
  pageCount: 25,
}
