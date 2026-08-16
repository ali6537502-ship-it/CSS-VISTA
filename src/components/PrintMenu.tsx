import { useState } from 'react'
import { Printer } from 'lucide-react'

// Print helper: hides menus/buttons via print CSS; optionally hides answers.
export function printPage(withAnswers: boolean, targetSelector = '.print-area') {
  document.body.classList.remove('print-with-answers', 'print-no-answers')
  document.body.classList.add(withAnswers ? 'print-with-answers' : 'print-no-answers')
  const targets = [...document.querySelectorAll<HTMLElement>(targetSelector)]
  targets.forEach((target) => {
    target.classList.add('print-selected-area')
    let current: HTMLElement | null = target
    while (current?.parentElement && current.parentElement.tagName !== 'MAIN') {
      const parent: HTMLElement = current.parentElement
      ;[...parent.children].forEach((sibling) => {
        if (sibling !== current && sibling instanceof HTMLElement) sibling.classList.add('print-hidden-sibling')
      })
      current = parent
    }
  })
  if (targets.length) document.body.classList.add('printing-selected-area')
  const cleanup = () => {
    document.body.classList.remove('print-with-answers', 'print-no-answers', 'printing-selected-area')
    document.querySelectorAll('.print-selected-area').forEach((node) => node.classList.remove('print-selected-area'))
    document.querySelectorAll('.print-hidden-sibling').forEach((node) => node.classList.remove('print-hidden-sibling'))
    window.removeEventListener('afterprint', cleanup)
    window.clearTimeout(fallback)
  }
  window.addEventListener('afterprint', cleanup)
  const fallback = window.setTimeout(cleanup, 3000)
  window.print()
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
