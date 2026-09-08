import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  CheckCircle2, Download, ExternalLink, Image as ImageIcon, ImageOff, LogOut,
  RefreshCw, Search, Settings2, UserRound, Users,
} from 'lucide-react'
import { Badge, PageHeader } from '@/components/shared'

const input = 'h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

type StudentDirectoryRow = {
  user_id: string
  email: string
  auth_source: string
  created_at: string
  last_sign_in_at: string | null
  last_seen_at: string | null
  display_name: string | null
  phone: string | null
  whatsapp: string | null
  date_of_birth: string | null
  age: number | null
  gender: string | null
  city: string | null
  province_region: string | null
  country: string | null
  css_attempt_year: number | null
  preparation_level: string | null
  optional_subjects: string[]
  education: string | null
  previous_academy_mentor: string | null
  profile_photo_bytes?: number | null
  profile_completed_at: string | null
  has_photo?: boolean
  registration_id: string | null
  registration_code: string | null
  registration_status: string | null
  payment_status: string | null
  submitted_at: string | null
  batch_id: string | null
  batch_title: string | null
  progress_updated_at: string | null
  activity_count: number
  quiz_attempt_count: number
}

type StudentDirectoryResponse = {
  ok: boolean
  total: number
  students: StudentDirectoryRow[]
  message?: string
}

type StudentCategory = 'all' | 'complete' | 'incomplete' | 'photo' | 'no-photo' | 'active'

function hasText(value: unknown) {
  return typeof value === 'string' ? value.trim() !== '' : value !== null && value !== undefined && value !== ''
}

function completionFor(row: StudentDirectoryRow) {
  const checks = [
    Boolean(row.has_photo),
    hasText(row.display_name),
    hasText(row.phone) || hasText(row.whatsapp),
    hasText(row.date_of_birth),
    hasText(row.gender),
    hasText(row.city),
    hasText(row.province_region),
    hasText(row.country),
    hasText(row.css_attempt_year),
    hasText(row.preparation_level),
    Array.isArray(row.optional_subjects) && row.optional_subjects.length > 0,
    hasText(row.education),
  ]
  const completed = checks.filter(Boolean).length
  return { completed, total: checks.length, percent: Math.round((completed / checks.length) * 100), complete: completed === checks.length }
}

function friendlyDate(value: string | null) {
  if (!value) return 'Not yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not yet'
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function showValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not provided'
  return String(value)
}

