import { PageHeader } from '@/components/shared'
import FpscSyllabusPlanner from '@/components/FpscSyllabusPlanner'
import { Link } from 'react-router'

export default function FpscSyllabus() {
  return (
    <div>
      <PageHeader
        title="FPSC Syllabus & Study Planner"
        description="Search and track the supplied official FPSC syllabus, then send individual or bulk-selected topics directly to your saved daily or weekly plan."
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex justify-end"><Link to="/exam-intelligence?section=map" className="inline-flex min-h-10 items-center rounded-lg bg-emerald-800 px-4 text-xs font-bold text-white">Open Preparation Map</Link></div>
        <FpscSyllabusPlanner />
      </main>
    </div>
  )
}
