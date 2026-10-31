import { useEffect, useState, type ReactNode } from 'react'
import { useAccount } from '@/lib/accountContext'
import { currentHostingerAccountUser, hostingerRequest } from '@/lib/hostingerApi'
import { WorkspacePreviewContext } from './context'

type Selection = { owner: string; identity: string; enabled: boolean }
/** Read-only, in-memory decision, discarded whenever the authenticated owner changes. */
export default function WorkspacePreviewProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAccount(), owner = user?.id || ''
  const identity = user ? JSON.stringify([user.id, user.email, user.email_confirmed_at]) : 'guest'
  const [selection, setSelection] = useState<Selection | null>(null)
  // The public account form keeps its presentation through registration. Its
  // fields enforce ownership themselves; workspace decisions remain owner-bound.
  const [entrySelection, setEntrySelection] = useState<boolean | null>(null)
  useEffect(() => {
    let disposed = false
    const controller = new AbortController()
    const deadline = window.setTimeout(() => controller.abort(), 5000)
    const isCurrent = () => !disposed && (currentHostingerAccountUser() || '') === owner
    hostingerRequest<{ enabled: boolean; user_id?: string }>(owner ? 'auth/workspace-preview.php' : 'workspace-release.php', { signal: controller.signal, ...(owner ? { headers: { 'X-CSSV-User': owner } } : {}) }).then(result => {
      if (isCurrent()) {
        const enabled = (!owner || result.user_id === owner) && result.enabled === true
        setSelection({ owner, identity, enabled }); setEntrySelection(enabled)
      }
    }).catch(() => { if (isCurrent()) { setSelection({ owner, identity, enabled: false }); setEntrySelection(current => current ?? false) } }).finally(() => window.clearTimeout(deadline))
    return () => { disposed = true; window.clearTimeout(deadline); controller.abort() }
  }, [owner, identity])
  const pending = loading || selection?.identity !== identity
  const enabled = !pending && selection?.identity === identity && selection.enabled
  const entryPending = loading || entrySelection === null
  return <WorkspacePreviewContext.Provider value={{ pending, enabled: !!enabled, entryPending, entryEnabled: !entryPending && entrySelection === true }}>{children}</WorkspacePreviewContext.Provider>
}
