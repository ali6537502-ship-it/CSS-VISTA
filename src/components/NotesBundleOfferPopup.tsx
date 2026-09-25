import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, MessageCircle, Sparkles, X } from 'lucide-react'
import { noteProducts } from '@/data/notes'
import { mentors, waLink } from '@/data/site'
import { notesBundleOfferEndsAt as OFFER_ENDS_AT, notesBundleOfferPrice as OFFER_PRICE } from '@/data/notesBundleOffer'

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-PK').format(value)
}

function getTimeLeft(now: number) {
  const remaining = Math.max(0, OFFER_ENDS_AT - now)
  const totalSeconds = Math.floor(remaining / 1000)

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: remaining <= 0,
  }
}

export default function NotesBundleOfferPopup() {
  const [open, setOpen] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const totalPrice = useMemo(
    () => noteProducts.reduce((sum, product) => sum + product.pricing.regularPrice, 0),
    [],
  )
  const savings = totalPrice - OFFER_PRICE
  const timeLeft = getTimeLeft(now)

  if (!open || timeLeft.expired) return null

  const ali = mentors.find((mentor) => mentor.id === 'ali')
  const purchaseLink = ali
    ? waLink(
        ali.whatsapp,
        `Assalam-o-Alaikum, I want to purchase the Complete Notes Bundle at today's PKR ${formatPrice(OFFER_PRICE)} offer before 11:00 PM PKT. Please share the purchase details.`,
      )
    : '/notes'

  const subjects = [
    'Current Affairs',
    'Pakistan Affairs',
    'Criminology',
    'Political Science',
    'European History',
  ]

  const priceBreakdown = [
    { label: 'Current Affairs + Pakistan Affairs', price: 7000 },
    { label: 'Criminology', price: 3600 },
    { label: 'Political Science', price: 4000 },
    { label: 'European History', price: 6000 },
  ]

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-emerald-950/80 px-3 py-5 backdrop-blur-md sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-bundle-offer-title"
    >
      <section className="relative w-full max-w-3xl overflow-hidden rounded-[28px] border border-amber-300/80 bg-[#fffdf7] shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300" />

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-emerald-900/10 bg-white/90 text-emerald-950 shadow-sm transition hover:bg-emerald-50"
          aria-label="Close bundle offer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 px-5 pb-7 pt-8 text-white sm:px-8 sm:pb-8 sm:pt-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-950">
              <Sparkles className="h-3.5 w-3.5" />
              One-Day Bundle Offer
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-50">
              Ends 11:00 PM PKT
            </span>
          </div>

          <h2 id="notes-bundle-offer-title" className="mt-4 max-w-2xl font-display text-3xl font-black leading-tight sm:text-4xl">
            Get the Complete Notes Bundle for <span className="text-amber-300">PKR {formatPrice(OFFER_PRICE)}</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/85 sm:text-base">
            Five core subjects in one complete package. Today only, the full bundle is available at a special price before the countdown ends.
          </p>

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-200">
              <Clock3 className="h-4 w-4" />
              Offer ends in
            </div>
            <div className="grid max-w-md grid-cols-3 gap-2.5">
              {[
                ['Hours', timeLeft.hours],
                ['Minutes', timeLeft.minutes],
                ['Seconds', timeLeft.seconds],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center shadow-inner backdrop-blur">
                  <div className="font-display text-2xl font-black tabular-nums text-white sm:text-3xl">
                    {String(value).padStart(2, '0')}
                  </div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-100/75">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-7 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">All subjects included</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {subjects.map((subject) => (
                <div key={subject} className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-sm font-bold text-emerald-950">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                  {subject}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-4 sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">Regular value</p>
            <div className="mt-3 space-y-2.5">
              {priceBreakdown.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-slate-600">{item.label}</span>
                  <strong className="shrink-0 text-emerald-950">PKR {formatPrice(item.price)}</strong>
                </div>
              ))}
            </div>

            <div className="my-4 border-t border-dashed border-amber-300" />

            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Total price</p>
                <p className="mt-1 font-display text-xl font-black text-slate-500 line-through">PKR {formatPrice(totalPrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">Today</p>
                <p className="mt-1 font-display text-3xl font-black text-emerald-950">PKR {formatPrice(OFFER_PRICE)}</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-amber-300 px-3 py-2.5 text-center text-sm font-black text-emerald-950">
              You save PKR {formatPrice(savings)}
            </div>
          </div>
        </div>

        <div className="border-t bg-white px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={purchaseLink}
              target={purchaseLink.startsWith('http') ? '_blank' : undefined}
              rel={purchaseLink.startsWith('http') ? 'noopener noreferrer' : undefined}
              data-google-vignette="false"
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-black text-white shadow-lg transition hover:bg-emerald-800"
            >
              <MessageCircle className="h-4 w-4" />
              Get Complete Bundle — PKR {formatPrice(OFFER_PRICE)}
            </a>
            <a
              href="/notes"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-emerald-900 px-5 text-sm font-black text-emerald-950 transition hover:bg-emerald-50"
            >
              View Notes & Samples
            </a>
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
            Special bundle price valid only until 11:00 PM Pakistan Standard Time on 25 September 2026.
          </p>
        </div>
      </section>
    </div>
  )
}
