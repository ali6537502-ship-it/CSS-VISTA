import { Link } from 'react-router'
import { ClipboardPaste, LockKeyhole, NotebookPen, ShieldCheck } from 'lucide-react'

/** Visible navigation destination while private cloud backup recovery is being prepared. */
export default function NotesProtectionPending() {
  return <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16" aria-label="My Notes security status">
    <div className="rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-sm sm:p-9">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><NotebookPen size={26}/></div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[.13em] text-emerald-800">My private study notebook</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-pine">My Notes</h1>
      <p className="mt-4 text-sm leading-7 text-slate-700">Your personal notebook is being prepared. Its private cloud-saving service will be enabled only after independent encrypted backups and a full recovery test are verified. Your existing account and study progress remain unchanged.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <ClipboardPaste size={20} className="shrink-0 text-emerald-800"/>
          <div><h2 className="text-sm font-semibold">Paste from any lesson</h2><p className="mt-1 text-xs leading-6 text-slate-600">Select or paste material while studying and save it directly into your own Notes library once cloud saving is enabled.</p></div>
        </div>
        <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <ShieldCheck size={20} className="shrink-0 text-emerald-800"/>
          <div><h2 className="text-sm font-semibold">Protected across devices</h2><p className="mt-1 text-xs leading-6 text-slate-600">Private folders, page history and account-owned notes, backed by an independently verified recovery copy.</p></div>
        </div>
      </div>
      <div role="status" className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-950">
        <LockKeyhole size={16} className="mt-1 shrink-0"/>
        <span>Personal Notes cloud saving is not active yet. This screen does not claim your work has been backed up.</span>
      </div>
      <Link to="/account/library" className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800">Return to My Library</Link>
    </div>
  </main>
}
