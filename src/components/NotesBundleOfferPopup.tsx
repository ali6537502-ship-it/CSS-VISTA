import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Clock3, FileText, Landmark, MessageCircle, Scale, X } from 'lucide-react'
import { noteProducts } from '@/data/notes'
import { notesBundleOfferEndsAt as OFFER_ENDS_AT, notesBundleOfferPrice as OFFER_PRICE } from '@/data/notesBundleOffer'

const DISMISSED_KEY = 'cssvista:notes-bundle-offer-dismissed:' + OFFER_ENDS_AT + ':' + OFFER_PRICE

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

  const purchaseLink = `https://wa.me/923166050195?text=${encodeURIComponent(
    `Assalam-o-Alaikum, I want to purchase Sir Ali Hassan Sargana's Complete Notes Bundle at PKR ${formatPrice(OFFER_PRICE)}. Please share the purchase details.`,
  )}`

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-emerald-950/55 p-2.5 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-bundle-offer-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) closeOffer()
      }}
    >
      <section className="relative max-h-[calc(100dvh-1rem)] w-full max-w-[360px] overflow-y-auto overscroll-contain rounded-[20px] border border-emerald-950/10 bg-[#fffdf7] shadow-[0_22px_70px_rgba(2,44,34,.34)] sm:max-w-[540px] sm:rounded-[22px]">
        <button
          type="button"
          onClick={closeOffer}
          className="absolute right-2.5 top-2.5 z-20 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          aria-label="Close bundle offer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="px-3.5 pb-3 pt-3.5 sm:px-5 sm:pt-4">
          <div className="flex items-start justify-between gap-3 pr-10">
            <img
              src="/images/logo.png"
              alt="CSS VISTA"
              className="h-9 w-auto max-w-[118px] object-contain object-left sm:h-10 sm:max-w-[140px]"
            />
            <span className="inline-flex shrink-0 rounded-full bg-amber-200 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-amber-950 sm:text-[9px]">
              50%+ OFF
            </span>
          </div>

          <h2 id="notes-bundle-offer-title" className="mt-2.5 font-display text-[19px] font-black leading-[1.08] tracking-[-0.025em] text-emerald-950 sm:text-[26px]">
            Discount on Sir Ali Hassan Sargana’s Complete Notes Bundle
          </h2>

          <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/75 px-2.5 py-2">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-rose-600" />
            <span className="min-w-0 flex-1 text-[9px] font-extrabold text-slate-700 sm:text-[10px]">
              Avail offer before it ends
            </span>
          </div>
        </div>

        <div className="px-3.5 sm:px-5">
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
            {subjectRows.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className={`flex min-h-9 items-center gap-2 px-2.5 py-1.5 ${index !== subjectRows.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-900 text-white">
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1 text-[10px] font-bold leading-tight text-slate-800 sm:text-[11px]">
                    {item.label}
                  </span>
                  <strong className="shrink-0 text-[10px] font-black text-slate-800 sm:text-[11px]">
                    Rs. {formatPrice(item.price)}
                  </strong>
                </div>
              )
            })}
          </div>

          <div className="mt-2.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 px-3 py-2.5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-100/75">Regular value</p>
                <p className="mt-0.5 text-xs font-bold text-emerald-100/65 line-through decoration-rose-400 decoration-2">
                  Rs. {formatPrice(totalPrice)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.11em] text-amber-200">Today Only</p>
                <p className="font-display text-[27px] font-black leading-none tracking-[-0.03em] text-amber-300 sm:text-[31px]">
                  Rs. {formatPrice(OFFER_PRICE)}
                </p>
              </div>
              <div className="rounded-lg bg-amber-200 px-2 py-1.5 text-center text-amber-950">
                <p className="text-[7px] font-extrabold uppercase">Save</p>
                <p className="mt-0.5 text-xs font-black leading-none">Rs. {formatPrice(savings)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-3.5 pb-3.5 pt-2.5 sm:px-5 sm:pb-4">
          <a
            href={purchaseLink}
            target={purchaseLink.startsWith('http') ? '_blank' : undefined}
            rel={purchaseLink.startsWith('http') ? 'noopener noreferrer' : undefined}
            data-google-vignette="false"
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-[11px] font-black text-white shadow-sm transition hover:bg-emerald-800 sm:text-xs"
          >
            <MessageCircle className="h-4 w-4" />
            Get Complete Bundle — Rs. {formatPrice(OFFER_PRICE)}
          </a>
          <p className="mt-1.5 text-center text-[8px] leading-relaxed text-slate-400 sm:text-[9px]">
            Close × to continue using CSS VISTA. The offer stays closed for this browsing session.
          </p>
        </div>
      </section>
    </div>
  )
}
