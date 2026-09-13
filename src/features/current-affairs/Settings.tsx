import { StudentProfilePanel } from '@/components/StudentProfilePanel'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { z } from 'zod'
import { useAccount } from '@/lib/accountContext'
import { briefingRequest, preferencesBody } from './api'
import { preferencesSchema, settingsSchema } from './model'
import { useBriefing } from './useBriefing'
import { LoadError, Loading } from './ui'

const savedSchema = z.object({ preferences: preferencesSchema })
export default function Settings() {
  const result = useBriefing('view=preferences', settingsSchema)
  if (result.loading) return <Loading />
  if (result.error || !result.data) return <LoadError error={result.error || 'Please try again.'} retry={result.retry} />
  return <SettingsForm initial={result.data} />
}
function SettingsForm({ initial }: { initial: z.infer<typeof settingsSchema> }) {
  const { updatePassword } = useAccount()
  const [name, setName] = useState(initial.display_name)
  const [mode, setMode] = useState(initial.preferences.reading_mode)
  const [categories, setCategories] = useState(initial.preferences.preferred_categories)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    try { await briefingRequest('', savedSchema, undefined, preferencesBody({ reading_mode: mode, preferred_categories: categories }, name.trim())); setMessage('Your account preferences have been saved.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Your preferences could not be saved.') }
    finally { setBusy(false) }
  }
  async function changePassword(e: FormEvent) {
    e.preventDefault(); setPasswordMessage('')
    if (password !== confirmation) { setPasswordMessage('Passwords do not match.'); return }
    setPasswordBusy(true)
    try {
      const result = await updatePassword(password, currentPassword)
      if (result.error) setPasswordMessage(result.error)
      else { setCurrentPassword(''); setPassword(''); setConfirmation(''); setPasswordMessage('Your password has been updated.') }
    } catch { setPasswordMessage('Your password could not be changed. Please try again.') }
    finally { setPasswordBusy(false) }
  }
  return <>
    <header className="ca-heading"><p className="ca-eyebrow">YOUR ACCOUNT</p><h1>Account Settings</h1><p>A few useful preferences for your daily reading.</p></header>
    <StudentProfilePanel email={initial.email} />
    <form className="ca-settings-panel" onSubmit={(e) => void save(e)}><h2>Profile & reading preferences</h2>
      <label>Display name<input required autoComplete="name" maxLength={160} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Email<input type="email" value={initial.email} readOnly aria-describedby="ca-email-note" /></label><small id="ca-email-note">Your account email.</small>
      <fieldset><legend>Default reading mode</legend><div className="ca-radio-row"><label><input type="radio" name="reading-mode" value="quick" checked={mode === 'quick'} onChange={() => setMode('quick')} /> Quick Read</label><label><input type="radio" name="reading-mode" value="full" checked={mode === 'full'} onChange={() => setMode('full')} /> Full Analysis</label></div></fieldset>
      {initial.categories.length > 0 && <fieldset><legend>Preferred categories</legend><p className="ca-muted">Bring these categories to the top of your dashboard. You can always access the complete briefing.</p><div className="ca-preferences-categories">{initial.categories.map((category) => <label key={category}><input type="checkbox" checked={categories.includes(category)} onChange={(e) => setCategories((old) => e.target.checked ? [...old, category] : old.filter((c) => c !== category))} />{category}</label>)}</div></fieldset>}
      <button className="ca-button" disabled={busy}>{busy ? 'Saving…' : 'Save preferences'}</button><p role="status">{message}</p>
    </form>
    <form className="ca-settings-panel" onSubmit={(e) => void changePassword(e)}><h2>Change password</h2>
      <label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label>
      <label>New password<input type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label>
      <button className="ca-button" disabled={passwordBusy}>{passwordBusy ? 'Updating…' : 'Update password'}</button><p role="status">{passwordMessage}</p>
    </form>
    <div className="ca-settings-panel"><h2>Study profile & progress</h2><p>Your existing CSS Vista study profile, personal factbook and progress remain available in your account.</p><Link className="ca-text-link" to="/account?settings=1">Manage study profile and progress</Link></div>
  </>
}
