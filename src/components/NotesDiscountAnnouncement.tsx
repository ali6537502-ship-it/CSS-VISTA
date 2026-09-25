import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BadgePercent, X } from 'lucide-react'
import { Link } from 'react-router'
import { isNotesDiscountActive, noteProducts, notesDiscountEndsAt } from '@/data/notes'
import { isNotesBundleExclusiveWindow } from '@/data/notesBundleOffer'

const DISCOUNT_SEEN_KEY = 'cssVistaNotesDiscountSeen:' + notesDiscountEndsAt
const priceFormatter = new Intl.NumberFormat('en-PK')
const offerProductIds = ['ca-pa', 'political-science', 'criminology']
const offerProducts = offerProductIds
  .map((id) => noteProducts.find((product) => product.id === id))
  .filter((product): product is NonNullable<typeof product> => Boolean(product))

function readSessionFlag() {
  try {
    return window.sessionStorage.getItem(DISCOUNT_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function rememberPresentation() {
  try {
    window.sessionStorage.setItem(DISCOUNT_SEEN_KEY, '1')
  } catch {
    // The announcement remains usable when storage is unavailable.
  }
}

export default function NotesDiscountAnnouncement() {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const closeModal = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (isNotesBundleExclusiveWindow()) return
    if (!isNotesDiscountActive() || readSessionFlag()) return
    const timer = window.setTimeout(() => {
      rememberPresentation()
      setOpen(true)
    }, 550)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => closeRef.current?.focus())

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeModal()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      window.requestAnimationFrame(() => previousFocus?.focus())
    }
  }, [closeModal, open])

  if (isNotesBundleExclusiveWindow() || !open || !isNotesDiscountActive()) return null

  return createPortal(
    <div
      className="cssv-tutorial-backdrop fixed inset-0 z-[165] grid place-items-center bg-emerald-950/35 p-3 backdrop-blur-[1px] sm:p-5"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) closeModal()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cssv-notes-discount-title"
        aria-describedby="cssv-notes-discount-description"
        data-cssv-notes-discount-dialog
        className="cssv-tutorial-dialog relative max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-emerald-900/10 bg-[#fffdf7] shadow-[0_24px_75px_rgba(2,44,34,0.30)]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={closeModal}
          className="cssv-tap absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          aria-label="Close notes discount announcement"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid gap-3 p-4 sm:grid-cols-[104px_1fr] sm:gap-5 sm:p-5">
          <img
            src="/images/mentor-ali.jpg"
            alt="Sir Ali Hassan Sargana"
            width="104"
            height="148"
            decoding="async"
            className="h-20 w-16 rounded-xl border border-emerald-900/10 object-cover object-top shadow-sm sm:h-[148px] sm:w-[104px]"
          />
          <div className="min-w-0 sm:pr-8">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-emerald-700">
              <BadgePercent className="h-4 w-4" /> Today only · CSS Vista notes
            </p>
            <h2 id="cssv-notes-discount-title" className="mt-1.5 font-display text-xl font-bold leading-tight text-emerald-950 sm:text-2xl">
              30% off notes by Sir Ali Hassan Sargana
            </h2>
            <p id="cssv-notes-discount-description" className="mt-1.5 text-xs leading-5 text-slate-600">
              Complete topic coverage for focused CSS preparation.
            </p>

            <div className="mt-3 space-y-1.5">
              {offerProducts.map((product) => (
                <div key={product.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-emerald-900/10 pb-1.5 text-xs">
                  <span className="text-slate-700">{product.subject}</span>
                  <strong className="font-bold text-emerald-800">
                    <span className="mr-1.5 font-normal text-slate-400 line-through">PKR {priceFormatter.format(product.pricing.regularPrice)}</span>
                    PKR {priceFormatter.format(product.pricing.offerPrice)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                to="/notes"
                onClick={closeModal}
                className="cssv-tap inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-950 px-3 text-xs font-bold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                Explore notes
              </Link>
              <button
                type="button"
                onClick={closeModal}
                className="cssv-tap min-h-10 rounded-lg border border-emerald-900/15 bg-white px-3 text-xs font-bold text-emerald-950 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
