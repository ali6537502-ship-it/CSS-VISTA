import type { ReactNode } from 'react'
import { useWorkspacePreview } from './context'
export default function WorkspaceVariant({ children, classic, entry = false }: { children: ReactNode; classic: ReactNode; entry?: boolean }) {
  const state = useWorkspacePreview()
  const pending = entry ? state.entryPending : state.pending
  const enabled = entry ? state.entryEnabled : state.enabled
  if (pending) return <div role="status" className="mx-auto min-h-screen max-w-5xl px-4 py-10">Opening your study space…</div>
  return <>{enabled ? children : classic}</>
}
