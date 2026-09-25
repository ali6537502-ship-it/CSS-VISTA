// Every candidate-facing MPT string lives here (Section 19), ready for Urdu.
import type { MptPhase, MptPrimaryAction } from './state'

export const PKT_ZONE = 'Asia/Karachi'

export function pktTime(iso: string | null | undefined) {
  if (!iso) return ''
  return `${new Intl.DateTimeFormat('en-PK', { timeZone: PKT_ZONE, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))} PKT`
}
export function pktDate(iso: string | null | undefined) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-PK', { timeZone: PKT_ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}
export function pktDateTime(iso: string | null | undefined) {
  return iso ? `${pktDate(iso)}, ${pktTime(iso)}` : ''
}

/** "09:59" under an hour, "2h 10m" above. */
export function countdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
export function minutesText(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

export type BadgeTone = 'neutral' | 'open' | 'reserved' | 'live' | 'done' | 'muted' | 'warning'

export const PHASE_BADGE: Record<MptPhase, { label: string; tone: BadgeTone }> = {
  LOGIN_REQUIRED: { label: 'Applications Open', tone: 'open' },
  NOT_YET_OPEN: { label: 'Opens Soon', tone: 'neutral' },
  APPLICATIONS_OPEN: { label: 'Applications Open', tone: 'open' },
  SLOTS_FULL: { label: 'Slots Full', tone: 'muted' },
  APPLICATIONS_CLOSED: { label: 'Applications Closed', tone: 'muted' },
  ROLL_NUMBER_PENDING: { label: 'Slot Reserved', tone: 'reserved' },
  SLOT_RESERVED: { label: 'Slot Reserved', tone: 'reserved' },
  ENTRY_OPEN: { label: 'Entry Open', tone: 'live' },
  IN_PROGRESS: { label: 'In Progress', tone: 'live' },
  SUBMITTED_PENDING_RESULT: { label: 'Submitted', tone: 'done' },
  RESULT_AVAILABLE: { label: 'Completed', tone: 'done' },
  ABSENT: { label: 'Absent', tone: 'warning' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
}

export const ACTION_LABEL: Record<Exclude<MptPrimaryAction, null>, string> = {
  login: 'Login to Apply',
  apply: 'Apply Now',
  view_application: 'View Application',
  view_roll_number: 'View Roll Number',
  enter_exam: 'Enter Exam',
  continue_exam: 'Continue Exam',
  view_submission: 'View Submission',
  view_result: 'View Result',
}

export const copy = {
  hub: {
    title: 'CSS MPT MOCK',
    tagline: 'Apply. Reserve your slot. Receive your Roll Number. Attempt the mock.',
    cta: 'Apply for MPT Mock',
    free: 'Free — a My CSS Vista account keeps your slot, Roll Number and full exam record.',
    loginTitle: 'Create your My CSS Vista account',
    loginBody: 'Reserve your MPT Mock slot, get your Roll Number and keep your complete exam history — free.',
    createAccount: 'Create Account',
    haveAccount: 'Already have an account? Log in',
    noMocks: 'No MPT Mock is open for applications right now. The next one will appear here as soon as applications open.',
    registered: (n: number) => `${n} candidates registered`,
    moreUpcoming: 'See all upcoming mocks in My CSS Vista',
    slots: (n: number) => `Slots available: ${n}`,
  },
  apply: {
    heading: 'CSS VISTA MPT MOCK EXAMINATION',
    title: (n: number) => `Application for MPT Mock ${n}`,
    examDetails: 'Exam details',
    candidateDetails: 'Candidate details',
    fee: 'FREE',
    wrongDetails: 'Details wrong? Update your profile',
    declaration: 'I confirm I am applying through my own My CSS Vista account and understand that the Roll Number issued with this application is personal to me and required to enter the examination.',
    submit: 'Submit Application & Reserve Slot',
    submitting: 'Reserving your slot…',
    closesAtStart: 'Applications close when the exam starts. You can apply for any upcoming mock at any time.',
    alreadyApplied: 'You have already applied for this mock.',
  },
  confirmation: {
    success: 'APPLICATION SUCCESSFUL',
    reserved: 'Your MPT Mock slot has been reserved.',
    rollIn: 'Your Roll Number will be issued in',
    rollHint: "It will appear here and on your My CSS Vista dashboard. You don't need to stay on this page.",
    yourRoll: 'YOUR ROLL NUMBER',
    copy: 'Copy Roll Number',
    copied: 'Copied',
    back: 'Back to My CSS Vista',
    view: 'View Application',
    calendar: 'Add to Calendar',
    enterNow: (minutes: number) => `Enter Exam Now — ${minutes} min left`,
    personal: 'Your Roll Number is linked to your My CSS Vista account and cannot be used by anyone else.',
    print: 'Print Application',
    withdraw: 'Withdraw Application',
    withdrawConfirm: 'Withdraw this application? Your slot will be released. You can apply again while applications are open.',
    withdrawing: 'Withdrawing…',
    statusReserved: 'SLOT RESERVED',
  },
  entrance: {
    heading: 'MPT MOCK EXAMINATION — Candidate Verification',
    label: 'Enter your Roll Number',
    hint: 'Your Roll Number is on your My CSS Vista dashboard.',
    submit: 'Verify & Enter',
    verifying: 'Verifying…',
    where: 'Where is my Roll Number?',
    typo: 'Please check your Roll Number — a digit looks wrong or missing.',
    verified: 'Candidate Verified',
    timerNote: 'Your timer starts when you press Start and does not pause.',
    start: 'Start MPT Mock',
    continue: 'Continue MPT Mock',
    starting: 'Starting examination…',
    late: (minutes: number, allowance: string) => `You are starting ${minutes} minute${minutes === 1 ? '' : 's'} late. You have ${allowance}.`,
    fullTime: (allowance: string) => `You will have ${allowance}.`,
    resumeNote: 'Your examination is in progress. Your saved answers and remaining time will be restored.',
  },
  exam: {
    saved: (ago: string) => `Saved · ${ago}`,
    saving: 'Saving…',
    offline: 'Offline — answers will sync when you reconnect',
    timeUp: 'Time is up. Your saved answers have been submitted.',
    submit: 'Submit MPT Mock',
    submitting: 'Submitting…',
    submitConfirm: (unanswered: number) => unanswered > 0
      ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit your examination now? This cannot be undone.`
      : 'Submit your examination now? This cannot be undone.',
    otherDevice: 'This exam is open on another device. Continue here?',
    continueHere: 'Continue here',
    inProgress: 'Examination in Progress',
  },
  result: {
    title: 'MPT Mock Result',
    pending: (time: string) => `Submitted. Your result card will be available at ${time} — 30 minutes after the mock ends, once every candidate has finished.`,
    reviewAt: (time: string) => `Question-by-question review opens at ${time}, after every candidate has finished.`,
    card: 'MPT MOCK RESULT CARD',
    congrats: (n: number) => `Congratulations on completing CSS Vista MPT Mock ${n}.`,
    keepGoing: 'Every mock sharpens your preparation. Review your wrong answers and aim higher in the next one.',
    printCard: 'Download / Print Result Card',
    verifiedNote: 'Official CSS Vista mock result, scored by the server.',
    rescored: (date: string) => `Result updated on ${date} after an answer-key correction.`,
    viewPerformance: 'View Performance',
    back: 'Back to My CSS Vista',
    review: 'Review Answers',
  },
  dashboard: {
    currentTitle: 'Current MPT Mock',
    scoreTitle: 'My MPT Score',
    scoreEmpty: 'Your MPT score will appear here after your first completed mock.',
    performanceTitle: 'MPT Performance',
    historyTitle: 'My MPT History',
    upcomingTitle: 'Upcoming MPT Mocks',
    ready: 'Your MPT Mock is ready',
    viewAll: 'View All History',
    viewPerformance: 'View Full Performance',
    viewResult: 'View Result Card',
    mistakesTitle: 'My Wrong Answers',
    mistakesIntro: 'Every question you answered incorrectly in your completed MPT Mocks, with the correct answer, so you can work on it.',
    mistakesEmpty: 'Your wrong answers appear here once a completed mock’s results are out (30 minutes after it ends).',
    mistakesLink: (n: number) => `${n} wrong answer${n === 1 ? '' : 's'} to review`,
    legacy: 'Legacy attempt · self-scored',
    legacyNote: 'Earlier mock results were scored in the browser under the old rules. They stay in your history but are not counted in official averages, trend or rank.',
    trend: { IMPROVING: 'Improving', DECLINING: 'Declining', STEADY: 'Steady' } as const,
    trendRule: 'Average of your last 3 completed mocks compared with the 3 before them.',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    notEnabled: 'MPT applications are not available yet.',
  },
}
