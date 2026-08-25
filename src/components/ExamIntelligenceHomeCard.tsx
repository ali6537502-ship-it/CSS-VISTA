import { Link } from 'react-router'
import { ArrowRight, BrainCircuit, CalendarClock, Target } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { useExamIntelligence } from '@/hooks/useExamIntelligence'

export default function ExamIntelligenceHomeCard() {
  const { user } = useAccount()
  const { report, loading } = useExamIntelligence()
  if (!user) return null
  const due = report.revisionQueue.reduce((sum, item) => sum + item.dueCount, 0)
  return <section className="cssv-reveal mt-3" aria-labelledby="home-exam-intelligence">
    <Link to="/exam-intelligence" className="cssv-glass-panel cssv-tap block overflow-hidden rounded-2xl border">
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-900 text-white"><BrainCircuit className="h-5 w-5" /></span>
          <span className="min-w-0"><span className="text-[9px] font-bold uppercase tracking-[.16em] text-amber-700">Your preparation today</span><span id="home-exam-intelligence" className="mt-1 block text-lg font-bold text-pine">VISTA Exam Intelligence</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{loading ? 'Preparing your command center…' : report.recommendations[0]?.title ?? 'Build your preparation profile'}</span></span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
          <span className="rounded-lg bg-white/80 p-2"><span className="block text-[9px] uppercase text-muted-foreground">Readiness</span><strong className="mt-0.5 block text-sm text-pine">{report.readiness === null ? 'Building' : `${report.readiness}%`}</strong></span>
          <span className="rounded-lg bg-white/80 p-2"><span className="flex items-center gap-1 text-[9px] uppercase text-muted-foreground"><CalendarClock className="h-3 w-3" /> Revision</span><strong className="mt-0.5 block text-sm text-pine">{due} due</strong></span>
          <span className="rounded-lg bg-white/80 p-2"><span className="flex items-center gap-1 text-[9px] uppercase text-muted-foreground"><Target className="h-3 w-3" /> Weakest</span><strong className="mt-0.5 block truncate text-sm text-pine">{report.weakest?.subject ?? 'Building'}</strong></span>
        </div>
      </div>
      <span className="flex min-h-10 items-center justify-center gap-1.5 border-t bg-emerald-950 px-4 text-xs font-bold text-white">Study now <ArrowRight className="h-3.5 w-3.5" /></span>
    </Link>
  </section>
}
