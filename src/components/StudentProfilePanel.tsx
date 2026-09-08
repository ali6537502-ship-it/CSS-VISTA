import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import {
  Camera, CheckCircle2, LoaderCircle, Save, Upload, UserRound,
} from 'lucide-react'

const MAX_PHOTO_BYTES = 25 * 1024
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type StudentProfile = {
  email?: string | null
  display_name?: string | null
  phone?: string | null
  whatsapp?: string | null
  date_of_birth?: string | null
  gender?: string | null
  city?: string | null
  province_region?: string | null
  country?: string | null
  css_attempt_year?: number | string | null
  preparation_level?: string | null
  optional_subjects?: string[] | string | null
  education?: string | null
  previous_academy_mentor?: string | null
  profile_completed_at?: string | null
  profile_photo_updated_at?: string | null
  profile_photo_bytes?: number | string | null
  has_photo?: boolean
}

type ProfileForm = {
  display_name: string
  phone: string
  whatsapp: string
  date_of_birth: string
  gender: string
  city: string
  province_region: string
  country: string
  css_attempt_year: string
  preparation_level: string
  optional_subjects: string
  education: string
  previous_academy_mentor: string
}

type ApiFailure = { error?: string; message?: string }

const emptyForm: ProfileForm = {
  display_name: '',
  phone: '',
  whatsapp: '',
  date_of_birth: '',
  gender: '',
  city: '',
  province_region: '',
  country: 'Pakistan',
  css_attempt_year: '',
  preparation_level: '',
  optional_subjects: '',
  education: '',
  previous_academy_mentor: '',
}

function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)cssv_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & ApiFailure
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Profile request failed.')
  }
  return data
}

async function loadProfile(): Promise<StudentProfile> {
  const response = await fetch('/api/student/profile.php', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const data = await parseResponse<{ profile: StudentProfile }>(response)
  return data.profile
}

async function saveProfile(form: ProfileForm) {
  const token = csrfToken()
  const response = await fetch('/api/student/profile.php', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'X-CSRF-Token': token } : {}),
    },
    body: JSON.stringify({
      display_name: form.display_name.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      date_of_birth: form.date_of_birth || null,
      gender: form.gender.trim(),
      city: form.city.trim(),
      province_region: form.province_region.trim(),
      country: form.country.trim() || 'Pakistan',
      css_attempt_year: form.css_attempt_year ? Number(form.css_attempt_year) : null,
      preparation_level: form.preparation_level.trim(),
      optional_subjects: form.optional_subjects
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      education: form.education.trim(),
      previous_academy_mentor: form.previous_academy_mentor.trim(),
    }),
  })
  return parseResponse<{ ok: boolean; message?: string }>(response)
}

async function uploadPhoto(file: File) {
  const token = csrfToken()
  const body = new FormData()
  body.append('photo', file)
  const response = await fetch('/api/student/photo.php', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(token ? { 'X-CSRF-Token': token } : {}),
    },
    body,
  })
  return parseResponse<{ ok: boolean; photo: { bytes: number; width: number; height: number; mime: string } }>(response)
}

function optionalSubjectsText(value: StudentProfile['optional_subjects']) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(', ')
  if (typeof value !== 'string' || value.trim() === '') return ''
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string').join(', ')
  } catch {
    // Older imported records may contain a plain comma-separated string.
  }
  return value
}

