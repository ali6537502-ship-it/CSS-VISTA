// Official announcements displayed below the customized test-series planner.
// The owner posts announcements, posters, schedules and registration details via the admin panel.
export interface TestSeriesAnnouncement {
  id: string
  title: string
  date: string
  body: string
  posterUrl?: string // owner-provided poster image
  registrationInfo?: string
  startDate?: string
  published: boolean
}

export const testSeriesAnnouncements: TestSeriesAnnouncement[] = [
  {
    id: 'ts-seed-1',
    title: 'CSS 2027 Test Series & Grand Mocks - with Miss Sadia Zahoor, PAS',
    date: '2026-07-17',
    body: 'The CSS 2027 Test Series and Grand Mocks by Miss Sadia Zahoor, PAS include scheduled essay tests, personalised evaluation and answer-writing feedback. Registration details, posters and the full schedule will be posted here as announced.',
    registrationInfo: 'Contact on WhatsApp 0300-1202251 for registration details.',
    startDate: 'To be announced',
    published: true,
  },
]
