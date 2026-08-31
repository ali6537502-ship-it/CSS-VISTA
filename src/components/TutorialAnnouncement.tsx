import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Compass, Instagram, MessageCircle, PlayCircle, X, Youtube } from 'lucide-react'
import { isNotesDiscountActive } from '@/data/notes'

const TUTORIAL_URL = 'https://youtu.be/RawGyL7BkEk?si=EiZ8EPo6oMKr-zW9'
const TUTORIAL_EMBED_URL = 'https://www.youtube-nocookie.com/embed/RawGyL7BkEk?autoplay=1&rel=0'
const YOUTUBE_SUBSCRIBE_URL = 'https://www.youtube.com/@cssvista?sub_confirmation=1'
const INSTAGRAM_URL = 'https://www.instagram.com/cssvista?igsh=bmx0cWNiamJ5OTU4&utm_source=qr'
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/KkmMs8KS4wZ7Z39grDLZwT?s=cl&p=i&ilr=2&amv=2'
const TUTORIAL_SEEN_KEY = 'cssVistaTutorialSeen'
const TUTORIAL_DISMISSED_KEY = 'cssVistaTutorialDismissed'

type TutorialMode = 'closed' | 'introduction' | 'video'

function readStorage(storage: Storage, key: string) {
  try {
    return storage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeStorage(storage: Storage, key: string) {
  try {
    storage.setItem(key, '1')
  } catch {
    // Keep the tutorial usable when browser storage is unavailable.
  }
}

export default function TutorialAnnouncement() {
  const [mode, setMode] = useState<TutorialMode>('closed')
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const closeModal = useCallback(() => {
    setMode((current) => {
      if (current === 'introduction') writeStorage(window.sessionStorage, TUTORIAL_DISMISSED_KEY)
      return 'closed'
    })
  }, [])

  const exploreWebsite = useCallback(() => {
    writeStorage(window.sessionStorage, TUTORIAL_DISMISSED_KEY)
    setMode('closed')
  }, [])

  const watchTutorial = useCallback((trigger?: HTMLElement | null) => {
    if (trigger) returnFocusRef.current = trigger
    writeStorage(window.localStorage, TUTORIAL_SEEN_KEY)
    setMode('video')
  }, [])

  useEffect(() => {
    if (isNotesDiscountActive()) return
    if (readStorage(window.localStorage, TUTORIAL_SEEN_KEY)) return
    if (readStorage(window.sessionStorage, TUTORIAL_DISMISSED_KEY)) return
    const timer = window.setTimeout(() => setMode('introduction'), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (mode === 'closed') return
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
        'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])',
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
      const focusTarget = returnFocusRef.current ?? previousFocus
      window.requestAnimationFrame(() => focusTarget?.focus())
    }
  }, [closeModal, mode])

  const modal = mode === 'closed' ? null : createPortal(
    <div
      className="cssv-tutorial-backdrop fixed inset-0 z-[160] grid place-items-center bg-emerald-950/55 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) closeModal()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cssv-tutorial-title"
        aria-describedby="cssv-tutorial-description"
        className="cssv-tutorial-dialog relative max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-emerald-900/10 bg-[#fffdf7] shadow-[0_28px_90px_rgba(2,44,34,0.35)]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={closeModal}
          className="cssv-tap absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          aria-label="Close tutorial"
        >
          <X className="h-5 w-5" />
        </button>

        {mode === 'video' ? (
          <div className="p-3 pt-16 sm:p-6 sm:pt-16">
            <div className="overflow-hidden rounded-xl border border-emerald-900/10 bg-black shadow-sm">
              <iframe
                className="aspect-video w-full"
                src={TUTORIAL_EMBED_URL}
                title="CSS VISTA tutorial video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-emerald-700">CSS VISTA tutorial video</p>
                <h2 id="cssv-tutorial-title" className="mt-1 text-xl font-bold text-emerald-950">Learn how to use CSS VISTA easily</h2>
                <p id="cssv-tutorial-description" className="mt-1 text-sm text-slate-600">Watch the official walkthrough, then continue exploring the platform.</p>
              </div>
              <a href={TUTORIAL_URL} target="_blank" rel="noopener noreferrer" className="cssv-tap inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50">
                Open on YouTube <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <nav className="mt-4 grid gap-2 border-t border-emerald-900/10 pt-4 sm:grid-cols-3" aria-label="CSS Vista social channels">
              <a href={YOUTUBE_SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer" className="cssv-tap inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#b3261e] px-3 text-xs font-bold text-white hover:bg-[#941f19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700">
                <Youtube className="h-4 w-4" /> Subscribe to CSS Vista
              </a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="cssv-tap inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-900/15 bg-white px-3 text-xs font-bold text-emerald-950 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
                <Instagram className="h-4 w-4" /> Instagram
              </a>
              <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer" className="cssv-tap inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-900/15 bg-white px-3 text-xs font-bold text-emerald-950 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
                <MessageCircle className="h-4 w-4" /> Join WhatsApp
              </a>
            </nav>
          </div>
        ) : (
          <div className="grid gap-5 p-5 pt-16 sm:grid-cols-[auto_1fr] sm:gap-6 sm:p-8 sm:pt-16">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-950 text-amber-300 shadow-[0_10px_30px_rgba(2,77,57,0.18)] sm:h-16 sm:w-16">
              <PlayCircle className="h-8 w-8" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">CSS VISTA tutorial video</p>
              <h2 id="cssv-tutorial-title" className="mt-2 text-2xl font-black tracking-[-0.025em] text-emerald-950 sm:text-3xl">Learn how to use CSS VISTA easily</h2>
              <p id="cssv-tutorial-description" className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Watch the tutorial to explore the platform step by step.</p>
              <a href="https://www.css-vista.com" className="mt-3 inline-block text-sm font-bold text-emerald-800 hover:underline">www.css-vista.com</a>
              <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap">
                <button type="button" onClick={(event) => watchTutorial(event.currentTarget)} className="cssv-tap inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(2,77,57,0.18)] hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
                  <PlayCircle className="h-5 w-5" /> Watch Tutorial
                </button>
                <button type="button" onClick={exploreWebsite} className="cssv-tap inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-900/20 bg-white px-5 text-sm font-bold text-emerald-950 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
                  <Compass className="h-5 w-5" /> Explore Website
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )

  return (
    <>
      <section className="cssv-glass-panel cssv-tutorial-card cssv-reveal mt-5 flex min-w-0 items-center gap-3 rounded-xl border p-3 sm:p-4" aria-labelledby="cssv-tutorial-card-title">
        <span className="cssv-glass-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl text-emerald-800"><PlayCircle className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-emerald-700">New to CSS VISTA?</span>
          <span id="cssv-tutorial-card-title" className="mt-0.5 block text-[13px] font-bold text-slate-900 sm:text-sm">Learn how to use every major feature</span>
          <span className="mt-0.5 hidden text-[10px] text-slate-500 sm:block">Watch the quick official tutorial and start preparing with confidence.</span>
        </span>
        <button
          type="button"
          onClick={(event) => watchTutorial(event.currentTarget)}
          className="cssv-tap inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-950 px-3 text-[11px] font-bold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:px-4 sm:text-xs"
        >
          <PlayCircle className="h-4 w-4" /> Watch <span className="hidden sm:inline">Tutorial</span>
        </button>
      </section>
      {modal}
    </>
  )
}
