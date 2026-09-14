import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Circle, LoaderCircle, Save, UserRound } from 'lucide-react'
import { hostingerRequest, PROFILE_UPDATED_EVENT } from '@/lib/hostingerApi'
import { useAccount } from '@/lib/accountContext'

type Check = { key: string; label: string; complete: boolean }
type Completion = { checks: Check[]; completed: number; total: number; percent: number; complete: boolean }
type Profile = Record<string, unknown> & { completion: Completion; has_photo: boolean; email: string }
type Field = { key: string; label: string; type?: string; max?: number; options?: string[]; multiOptions?: string[]; hint?: string; textarea?: boolean }

const MAX_PROFILE_PHOTO_BYTES = 60 * 1024
const OVERSIZE_PHOTO_ERROR = 'Profile photo must be 60 KB or smaller. Please resize the photo and upload it again.'

const groups: { title: string; fields: Field[] }[] = [
  {
    title: 'About you',
    fields: [
      { key: 'display_name', label: 'Full name', max: 180 },
      { key: 'date_of_birth', label: 'Date of birth', type: 'date' },
      { key: 'gender', label: 'Gender', options: ['Male', 'Female', 'Other'] },
      { key: 'phone', label: 'Contact number', type: 'tel', max: 40, hint: 'Add a phone number or WhatsApp number.' },
      { key: 'whatsapp', label: 'WhatsApp number', type: 'tel', max: 40 },
      { key: 'city', label: 'City', max: 120 },
      { key: 'province_region', label: 'Province / region', max: 120 },
      { key: 'country', label: 'Country', max: 120 },
    ],
  },
  {
    title: 'Your studies',
    fields: [
      { key: 'css_attempt_year', label: 'Attempt year', type: 'number' },
      { key: 'preparation_level', label: 'Preparation level', options: ['Starting out', 'Building foundations', 'Covering the syllabus', 'Revision and practice', 'Ready for the examination'] },
      { key: 'optional_subjects', label: 'Optional subjects', max: 2400, hint: 'Separate subject names with commas.' },
      { key: 'education', label: 'Education', max: 240, hint: 'Your current or completed qualification.' },
      {
        key: 'previous_css_vista_student',
        label: 'Have you previously studied with Miss Sadia Zahoor or Sir Ali Hassan Sargana?',
        options: ['No', 'Miss Sadia Zahoor', 'Sir Ali Hassan Sargana', 'Both'],
        hint: 'This answer is required so your previous CSS Vista learning history can be identified correctly.',
      },
      {
        key: 'previous_css_vista_services',
        label: 'What did you previously join or purchase?',
        multiOptions: ['Batch', 'Test Series', 'Purchased Notes'],
        hint: 'Select every option that applies to you.',
      },
      {
        key: 'previous_css_vista_details',
        label: 'Previous study details (optional)',
        max: 500,
        textarea: true,
        hint: 'You may mention the batch name/year, test series or notes if you remember the details.',
      },
      { key: 'previous_academy_mentor', label: 'Other previous academy / mentor (optional)', max: 240 },
    ],
  },
  { title: 'Your photo', fields: [] },
]

const inputClass = 'mt-2 min-h-11 w-full min-w-0 rounded-lg border border-pine/20 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-700'

function asForm(p: Profile): Record<string, string> {
  return Object.fromEntries(groups.flatMap(g => g.fields).map(f => {
    let value = p[f.key]
    if ((f.key === 'optional_subjects' || f.key === 'previous_css_vista_services') && typeof value === 'string') {
      try {
        value = JSON.parse(value)
      } catch {
        /* Preserve imported plain text. */
      }
    }
    return [f.key, Array.isArray(value) ? value.join(', ') : String(value ?? '')]
  }))
}

function values(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function preparePhoto(file: File): File {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPG, PNG or WebP photo.')
  }
  if (file.size < 512) {
    throw new Error('Choose a valid photo file.')
  }
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error(OVERSIZE_PHOTO_ERROR)
  }
  return file
}

