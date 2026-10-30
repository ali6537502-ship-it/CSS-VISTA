import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Camera, Check, CircleCheck, GraduationCap, LoaderCircle, MapPin, UserRound } from 'lucide-react'
import { currentHostingerAccountUser, hostingerRequest, PROFILE_UPDATED_EVENT } from '@/lib/hostingerApi'
import { useAccount } from '@/lib/accountContext'
import WorkspaceAvatar from '@/features/workspace/WorkspaceAvatar'
import { ProfileFields } from './ProfileFields'
import { firstIncompleteProfileStep, profileDraft, profileFieldStep, profileIssues, profileSteps, type ProfileDraft, type StudentProfile } from './profileForm'
import { persistProfileEdit, persistProfilePhoto } from './profilePersistence'
import './account.css'

const MAX_PROFILE_PHOTO_BYTES = 60 * 1024
const OVERSIZE_PHOTO_ERROR = 'Profile photo must be 60 KB or smaller. Please resize the photo and upload it again.'
const icons = [UserRound, MapPin, GraduationCap, Camera]
export function StudentProfilePanel({ email }: { email: string }) {
  const { user } = useAccount()
  const owner = user?.id || ''
  const request = useCallback(<T,>(path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers); headers.set('X-CSSV-User', owner)
    return hostingerRequest<T>(path, { ...init, headers })
  }, [owner])
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [form, setForm] = useState<ProfileDraft>({})
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [photoNote, setPhotoNote] = useState('')
  const job = useRef(0), pending = useRef(false), mounted = useRef(false)
  const editedBase = useRef<ProfileDraft>({})
  const root = useRef<HTMLElement>(null)
  const isCurrent = useCallback(() => mounted.current && currentHostingerAccountUser() === owner, [owner])
  useEffect(() => { const jobs = job; mounted.current = true; return () => { mounted.current = false; ++jobs.current } }, [])
  useEffect(() => {
    const controller = new AbortController()
    request<{ profile: StudentProfile }>('student/profile.php', { signal: controller.signal }).then(({ profile: saved }) => {
      if (!controller.signal.aborted && isCurrent()) { setProfile(saved); setForm(profileDraft(saved)); setStep(firstIncompleteProfileStep(saved)); setError('') }
    }).catch(() => { if (!controller.signal.aborted && isCurrent()) setError('Your profile could not be loaded. Please retry.') })
    return () => controller.abort()
  }, [request, retry, isCurrent])
  useEffect(() => {
    if (!photo) { setPreview(''); return }
    const url = URL.createObjectURL(photo); setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])
  const dirty = useMemo(() => profile && JSON.stringify(form) !== JSON.stringify(profileDraft(profile)), [form, profile])
  function move(next: number, field?: string) {
    setStep(next)
    requestAnimationFrame(() => {
      const element = field ? root.current?.querySelector<HTMLElement>(`#profile-${field === 'contact' ? 'phone' : field}`) : root.current?.querySelector<HTMLElement>('#profile-step-heading')
      element?.focus(); element?.scrollIntoView({ block: 'nearest' })
    })
  }
  function change(key: string, value: string) {
    if (profile && form[key] === profileDraft(profile)[key]) editedBase.current[key] = form[key]
    setForm(current => key === 'previous_css_vista_student' && value === 'No' ? { ...current, [key]: value, previous_css_vista_services: '', previous_css_vista_details: '' } : { ...current, [key]: value })
    setIssues(current => { const next = { ...current }; delete next[key]; return next }); setMessage('')
  }
  function notify() { if (isCurrent()) window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT)) }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (pending.current || !profile || !isCurrent()) return
    const invalid = profileIssues(form, step)
    setIssues(invalid); setError(''); setMessage('')
    const first = Object.keys(invalid)[0]
    if (first) { move(profileFieldStep(first), first); return }
    const keys = profileSteps[step].fields.map(field => field.key), base = profileDraft(profile)
    const changed = keys.filter(key => form[key] !== base[key])
    if (!changed.length) { if (!profile.completion.complete) move(Math.min(3, step + 1)); else setMessage('Your details are already saved.'); return }
    pending.current = true; setBusy(true)
    try {
      const { profile: saved, conflicts } = await persistProfileEdit(owner, profile, form, keys, editedBase.current, () => { if (!isCurrent()) throw new Error('Your account changed. Please reopen your profile.') })
      if (conflicts.length) {
        const fresh = profileDraft(saved)
        conflicts.forEach(key => { editedBase.current[key] = fresh[key] })
        setProfile(saved)
        setError(`Newer saved details were found: ${conflicts.map(key => `${profileSteps[step].fields.find(field => field.key === key)?.label}: ${fresh[key] || 'empty'}`).join('; ')}. Your entries are retained. Review them and save again to use your changes.`)
        return
      }
      const otherDrafts = Object.fromEntries(Object.entries(form).filter(([key, value]) => !keys.includes(key) && value !== base[key]))
      const savedForm = profileDraft(saved)
      keys.forEach(key => { delete editedBase.current[key] })
      setProfile(saved); setForm({ ...savedForm, ...otherDrafts }); setMessage('Saved to your account.'); notify()
      if (!profile.completion.complete) move(Math.min(3, step + 1))
    } catch (failure) { if (isCurrent()) setError(failure instanceof Error ? failure.message : 'Your details could not be saved. Please try again.') }
    finally { pending.current = false; if (isCurrent()) setBusy(false) }
  }
  async function choosePhoto(file?: File) {
    if (!file || pending.current) return
    const currentJob = ++job.current
    setBusy(true); setPhoto(null); setError(''); setPhotoNote(''); setMessage('')
    try {
      const { prepareProfilePhoto } = await import('@/lib/photoCompression')
      const prepared = await prepareProfilePhoto(file)
      if (currentJob === job.current && isCurrent()) { setPhoto(prepared.file); setPhotoNote(prepared.note) }
    } catch (failure) { if (currentJob === job.current && isCurrent()) setError(failure instanceof Error ? failure.message : 'This photo could not be prepared. Try another image.') }
    finally { if (currentJob === job.current && isCurrent()) setBusy(false) }
  }
  async function upload() {
    if (!photo || pending.current || !isCurrent()) return
    if (photo.size > MAX_PROFILE_PHOTO_BYTES) { setError(OVERSIZE_PHOTO_ERROR); return }
    pending.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const saved = await persistProfilePhoto(owner, photo, () => { if (!isCurrent()) throw new Error('Your account changed. Please reopen your profile.') })
      setProfile(saved); setPhoto(null); setPhotoNote(''); notify(); setMessage(saved.completion.complete ? 'Your student workspace is ready.' : 'Photo saved. Finish the remaining profile details to continue.')
    } catch (failure) { if (isCurrent()) setError(failure instanceof Error ? failure.message : 'Your photo could not be saved. Please try again.') }
    finally { pending.current = false; if (isCurrent()) setBusy(false) }
  }
  if (!profile) return <section className="ac-profile ac-load" role="status">{error ? <><p role="alert">{error}</p><button onClick={() => { setError(''); setRetry(value => value + 1) }}>Retry</button></> : <><LoaderCircle size={20} className="animate-spin"/>Loading your profile…</>}</section>
  const c = profile.completion, group = profileSteps[step], Icon = icons[step]
  return <section ref={root} className="ac-profile">
    <header className="ac-profile-header"><div><p className="ac-eyebrow">YOUR PRIVATE STUDENT PROFILE</p><h2>{c.complete ? 'Your profile, your learning space' : 'A few details. Then you’re ready.'}</h2><p>{c.complete ? 'Keep your details up to date, whenever you need to.' : 'Four short steps. Each section saves to your account, so you can come back and continue.'}</p></div><div className="ac-saved-progress"><strong>{c.percent}%</strong><span>{c.completed} of {c.total} required details saved</span><div role="progressbar" aria-label="Saved profile completion" aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={c.completed}><i style={{ width: `${c.percent}%` }}/></div></div></header>
    <div className="ac-profile-layout"><aside className="ac-profile-rail"><nav aria-label="Profile sections">{profileSteps.map((item, index) => {
      const StepIcon = icons[index], complete = item.checks.every(key => c.checks.find(check => check.key === key)?.complete)
      return <button key={item.title} type="button" disabled={busy} aria-current={step === index ? 'step' : undefined} onClick={() => move(index)}><span>{complete ? <Check size={17}/> : <StepIcon size={17}/>}</span><span><small>Step {index + 1}</small>{item.title}</span></button>
    })}</nav><details><summary>Profile requirements</summary>{c.checks.map(check => <button key={check.key} type="button" disabled={busy} onClick={() => move(profileFieldStep(check.key), check.key)}><CircleCheck size={14}/>{check.label}<small>{check.complete ? 'Saved' : 'Needed'}</small></button>)}</details><p>Your details and photo are private to you and authorised administration.</p></aside>
    <div className="ac-profile-body"><div className="ac-step-title"><span><Icon size={23}/></span><div><p className="ac-eyebrow">STEP {step + 1} OF 4</p><h3 id="profile-step-heading" tabIndex={-1}>{group.title}</h3></div></div><p className="ac-step-description">{group.description}</p>
      {error && <p role="alert" className="ac-error">{error}</p>}{Object.keys(issues).length > 0 && <p role="alert" className="ac-error">Please check the highlighted details.</p>}{message && <p role="status" className="ac-success">{message}</p>}
      {step < 3 ? <form noValidate onSubmit={event => void save(event)}><fieldset disabled={busy} className="ac-fields">{step === 0 && <p className="ac-account-email ac-wide">Account email <strong>{email}</strong></p>}<ProfileFields fields={group.fields} form={form} issues={issues} change={change}/></fieldset><div className="ac-form-actions">{step > 0 && <button type="button" disabled={busy} className="ac-back" onClick={() => move(step - 1)}><ArrowLeft size={16}/>Back</button>}<button className="ac-primary" disabled={busy}>{busy ? <><LoaderCircle size={17} className="animate-spin"/>Saving…</> : c.complete ? 'Save changes' : <>Save & continue<ArrowRight size={17}/></>}</button><span>{dirty ? 'Changes are not saved yet' : 'Saved details stay with your account'}</span></div></form> : <div className="ac-photo-step"><p>Choose a JPG, PNG or WebP photo. Larger photos are resized on your device to the existing 60 KB upload limit.</p><div className="ac-photo-picker"><div className="ac-photo-preview">{preview ? <img src={preview} alt="Your profile photo preview"/> : profile.has_photo ? <WorkspaceAvatar user={user}/> : <UserRound size={44}/>}</div><div><label className="ac-choose-photo"><Camera size={18}/>Choose photo<input id="profile-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = '' }}/></label><p className="ac-hint">Up to 20 MB to prepare · saved file at most 60 KB</p></div></div>{photoNote && <p role="status" className="ac-photo-note">{photoNote}</p>}{busy && <p role="status" className="ac-hint">Preparing or saving your photo…</p>}<div className="ac-form-actions"><button type="button" className="ac-back" disabled={busy} onClick={() => move(2)}><ArrowLeft size={16}/>Back</button>{photo && <button type="button" className="ac-primary" disabled={busy} onClick={() => void upload()}>{busy ? 'Saving…' : 'Save photo'}<ArrowRight size={17}/></button>}</div>{error && <Link className="ac-text-link" to="/photo-compressor" target="_blank" rel="noopener noreferrer">Open the separate photo size reducer</Link>}</div>}
      {c.complete && <Link to="/account/dashboard" className="ac-text-link ac-dashboard-link">Open my dashboard<ArrowRight size={16}/></Link>}
    </div></div>
  </section>
}
