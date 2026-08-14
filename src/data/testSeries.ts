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
    title: 'Registration Open: Test Series & Evaluation Program by Ms. Sadia Zahoor',
    date: '2026-08-10',
    body: 'Create a completely customized written test series covering all compulsory subjects and the selected optional subjects taught by Ms. Sadia Zahoor. Choose alternate papers, the number of tests, dates and syllabus division. The program includes daily answer writing, topic-wise and subject-wise tests, full-length mock examinations, detailed evaluation and optional live mock evaluation on Google Meet.',
    posterUrl: '/images/test-series-sadia-zahoor.webp',
    registrationInfo: 'Contact on WhatsApp 0300-1202251 for registration details.',
    startDate: 'Customized for each student',
    published: true,
  },
]