export function StudentProfilePanel({ email }: { email: string }) {
  const { user } = useAccount()
  const request = useCallback(<T,>(path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers)
    headers.set('X-CSSV-User', user?.id || '')
    return hostingerRequest<T>(path, { ...init, headers })
  }, [user?.id])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [version, setVersion] = useState(0)
  const photoJob = useRef(0)
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    let active = true
    const jobs = photoJob
    request<{ profile: Profile }>('student/profile.php')
      .then(({ profile: p }) => {
        if (active) {
          setProfile(p)
          setForm(asForm(p))
          setError('')
        }
      })
      .catch(() => {
        if (active) setError('Your profile could not be loaded. Please retry.')
      })
    return () => {
      active = false
      ++jobs.current
    }
  }, [request, retry])

  useEffect(() => {
    if (!photo) return
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const dirty = useMemo(() => profile && JSON.stringify(form) !== JSON.stringify(asForm(profile)), [form, profile])
  const showPhotoCompressor = step === 2 && (error === OVERSIZE_PHOTO_ERROR || error.includes('60 KB'))

  function notify() {
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT))
  }

  function toggleMulti(key: string, option: string, checked: boolean) {
    setForm(current => {
      const selected = values(current[key] || '')
      const next = checked
        ? [...selected.filter(item => item !== option), option]
        : selected.filter(item => item !== option)
      return { ...current, [key]: next.join(', ') }
    })
  }

  async function save(event: FormEvent, advance = false) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await request('student/profile.php', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          date_of_birth: form.date_of_birth || null,
          css_attempt_year: form.css_attempt_year ? Number(form.css_attempt_year) : null,
          optional_subjects: values(form.optional_subjects || ''),
          previous_css_vista_services: values(form.previous_css_vista_services || ''),
        }),
      })
      const { profile: p } = await request<{ profile: Profile }>('student/profile.php')
      setProfile(p)
      setForm(asForm(p))
      setMessage(p.completion.complete ? 'All 12 checks complete. Your account services are unlocked.' : `Saved. ${p.completion.completed} of 12 checks complete.`)
      notify()
      if (advance) setStep(s => Math.min(2, s + 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your profile could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  async function choosePhoto(file?: File) {
    if (!file) return
    const job = ++photoJob.current
    setBusy(true)
    setError('')
    setMessage('')
    setPhoto(null)
    setPreview('')
    try {
      const next = preparePhoto(file)
      if (job === photoJob.current) setPhoto(next)
    } catch (e) {
      if (job === photoJob.current) {
        setError(e instanceof Error ? e.message : 'The photo could not be checked.')
      }
    } finally {
      if (job === photoJob.current) setBusy(false)
    }
  }

  async function upload() {
    if (!photo) return
    if (photo.size > MAX_PROFILE_PHOTO_BYTES) {
      setPhoto(null)
      setPreview('')
      setError(OVERSIZE_PHOTO_ERROR)
      return
    }

    setBusy(true)
    setError('')
    setMessage('')
    try {
      const body = new FormData()
      body.append('photo', photo)
      await request('student/photo.php', { method: 'POST', body })
      const { profile: p } = await request<{ profile: Profile }>('student/profile.php')
      setProfile(p)
      setPhoto(null)
      setPreview('')
      setVersion(v => v + 1)
      notify()
      setMessage(p.completion.complete ? 'Profile complete. Your account services are unlocked.' : 'Photo saved. Complete the remaining checks to unlock your account.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your photo could not be uploaded.')
    } finally {
      setBusy(false)
    }
  }

  function jump(key: string) {
    const next = key === 'photo' ? 2 : key === 'contact' ? 0 : groups.findIndex(g => g.fields.some(f => f.key === key))
    setStep(Math.max(0, next))
    requestAnimationFrame(() => root.current?.querySelector<HTMLInputElement>(`[name="${key === 'contact' ? 'phone' : key}"]`)?.focus())
  }

  if (!profile) {
    return (
      <section className="vista-card p-6" role="status">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className={inputClass} onClick={() => setRetry(v => v + 1)}>Retry</button>
          </>
        ) : (
          <span className="flex items-center gap-2"><LoaderCircle className="h-5 w-5 animate-spin" />Loading your profile…</span>
        )}
      </section>
    )
  }

  const c = profile.completion
  const photoUrl = preview || (profile.has_photo ? `/api/student/photo-view.php?v=${version}` : '')

  return (
    <section ref={root} className="overflow-hidden rounded-2xl border border-pine/15 bg-white/70 shadow-lg shadow-pine/5 backdrop-blur-sm">
      <header className="border-b border-pine/10 bg-emerald-50/60 p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Your private study profile</p>
        <h2 className="mt-2 text-2xl font-bold text-pine">{c.complete ? 'Your profile, your learning space' : 'Complete your profile to get started'}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">All 12 checks are required to unlock current affairs and your account services. Your details and photo are private and visible to you and authorised administration.</p>
        <div className="mt-5 flex items-center justify-between text-sm font-semibold"><span>{c.completed} of 12 checks complete</span><span>{c.percent}%</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100" role="progressbar" aria-valuemin={0} aria-valuemax={12} aria-valuenow={c.completed} aria-label="Saved profile completion">
          <div className="h-full bg-emerald-700 transition-[width] motion-reduce:transition-none" style={{ width: `${c.percent}%` }} />
        </div>
      </header>

      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-pine/10 p-4 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">SAVED PROFILE CHECKLIST</p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {c.checks.map(check => (
              <button key={check.key} type="button" onClick={() => jump(check.key)} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-left text-xs hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-pine">
                {check.complete ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span>{check.label}<span className="sr-only">: {check.complete ? 'complete' : 'needed'}</span></span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-6">
          <nav className="mb-6 grid grid-cols-3 gap-1 rounded-xl bg-pine/5 p-1" aria-label="Profile sections">
            {groups.map((g, i) => (
              <button key={g.title} type="button" aria-pressed={step === i} onClick={() => setStep(i)} className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${step === i ? 'bg-white text-pine shadow-sm' : 'text-muted-foreground'}`}>
                {i + 1}. {g.title}
              </button>
            ))}
          </nav>

          <div aria-live="polite">
            {error && (
              <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                <p>{error}</p>
                {showPhotoCompressor && (
                  <Link to="/photo-compressor" className="mt-2 inline-flex min-h-10 items-center rounded-lg border border-red-200 bg-white px-3 font-semibold text-pine hover:bg-red-50">
                    Resize photo to 60 KB
                  </Link>
                )}
              </div>
            )}
            {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
          </div>

          {step < 2 ? (
            <form onSubmit={e => void save(e)}>
              <h3 className="text-lg font-bold text-pine">{groups[step].title}</h3>
              {step === 0 && <p className="mt-2 break-all text-sm text-muted-foreground">Verified email: {email}</p>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {groups[step].fields.map(f => {
                  const priorStudent = form.previous_css_vista_student || ''
                  const priorDetailField = f.key === 'previous_css_vista_services' || f.key === 'previous_css_vista_details'
                  if (priorDetailField && (!priorStudent || priorStudent === 'No')) return null

                  if (f.multiOptions) {
                    return (
                      <fieldset key={f.key} className="min-w-0 sm:col-span-2">
                        <legend className="text-sm font-medium">{f.label}</legend>
                        <div className="mt-2 grid gap-2 rounded-lg border border-pine/15 bg-white/70 p-3 sm:grid-cols-3">
                          {f.multiOptions.map(option => (
                            <label key={option} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-normal hover:bg-emerald-50">
                              <input
                                type="checkbox"
                                name={`${f.key}-${option}`}
                                checked={values(form[f.key] || '').includes(option)}
                                onChange={e => toggleMulti(f.key, option, e.target.checked)}
                                className="h-4 w-4 rounded border-pine/30"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                        {f.hint && <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{f.hint}</span>}
                      </fieldset>
                    )
                  }

                  return (
                    <label key={f.key} className={`min-w-0 text-sm font-medium ${f.textarea ? 'sm:col-span-2' : ''}`}>
                      {f.label}
                      {f.options ? (
                        <select
                          name={f.key}
                          className={inputClass}
                          value={form[f.key] || ''}
                          onChange={e => {
                            const next = e.target.value
                            setForm(current => f.key === 'previous_css_vista_student' && (next === 'No' || next === '')
                              ? { ...current, [f.key]: next, previous_css_vista_services: '', previous_css_vista_details: '' }
                              : { ...current, [f.key]: next })
                          }}
                        >
                          <option value="">Choose…</option>
                          {form[f.key] && !f.options.includes(form[f.key]) && <option>{form[f.key]}</option>}
                          {f.options.map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : f.textarea ? (
                        <textarea
                          name={f.key}
                          className={`${inputClass} min-h-24 resize-y`}
                          maxLength={f.max}
                          value={form[f.key] || ''}
                          onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          name={f.key}
                          className={inputClass}
                          type={f.type || 'text'}
                          maxLength={f.max}
                          min={f.type === 'number' ? 2020 : undefined}
                          max={f.type === 'number' ? 2040 : f.type === 'date' ? new Date().toISOString().slice(0, 10) : undefined}
                          autoComplete={f.key === 'display_name' ? 'name' : f.type === 'tel' ? 'tel' : undefined}
                          value={form[f.key] || ''}
                          onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                        />
                      )}
                      {f.hint && <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{f.hint}</span>}
                    </label>
                  )
                })}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-4">
                <button disabled={busy || !dirty} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold disabled:opacity-50">
                  <Save size={16} />{busy ? 'Saving…' : 'Save details'}
                </button>
                <button type="button" disabled={busy} onClick={e => void save(e, true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-pine px-4 text-sm font-semibold text-white disabled:opacity-50">
                  Save & continue <ArrowRight size={16} />
                </button>
                {dirty && <span className="text-xs text-amber-800">Unsaved changes</span>}
              </div>
            </form>
          ) : (
            <div>
              <h3 className="text-lg font-bold text-pine">Add your profile photo</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a clear JPG, PNG or WebP photo that is 60 KB or smaller. Photos above 60 KB are not accepted.</p>
              <Link to="/photo-compressor" className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-pine hover:bg-emerald-100">
                Photo larger than 60 KB? Resize it here
              </Link>
              <div className="mt-5 flex flex-wrap items-center gap-5">
                <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-emerald-50">
                  {photoUrl ? <img src={photoUrl} alt="Your profile photo preview" className="h-full w-full object-cover" /> : <UserRound size={48} className="text-emerald-700" />}
                </div>
                <div className="min-w-0">
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-semibold focus-within:ring-2 focus-within:ring-pine">
                    <Camera size={17} />Choose photo
                    <input className="sr-only" name="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { void choosePhoto(e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">JPG, PNG or WebP · maximum file size 60 KB</p>
                </div>
              </div>
              {photo && (
                <button onClick={() => void upload()} disabled={busy} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-pine px-5 text-sm font-semibold text-white disabled:opacity-50">
                  <Save size={16} />Save photo
                </button>
              )}
              {busy && <p role="status" className="mt-3 flex gap-2 text-sm"><LoaderCircle size={17} className="animate-spin" />Checking or saving your photo…</p>}
              <button onClick={() => setStep(1)} className="mt-6 flex min-h-11 items-center gap-2 text-sm font-semibold text-pine"><ArrowLeft size={16} />Back to study details</button>
            </div>
          )}

          {c.complete && <Link to="/account/dashboard" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white">Open my dashboard <ArrowRight size={16} /></Link>}
        </div>
      </div>
    </section>
  )
}
