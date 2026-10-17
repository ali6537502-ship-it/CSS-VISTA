import { Bell, BellOff, Check, ExternalLink, Eye, EyeOff, Headphones, MonitorUp, ShieldCheck, Volume2, Zap } from 'lucide-react'
import { canRequestTimerNotifications, previewTimerAlert, requestTimerNotifications, type TimerAlertMode } from './TimerFeedback'

type Permission = NotificationPermission | 'unsupported'

interface TimerCompanionPanelProps {
  mode: TimerAlertMode
  onModeChange: (next: TimerAlertMode) => void
  notificationsEnabled: boolean
  onNotificationsChange: (enabled: boolean) => void
  permission: Permission
  onPermissionChange: (next: Permission) => void
  keepAwake: boolean
  onKeepAwakeChange: (enabled: boolean) => void
}

const modes: { value: TimerAlertMode; title: string }[] = [
  { value: 'off', title: 'Silent' },
  { value: 'tones', title: 'Tones' },
  { value: 'voice', title: 'Voice' },
  { value: 'both', title: 'Both' },
]

export function TimerCompanionPanel({
  mode, onModeChange, notificationsEnabled, onNotificationsChange,
  permission, onPermissionChange, keepAwake, onKeepAwakeChange,
}: TimerCompanionPanelProps) {
  const notificationsSupported = canRequestTimerNotifications()
  const wakeSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator && window.isSecureContext

  async function enableNotifications() {
    if (permission === 'denied' || permission === 'unsupported') return
    const response = permission === 'granted' ? 'granted' : await requestTimerNotifications()
    onPermissionChange(response as Permission)
    onNotificationsChange(response === 'granted')
  }

  return (
    <section aria-labelledby="companion-title" className="no-print mb-6 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-800 px-5 py-5 text-white sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-white/15 p-2"><MonitorUp className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.19em] text-emerald-100/80">Focus companion</p>
              <h2 id="companion-title" className="text-lg font-bold">Make every minute count</h2>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-emerald-100/90">
            Choose the reminders you want. Your browser will ask for notification permission only if you select Enable.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold"><ShieldCheck className="h-3.5 w-3.5" /> Your choice, always</span>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Headphones className="h-4 w-4 text-emerald-800" /> Sound and voice</div>
          <p className="mt-2 min-h-9 text-xs leading-5 text-slate-600">Choose spoken guidance, gentle tones, both, or complete silence.</p>
          <div role="group" aria-label="Timer alert sound" className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-slate-200/70 p-1">
            {modes.map((item) => (
              <button key={item.value} onClick={() => onModeChange(item.value)}
                aria-pressed={mode === item.value}
                className={`rounded-md px-1 py-2 text-[11px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 ${mode === item.value ? 'bg-white text-emerald-950 shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}>
                {item.title}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => previewTimerAlert(mode)} disabled={mode === 'off'}
            className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-800/20 bg-white px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
            <Volume2 className="h-3.5 w-3.5" /> Test reminder
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Bell className="h-4 w-4 text-emerald-800" /> Browser notifications</div>
          <p className="mt-2 min-h-9 text-xs leading-5 text-slate-600">Opt in to an overdue alert when the tab is open in the background.</p>
          <div className="mt-3 flex items-center gap-2">
            {permission === 'granted' && notificationsEnabled ? (
              <button onClick={() => onNotificationsChange(false)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-800 px-3 text-xs font-semibold text-white">
                <Check className="h-4 w-4" /> On · Disable
              </button>
            ) : permission === 'granted' ? (
              <button onClick={enableNotifications} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-700 px-3 text-xs font-semibold text-emerald-900">
                <Bell className="h-4 w-4" /> Enable alerts
              </button>
            ) : permission === 'denied' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800"><BellOff className="h-4 w-4" /> Blocked in browser settings</span>
            ) : notificationsSupported ? (
              <button onClick={enableNotifications} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-700 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-50">
                <Bell className="h-4 w-4" /> Ask my permission
              </button>
            ) : (
              <span className="text-xs text-slate-500">Not supported in this browser</span>
            )}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">Not a guarantee after closing the site. Change or revoke permission in your browser settings.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Zap className="h-4 w-4 text-emerald-800" /> Keep screen awake</div>
          <p className="mt-2 min-h-9 text-xs leading-5 text-slate-600">Optional for long sessions. Stops the screen dimming while the timer page is visible.</p>
          {wakeSupported ? (
            <button type="button" aria-pressed={keepAwake} onClick={() => onKeepAwakeChange(!keepAwake)}
              className={`mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${keepAwake ? 'bg-emerald-800 text-white' : 'border border-emerald-700 bg-white text-emerald-900'}`}>
              {keepAwake ? <><Eye className="h-4 w-4" /> Enabled · Turn off</> : <><EyeOff className="h-4 w-4" /> Keep screen on</>}
            </button>
          ) : (
            <span className="mt-3 inline-block text-xs text-slate-500">Not supported in this browser</span>
          )}
          <p className="mt-2 text-[11px] leading-4 text-slate-500">Only active while the page is visible and the device allows it. Uses more battery.</p>
        </div>
      </div>
      <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs leading-5 text-slate-600">
        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
        <p><strong className="text-slate-800">Floating timer:</strong> Select “Float timer” beside the clock to request an always-on-top window on supported desktop browsers. The floating window closes with the original browser tab. Mobile users can keep the timer page open instead.</p>
      </div>
    </section>
  )
}
