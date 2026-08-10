// Site-wide configuration and owner-provided details
import { shippedMcqSummary } from '@/data/mcqMeta'

export const site = {
  name: 'CSS Vista',
  tagline: 'A complete preparation platform for CSS aspirants in Pakistan',
  whatsappNumber: '',
  cssGroupLink: 'https://chat.whatsapp.com/KkmMs8KS4wZ7Z39grDLZwT',
  cssGroupLabel: 'Join the CSS Vista WhatsApp Group',
  email: '',
}

export const mentors = [
  {
    id: 'sadia',
    name: 'Miss Sadia Zahoor, PAS',
    role: 'All-Round CSS Mentor',
    photo: '/images/mentor-sadia.jpg',
    instagram: 'https://www.instagram.com/sadia.zahoor.pas',
    credentials: ['5th Position in CSS 2024', 'CSS 2025 Written Qualifier', 'PMS 2023 Written Qualifier'],
    bio: 'A CSS position holder who cleared every subject of her examination - an all-round mentor for the complete CSS journey, from written papers to interview preparation.',
    optionalSubjects: ['Political Science', 'Criminology', 'European History', 'Environmental Science', 'Punjabi'],
    services: [
      'Complete CSS mentorship',
      'English Essay preparation',
      'Précis and Composition guidance',
      'Answer-writing improvement',
      'Individual mentorship',
      'CSS 2027 Test Series',
      'CSS 2027 Grand Mocks',
      'Personalised evaluation and feedback',
      'Overall preparation planning',
    ],
    whatsapp: '923001202251',
    whatsappDisplay: '0300-1202251',
    message:
      'Assalam-o-Alaikum Ma’am, I want information about CSS mentorship, English Essay preparation, the CSS 2027 Test Series and Grand Mocks.',
  },
  {
    id: 'ali',
    name: 'Sir Ali Hassan Sargana',
    role: 'Advocate and CSS Mentor',
    photo: '/images/mentor-ali.jpg',
    instagram: 'https://www.instagram.com/ali_hassan_sargana_',
    credentials: [],
    bio: 'An advocate and CSS mentor specialising in Criminology, Current Affairs, Pakistan Affairs and Political Science - with exam-oriented notes, analytical answer-writing guidance and subject-specific preparation support.',
    optionalSubjects: [] as string[],
    specialisations: ['Criminology', 'Current Affairs', 'Pakistan Affairs', 'Political Science'],
    services: [
      'Criminology',
      'Current Affairs',
      'Pakistan Affairs',
      'Political Science',
      'Notes and academic resources',
      'Analytical answer-writing guidance',
      'Subject-specific preparation support',
    ],
    whatsapp: '923092996294',
    whatsappDisplay: '0309-2996294',
    message: 'Assalam-o-Alaikum Sir, I want to view the sample notes and get details about the notes package.',
  },
]

export function waLink(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export interface Notification {
  id: string
  kind: 'fpsc' | 'platform'
  text: string
  link: string
  expires?: string
}

export const notifications: Notification[] = [
  {
    id: 'n1',
    kind: 'platform',
    text: `GK World is live - ${shippedMcqSummary} with daily challenges and a mistake notebook.`,
    link: '/gk',
  },
  {
    id: 'n2',
    kind: 'fpsc',
    text: 'CSS applications, MPT and written-exam dates are announced only by FPSC. Always verify dates at fpsc.gov.pk.',
    link: '/fpsc-updates',
  },
]

export const fpscVerificationNote =
  'Rules and dates may change. Always confirm current information from the official FPSC notice linked on this page.'
