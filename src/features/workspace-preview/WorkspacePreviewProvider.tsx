import { useEffect, useState, type ReactNode } from 'react'
import { useAccount } from '@/lib/accountContext'
import { currentHostingerAccountUser, hostingerRequest } from '@/lib/hostingerApi'
import { WorkspacePreviewContext } from './context'

type Selection = { owner: string; identity: string; enabled: boolean }
/** Read-only, in-memory decision, discarded whenever the authenticated owner changes. */
export default function WorkspacePreviewProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAccount(), owner = user?.id || ''
  const identity = user ? JSON.stringify([user.id, user.email, user.email_confirmed_at]) : ''
  const [selection, setSelection] = useState<Selection | null>(null)
  useEffect(() => {
    if (!owner) { setSelection(null); return }
    let disposed = false
    const controller = new AbortController()
    const deadline = window.setTimeout(() => controller.abort(), 5000)
    const isCurrent = () => !disposed && currentHostingerAccountUser() === owner
    hostingerRequest<{ enabled: boolean; user_id: string }>('auth/workspace-preview.php', { signal: controller.signal, headers: { 'X-CSSV-User': owner } }).then(result => {
      if (isCurrent()) setSelection({ owner, identity, enabled: result.user_id === owner && result.enabled === true })
    }).catch(() => { if (isCurrent()) setSelection({ owner, identity, enabled: false }) }).finally(() => window.clearTimeout(deadline))
    return () => { disposed = true; window.clearTimeout(deadline); controller.abort() }
  }, [owner, identity])
  const pending = loading || (!!owner && selection?.identity !== identity)
  const enabled = !pending && !!owner && selection?.identity === identity && selection.enabled
  return <WorkspacePreviewContext.Provider value={{ pending, enabled: !!enabled }}>{children}</WorkspacePreviewContext.Provider>
}
