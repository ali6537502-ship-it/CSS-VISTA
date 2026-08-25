import { CheckCircle2, Clock3, MessageCircle, Video } from 'lucide-react'
import ConsultationCard from '@/components/ConsultationCard'
import { PageHeader } from '@/components/shared'
import { consultationSettings, consultationTopics } from '@/data/consultations'

const bookingSteps = [
  'Choose Sir Ali Hassan or Ms. Sadia Zahoor.',
  'Open the mentor-specific WhatsApp booking message.',
  'Receive the consultation fee and available time slots.',
  'Confirm a preferred slot and arrange payment.',
  'Receive Google Meet details after booking confirmation.',
  'Attend the scheduled live consultation.',
]

export default function Consultation() {
  return (
    <div>
      <PageHeader title="1-on-1 CSS Consultation" description="Private, paid preparation guidance with a CSS VISTA mentor, scheduled by prior appointment and conducted live on Google Meet." />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:py-10">
        <ConsultationCard showDetailsLink={false} />

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="consultation-scope-heading">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><CheckCircle2 className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-amber-700">Personalized discussion</p><h2 id="consultation-scope-heading" className="font-display text-xl font-bold text-pine">What the session may cover</h2></div></div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {consultationTopics.map((topic) => <li key={topic} className="flex items-start gap-2 rounded-lg bg-secondary/45 px-3 py-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> {topic}</li>)}
            </ul>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="consultation-process-heading">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><MessageCircle className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-amber-700">Simple human booking</p><h2 id="consultation-process-heading" className="font-display text-xl font-bold text-pine">Booking process</h2></div></div>
            <ol className="mt-5 space-y-3">
              {bookingSteps.map((step, index) => <li key={step} className="flex items-start gap-3 text-sm leading-6 text-slate-700"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pine text-xs font-bold text-white">{index + 1}</span><span>{step}</span></li>)}
            </ol>
          </section>
        </div>

        <section className="rounded-2xl border border-emerald-900/15 bg-pine p-5 text-white sm:p-6" aria-labelledby="consultation-appointment-heading">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3"><Video className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><h2 id="consultation-appointment-heading" className="font-bold">Session mode</h2><p className="mt-1 text-sm text-emerald-100">Live on {consultationSettings.sessionPlatform}</p></div></div>
            <div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><h3 className="font-bold">Availability</h3><p className="mt-1 text-sm text-emerald-100">Prior appointment only</p></div></div>
            <div className="flex items-start gap-3"><MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><h3 className="font-bold">Booking contact</h3><p className="mt-1 text-sm text-emerald-100">WhatsApp {consultationSettings.bookingNumberDisplay}</p></div></div>
          </div>
          <p className="mt-4 border-t border-white/15 pt-4 text-xs leading-5 text-emerald-100">The website does not issue an automated booking or payment confirmation. The fee, slot, payment arrangement and Google Meet details are confirmed directly through CSS VISTA WhatsApp.</p>
        </section>
      </main>
    </div>
  )
}
