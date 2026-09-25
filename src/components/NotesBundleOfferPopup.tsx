import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Clock3, FileText, Landmark, MessageCircle, Scale, X } from 'lucide-react'
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
    // Closing must still work when browser storage is unavailable.
  }
}

const subjectRows = [
  { label: 'Current Affairs + Pakistan Affairs', price: 7000, icon: FileText },
  { label: 'Political Science', price: 4000, icon: Landmark },
  { label: 'Criminology', price: 3600, icon: Scale },
  { label: 'European History', price: 6000, icon: BookOpen },
] as const

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
        `Assalam-o-Alaikum, I want to purchase the Complete Notes Bundle by Sir Ali Hassan Sargana at today's PKR ${formatPrice(OFFER_PRICE)} offer before 11:00 PM PKT. Please share the purchase details.`,
      )
    : '/notes'

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-emerald-950/65 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-bundle-offer-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) closeOffer()
      }}
    >
      <section className="relative max-h-[calc(100dvh-1.25rem)] w-full max-w-[390px] overflow-y-auto overscroll-contain rounded-[22px] border border-emerald-950/10 bg-[#fffdf7] shadow-[0_28px_85px_rgba(2,44,34,.36)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-[620px] sm:rounded-[26px]">
        <button
          type="button"
          onClick={closeOffer}
          className="absolute right-2.5 top-2.5 z-20 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm transition hover:bg-slate-50 sm:right-3 sm:top-3"
          aria-label="Close bundle offer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
          <div className="pr-11">
            <p className="font-display text-[20px] font-black leading-none tracking-[-0.03em] text-emerald-950 sm:text-2xl">
              CSS VISTA
            </p>
            <p className="mt-1 text-[10px] font-bold text-amber-700 sm:text-xs">
              By Sir Ali Hassan Sargana
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex w-fit items-center rounded-full bg-amber-200 px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-amber-950 sm:text-[10px]">
              ⚡ Limited Time Offer
            </span>

            <div className="rounded-xl border border-rose-100 bg-rose-50/80 px-2.5 py-2 sm:min-w-[220px]">
              <div className="flex items-center justify-center gap-1.5 text-[9px] font-extrabold text-slate-700 sm:text-[10px]">
                <Clock3 className="h-3.5 w-3.5 text-rose-600" />
                Offer ends at 11:00 PM PKT
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {[
                  ['HRS', timeLeft.hours],
                  ['MINS', timeLeft.minutes],
                  ['SECS', timeLeft.seconds],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-emerald-950 px-1.5 py-1.5 text-center text-white">
                    <div className="font-mono text-lg font-black leading-none tabular-nums sm:text-xl">
                      {String(value).padStart(2, '0')}
                    </div>
                    <div className="mt-1 text-[7px] font-bold tracking-wide text-emerald-100/75">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h2 id="notes-bundle-offer-title" className="mt-3 font-display text-[23px] font-black leading-[1.05] tracking-[-0.03em] text-emerald-950 sm:mt-4 sm:text-3xl">
            Complete <span className="text-amber-700">Notes Bundle</span>
          </h2>
          <p className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">
            All major subjects in one bundle
          </p>
        </div>

        <div className="px-4 sm:px-6">
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
            {subjectRows.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 px-3 py-2.5 ${index !== subjectRows.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-900 text-white">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 text-[11px] font-bold leading-tight text-slate-800 sm:text-xs">
                    {item.label}
                  </span>
                  <strong className="shrink-0 text-[11px] font-black text-slate-800 sm:text-xs">
                    Rs. {formatPrice(item.price)}
                  </strong>
                </div>
              )
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3 px-1">
            <span className="text-[11px] font-black text-slate-800 sm:text-xs">Total Value</span>
            <span className="text-sm font-black text-slate-600 line-through decoration-rose-500 decoration-2 sm:text-base">
              Rs. {formatPrice(totalPrice)}
            </span>
          </div>

          <div className="mt-3 rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 px-3.5 py-3 text-white shadow-sm sm:px-5 sm:py-4">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200 sm:text-[10px]">Today Only</p>
                <p className="mt-0.5 font-display text-[32px] font-black leading-none tracking-[-0.03em] text-amber-300 sm:text-4xl">
                  Rs. {formatPrice(OFFER_PRICE)}
                </p>
              </div>
              <div className="rounded-xl bg-amber-200 px-3 py-2 text-center text-amber-950">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.09em]">You Save</p>
                <p className="mt-0.5 text-[15px] font-black leading-none sm:text-base">Rs. {formatPrice(savings)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 px-4 pb-4 pt-3 sm:px-6 sm:pb-5">
          <a
            href={purchaseLink}
            target={purchaseLink.startsWith('http') ? '_blank' : undefined}
            rel={purchaseLink.startsWith('http') ? 'noopener noreferrer' : undefined}
            data-google-vignette="false"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-[12px] font-black text-white shadow-sm transition hover:bg-emerald-800 sm:text-sm"
          >
            <MessageCircle className="h-4 w-4" />
            Get Complete Bundle — Rs. {formatPrice(OFFER_PRICE)}
          </a>

          <a
            href="/notes"
            onClick={closeOffer}
            data-google-vignette="false"
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-900/25 bg-white px-4 text-[11px] font-bold text-emerald-950 transition hover:bg-emerald-50 sm:text-xs"
          >
            <FileText className="h-4 w-4" />
            View Notes & Samples
          </a>
        </div>
      </section>
    </div>
  )
}
