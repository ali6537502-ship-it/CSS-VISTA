import type { ReactNode } from 'react'
import { useWorkspacePreview } from './context'
export default function WorkspaceVariant({ children, classic }: { children: ReactNode; classic: ReactNode }) {
  const { pending, enabled } = useWorkspacePreview()
  if (pending) return <div role="status" className="mx-auto max-w-5xl px-4 py-10">Opening your study space…</div>
  return <>{enabled ? children : classic}</>
}