function formFromProfile(profile: StudentProfile): ProfileForm {
  return {
    display_name: profile.display_name ?? '',
    phone: profile.phone ?? '',
    whatsapp: profile.whatsapp ?? '',
    date_of_birth: profile.date_of_birth?.slice(0, 10) ?? '',
    gender: profile.gender ?? '',
    city: profile.city ?? '',
    province_region: profile.province_region ?? '',
    country: profile.country || 'Pakistan',
    css_attempt_year: profile.css_attempt_year ? String(profile.css_attempt_year) : '',
    preparation_level: profile.preparation_level ?? '',
    optional_subjects: optionalSubjectsText(profile.optional_subjects),
    education: profile.education ?? '',
    previous_academy_mentor: profile.previous_academy_mentor ?? '',
  }
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

export function StudentProfilePanel({ email }: { email: string }) {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [form, setForm] = useState<ProfileForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoVersion, setPhotoVersion] = useState(() => Date.now())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [photoSuccess, setPhotoSuccess] = useState('')

  useEffect(() => {
    let active = true
    async function hydrate() {
      setLoading(true)
      setError('')
      let lastError: unknown = null
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const nextProfile = await loadProfile()
          if (!active) return
          setProfile(nextProfile)
          setForm(formFromProfile(nextProfile))
          setLoading(false)
          return
        } catch (nextError) {
          lastError = nextError
          if (attempt === 0) await sleep(600)
        }
      }
      if (!active) return
      setLoading(false)
      setError(lastError instanceof Error ? lastError.message : 'Your profile could not be loaded.')
    }
    void hydrate()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  function setField<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submitProfile(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const result = await saveProfile(form)
      setProfile((current) => current ? {
        ...current,
        ...form,
        css_attempt_year: form.css_attempt_year ? Number(form.css_attempt_year) : null,
        optional_subjects: form.optional_subjects.split(',').map((item) => item.trim()).filter(Boolean),
        profile_completed_at: current.has_photo ? current.profile_completed_at || new Date().toISOString() : current.profile_completed_at,
      } : current)
      setSuccess(result.message || 'Profile saved successfully.')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Your profile could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setPhotoError('')
    setPhotoSuccess('')
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview('')
    setSelectedPhoto(null)
    if (!file) return
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      setPhotoError('Use a JPG, PNG or WebP photo.')
      event.target.value = ''
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(`Photo is ${(file.size / 1024).toFixed(1)} KB. Please reduce it to 25 KB or less.`)
      event.target.value = ''
      return
    }
    if (file.size < 512) {
      setPhotoError('This file is too small to be a valid profile photo.')
      event.target.value = ''
      return
    }
    setSelectedPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function submitPhoto() {
    if (!selectedPhoto) return
    setUploading(true)
    setPhotoError('')
    setPhotoSuccess('')
    try {
      const result = await uploadPhoto(selectedPhoto)
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      setPhotoPreview('')
      setSelectedPhoto(null)
      setPhotoVersion(Date.now())
      setProfile((current) => current ? {
        ...current,
        has_photo: true,
        profile_photo_bytes: result.photo.bytes,
        profile_photo_updated_at: new Date().toISOString(),
        profile_completed_at: form.display_name.trim() ? current.profile_completed_at || new Date().toISOString() : current.profile_completed_at,
      } : current)
      setPhotoSuccess('Profile photo uploaded successfully.')
    } catch (nextError) {
      setPhotoError(nextError instanceof Error ? nextError.message : 'Your photo could not be uploaded.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <section className="vista-card flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <LoaderCircle className="h-5 w-5 animate-spin" /> Loading your student profile…
      </section>
    )
  }

  const currentPhoto = profile?.has_photo ? `/api/student/photo-view.php?v=${photoVersion}` : ''
  const complete = Boolean(profile?.profile_completed_at)

  return (
    <section className="vista-card overflow-hidden">
      <div className="border-b bg-emerald-50/60 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Student profile</p>
            <h2 className="mt-1 text-xl font-bold text-pine">Complete your information</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Keep your CSS profile and contact details updated. These details are private and available to you and authorised CSS Vista administration only.
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {complete && <CheckCircle2 className="h-3.5 w-3.5" />}
            {complete ? 'Profile complete' : 'Profile incomplete'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <div className="flex flex-col items-center rounded-xl border bg-white p-5 text-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-emerald-50 bg-secondary">
              {photoPreview || currentPhoto ? (
                <img
                  src={photoPreview || currentPhoto}
                  alt="Student profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <h3 className="mt-4 font-bold text-pine">Profile photo</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              JPG, PNG or WebP. Maximum 25 KB.
            </p>
            <label className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-semibold text-pine hover:bg-secondary">
              <Camera className="h-4 w-4" /> Choose photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={choosePhoto}
                className="sr-only"
              />
            </label>
            {selectedPhoto && (
              <p className="mt-2 max-w-full truncate text-xs text-muted-foreground">
                {selectedPhoto.name} · {(selectedPhoto.size / 1024).toFixed(1)} KB
              </p>
            )}
            <button
              type="button"
              onClick={() => void submitPhoto()}
              disabled={!selectedPhoto || uploading}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Uploading…' : 'Upload photo'}
            </button>
            {photoError && <p className="mt-3 text-xs font-medium leading-relaxed text-red-700">{photoError}</p>}
            {photoSuccess && <p className="mt-3 text-xs font-medium leading-relaxed text-emerald-700">{photoSuccess}</p>}
            <Link to="/photo-compressor" className="mt-3 text-xs font-semibold text-emerald-800 underline-offset-4 hover:underline">
              Photo larger than 25 KB? Reduce it here
            </Link>
          </div>
        </aside>

        <form onSubmit={submitProfile} className="space-y-5">
          {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {success && <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Full name <span className="text-red-600">*</span>
              <input
                value={form.display_name}
                onChange={(event) => setField('display_name', event.target.value)}
                required
                maxLength={180}
                autoComplete="name"
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Your full name"
              />
            </label>
            <label className="block text-sm font-medium">
              Email address
              <input
                value={profile?.email || email}
                readOnly
                className="mt-1.5 h-11 w-full rounded-md border bg-secondary/60 px-3 text-muted-foreground outline-none"
              />
            </label>
            <label className="block text-sm font-medium">
              Phone number
              <input
                value={form.phone}
                onChange={(event) => setField('phone', event.target.value)}
                maxLength={40}
                inputMode="tel"
                autoComplete="tel"
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. 03xx xxxxxxx"
              />
            </label>
            <label className="block text-sm font-medium">
              WhatsApp number
              <input
                value={form.whatsapp}
                onChange={(event) => setField('whatsapp', event.target.value)}
                maxLength={40}
                inputMode="tel"
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="WhatsApp contact"
              />
            </label>
            <label className="block text-sm font-medium">
              Date of birth
              <input
                type="date"
                value={form.date_of_birth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setField('date_of_birth', event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block text-sm font-medium">
              Gender
              <select
                value={form.gender}
                onChange={(event) => setField('gender', event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              City / origin
              <input
                value={form.city}
                onChange={(event) => setField('city', event.target.value)}
                maxLength={120}
                autoComplete="address-level2"
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="City"
              />
            </label>
            <label className="block text-sm font-medium">
              Province / region
              <input
                value={form.province_region}
                onChange={(event) => setField('province_region', event.target.value)}
                maxLength={120}
                autoComplete="address-level1"
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Province or region"
              />
            </label>
            <label className="block text-sm font-medium">
              Country
              <input
                value={form.country}
                onChange={(event) => setField('country', event.target.value)}
                maxLength={120}
                autoComplete="country-name"
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block text-sm font-medium">
              CSS attempt year
              <input
                type="number"
                min={2020}
                max={2040}
                value={form.css_attempt_year}
                onChange={(event) => setField('css_attempt_year', event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. 2027"
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Preparation level
              <input
                value={form.preparation_level}
                onChange={(event) => setField('preparation_level', event.target.value)}
                maxLength={120}
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Beginner, syllabus covered, revision phase"
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Optional subjects
              <input
                value={form.optional_subjects}
                onChange={(event) => setField('optional_subjects', event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Political Science, European History, Environmental Science"
              />
              <span className="mt-1 block text-xs text-muted-foreground">Separate subjects with commas.</span>
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Education / qualification
              <input
                value={form.education}
                onChange={(event) => setField('education', event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Degree, university or current qualification"
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Previous academy / mentor
              <input
                value={form.previous_academy_mentor}
                onChange={(event) => setField('previous_academy_mentor', event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t pt-5">
            <button
              type="submit"
              disabled={saving || !form.display_name.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-pine px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            <p className="text-xs text-muted-foreground">You can update these details at any time.</p>
          </div>
        </form>
      </div>
    </section>
  )
}
