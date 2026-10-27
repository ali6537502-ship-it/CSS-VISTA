import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, Camera, GraduationCap, LoaderCircle, LockKeyhole, MapPin, UserRound } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { currentHostingerAccountUser, loadAccountSession, PROFILE_UPDATED_EVENT } from '@/lib/hostingerApi'
import WorkspaceAvatar from '@/features/workspace/WorkspaceAvatar'
import AccountPassword from './AccountPassword'
import { accessIssues } from './accessForm'
import { ProfileFields } from './ProfileFields'
import { profileDraft, profileSteps, type ProfileDraft, type StudentProfile } from './profileForm'
import { registrationIssues } from './registrationModel'
import { persistProfileEdit, persistProfilePhoto, profileRequest } from './profilePersistence'
import './account.css'

export default function RegistrationForm({ destination, embedded = false }: { destination: string; embedded?: boolean }) {
  const account = useAccount(), owner = account.user?.id || '', navigate = useNavigate()
  const [base, setBase] = useState<StudentProfile | null>(null)
  const [form, setForm] = useState<ProfileDraft>(() => profileDraft({}))
  const [email, setEmail] = useState(account.user?.email || ''), [password, setPassword] = useState('')
  const [issues, setIssues] = useState<Record<string, string>>({}), [error, setError] = useState('')
  const [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false), [status, setStatus] = useState('')
  const [photo, setPhoto] = useState<File | null>(null), [preview, setPreview] = useState(''), [photoNote, setPhotoNote] = useState('')
  const [retry, setRetry] = useState(0)
  const pending = useRef(false), mounted = useRef(false), loadedOwner = useRef(owner), photoJob = useRef(0)
  const unconfirmedRegistration = useRef<{ owner: string; email: string } | null>(null)
  useEffect(() => { const jobs = photoJob; mounted.current = true; return () => { mounted.current = false; ++jobs.current } }, [])
  useEffect(() => {
    if (pending.current || (owner === loadedOwner.current && (!owner || base))) return
    const controller = new AbortController()
    if (!owner) {
      loadedOwner.current = ''; unconfirmedRegistration.current = null; ++photoJob.current; setBase(null); setForm(profileDraft({})); setPhoto(null); setPhotoNote(''); setEmail(''); setPassword(''); setIssues({}); setError(''); setPreparing(false)
      return
    }
    const assertCurrent = () => { if (controller.signal.aborted || !mounted.current || currentHostingerAccountUser() !== owner) throw new Error('Account changed') }
    profileRequest<{ profile: StudentProfile }>(owner, 'student/profile.php', assertCurrent, { signal: controller.signal }).then(({ profile }) => {
      const retained = unconfirmedRegistration.current?.owner === owner && unconfirmedRegistration.current.email.toLowerCase() === profile.email.toLowerCase()
      loadedOwner.current = owner; unconfirmedRegistration.current = null; ++photoJob.current; setBase(profile); setEmail(profile.email); setPassword(''); setIssues({}); setError(''); setPreparing(false)
      if (!retained) { setForm(profileDraft(profile)); setPhoto(null); setPhotoNote('') }
    }).catch(() => { if (!controller.signal.aborted && mounted.current && currentHostingerAccountUser() === owner) setError('Your profile could not be loaded. Please retry.') })
    return () => controller.abort()
  }, [owner, busy, retry, base])
  useEffect(() => {
    if (!photo) { setPreview(''); return }
    const url = URL.createObjectURL(photo); setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  function change(key: string, value: string) {
    setForm(current => key === 'previous_css_vista_student' && value === 'No' ? { ...current, [key]: value, previous_css_vista_services: '', previous_css_vista_details: '' } : { ...current, [key]: value })
    setIssues(current => { const next = { ...current }; delete next[key]; if (key === 'display_name') delete next.name; if (key === 'previous_css_vista_student' && value === 'No') { delete next.previous_css_vista_services; delete next.previous_css_vista_details } return next }); setError('')
  }
  async function choosePhoto(input?: File) {
    if (!input || pending.current) return
    const job = ++photoJob.current, expected = owner
    setPreparing(true); setPhoto(null); setPhotoNote(''); setError('')
    try {
      const { prepareProfilePhoto } = await import('@/lib/photoCompression'), prepared = await prepareProfilePhoto(input)
      if (mounted.current && job === photoJob.current && (currentHostingerAccountUser() || '') === expected) {
        setPhoto(prepared.file); setPhotoNote(prepared.note); setIssues(current => { const next = { ...current }; delete next.photo; return next })
      }
    } catch (failure) { if (mounted.current && job === photoJob.current && (currentHostingerAccountUser() || '') === expected) setError(failure instanceof Error ? failure.message : 'This photo could not be prepared. Try another image.') }
    finally { if (mounted.current && job === photoJob.current && (currentHostingerAccountUser() || '') === expected) setPreparing(false) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current || preparing) return
    const credentials = !owner ? accessIssues({ name: form.display_name || '', email, password, confirmation: '', resetCode: '' }, 'create', false, false) : {}
    const invalid = { ...credentials, ...registrationIssues(form, !!photo || !!base?.has_photo) }
    setIssues(invalid); setError('')
    const first = Object.keys(invalid)[0]
    if (first) {
      const key = first === 'name' ? 'display_name' : first
      requestAnimationFrame(() => document.getElementById(`${['email', 'password'].includes(key) ? 'access' : 'profile'}-${key}`)?.focus())
      return
    }
    pending.current = true; setBusy(true)
    let expectedOwner = owner
    const assertCurrent = () => { if (!mounted.current || !expectedOwner || currentHostingerAccountUser() !== expectedOwner) throw new Error('Your account changed. Please reopen account setup.') }
    try {
      let original = base
      if (!expectedOwner) {
        setStatus('Creating your account…')
        const result = await account.signUp(email.trim(), password, form.display_name.trim())
        if (!mounted.current) return
        if (result.error) throw new Error(result.error)
        setPassword('')
        unconfirmedRegistration.current = { owner: currentHostingerAccountUser() || '', email: email.trim() }
        // Confirm the actual native identity; a superseded auth response must not
        // turn a different signed-in account into the owner of this form's data.
        const session = await loadAccountSession()
        if (!session.authenticated || session.user?.email.toLowerCase() !== email.trim().toLowerCase()) throw new Error('Account creation could not be confirmed. Please sign in to continue.')
        expectedOwner = session.user.id; assertCurrent()
      }
      if (!original || loadedOwner.current !== expectedOwner) {
        const response = await profileRequest<{ profile: StudentProfile }>(expectedOwner, 'student/profile.php', assertCurrent)
        original = response.profile; loadedOwner.current = expectedOwner; unconfirmedRegistration.current = null; setBase(original)
      }
      setStatus('Saving your profile…')
      const { profile: saved, conflicts } = await persistProfileEdit(expectedOwner, original, form, Object.keys(form), {}, assertCurrent)
      setBase(saved)
      if (conflicts.length) {
        const fresh = profileDraft(saved)
        throw new Error(`Newer saved details were found: ${conflicts.map(key => `${profileSteps.flatMap(group => group.fields).find(field => field.key === key)?.label}: ${fresh[key] || 'empty'}`).join('; ')}. Your entries are retained. Review them and submit again to use your changes.`)
      }
      setForm(profileDraft(saved))
      let completed = saved
      if (photo) { setStatus('Saving your photo…'); completed = await persistProfilePhoto(expectedOwner, photo, assertCurrent); setBase(completed); setPhoto(null); setPhotoNote('') }
      if (!completed.completion.complete) throw new Error('Your saved profile is not complete yet. Check the required details below and submit again.')
      assertCurrent(); window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT)); navigate(destination, { replace: true })
    } catch (failure) {
      if (mounted.current && (!expectedOwner || currentHostingerAccountUser() === expectedOwner)) setError(failure instanceof Error ? failure.message : 'Your details could not be saved. Please retry.')
    } finally { pending.current = false; if (mounted.current) { setBusy(false); setStatus('') } }
  }

  if (owner && (owner !== loadedOwner.current || !base)) return <section className="ac-profile ac-load" role="status">{error ? <><p role="alert">{error}</p><button onClick={() => { setError(''); setRetry(value => value + 1) }}>Retry</button></> : <><LoaderCircle size={20} className="animate-spin"/>{busy ? 'Saving your account…' : 'Loading your profile…'}</>}</section>
  if (!owner && loadedOwner.current) return <section className="ac-profile ac-load" role="status">Updating your account…</section>
  const Heading = embedded ? 'h2' : 'h1', SectionHeading = embedded ? 'h3' : 'h2', disabled = busy || preparing
  const fieldProps = { form, issues, change }
  return <section className="ac-profile ac-single">
    <header className="ac-single-header"><div><p className="ac-eyebrow">YOUR CSS VISTA ACCOUNT</p><Heading>{owner ? 'Complete your account' : 'Everything starts here.'}</Heading><p>Your login, personal details, study preferences and photo — all in one form.</p></div>{!owner && <Link className="ac-text-link" to={`/account?returnTo=${encodeURIComponent(destination)}`}>Already registered? Sign in<ArrowRight size={15}/></Link>}</header>
    <form noValidate onSubmit={event => void submit(event)}>
      {error && <p role="alert" className="ac-error">{owner && !base?.completion.complete ? 'Your account is created. ' : ''}{error}</p>}
      {!!Object.keys(issues).length && <p role="alert" className="ac-error">Please check the highlighted details before submitting.</p>}
      <fieldset disabled={disabled} className="ac-single-grid">
        <section className="ac-single-section"><SectionHeading><UserRound size={19}/>Account details</SectionHeading><div className="ac-fields"><ProfileFields fields={profileSteps[0].fields.slice(0, 1)} {...fieldProps}/><div className="ac-field"><label htmlFor="access-email">Email address</label><input id="access-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} readOnly={!!owner} value={email} aria-invalid={!!issues.email} aria-describedby={issues.email ? 'registration-email-error' : undefined} onChange={event => { setEmail(event.target.value); setIssues(current => { const next = { ...current }; delete next.email; return next }); setError('') }}/>{issues.email && <p id="registration-email-error" className="ac-field-error">{issues.email}</p>}</div>{!owner && <div className="ac-wide"><AccountPassword label="Password" name="password" value={password} fresh hint="At least eight characters. No email verification code is needed." error={issues.password} onChange={value => { setPassword(value); setIssues(current => { const next = { ...current }; delete next.password; return next }); setError('') }}/></div>}</div></section>
        <section className="ac-single-section"><SectionHeading><MapPin size={19}/>Personal information</SectionHeading><div className="ac-fields"><ProfileFields fields={[...profileSteps[0].fields.slice(1, 3), ...profileSteps[1].fields]} {...fieldProps}/></div></section>
        <section className="ac-single-section"><SectionHeading><GraduationCap size={19}/>Your studies</SectionHeading><div className="ac-fields"><ProfileFields fields={profileSteps[2].fields} {...fieldProps}/></div></section>
        <section className="ac-single-section"><SectionHeading><UserRound size={19}/>Your connection with CSS Vista</SectionHeading><div className="ac-fields"><ProfileFields fields={profileSteps[0].fields.slice(3)} {...fieldProps}/></div></section>
        <section className="ac-single-section ac-single-photo"><SectionHeading><Camera size={19}/>Your profile photo</SectionHeading><p className="ac-hint">Choose a clear JPG, PNG or WebP. Larger photos are resized on your device before saving.</p><div className="ac-photo-picker"><div className="ac-photo-preview">{preview ? <img src={preview} alt="Your profile photo preview"/> : base?.has_photo ? <WorkspaceAvatar user={account.user}/> : <UserRound size={42}/>}</div><div><label className="ac-choose-photo"><Camera size={18}/>Choose photo<input id="profile-photo" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={!!issues.photo} aria-describedby={issues.photo ? 'registration-photo-error' : undefined} onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = '' }}/></label><p className="ac-hint">Up to 20 MB to prepare · saved photo at most 60 KB</p></div></div>{photoNote && <p role="status" className="ac-photo-note">{photoNote}</p>}{issues.photo && <p id="registration-photo-error" className="ac-field-error">{issues.photo}</p>}</section>
      </fieldset>
      <footer className="ac-single-submit"><p><LockKeyhole size={16}/>Your profile and photo stay private to your account and authorised administration.</p><button type="submit" className="ac-primary" disabled={disabled}>{disabled ? <><LoaderCircle size={18} className="animate-spin"/>{preparing ? 'Preparing your photo…' : status || 'Saving…'}</> : <>{owner ? 'Finish account setup' : 'Create my account'}<ArrowRight size={18}/></>}</button></footer>
    </form>
  </section>
}
