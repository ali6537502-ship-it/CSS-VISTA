export type ConsultationMentorId = 'ali' | 'sadia'

export interface MentorConsultationConfig {
  mentorId: ConsultationMentorId
  available: boolean
  fee: string
  duration: string
  summary: string
  whatsappMessage: string
}

export const consultationSettings = {
  bookingNumber: '923166050195',
  bookingNumberDisplay: '0316-6050195',
  sessionPlatform: 'Google Meet',
  bookingStatus: 'Prior appointment required',
  paid: true,
} as const

export const mentorConsultations: Record<ConsultationMentorId, MentorConsultationConfig> = {
  ali: {
    mentorId: 'ali',
    available: true,
    fee: '',
    duration: '',
    summary: 'Discuss how to start CSS, preparation strategy, subject selection, resources, study planning and mistakes to avoid.',
    whatsappMessage: 'Assalam-o-Alaikum. I would like to book a 1-on-1 CSS consultation session with Sir Ali Hassan through CSS VISTA. Please share the booking procedure, available schedule, and consultation fee.',
  },
  sadia: {
    mentorId: 'sadia',
    available: true,
    fee: '',
    duration: '',
    summary: 'Get personalized guidance on preparation strategy, examination approach, answer writing, subject planning and study management.',
    whatsappMessage: 'Assalam-o-Alaikum. I would like to book a 1-on-1 CSS consultation session with Ms. Sadia Zahoor through CSS VISTA. Please share the booking procedure, available schedule, and consultation fee.',
  },
}

export const consultationTopics = [
  'How to start CSS preparation',
  'Preparation roadmap and study strategy',
  'Optional-subject selection',
  'Time and revision management',
  'Resource and syllabus planning',
  'Past-paper and mock-test strategy',
  'Answer-writing direction',
  'Preparation mistakes and personal difficulties',
] as const

export const consultationDisclaimer = 'Consultation provides personalized preparation guidance based on the aspirant’s circumstances. It does not constitute a guarantee of examination success or allocation.'

export function consultationFeeLabel(config: MentorConsultationConfig) {
  return config.fee.trim() || 'Contact for details'
}

export function consultationDurationLabel(config: MentorConsultationConfig) {
  return config.duration.trim() || null
}

export function consultationWhatsAppLink(mentorId: ConsultationMentorId) {
  const config = mentorConsultations[mentorId]
  return `https://wa.me/${consultationSettings.bookingNumber}?text=${encodeURIComponent(config.whatsappMessage)}`
}
