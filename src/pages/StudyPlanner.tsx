import PlannerWorkspace from '@/features/planner/PlannerWorkspace'
import ClassicStudyPlanner from '@/features/workspace-classic/pages/StudyPlanner'
import WorkspaceVariant from '@/features/workspace-preview/WorkspaceVariant'

export default function StudyPlanner() {
  return <WorkspaceVariant classic={<ClassicStudyPlanner />}><PlannerWorkspace /></WorkspaceVariant>
}
