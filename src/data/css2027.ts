// FPSC Notifications - CSS 2027 and CSS 2027 Important Dates.
// Only official FPSC notifications are published. No invented dates.
// The owner adds official notifications through the admin panel as FPSC releases them.

export interface FpscNotification2027 {
  id: string
  title: string
  date: string // publication date (ISO) or ''
  category:
    | 'MPT Advertisement'
    | 'MPT Applications'
    | 'MPT Examination'
    | 'MPT Result'
    | 'Written Applications'
    | 'Written Examination'
    | 'Admission Certificate'
    | 'Rules & Eligibility'
    | 'Psychological Assessment'
    | 'Viva Voce'
    | 'Final Result'
    | 'General'
  summary: string
  officialUrl: string // official FPSC link or PDF
}

export const css2027ScheduleSource = {
  title: 'FPSC Advance Public Notice - CSS Competitive Examination 2027',
  url: 'https://www.fpsc.gov.pk/uploads/content/1783075774884_Advance_Public_Notice_-_CSS_Competitive_Examination-2027.pdf',
  published: '2026-07-05',
  lastVerified: '2026-07-18',
}

export const notifications2027: FpscNotification2027[] = [
  {
    id: 'css-2027-advance-notice',
    title: 'Advance Public Notice - CSS Competitive Examination 2027',
    date: '2026-07-05',
    category: 'General',
    summary: 'FPSC announced the tentative MPT and written-examination schedule for CSS CE-2027. The notice includes the MPT notice/application window, MPT date, written application window, hardcopy deadline and written-examination commencement date.',
    officialUrl: css2027ScheduleSource.url,
  },
  {
    id: 'rules-standing',
    title: 'CSS Competitive Examination - Rules & Syllabus (standing document)',
    date: '',
    category: 'Rules & Eligibility',
    summary: 'The CSS CE Rules and syllabus govern eligibility, subjects and the examination structure for CSS 2027. Always rely on the FPSC-published version.',
    officialUrl: 'https://www.fpsc.gov.pk/',
  },
]

export type DateStatus = 'Official' | 'Tentative' | 'To Be Announced'

export interface CssDate {
  id: string
  item: string
  date: string
  status: DateStatus
}

// Future schedule dates below are officially published by FPSC but expressly tentative.
// Items omitted from the advance notice remain unannounced.
export const css2027Dates: CssDate[] = [
  { id: 'd0', item: 'Advance public notice published', date: '2026-07-05', status: 'Official' },
  { id: 'd1', item: 'MPT public notice', date: '2026-08-02', status: 'Tentative' },
  { id: 'd2', item: 'MPT online applications open', date: '2026-08-03', status: 'Tentative' },
  { id: 'd3', item: 'MPT online application deadline', date: '2026-08-20', status: 'Tentative' },
  { id: 'd4', item: 'MPT examination', date: '2026-09-27', status: 'Tentative' },
  { id: 'd5', item: 'MPT result date', date: '', status: 'To Be Announced' },
  { id: 'd5a', item: 'Written examination advertisement', date: '2026-11-08', status: 'Tentative' },
  { id: 'd6', item: 'Written online applications open', date: '2026-11-10', status: 'Tentative' },
  { id: 'd7', item: 'Written online application deadline', date: '2026-11-25', status: 'Tentative' },
  { id: 'd7a', item: 'Hardcopy application and documents deadline', date: '2026-12-04', status: 'Tentative' },
  { id: 'd8', item: 'Written examination commences', date: '2027-01-27', status: 'Tentative' },
  { id: 'd9', item: 'Detailed written examination date sheet', date: '', status: 'To Be Announced' },
  { id: 'd10', item: 'MPT fee and payment deadline', date: '', status: 'To Be Announced' },
  { id: 'd11', item: 'MPT admission certificate availability', date: '', status: 'To Be Announced' },
  { id: 'd12', item: 'Written examination fee deadline', date: '', status: 'To Be Announced' },
  { id: 'd13', item: 'CSS 2027 eligibility cut-off details', date: '', status: 'To Be Announced' },
  { id: 'd14', item: 'Written examination admission certificates', date: '', status: 'To Be Announced' },
  { id: 'd15', item: 'Written examination result', date: '', status: 'To Be Announced' },
  { id: 'd16', item: 'Medical examination schedule', date: '', status: 'To Be Announced' },
  { id: 'd17', item: 'Psychological assessment schedule', date: '', status: 'To Be Announced' },
  { id: 'd18', item: 'Viva voce schedule', date: '', status: 'To Be Announced' },
  { id: 'd19', item: 'CSS 2027 final result', date: '', status: 'To Be Announced' },
]
