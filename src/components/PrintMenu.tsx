import { useState } from 'react'
import { Printer } from 'lucide-react'

// Print helper: hides menus/buttons via print CSS; optionally hides answers.
export function printPage(withAnswers: boolean) {
  document.body.classList.remove('print-with-answers', 'print-no-answers')
  document.body.classList.add(withAnswers ? 'print-with-answers' : 'print-no-answers')
  const cleanup = () => {
    document.body.classList.remove('print-with-answers', 'print-no-answers')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

export default function PrintMenu({ answersAvailable = true, label = 'Print' }: { answersAvailable?: boolean; label?: string }) {
  const [open, setOpen] = useState(false)
  if (!answersAvailable) {
    return (
      <button
        onClick={() => printPage(true)}
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
            onClick={() => { setOpen(false); printPage(false) }}
            className="block w-full px-4 py-2.5 text-left text-sm hover:bg-secondary"
          >
            Print without answers
          </button>
          <button
            onClick={() => { setOpen(false); printPage(true) }}
            className="block w-full px-4 py-2.5 text-left text-sm hover:bg-secondary"
          >
            Print with answers
          </button>
        </div>
      )}
    </div>
  )
}
