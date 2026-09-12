import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { accountServiceConfigured } from '@/lib/hostingerApi'
import { scheduleIdleWork } from '@/lib/idle'

const ADMIN_CONTENT_EVENT = 'cssvista:admin-content'

type HostingerUpdate = {
  id: string
  title: string
  body: string
  date: string
  tag: string
  notify: boolean
}

function ownerCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)cssv_owner_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

function updateFingerprint(update: HostingerUpdate) {
  return JSON.stringify([update.title, update.body, update.date, update.tag, Boolean(update.notify)])
}

async function adminNotificationRequest(method: 'GET' | 'POST' | 'DELETE', payload?: unknown) {
  const token = ownerCsrfToken()
  const response = await fetch('/api/admin/notifications.php', {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': token } : {}),
    },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  })
  const body = await response.json().catch(() => null) as { ok?: boolean; updates?: HostingerUpdate[]; message?: string } | null
  if (!response.ok || !body?.ok) throw new Error(body?.message || 'Notification publishing is temporarily unavailable.')
  return body
}

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const contentInitialised = useRef(false)

  useEffect(() => {
    if (!accountServiceConfigured || contentInitialised.current) return
    // Public pages render from static/local content immediately. The cloud CMS
    // refresh is deliberately deferred so anonymous mobile visitors do not
    // wait for the account service during the critical first-load window.
    const contentCriticalRoute = /^\/admin(?:\/|$)/.test(location.pathname)
    return scheduleIdleWork(
      () => {
        if (contentInitialised.current) return
        contentInitialised.current = true
        void import('@/lib/admin')
          .then(({ initialiseCloudAdminContent }) => initialiseCloudAdminContent())
          .catch(() => {
            // Static/local content remains available when the optional CMS
            // runtime or network cannot be loaded.
          })
      },
      {
        timeout: contentCriticalRoute ? 1_800 : 15_000,
        fallbackDelay: contentCriticalRoute ? 0 : 6_000,
        immediate: contentCriticalRoute,
      },
    )
  }, [location.pathname])

  useEffect(() => {
    // The private owner admin now publishes bell announcements to Hostinger.
    // Keep the existing editor/local cache intact, but mirror only notification
    // changes into the central database so every student sees the same feed.
    if (location.pathname !== '/admin') return
    let active = true
    let syncing = false
    let queued = false
    let previous = new Map<string, string>()

    async function readLocalUpdates() {
      const { mergedUpdates } = await import('@/lib/admin')
      return mergedUpdates() as HostingerUpdate[]
    }

    async function sync(initial = false) {
      if (syncing) {
        queued = true
        return
      }
      syncing = true
      try {
        const local = await readLocalUpdates()
        if (!active) return
        const current = new Map(local.map((update) => [update.id, updateFingerprint(update)]))

        if (initial) {
          const remoteBody = await adminNotificationRequest('GET')
          const remote = new Map((remoteBody.updates || []).map((update) => [update.id, updateFingerprint(update)]))
          // Safely migrate announcements that already exist in this owner's
          // browser without deleting server announcements from another device.
          for (const update of local) {
            if (remote.get(update.id) !== current.get(update.id)) {
              await adminNotificationRequest('POST', { update })
            }
          }
        } else {
          for (const update of local) {
            if (previous.get(update.id) !== current.get(update.id)) {
              await adminNotificationRequest('POST', { update })
            }
          }
          for (const id of previous.keys()) {
            if (!current.has(id)) await adminNotificationRequest('DELETE', { id })
          }
        }
        previous = current
      } catch (error) {
        // Keep the local editor usable, but surface the publishing problem in
        // the console rather than falsely treating a failed server write as sent.
        console.error('CSS Vista notification sync failed:', error)
      } finally {
        syncing = false
        if (queued && active) {
          queued = false
          void sync(false)
        }
      }
    }

    void sync(true)
    const onContentChange = () => { void sync(false) }
    window.addEventListener(ADMIN_CONTENT_EVENT, onContentChange)
    return () => {
      active = false
      window.removeEventListener(ADMIN_CONTENT_EVENT, onContentChange)
    }
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname !== '/admin') return
    const refresh = () => {
      if (document.visibilityState === 'visible') void import('@/lib/admin').then(({ refreshCloudAdminContent }) => refreshCloudAdminContent()).catch(() => undefined)
    }
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [location.pathname])

  return children
}