function escapeCsv(value: unknown) {
  return '"' + String(value ?? '').replaceAll('"', '""') + '"'
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function StudentAvatar({ row, size = 'large' }: { row: StudentDirectoryRow; size?: 'small' | 'large' }) {
  const [failed, setFailed] = useState(false)
  const classes = size === 'small' ? 'h-12 w-12' : 'h-24 w-24'
  if (!row.has_photo || failed) {
    return (
      <div className={`${classes} flex shrink-0 items-center justify-center rounded-full border bg-secondary text-muted-foreground`}>
        <UserRound className={size === 'small' ? 'h-6 w-6' : 'h-10 w-10'} />
      </div>
    )
  }
  return (
    <img
      src={`/api/admin/student-photo.php?user_id=${encodeURIComponent(row.user_id)}`}
      alt={`${row.display_name || 'Student'} profile`}
      className={`${classes} shrink-0 rounded-full border object-cover`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

async function fetchAllStudents() {
  const collected: StudentDirectoryRow[] = []
  let expected = 0
  let offset = 0
  do {
    const params = new URLSearchParams({ limit: '100', offset: String(offset) })
    const response = await fetch('/api/admin/students.php?' + params.toString(), {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    const body = await response.json().catch(() => null) as StudentDirectoryResponse | null
    if (!response.ok || !body?.ok) {
      throw new Error(body?.message || 'Could not load the protected student directory.')
    }
    expected = Number(body.total || 0)
    collected.push(...(body.students || []))
    offset = collected.length
  } while (offset < expected)
  return collected
}

export default function StudentManagementPanel({ onOpenWebsiteTools }: { onOpenWebsiteTools: () => void }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<StudentDirectoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<StudentCategory>('all')
  const [attemptYear, setAttemptYear] = useState('')
  const [preparation, setPreparation] = useState('')
  const [city, setCity] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchAllStudents())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load student records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const counts = useMemo(() => ({
    all: rows.length,
    complete: rows.filter((row) => completionFor(row).complete).length,
    incomplete: rows.filter((row) => !completionFor(row).complete).length,
    photo: rows.filter((row) => row.has_photo).length,
    noPhoto: rows.filter((row) => !row.has_photo).length,
    active: rows.filter((row) => row.last_seen_at || row.last_sign_in_at).length,
  }), [rows])

  const attemptYears = useMemo(() => [...new Set(rows.map((row) => row.css_attempt_year).filter((value): value is number => Boolean(value)))].sort((a, b) => a - b), [rows])
  const preparationLevels = useMemo(() => [...new Set(rows.map((row) => row.preparation_level?.trim()).filter((value): value is string => Boolean(value)))].sort(), [rows])
  const cities = useMemo(() => [...new Set(rows.map((row) => row.city?.trim()).filter((value): value is string => Boolean(value)))].sort(), [rows])

  const visibleRows = useMemo(() => rows.filter((row) => {
    const completion = completionFor(row)
    if (category === 'complete' && !completion.complete) return false
    if (category === 'incomplete' && completion.complete) return false
    if (category === 'photo' && !row.has_photo) return false
    if (category === 'no-photo' && row.has_photo) return false
    if (category === 'active' && !(row.last_seen_at || row.last_sign_in_at)) return false
    if (attemptYear && String(row.css_attempt_year ?? '') !== attemptYear) return false
    if (preparation && (row.preparation_level?.trim() || '') !== preparation) return false
    if (city && (row.city?.trim() || '') !== city) return false
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [row.display_name, row.email, row.phone, row.whatsapp, row.city, row.batch_title, row.preparation_level]
      .some((value) => String(value ?? '').toLowerCase().includes(needle))
  }), [rows, category, attemptYear, preparation, city, query])

  const shortcutCards: { id: StudentCategory; label: string; value: number; hint: string }[] = [
    { id: 'all', label: 'All students', value: counts.all, hint: 'Every account' },
    { id: 'complete', label: 'Profiles complete', value: counts.complete, hint: '12 essentials added' },
    { id: 'incomplete', label: 'Need profile data', value: counts.incomplete, hint: 'Follow-up list' },
    { id: 'photo', label: 'Photo uploaded', value: counts.photo, hint: 'Photo on file' },
    { id: 'no-photo', label: 'Photo missing', value: counts.noPhoto, hint: 'Needs photo' },
    { id: 'active', label: 'Signed-in students', value: counts.active, hint: 'Has login activity' },
  ]

  function resetFilters() {
    setCategory('all')
    setAttemptYear('')
    setPreparation('')
    setCity('')
    setQuery('')
  }

  function downloadCsv() {
    const headings = [
      'Name', 'Email', 'Photo', 'Profile Completion', 'Phone', 'WhatsApp', 'City', 'Province/Region', 'Country',
      'Age', 'Gender', 'Attempt Year', 'Preparation Level', 'Optional Subjects', 'Education', 'Previous Academy/Mentor',
      'Batch', 'Registration Code', 'Registration Status', 'Payment Status', 'Joined', 'Last Active', 'Activity Records',
      'Quiz Attempts', 'Progress Synced',
    ]
    const values = visibleRows.map((row) => {
      const completion = completionFor(row)
      return [
        row.display_name, row.email, row.has_photo ? 'Uploaded' : 'Missing', `${completion.percent}%`, row.phone, row.whatsapp,
        row.city, row.province_region, row.country, row.age, row.gender, row.css_attempt_year, row.preparation_level,
        row.optional_subjects?.join('; '), row.education, row.previous_academy_mentor, row.batch_title, row.registration_code,
        row.registration_status, row.payment_status, row.created_at, row.last_seen_at || row.last_sign_in_at,
        row.activity_count, row.quiz_attempt_count, row.progress_updated_at,
      ]
    })
    const csv = [headings, ...values].map((line) => line.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `student-directory-${category}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  async function downloadPhotoReport() {
    if (visibleRows.length === 0) return
    setExporting(true)
    setError('')
    try {
      const photos = new Map<string, string>()
      for (let index = 0; index < visibleRows.length; index += 8) {
        const batch = visibleRows.slice(index, index + 8)
        await Promise.all(batch.map(async (row) => {
          if (!row.has_photo) return
          try {
            const response = await fetch(`/api/admin/student-photo.php?user_id=${encodeURIComponent(row.user_id)}`, {
              credentials: 'include', cache: 'no-store',
            })
            if (!response.ok) return
            photos.set(row.user_id, await blobToDataUrl(await response.blob()))
          } catch {
            // Keep the report usable even if one old photo is missing from private storage.
          }
        }))
      }

      const cards = visibleRows.map((row) => {
        const completion = completionFor(row)
        const photo = photos.get(row.user_id)
        const avatar = photo
          ? `<img class="photo" src="${photo}" alt="Student photo">`
          : `<div class="photo placeholder">No photo</div>`
        return `<article class="student">
          <div class="identity">${avatar}<div><h2>${escapeHtml(row.display_name || 'Student')}</h2><p>${escapeHtml(row.email)}</p><span class="status">${completion.percent}% complete · ${row.has_photo ? 'Photo uploaded' : 'Photo missing'}</span></div></div>
          <table><tbody>
            <tr><th>Phone</th><td>${escapeHtml(showValue(row.phone))}</td><th>WhatsApp</th><td>${escapeHtml(showValue(row.whatsapp))}</td></tr>
            <tr><th>City</th><td>${escapeHtml(showValue(row.city))}</td><th>Province</th><td>${escapeHtml(showValue(row.province_region))}</td></tr>
            <tr><th>Gender / age</th><td>${escapeHtml(showValue(row.gender))} · ${escapeHtml(showValue(row.age))}</td><th>Attempt year</th><td>${escapeHtml(showValue(row.css_attempt_year))}</td></tr>
            <tr><th>Preparation</th><td>${escapeHtml(showValue(row.preparation_level))}</td><th>Education</th><td>${escapeHtml(showValue(row.education))}</td></tr>
            <tr><th>Optional subjects</th><td colspan="3">${escapeHtml(row.optional_subjects?.length ? row.optional_subjects.join(', ') : 'Not provided')}</td></tr>
            <tr><th>Batch</th><td>${escapeHtml(showValue(row.batch_title))}</td><th>Payment</th><td>${escapeHtml(showValue(row.payment_status))}</td></tr>
            <tr><th>Joined</th><td>${escapeHtml(friendlyDate(row.created_at))}</td><th>Last active</th><td>${escapeHtml(friendlyDate(row.last_seen_at || row.last_sign_in_at))}</td></tr>
          </tbody></table>
        </article>`
      }).join('')

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>CSS Vista Student Directory</title><style>
        body{font-family:Arial,sans-serif;margin:28px;color:#16352b;background:#fff}header{border-bottom:2px solid #1d6b4c;padding-bottom:14px;margin-bottom:20px}h1{margin:0;font-size:24px}header p{color:#5f6f68;margin:6px 0 0}.student{break-inside:avoid;border:1px solid #dbe5df;border-radius:12px;padding:16px;margin:0 0 16px}.identity{display:flex;gap:14px;align-items:center;margin-bottom:14px}.identity h2{font-size:18px;margin:0 0 4px}.identity p{margin:0;color:#617068}.photo{width:70px;height:70px;border-radius:50%;object-fit:cover;border:1px solid #dbe5df}.placeholder{display:flex;align-items:center;justify-content:center;background:#eef3f0;color:#7a8982;font-size:11px}.status{display:inline-block;margin-top:6px;padding:3px 8px;border-radius:999px;background:#e9f6ef;color:#17613f;font-size:11px;font-weight:700}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-top:1px solid #edf1ef;padding:7px 6px;text-align:left;vertical-align:top}th{width:16%;color:#64736c;font-weight:600}td{width:34%}@media print{body{margin:12mm}.student{page-break-inside:avoid}}
      </style></head><body><header><h1>CSS Vista — Student Directory</h1><p>Private owner export · ${escapeHtml(String(visibleRows.length))} students · generated ${escapeHtml(new Date().toLocaleString('en-PK'))}</p></header>${cards}</body></html>`
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `student-directory-with-photos-${category}-${new Date().toISOString().slice(0, 10)}.html`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not prepare the photo report.')
    } finally {
      setExporting(false)
    }
  }

  async function signOutOwner() {
    await fetch('/api/admin-auth/logout.php', { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } }).catch(() => null)
    navigate('/admin/login', { replace: true })
  }

  return (
    <div>
      <PageHeader title="Student Management" description="Private CSS Vista owner workspace for student profiles, photos, preparation and activity." />
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-8">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
          <span className="mr-auto inline-flex items-center gap-2 text-sm font-bold text-pine"><Users className="h-4 w-4" /> Student workspace</span>
          <button onClick={onOpenWebsiteTools} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"><Settings2 className="h-4 w-4" /> Website & content tools</button>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"><ExternalLink className="h-4 w-4" /> View site</Link>
          <button onClick={() => void signOutOwner()} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"><LogOut className="h-4 w-4" /> Log out</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {shortcutCards.map((card) => (
            <button
              key={card.id}
              onClick={() => setCategory(card.id)}
              className={`rounded-xl border p-4 text-left transition ${category === card.id ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700' : 'bg-white hover:border-emerald-300 hover:bg-emerald-50/40'}`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-pine">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </button>
          ))}
        </div>

        <section className="rounded-xl border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-pine">Categorize students</h2>
              <p className="mt-1 text-sm text-muted-foreground">Shortcuts and filters work together. Downloads include only the students currently shown.</p>
            </div>
            <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone, city or batch" className={input + ' pl-9'} />
            </label>
            <select value={attemptYear} onChange={(event) => setAttemptYear(event.target.value)} className={input} aria-label="CSS attempt year"><option value="">All attempt years</option>{attemptYears.map((year) => <option key={year} value={year}>CSS {year}</option>)}</select>
            <select value={preparation} onChange={(event) => setPreparation(event.target.value)} className={input} aria-label="Preparation level"><option value="">All preparation levels</option>{preparationLevels.map((value) => <option key={value}>{value}</option>)}</select>
            <select value={city} onChange={(event) => setCity(event.target.value)} className={input} aria-label="City"><option value="">All cities</option>{cities.map((value) => <option key={value}>{value}</option>)}</select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-pine">Showing {visibleRows.length} of {rows.length} students</p>
            <div className="flex flex-wrap gap-2">
              {(category !== 'all' || attemptYear || preparation || city || query) && <button onClick={resetFilters} className="rounded-md border px-3 py-2 text-xs font-semibold hover:bg-secondary">Clear filters</button>}
              <button onClick={downloadCsv} disabled={loading || visibleRows.length === 0} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"><Download className="h-4 w-4" /> Download CSV</button>
              <button onClick={() => void downloadPhotoReport()} disabled={loading || exporting || visibleRows.length === 0} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} {exporting ? 'Preparing photos…' : 'Download with photos'}</button>
            </div>
          </div>
        </section>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!error && loading && <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading protected student records…</div>}
        {!error && !loading && visibleRows.length === 0 && <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No students match this category and filter combination.</div>}

        {!error && !loading && visibleRows.length > 0 && (
          <div className="space-y-3">
            {visibleRows.map((row) => {
              const completion = completionFor(row)
              return (
                <details key={row.user_id} className="group rounded-xl border bg-white p-4 sm:p-5">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4">
                    <StudentAvatar row={row} size="small" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-bold text-pine">{row.display_name || 'Student'}</h3>
                        <Badge tone={completion.complete ? 'green' : 'gold'}>{completion.complete ? 'Profile complete' : `${completion.percent}% complete`}</Badge>
                        <Badge tone={row.has_photo ? 'green' : 'gray'}>{row.has_photo ? 'Photo' : 'No photo'}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{row.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{[row.phone, row.city, row.css_attempt_year ? `CSS ${row.css_attempt_year}` : '', row.preparation_level].filter(Boolean).join(' · ') || 'Profile details not yet completed'}</p>
                    </div>
                    <span className="rounded-md border px-3 py-1.5 text-xs font-semibold group-open:bg-secondary">View student</span>
                  </summary>

                  <div className="mt-5 grid gap-4 border-t pt-5 lg:grid-cols-[150px_1fr]">
                    <aside className="flex flex-col items-center rounded-lg bg-secondary/50 p-4 text-center">
                      <StudentAvatar row={row} />
                      <p className="mt-3 text-xs font-bold text-pine">{row.has_photo ? 'Profile photo on file' : 'Photo not uploaded'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{completion.completed} of {completion.total} profile essentials</p>
                      {!row.has_photo && <ImageOff className="mt-2 h-4 w-4 text-muted-foreground" />}
                    </aside>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <section className="rounded-lg bg-secondary/50 p-4"><h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800">Contact</h4><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-xs text-muted-foreground">Email</dt><dd className="break-all font-medium">{row.email}</dd></div><div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="font-medium">{showValue(row.phone)}</dd></div><div><dt className="text-xs text-muted-foreground">WhatsApp</dt><dd className="font-medium">{showValue(row.whatsapp)}</dd></div></dl></section>
                      <section className="rounded-lg bg-secondary/50 p-4"><h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800">Personal</h4><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-xs text-muted-foreground">Age / DOB</dt><dd className="font-medium">{showValue(row.age)}{row.date_of_birth ? ` · ${row.date_of_birth}` : ''}</dd></div><div><dt className="text-xs text-muted-foreground">Gender</dt><dd className="font-medium">{showValue(row.gender)}</dd></div><div><dt className="text-xs text-muted-foreground">Location</dt><dd className="font-medium">{[row.city, row.province_region, row.country].filter(Boolean).join(', ') || 'Not provided'}</dd></div></dl></section>
                      <section className="rounded-lg bg-secondary/50 p-4"><h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800">CSS preparation</h4><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-xs text-muted-foreground">Attempt</dt><dd className="font-medium">{showValue(row.css_attempt_year)}</dd></div><div><dt className="text-xs text-muted-foreground">Level</dt><dd className="font-medium">{showValue(row.preparation_level)}</dd></div><div><dt className="text-xs text-muted-foreground">Education</dt><dd className="font-medium">{showValue(row.education)}</dd></div><div><dt className="text-xs text-muted-foreground">Optional subjects</dt><dd className="font-medium">{row.optional_subjects?.length ? row.optional_subjects.join(', ') : 'Not provided'}</dd></div></dl></section>
                      <section className="rounded-lg bg-secondary/50 p-4"><h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800">Registration & activity</h4><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-xs text-muted-foreground">Batch</dt><dd className="font-medium">{showValue(row.batch_title)}</dd></div><div><dt className="text-xs text-muted-foreground">Status / payment</dt><dd className="font-medium">{showValue(row.registration_status)} · {showValue(row.payment_status)}</dd></div><div><dt className="text-xs text-muted-foreground">Joined</dt><dd className="font-medium">{friendlyDate(row.created_at)}</dd></div><div><dt className="text-xs text-muted-foreground">Last active</dt><dd className="font-medium">{friendlyDate(row.last_seen_at || row.last_sign_in_at)}</dd></div><div><dt className="text-xs text-muted-foreground">Activity / quizzes</dt><dd className="font-medium">{row.activity_count || 0} · {row.quiz_attempt_count || 0}</dd></div></dl></section>
                    </div>
                  </div>
                </details>
              )
            })}
          </div>
        )}

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="mr-2 inline h-4 w-4" /> Student photos are served only through the authenticated private owner session. Private storage paths are never exposed in the directory or exports.
        </div>
      </div>
    </div>
  )
}
