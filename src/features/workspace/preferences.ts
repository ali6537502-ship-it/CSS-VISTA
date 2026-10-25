import { useState } from 'react'
import { useAccount } from '@/lib/accountContext'
type Preferences = { pins: string[]; guidanceDismissed: boolean; comparative: boolean }
const defaults: Preferences = { pins:['daily-pdfs','current-affairs','daily-english','vistagram','grammar-course'], guidanceDismissed:false, comparative:false }
export function useWorkspacePreferences() {
  const { user } = useAccount()
  const key = `cssvista:workspace:v1:${user?.id ?? 'guest'}`
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  void revision
  let preferences = defaults
  try { const raw = localStorage.getItem(key); if (raw) { const p = JSON.parse(raw); preferences = { pins:Array.isArray(p.pins) ? p.pins.filter((x:unknown) => typeof x === 'string') : defaults.pins, guidanceDismissed:p.guidanceDismissed === true, comparative:p.comparative === true } } } catch { /* Retain readable defaults; do not overwrite malformed preferences. */ }
  function update(patch: Partial<Preferences>) {
    if (!user) return
    try { localStorage.setItem(key, JSON.stringify({...preferences,...patch})); setError(''); setRevision(v => v+1) }
    catch { setError('This device could not save your workspace preference. Please try again.') }
  }
  return { preferences, update, error }
}
