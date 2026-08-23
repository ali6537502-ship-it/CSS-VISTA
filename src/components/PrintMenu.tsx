import { useState } from 'react'
import { Printer } from 'lucide-react'

const PRINT_PORTAL_CLASS = 'print-portal'

function afterPrintLayout(callback: () => void) {
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback))
}

// Print only the requested resource. A detached print copy avoids stray navigation,
// modals and long blank pages while keeping the visible React tree untouched.
export function printPage(withAnswers: boolean, targetSelector = '.print-area') {
  document.querySelectorAll(`.${PRINT_PORTAL_CLASS}`).forEach((node) => node.remove())
  document.body.classList.remove('print-with-answers', 'print-no-answers')
  document.body.classList.add(withAnswers ? 'print-with-answers' : 'print-no-answers')
  const target = document.querySelector<HTMLElement>(targetSelector)
  const portal = target ? document.createElement('section') : null
  if (portal && target) {
    portal.className = PRINT_PORTAL_CLASS
    portal.setAttribute('aria-hidden', 'true')
    const branding = document.querySelector<HTMLElement>('.print-branding')
    if (branding) portal.appendChild(branding.cloneNode(true))
    portal.appendChild(target.cloneNode(true))
    document.body.appendChild(portal)
    document.body.classList.add('printing-selected-area')
  }

  const cleanupState: { fallback?: number; media?: MediaQueryList } = {}
  const cleanup = () => {
    document.body.classList.remove('print-with-answers', 'print-no-answers', 'printing-selected-area')
    portal?.remove()
    window.removeEventListener('afterprint', cleanup)
    cleanupState.media?.removeEventListener('change', handlePrintMedia)
    if (cleanupState.fallback) window.clearTimeout(cleanupState.fallback)
  }
  const handlePrintMedia = (event: MediaQueryListEvent) => {
    if (!event.matches) cleanup()
  }
  window.addEventListener('afterprint', cleanup)
  cleanupState.media = window.matchMedia('print')
  cleanupState.media.addEventListener('change', handlePrintMedia)
  cleanupState.fallback = window.setTimeout(cleanup, 60_000)
  afterPrintLayout(() => window.print())
}

// Same-origin PDFs are sent directly to the browser print dialog. If a browser
// blocks embedded PDF printing, opening the PDF still provides its native print control.
export function printPdfFile(pdfUrl: string) {
  const frame = document.createElement('iframe')
  frame.className = 'pdf-print-frame'
  frame.title = 'CSS Vista magazine print preview'
  frame.src = pdfUrl
  const cleanup = () => frame.remove()
  frame.addEventListener('load', () => {
    window.setTimeout(() => {
      try {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
      } catch {
        window.open(pdfUrl, '_blank', 'noopener,noreferrer')
      }
      window.setTimeout(cleanup, 60_000)
    }, 180)
  }, { once: true })
  document.body.appendChild(frame)
}

export default function PrintMenu({ answersAvailable = true, label = 'Print', targetSelector = '.print-area' }: { answersAvailable?: boolean; label?: string; targetSelector?: string }) {
  const [open, setOpen] = useState(false)
  if (!answersAvailable) {
    return (
      <button
        onClick={() => printPage(true, targetSelector)}
        className="no-print inline-flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-sm font-semibold text-pine hover:bg-secondary"
      >
        <Printer className="h-4 w-4" /> {label}
      </button>
    )
  }
  return (
    <div className="no-print relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-sm font-semibold text-pine hover:bg-secondary"
      >
        <Printer className="h-4 w-4" /> {label}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-md border bg-white shadow-lg" onMouseLeave={() => setOpen(false)}>
          <button
            onClick={() => { setOpen(false); printPage(false, targetSelector) }}
            className="block w-full px-4 py-2.5 text-left text-sm hover:bg-secondary"
          >
            Print without answers
          </button>
          <button
            onClick={() => { setOpen(false); printPage(true, targetSelector) }}
            className="block w-full px-4 py-2.5 text-left text-sm hover:bg-secondary"
          >
            Print with answers
          </button>
        </div>
      )}
    </div>
  )
}
