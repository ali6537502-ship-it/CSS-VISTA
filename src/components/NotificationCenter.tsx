import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Bell, BellRing, Check, X } from 'lucide-react'
import { mergedUpdates } from '@/lib/admin'
import { getNotifPrefs, markUpdatesSeen, setNotifPrefs, unseenUpdateIds } from '@/lib/progress'
import { useAccount } from '@/lib/accountContext'

export const UPDATE_TAGS = ['Mentors', 'Opinions', 'Test Series', 'FPSC', 'General']

export function useUpdates() {
  const [updates, setUpdates] = useState(mergedUpdates())
  useEffect(() => {
    const t = setInterval(() => setUpdates(mergedUpdates()), 5000)
    return () => clearInterval(t)
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
    setNotifPrefs({ asked: true, enabled: true })
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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Browser push for new notify-enabled updates (when permission granted)
  useEffect(() => {
    if (!prefs.enabled || !('Notification' in window) || Notification.permission !== 'granted') return
    const fresh = updates.filter((u) => unseen.includes(u.id) && u.notify && (prefs.tags[u.tag] ?? true))
    if (fresh.length > 0) {
      const u = fresh[0]
      try {
        new Notification(`CSS Vista - ${u.tag}`, { body: `${u.title}\n${u.body}`.slice(0, 160) })
      } catch {
        /* some browsers require service workers - bell feed still works */
      }
      markUpdatesSeen(fresh.map((x) => x.id))
      force((f) => f + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updates.length])

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
    if (next && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    setEnabled(next)
    setNotifPrefs({ enabled: next, asked: true })
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
        {user ? 'These preferences are included in your account progress sync.' : 'Guest preferences save on this device.'}{' '}
        <Link to={user ? '/account' : '/dashboard'} className="underline underline-offset-2">Learn more</Link>
      </p>
    </div>
  )
}
