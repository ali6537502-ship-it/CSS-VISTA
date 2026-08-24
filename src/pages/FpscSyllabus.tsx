import { PageHeader } from '@/components/shared'
import FpscSyllabusPlanner from '@/components/FpscSyllabusPlanner'

export default function FpscSyllabus() {
  return (
    <div>
      <PageHeader
        title="FPSC Syllabus & Study Planner"
        description="Search and track the supplied official FPSC syllabus, then send individual or bulk-selected topics directly to your saved daily or weekly plan."
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <FpscSyllabusPlanner />
      </main>
    </div>
  )
}
