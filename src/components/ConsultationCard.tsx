import { ArrowRight, CalendarClock, Video } from 'lucide-react'
import { Link } from 'react-router'
import WhatsAppIcon from '@/components/WhatsAppIcon'
import {
  consultationDisclaimer,
  consultationDurationLabel,
  consultationFeeLabel,
  consultationSettings,
  consultationWhatsAppLink,
  mentorConsultations,
  type ConsultationMentorId,
} from '@/data/consultations'
import { mentors } from '@/data/site'

export function ConsultationBookingButton({ mentorId, className = '' }: { mentorId: ConsultationMentorId; className?: string }) {
  const config = mentorConsultations[mentorId]
  if (!config.available) {
    return <span className={`inline-flex min-h-11 items-center justify-center rounded-xl border bg-slate-100 px-4 text-sm font-bold text-slate-500 ${className}`}>Currently unavailable</span>
  }
  const mentor = mentors.find((item) => item.id === mentorId)!
  return (
    <a
      href={consultationWhatsAppLink(mentorId)}
      target="_blank"
      rel="noopener noreferrer"
      data-google-vignette="false"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-center text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 ${className}`}
      aria-label={`Book a 1-on-1 CSS consultation with ${mentor.name} on WhatsApp`}
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0" aria-hidden="true" /> Book consultation on WhatsApp
    </a>
  )
}

export default function ConsultationCard({
  mentorIds = ['ali', 'sadia'],
  variant = 'full',
  heading = 'Need Personal Guidance Before Starting CSS?',
  description = 'Book a private consultation with a CSS VISTA mentor to discuss your preparation according to your individual situation.',
  showDetailsLink = true,
}: {
  mentorIds?: ConsultationMentorId[]
  variant?: 'full' | 'compact'
  heading?: string
  description?: string
  showDetailsLink?: boolean
}) {
  const compact = variant === 'compact'
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-white via-emerald-50/50 to-amber-50/50 shadow-sm" aria-labelledby={`consultation-${mentorIds.join('-')}-heading`}>
      <div className={compact ? 'p-4 sm:p-5' : 'p-5 sm:p-7'}>
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pine text-white"><Video className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-700">Paid 1-on-1 CSS consultation</p>
            <h2 id={`consultation-${mentorIds.join('-')}-heading`} className="mt-1 font-display text-xl font-bold text-pine sm:text-2xl">{heading}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className={`mt-5 grid gap-3 ${mentorIds.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {mentorIds.map((mentorId) => {
            const config = mentorConsultations[mentorId]
            const mentor = mentors.find((item) => item.id === mentorId)!
            const duration = consultationDurationLabel(config)
            return (
              <article key={mentorId} className="flex min-w-0 flex-col rounded-xl border border-emerald-900/10 bg-white p-4 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={mentor.photo} alt={mentor.name} loading="lazy" decoding="async" className="h-16 w-14 shrink-0 rounded-xl object-cover object-top" />
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold leading-tight text-pine">1-on-1 with {mentor.name}</h3>
                    <p className="mt-1 text-xs font-semibold text-emerald-800">{consultationSettings.bookingStatus}</p>
                  </div>
                </div>
                {!compact && <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{config.summary}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1">Live on {consultationSettings.sessionPlatform}</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1">Paid consultation</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Fee: {consultationFeeLabel(config)}</span>
                  {duration && <span className="rounded-full bg-slate-100 px-2.5 py-1">{duration}</span>}
                </div>
                <ConsultationBookingButton mentorId={mentorId} className="mt-4 w-full" />
              </article>
            )
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-emerald-900/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" /> Sessions are scheduled according to mentor availability after booking confirmation.</p>
          {showDetailsLink && <Link to="/consultation" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-lg border bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50">View booking details <ArrowRight className="h-3.5 w-3.5" /></Link>}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">{consultationDisclaimer}</p>
      </div>
    </section>
  )
}
