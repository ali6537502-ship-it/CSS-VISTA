import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Camera, Check, CircleCheck, GraduationCap, LoaderCircle, MapPin, UserRound, X } from 'lucide-react'
import { currentHostingerAccountUser, hostingerRequest, PROFILE_UPDATED_EVENT } from '@/lib/hostingerApi'
import { useAccount } from '@/lib/accountContext'
import WorkspaceAvatar from '@/features/workspace/WorkspaceAvatar'
import { ProfileSubjects } from './ProfileSubjects'
import { firstIncompleteProfileStep, incompatibleProfileList, profileDraft, profileFieldStep, profileIssues, profilePayload, profileSteps, profileValues, type ProfileDraft, type StudentProfile } from './profileForm'
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
      // Refresh untouched fields before the existing full-profile API write.
      const { profile: latest } = await request<{ profile: StudentProfile }>('student/profile.php')
      if (!isCurrent()) return
      const incompatible = incompatibleProfileList(latest, changed)
      if (incompatible) throw new Error(`Your saved ${incompatible === 'optional_subjects' ? 'subject list' : 'previous-service list'} uses an unsupported format. Your saved data and entries are retained. Review that list in ${incompatible === 'optional_subjects' ? 'Your studies' : 'Contact'} before saving other changes.`)
      const fresh = profileDraft(latest)
      const conflicts = changed.filter(key => fresh[key] !== (editedBase.current[key] ?? base[key]) && fresh[key] !== form[key])
      if (conflicts.length) {
        conflicts.forEach(key => { editedBase.current[key] = fresh[key] })
        setProfile(latest)
        setError(`Newer saved details were found: ${conflicts.map(key => `${profileSteps[step].fields.find(field => field.key === key)?.label}: ${fresh[key] || 'empty'}`).join('; ')}. Your entries are retained. Review them and save again to use your changes.`)
        return
      }
      const patch = Object.fromEntries(changed.map(key => [key, form[key]])), payload = profilePayload({ ...fresh, ...patch })
      await request('student/profile.php', { method: 'POST', body: JSON.stringify(payload) })
      const { profile: saved } = await request<{ profile: StudentProfile }>('student/profile.php')
      if (!isCurrent()) return
      const otherDrafts = Object.fromEntries(Object.entries(form).filter(([key, value]) => !keys.includes(key) && value !== base[key]))
      const savedForm = profileDraft(saved), expected = profileDraft(payload)
      if (changed.some(key => savedForm[key] !== expected[key])) throw new Error('Your saved details could not be confirmed. Your entries are retained; please try again.')
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
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP photo.')
      if (file.size < 512) throw new Error('Choose a valid photo file.')
      const { compressImage, MAX_INPUT_BYTES, formatBytes } = await import('@/lib/photoCompression')
      if (file.size > MAX_INPUT_BYTES) throw new Error('Choose a photo smaller than 20 MB.')
      let prepared = file
      if (file.size > MAX_PROFILE_PHOTO_BYTES) { const result = await compressImage(file, 60); prepared = new File([result.blob], 'profile-photo.jpg', { type: 'image/jpeg' }) }
      if (prepared.size > MAX_PROFILE_PHOTO_BYTES) throw new Error(OVERSIZE_PHOTO_ERROR)
      if (currentJob === job.current && isCurrent()) { setPhoto(prepared); setPhotoNote(prepared === file ? `${formatBytes(prepared.size)} · ready to save` : `Resized on your device: ${formatBytes(file.size)} → ${formatBytes(prepared.size)}. Preview it before saving.`) }
    } catch (failure) { if (currentJob === job.current && isCurrent()) setError(failure instanceof Error ? failure.message : 'This photo could not be prepared. Try another image.') }
    finally { if (currentJob === job.current && isCurrent()) setBusy(false) }
  }
  async function upload() {
    if (!photo || pending.current || !isCurrent()) return
    if (photo.size > MAX_PROFILE_PHOTO_BYTES) { setError(OVERSIZE_PHOTO_ERROR); return }
    pending.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const body = new FormData(); body.append('photo', photo)
      await request('student/photo.php', { method: 'POST', body })
      const { profile: saved } = await request<{ profile: StudentProfile }>('student/profile.php')
      if (!isCurrent()) return
      if (!saved.has_photo || Number(saved.profile_photo_bytes) !== photo.size) throw new Error('Your saved photo could not be confirmed. Please try again.')
      setProfile(saved); setPhoto(null); setPhotoNote(''); notify(); setMessage(saved.completion.complete ? 'Your student workspace is ready.' : 'Photo saved. Finish the remaining profile details to continue.')
    } catch (failure) { if (isCurrent()) setError(failure instanceof Error ? failure.message : 'Your photo could not be saved. Please try again.') }
    finally { pending.current = false; if (isCurrent()) setBusy(false) }
  }
  if (!profile) return <section className="ac-profile ac-load" role="status">{error ? <><p role="alert">{error}</p><button onClick={() => { setError(''); setRetry(value => value + 1) }}>Retry</button></> : <><LoaderCircle size={20} className="animate-spin"/>Loading your profile…</>}</section>
  const c = profile.completion, group = profileSteps[step], Icon = icons[step]
  const selectedHistory = form.previous_css_vista_student && form.previous_css_vista_student !== 'No'
  return <section ref={root} className="ac-profile">
    <header className="ac-profile-header"><div><p className="ac-eyebrow">YOUR PRIVATE STUDENT PROFILE</p><h2>{c.complete ? 'Your profile, your learning space' : 'A few details. Then you’re ready.'}</h2><p>{c.complete ? 'Keep your details up to date, whenever you need to.' : 'Four short steps. Each section saves to your account, so you can come back and continue.'}</p></div><div className="ac-saved-progress"><strong>{c.percent}%</strong><span>{c.completed} of {c.total} required details saved</span><div role="progressbar" aria-label="Saved profile completion" aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={c.completed}><i style={{ width: `${c.percent}%` }}/></div></div></header>
    <div className="ac-profile-layout"><aside className="ac-profile-rail"><nav aria-label="Profile sections">{profileSteps.map((item, index) => {
      const StepIcon = icons[index], complete = item.checks.every(key => c.checks.find(check => check.key === key)?.complete)
      return <button key={item.title} type="button" disabled={busy} aria-current={step === index ? 'step' : undefined} onClick={() => move(index)}><span>{complete ? <Check size={17}/> : <StepIcon size={17}/>}</span><span><small>Step {index + 1}</small>{item.title}</span></button>
    })}</nav><details><summary>Profile requirements</summary>{c.checks.map(check => <button key={check.key} type="button" disabled={busy} onClick={() => move(profileFieldStep(check.key), check.key)}><CircleCheck size={14}/>{check.label}<small>{check.complete ? 'Saved' : 'Needed'}</small></button>)}</details><p>Your details and photo are private to you and authorised administration.</p></aside>
    <div className="ac-profile-body"><div className="ac-step-title"><span><Icon size={23}/></span><div><p className="ac-eyebrow">STEP {step + 1} OF 4</p><h3 id="profile-step-heading" tabIndex={-1}>{group.title}</h3></div></div><p className="ac-step-description">{group.description}</p>
      {error && <p role="alert" className="ac-error">{error}</p>}{Object.keys(issues).length > 0 && <p role="alert" className="ac-error">Please check the highlighted details.</p>}{message && <p role="status" className="ac-success">{message}</p>}
      {step < 3 ? <form noValidate onSubmit={event => void save(event)}><fieldset disabled={busy} className="ac-fields">{step === 0 && <p className="ac-account-email ac-wide">Account email <strong>{email}</strong></p>}{group.fields.map(field => {
        if (['previous_css_vista_services', 'previous_css_vista_details'].includes(field.key) && !selectedHistory) return null
        if (field.key === 'optional_subjects') return <ProfileSubjects key={field.key} value={form.optional_subjects || ''} onChange={value => change(field.key, value)} error={issues[field.key]}/>
        const id = `profile-${field.key}`, hint = `profile-hint-${field.key}`, errorId = `profile-error-${field.key}`
        const described = [field.hint ? hint : '', issues[field.key] ? errorId : ''].filter(Boolean).join(' ') || undefined
        if (field.multiOptions) return <fieldset tabIndex={-1} id={id} key={field.key} className="ac-services ac-wide" aria-describedby={described}><legend>{field.label}</legend><div>{field.multiOptions.map(option => <label key={option}><input type="checkbox" checked={profileValues(form[field.key] || '').includes(option)} onChange={event => { const selected = profileValues(form[field.key] || ''); change(field.key, JSON.stringify(event.target.checked ? [...selected, option] : selected.filter(value => value !== option))) }}/>{option}</label>)}</div>{[...new Set(profileValues(form[field.key] || ''))].filter(value => !field.multiOptions?.includes(value)).map(value => <div className="ac-subject-chips" key={value}><button type="button" aria-label={`Remove unrecognized service ${value}`} onClick={() => change(field.key, JSON.stringify(profileValues(form[field.key] || '').filter(item => item !== value)))}><span dir="auto">{value}</span><X size={13}/></button></div>)}<p id={hint} className="ac-hint">{field.hint}</p>{issues[field.key] && <p id={errorId} className="ac-field-error">{issues[field.key]}</p>}</fieldset>
        const common = { id, name: field.key, value: form[field.key] || '', 'aria-invalid': !!issues[field.key], 'aria-describedby': described, onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => change(field.key, event.target.value) }
        return <div key={field.key} className={`ac-field ${field.textarea || field.options || field.optional ? 'ac-wide' : ''}`}><label htmlFor={id}>{field.label}{field.optional ? <small>Optional</small> : <span aria-hidden="true"> *</span>}</label>{field.options ? <select {...common}><option value="">Choose…</option>{form[field.key] && !field.options.includes(form[field.key]) && <option>{form[field.key]}</option>}{field.options.map(value => <option key={value}>{value}</option>)}</select> : field.textarea ? <textarea {...common} maxLength={field.max} rows={3}/> : <input {...common} type={field.type || 'text'} autoComplete={field.autoComplete} maxLength={field.max} inputMode={field.type === 'tel' ? 'tel' : field.type === 'number' ? 'numeric' : undefined} min={field.type === 'number' ? 2020 : undefined} max={field.type === 'number' ? 2040 : field.type === 'date' ? new Date().toISOString().slice(0, 10) : undefined}/>} {field.hint && <p id={hint} className="ac-hint">{field.hint}</p>}{issues[field.key] && <p id={errorId} className="ac-field-error">{issues[field.key]}</p>}</div>
      })}</fieldset><div className="ac-form-actions">{step > 0 && <button type="button" disabled={busy} className="ac-back" onClick={() => move(step - 1)}><ArrowLeft size={16}/>Back</button>}<button className="ac-primary" disabled={busy}>{busy ? <><LoaderCircle size={17} className="animate-spin"/>Saving…</> : c.complete ? 'Save changes' : <>Save & continue<ArrowRight size={17}/></>}</button><span>{dirty ? 'Changes are not saved yet' : 'Saved details stay with your account'}</span></div></form> : <div className="ac-photo-step"><p>Choose a JPG, PNG or WebP photo. Larger photos are resized on your device to the existing 60 KB upload limit.</p><div className="ac-photo-picker"><div className="ac-photo-preview">{preview ? <img src={preview} alt="Your profile photo preview"/> : profile.has_photo ? <WorkspaceAvatar user={user}/> : <UserRound size={44}/>}</div><div><label className="ac-choose-photo"><Camera size={18}/>Choose photo<input id="profile-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = '' }}/></label><p className="ac-hint">Up to 20 MB to prepare · saved file at most 60 KB</p></div></div>{photoNote && <p role="status" className="ac-photo-note">{photoNote}</p>}{busy && <p role="status" className="ac-hint">Preparing or saving your photo…</p>}<div className="ac-form-actions"><button type="button" className="ac-back" disabled={busy} onClick={() => move(2)}><ArrowLeft size={16}/>Back</button>{photo && <button type="button" className="ac-primary" disabled={busy} onClick={() => void upload()}>{busy ? 'Saving…' : 'Save photo'}<ArrowRight size={17}/></button>}</div>{error && <Link className="ac-text-link" to="/photo-compressor" target="_blank" rel="noopener noreferrer">Open the separate photo size reducer</Link>}</div>}
      {c.complete && <Link to="/account/dashboard" className="ac-text-link ac-dashboard-link">Open my dashboard<ArrowRight size={16}/></Link>}
    </div></div>
  </section>
}
