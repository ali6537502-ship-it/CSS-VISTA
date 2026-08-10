// FPSC Updates centre. Official notices are published only after verification from FPSC.
// No invented dates: pending items are explicitly marked.
export interface FpscNotice {
  id: string
  title: string
  category: 'Advertisement' | 'Schedule' | 'Rules' | 'Result' | 'Notice'
  status: 'active' | 'upcoming' | 'expired' | 'awaiting-verification'
  summary: string
  officialLink: string
  published?: string
  deadline?: string
}

export const fpscNotices: FpscNotice[] = [
  {
    id: 'f1',
    title: 'CSS Competitive Examination - Rules & Syllabus (official document)',
    category: 'Rules',
    status: 'active',
    summary: 'The CSS CE Rules and the official syllabus govern eligibility, subjects and the examination structure. Always rely on the FPSC-published version.',
    officialLink: 'https://www.fpsc.gov.pk/',
  },
  {
    id: 'f2',
    title: 'Next CSS advertisement (MPT and written cycle)',
    category: 'Advertisement',
    status: 'awaiting-verification',
    summary: 'The annual CSS advertisement - with MPT and written-exam dates - is published only by FPSC. This entry activates once the official notice is verified and linked.',
    officialLink: 'https://www.fpsc.gov.pk/',
  },
]

// Typical annual cycle (pattern guidance only - not a substitute for the official notice)
export const typicalCycle: { stage: string; typicalWindow: string; note: string }[] = [
  { stage: 'Advertisement & online applications', typicalWindow: 'Around October', note: 'Exact dates appear only in the FPSC advertisement.' },
  { stage: 'MPT (MCQ-based Preliminary Test)', typicalWindow: 'Around November', note: 'Screening stage introduced from CSS 2022; qualify to sit the written exam.' },
  { stage: 'Written examination', typicalWindow: 'Around February', note: 'Twelve papers: six compulsory and six optional.' },
  { stage: 'Written result', typicalWindow: 'Later in the year', note: 'Published on the FPSC website.' },
  { stage: 'Medical, psychological assessment & viva voce', typicalWindow: 'After the written result', note: 'Conducted per FPSC schedule for qualified candidates.' },
  { stage: 'Final merit & allocation', typicalWindow: 'After viva completion', note: 'Merit-cum-quota allocation to occupational groups.' },
]

export const updatesDisclaimer =
  'The timeline above describes the usual annual pattern for guidance only. Binding dates exist solely in the official FPSC advertisement and notices.'
