import { StudentProfilePanel } from '@/components/StudentProfilePanel'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { z } from 'zod'
import { useAccount } from '@/lib/accountContext'
import { briefingRequest, preferencesBody } from './api'
import { preferencesSchema, settingsSchema } from './model'
import { useBriefing } from './useBriefing'
import { LoadError, Loading } from './ui'
import WorkspaceTabs, { useWorkspaceSection } from './WorkspaceTabs'

const savedSchema = z.object({ preferences: preferencesSchema })
export default function Settings() {
  const result = useBriefing('view=preferences', settingsSchema)
  if (result.loading) return <Loading />
  if (result.error || !result.data) return <LoadError error={result.error || 'Please try again.'} retry={result.retry} />
  return <SettingsForm initial={result.data} />
}
function SettingsForm({ initial }: { initial: z.infer<typeof settingsSchema> }) {
  const { updatePassword, requestPasswordReset } = useAccount()
  const [section, setSection] = useWorkspaceSection('section', ['profile', 'reading', 'security'], 'profile')
  const [resetBusy, setResetBusy] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetSent, setResetSent] = useState(false)
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
    try { await briefingRequest('', savedSchema, undefined, preferencesBody({ reading_mode: mode, preferred_categories: categories })); setMessage('Your account preferences have been saved.') }
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
  async function sendResetCode() {
    setResetBusy(true); setResetMessage(''); setResetSent(false)
    try {
      const result = await requestPasswordReset(initial.email)
      if (result.error) setResetMessage(result.error)
      else { setResetSent(true); setResetMessage('If your account is eligible, a reset code and link will arrive shortly. Check your inbox and spam folder.') }
    } catch { setResetMessage('The reset email could not be requested. Please try again.') }
    finally { setResetBusy(false) }
  }
  return <>
    <header className="ca-heading"><p className="ca-eyebrow">YOUR ACCOUNT</p><h1>Account Settings</h1><p>Your profile, reading preferences and account security.</p></header>
    <WorkspaceTabs id="settings" label="Settings sections" items={[{value:'profile',label:'Profile'},{value:'reading',label:'Reading'},{value:'security',label:'Security'}]} value={section} onChange={setSection} />
    <section id="settings-profile" role="tabpanel" aria-labelledby="settings-profile-tab" hidden={section !== 'profile'} tabIndex={0}>
      <StudentProfilePanel email={initial.email} />
    </section>
    <section id="settings-reading" role="tabpanel" aria-labelledby="settings-reading-tab" hidden={section !== 'reading'} tabIndex={0}>
      <form className="ca-settings-panel" onSubmit={event => void save(event)}><h2>Make reading feel right for you</h2><p>Start with the essentials or open the complete analysis. You can switch modes inside any development.</p>
        <fieldset><legend>Default reading mode</legend><div className="ca-radio-row"><label><input type="radio" name="reading-mode" value="quick" checked={mode === 'quick'} onChange={() => setMode('quick')} /> Quick Read</label><label><input type="radio" name="reading-mode" value="full" checked={mode === 'full'} onChange={() => setMode('full')} /> Full Analysis</label></div></fieldset>
        {initial.categories.length > 0 && <fieldset><legend>Preferred categories</legend><p className="ca-muted">Bring these categories to the top of your dashboard. You can always access the complete briefing.</p><div className="ca-preferences-categories">{initial.categories.map(category => <label key={category}><input type="checkbox" checked={categories.includes(category)} onChange={event => setCategories(old => event.target.checked ? [...old, category] : old.filter(value => value !== category))} />{category}</label>)}</div></fieldset>}
        <button className="ca-button" disabled={busy}>{busy ? 'Saving…' : 'Save preferences'}</button><p role="status">{message}</p>
      </form>
    </section>
    <section id="settings-security" role="tabpanel" aria-labelledby="settings-security-tab" hidden={section !== 'security'} tabIndex={0}>
      <div className="ca-settings-panel"><h2>Password recovery</h2><p>Forgot your current password? Request a six-digit code at your account email. The code expires after 10 minutes.</p>
        <button className="ca-button" disabled={resetBusy} onClick={() => void sendResetCode()}>{resetBusy ? 'Requesting code…' : 'Email me a reset code'}</button>
        <p role="status">{resetMessage}</p>{resetSent && <Link className="ca-text-link" to="/account?recovery=code">Enter your reset code <span aria-hidden="true">→</span></Link>}
      </div>
      <details className="ca-password-details"><summary>Change password using your current password</summary>
        <form className="ca-settings-panel" onSubmit={event => void changePassword(event)}><h2>Change password</h2>
          <label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
          <label>New password<input type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={password} onChange={event => setPassword(event.target.value)} /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
          <button className="ca-button" disabled={passwordBusy}>{passwordBusy ? 'Updating…' : 'Update password'}</button><p role="status">{passwordMessage}</p>
        </form>
      </details>
    </section>
  </>
}
