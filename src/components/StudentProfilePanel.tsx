import { Suspense } from 'react'
import WorkspaceVariant from '@/features/workspace-preview/WorkspaceVariant'
import { lazyWithRecovery } from '@/lib/chunkRecovery'
const PreviewPanel = lazyWithRecovery(() => import('@/features/account/StudentProfileForm').then(module => ({ default: module.StudentProfilePanel })))
const ClassicPanel = lazyWithRecovery(() => import('@/features/workspace-classic/components/StudentProfilePanel').then(module => ({ default: module.StudentProfilePanel })))
export function StudentProfilePanel(props: { email: string }) {
  return <Suspense fallback={<div role="status">Loading your profile…</div>}><WorkspaceVariant classic={<ClassicPanel {...props}/>}><PreviewPanel {...props}/></WorkspaceVariant></Suspense>
}
