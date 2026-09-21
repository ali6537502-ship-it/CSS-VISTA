import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Bell, BellRing, Check, X } from 'lucide-react'
import type { SiteUpdate } from '@/lib/admin'
import { getNotifPrefs, markUpdatesSeen, setNotifPrefs, unseenUpdateIds } from '@/lib/progress'
import { useAccount } from '@/lib/accountContext'
import { scheduleIdleWork } from '@/lib/idle'

export const UPDATE_TAGS = ['Mentors', 'Opinions', 'Test Series', 'FPSC', 'General']

const ADMIN_CONTENT_EVENT = 'cssvista:admin-content'
const ADMIN_CONTENT_KEY = 'cssvista:admin:content'

function cachedUpdates(): SiteUpdate[] {
  try {
    const raw = localStorage.getItem(ADMIN_CONTENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { updates?: SiteUpdate[] }
    if (!Array.isArray(parsed.updates)) return []
    return [...parsed.updates].sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

type NotificationFeedResponse = {
  ok?: boolean
  updates?: SiteUpdate[]
}

function mergeNotificationFeeds(remote: SiteUpdate[], local: SiteUpdate[]) {
  const map = new Map<string, SiteUpdate>()
  local.forEach((update) => map.set(update.id, update))
  remote.forEach((update) => map.set(update.id, update))
  return [...map.values()].sort((a, b) => {
    const byDate = (b.date || '').localeCompare(a.date || '')
    return byDate || b.id.localeCompare(a.id)
  })
}

export function useUpdates() {
  const [updates, setUpdates] = useState<SiteUpdate[]>(() => cachedUpdates())

  useEffect(() => {
    let active = true

    async function refresh() {
      const local = cachedUpdates()
      try {
        const response = await fetch('/api/notifications.php', {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        const body = await response.json().catch(() => null) as NotificationFeedResponse | null
        if (!response.ok || !body?.ok || !Array.isArray(body.updates)) throw new Error('Notification feed unavailable')
        if (active) setUpdates(mergeNotificationFeeds(body.updates, local))
      } catch {
        // Keep the legacy/local feed as an offline fallback.
        if (active) setUpdates(local)
      }
    }

    const cancelInitialRefresh = scheduleIdleWork(
      () => { void refresh() },
      { timeout: 2_500, fallbackDelay: 900 },
    )
    const timer = window.setInterval(() => { void refresh() }, 15_000)
    const onFocus = () => { void refresh() }
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh() }
    const onContentChange = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    window.addEventListener(ADMIN_CONTENT_EVENT, onContentChange)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      active = false
      cancelInitialRefresh()
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(ADMIN_CONTENT_EVENT, onContentChange)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return updates
}

// Slim opt-in bar shown once under the header
export function NotificationOptInBar() {
  const [prefs, setPrefs] = useState(getNotifPrefs())
  if (prefs.dismissed || prefs.enabled) return null

  async function enable() {
    let granted = true
    if ('Notification' in window && Notification.permission === 'default') {
      granted = (await Notification.requestPermission()) === 'granted'
    } else if ('Notification' in window) {
      granted = Notification.permission === 'granted'
    }
    setNotifPrefs({ asked: true, enabled: granted })
    setPrefs({ ...getNotifPrefs() })
    if (!granted) {
      alert('Browser notifications are blocked, but you will still see every update in the bell icon at the top of the site.')
    }
  }

  return (
    <div className="no-print border-b bg-emerald-950 text-emerald-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <p className="flex items-center gap-2 text-xs sm:text-sm">
          <BellRing className="h-4 w-4 shrink-0 text-amber-300" />
          Get a notification whenever the mentors announce something new - test series, opinions, FPSC dates.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={enable} className="rounded bg-emerald-400 px-3 py-1 text-xs font-bold text-emerald-950 hover:bg-emerald-300">
            Turn on notifications
          </button>
          <button
            onClick={() => { setNotifPrefs({ dismissed: true, asked: true }); setPrefs({ ...getNotifPrefs() }) }}
            className="rounded p-1 text-emerald-200 hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NotificationCenter() {
  const updates = useUpdates()
  const [open, setOpen] = useState(false)
  const [, force] = useState(0)
  const prefs = getNotifPrefs()
  const unseen = unseenUpdateIds(updates.map((u) => u.id))
  const ref = useRef<HTMLDivElement>(null)
  const pushedIds = useRef<Set<string>>(
    new Set(JSON.parse(sessionStorage.getItem('cssvista:notification-pushes') || '[]') as string[]),
  )

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Browser push for new notify-enabled updates (when permission granted).
  // A browser pop-up must never mark the bell item as read: students should
  // still see the red unread badge until they actually open the notification panel.
  useEffect(() => {
    if (!prefs.enabled || !('Notification' in window) || Notification.permission !== 'granted') return
    const fresh = updates.filter((u) =>
      unseen.includes(u.id)
      && u.notify
      && (prefs.tags[u.tag] ?? true)
      && !pushedIds.current.has(u.id),
    )
    if (fresh.length > 0) {
      const u = fresh[0]
      try {
        new Notification(`CSS Vista - ${u.tag}`, { body: `${u.title}\n${u.body}`.slice(0, 160) })
      } catch {
        /* some browsers require service workers - bell feed still works */
      }
      // Avoid repeated operating-system pop-ups during polling, but leave all
      // notification IDs unread until the student opens the bell panel.
      fresh.forEach((item) => pushedIds.current.add(item.id))
      try {
        sessionStorage.setItem('cssvista:notification-pushes', JSON.stringify([...pushedIds.current].slice(-200)))
      } catch {
        // Session storage is only a duplicate-push convenience.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updates])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) {
            markUpdatesSeen(updates.map((u) => u.id))
            setTimeout(() => force((f) => f + 1), 300)
          }
        }}
        className="relative rounded-md p-2 text-pine hover:bg-secondary"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unseen.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unseen.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-xl border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b bg-secondary/60 px-4 py-2.5">
            <p className="text-sm font-bold text-pine">Updates &amp; announcements</p>
            <span className="text-[11px] text-muted-foreground">{updates.length} total</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {updates.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No announcements yet. New updates from the mentors will appear here.
              </p>
            )}
            {updates.map((u) => (
              <div key={u.id} className="border-b px-4 py-3 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">{u.tag}</span>
                  <span className="text-[11px] text-muted-foreground">{u.date}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">{u.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{u.body}</p>
              </div>
            ))}
          </div>
          <NotificationSettings onChange={() => force((f) => f + 1)} />
        </div>
      )}
    </div>
  )
}

function NotificationSettings({ onChange }: { onChange: () => void }) {
  const prefs = getNotifPrefs()
  const [enabled, setEnabled] = useState(prefs.enabled)
  const [tags, setTags] = useState(prefs.tags)
  const { user } = useAccount()

  async function toggleEnabled() {
    const next = !enabled
    let granted = next
    if (next && 'Notification' in window && Notification.permission === 'default') {
      granted = (await Notification.requestPermission()) === 'granted'
    } else if (next && 'Notification' in window) {
      granted = Notification.permission === 'granted'
    }
    setEnabled(granted)
    setNotifPrefs({ enabled: granted, asked: true })
    if (next && !granted) window.alert('Browser notifications are blocked. Updates will remain available in the CSS Vista bell feed.')
    onChange()
  }

  function toggleTag(t: string) {
    const next = { ...tags, [t]: !tags[t] }
    setTags(next)
    setNotifPrefs({ tags: next })
    onChange()
  }

  return (
    <div className="border-t bg-secondary/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-pine">Notification settings</p>
        <button
          onClick={toggleEnabled}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${enabled ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}
        >
          {enabled && <Check className="h-3 w-3" />} {enabled ? 'On' : 'Off'}
        </button>
      </div>
      {enabled && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {UPDATE_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${(tags[t] ?? true) ? 'bg-pine text-emerald-50' : 'bg-white text-muted-foreground line-through'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {user ? 'These preferences are included in your account progress sync.' : 'Sign in to sync these preferences across devices.'}{' '}
        <Link to={user ? '/account' : '/dashboard'} className="underline underline-offset-2">Learn more</Link>
      </p>
    </div>
  )
}
