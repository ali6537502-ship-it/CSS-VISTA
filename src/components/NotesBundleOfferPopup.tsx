import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, MessageCircle, X } from 'lucide-react'
import { noteProducts } from '@/data/notes'
import { mentors, waLink } from '@/data/site'
import { notesBundleOfferEndsAt as OFFER_ENDS_AT, notesBundleOfferPrice as OFFER_PRICE } from '@/data/notesBundleOffer'

const DISMISSED_KEY = 'cssvista:notes-bundle-offer-dismissed:' + OFFER_ENDS_AT

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

function wasDismissedThisSession() {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function rememberDismissal() {
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // The offer remains closable even when storage is unavailable.
  }
}

export default function NotesBundleOfferPopup() {
  const [open, setOpen] = useState(() => !wasDismissedThisSession())
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

  function closeOffer() {
    rememberDismissal()
    setOpen(false)
  }

  const ali = mentors.find((mentor) => mentor.id === 'ali')
  const purchaseLink = ali
    ? waLink(
        ali.whatsapp,
        `Assalam-o-Alaikum, I want to purchase the Complete Notes Bundle of Sir Ali Hassan Sargana at today's PKR ${formatPrice(OFFER_PRICE)} offer before 11:00 PM PKT. Please share the purchase details.`,
      )
    : '/notes'

  const subjects = [
    'Current Affairs',
    'Pakistan Affairs',
    'Criminology',
    'Political Science',
    'European History',
  ]

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-emerald-950/35 p-2 backdrop-blur-[2px] sm:items-center sm:overflow-y-auto sm:bg-emerald-950/75 sm:px-5 sm:py-5 sm:backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-bundle-offer-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) closeOffer()
      }}
    >
      <section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-300/80 bg-[#fffdf7] shadow-2xl sm:max-w-xl sm:rounded-[24px]">
        <button
          type="button"
          onClick={closeOffer}
          className="absolute right-2.5 top-2.5 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-white text-emerald-950 shadow-md"
          aria-label="Close bundle offer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="bg-gradient-to-br from-emerald-950 to-emerald-800 px-4 pb-4 pt-4 text-white sm:px-6 sm:pb-5 sm:pt-5">
          <p className="pr-11 text-[9px] font-black uppercase tracking-[0.16em] text-amber-300">
            Today only · Ends 11:00 PM PKT
          </p>

          <h2 id="notes-bundle-offer-title" className="mt-1.5 pr-10 font-display text-[21px] font-black leading-[1.08] sm:text-3xl">
            Complete Notes Bundle of Sir Ali Hassan Sargana
          </h2>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-emerald-100/80">Regular value</span>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-sm font-bold text-emerald-100/60 line-through">PKR {formatPrice(totalPrice)}</span>
                <strong className="font-display text-3xl font-black text-amber-300">PKR {formatPrice(OFFER_PRICE)}</strong>
              </div>
            </div>
            <div className="rounded-xl border border-amber-300/35 bg-amber-300/10 px-2.5 py-2 text-center">
              <div className="text-[9px] font-bold uppercase tracking-[.1em] text-amber-200">Save</div>
              <div className="text-sm font-black text-white">PKR {formatPrice(savings)}</div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[10px] font-bold uppercase tracking-[.1em] text-emerald-100/80">Offer ends in</span>
            <span className="ml-auto font-mono text-base font-black tabular-nums text-white">
              {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex flex-wrap gap-1.5" aria-label="Subjects included">
            {subjects.map((subject) => (
              <span key={subject} className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-950 sm:text-[11px]">
                <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                {subject}
              </span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <a
              href={purchaseLink}
              target={purchaseLink.startsWith('http') ? '_blank' : undefined}
              rel={purchaseLink.startsWith('http') ? 'noopener noreferrer' : undefined}
              data-google-vignette="false"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-900 px-3 text-[11px] font-black text-white shadow-sm hover:bg-emerald-800 sm:text-sm"
            >
              <MessageCircle className="h-4 w-4" />
              Get Bundle — PKR {formatPrice(OFFER_PRICE)}
            </a>
            <button
              type="button"
              onClick={closeOffer}
              className="min-h-10 rounded-xl border border-emerald-900/15 bg-white px-3 text-[11px] font-bold text-emerald-950 sm:text-xs"
            >
              Close
            </button>
          </div>

          <p className="mt-2 text-center text-[9px] leading-relaxed text-slate-500 sm:text-[10px]">
            Close this offer to continue using the website. It will stay closed for this browsing session.
          </p>
        </div>
      </section>
    </div>
  )
}
