import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { notifyProgressChanged, PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'

const STORAGE_KEY = 'cssvista:tool:gsa-tutor:v1'
type GsaProgress = {
  plan?: { days: number; startDate: string } | null
  completed?: Record<string, { at?: string; selfRating?: string }>
  revisit?: Record<string, unknown>
  bookmarks?: Record<string, unknown>
  last?: string
}

function readProgress(): GsaProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as GsaProgress : {}
  } catch {
    return {}
  }
}
function snapshot(progress: GsaProgress) {
  const days = progress.plan?.days
  return {
    days: typeof days === 'number' && Number.isInteger(days) && days >= 5 && days <= 120 ? days : null,
    completed: Object.keys(progress.completed ?? {}).length,
    revision: Object.keys(progress.revisit ?? {}).length,
  }
}
export default function GSATutorPage() {
  const { pathname } = useLocation()
  const { user, loading, syncStatus, syncError, syncNow, lastSyncedAt } = useAccount()
  const isAccount = pathname.startsWith('/account/')
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [progress, setProgress] = useState<GsaProgress>(() => readProgress())
  const [manualSync, setManualSync] = useState('')
  const result = snapshot(progress)

  useEffect(() => {
    function changed(event: Event) {
      if (event.type === 'message') {
        const incoming = event as MessageEvent
        if (incoming.origin !== window.location.origin || incoming.source !== iframeRef.current?.contentWindow || incoming.data?.type !== 'cssvista:gsa:changed') return
        // The iframe uses the same-origin progress key as the account snapshot.
        notifyProgressChanged()
      }
      setProgress(readProgress())
    }
    window.addEventListener('message', changed)
    window.addEventListener(PROGRESS_CHANGED_EVENT, changed)
    return () => {
      window.removeEventListener('message', changed)
      window.removeEventListener(PROGRESS_CHANGED_EVENT, changed)
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    // Hydrate again after native account sync resolves cloud state.
    if (user?.profile_complete && syncStatus !== 'synced') return
    setProgress(readProgress())
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'cssvista:gsa:hydrate', snapshot: readProgress() }, window.location.origin,
    )
  }, [loaded, syncStatus, user?.id, user?.profile_complete])

  async function saveToAccount() {
    setManualSync('')
    const result = await syncNow()
    setManualSync(result.error || 'Your account sync completed.')
  }

  return (
    <main className="bg-[#f7f8f5] text-slate-900">
      <div className="mx-auto max-w-screen-2xl px-3 pb-4 pt-5 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-emerald-800">CSS VISTA · General Science Part I</p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">GSA Tutor</h1>
            <p className="mt-1 text-xs leading-5 text-slate-600">Choose your duration, follow a daily lesson, practise, and return to difficult concepts.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user?.profile_complete ? (
              <>
                <Link className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-emerald-900" to={isAccount ? '/account/dashboard' : '/account/gsa-tutor'}>{isAccount ? 'My CSS VISTA' : 'Open in my account'}</Link>
                <button type="button" onClick={() => void saveToAccount()} disabled={syncStatus === 'syncing'} className="rounded-xl bg-emerald-900 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">Sync progress</button>
              </>
            ) : (
              <Link className="rounded-xl border border-emerald-300 bg-white px-4 py-3 text-xs font-bold text-emerald-900" to="/account">{user ? "Complete your profile to sync progress" : "Sign in to save across devices"}</Link>
            )}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600" aria-live="polite">
          <span><strong className="text-slate-900">{result.days ? result.days + '-day' : 'Not scheduled'}</strong> course</span>
          <span><strong className="text-slate-900">{Math.min(result.completed, 141)}/141</strong> lessons completed</span>
          <span><strong className="text-slate-900">{result.revision}</strong> lessons for revision</span>
          <span>{loading ? 'Checking account…' : user?.profile_complete ? syncStatus === 'synced' ? 'Account progress synced' : syncStatus === 'syncing' ? 'Account sync in progress' : 'Saved on device; account sync pending' : user ? 'Complete your profile to enable account sync' : 'Device progress only until signed in'}</span>
          {lastSyncedAt && user?.profile_complete && <span>Last synced {lastSyncedAt.toLocaleTimeString('en-PK')}</span>}
          {(syncError || manualSync) && <span role={syncError ? 'alert' : 'status'}>{syncError || manualSync}</span>}
        </div>
      </div>
      <iframe
        key={user?.id ?? (loading ? "session-loading" : "guest")}
        ref={iframeRef}
        title="CSS VISTA GSA Tutor interactive lessons and personal course schedule"
        src="/gsa-tutor/studio.html"
        className="block w-full border-0 bg-white"
        style={{ height: 'max(740px, calc(100vh - 150px))' }}
        onLoad={() => {
          // Account switches remount the iframe; hydrate every new instance,
          // not only when the parent state changes for the first time.
          setLoaded(true)
          if (!user?.profile_complete || syncStatus === 'synced') {
            iframeRef.current?.contentWindow?.postMessage(
              { type: 'cssvista:gsa:hydrate', snapshot: readProgress() },
              window.location.origin,
            )
          }
        }}
      />
      <div className="mx-auto max-w-screen-2xl px-5 py-6 text-xs leading-6 text-slate-600">
        This preview follows the uploaded General Science textbook. Its source questions and explanations still require complete editorial verification before a final educational release.
      </div>
    </main>
  )
}
