import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Download, ExternalLink, Image as ImageIcon, LogOut, RefreshCw, Search, Settings2,
  UserRound, Users,
} from 'lucide-react'
import { Badge, PageHeader } from '@/components/shared'

const input = 'h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

type StudentRow = {
  user_id: string
  email: string
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
  previous_css_vista_student: string | null
  previous_css_vista_services: string[]
  previous_css_vista_details: string | null
  profile_completed_at: string | null
  has_photo?: boolean
  batch_title: string | null
  registration_code: string | null
  registration_status: string | null
  payment_status: string | null
  progress_updated_at: string | null
  activity_count: number
  quiz_attempt_count: number
}

type DirectoryResponse = { ok: boolean; total: number; students: StudentRow[]; message?: string }
type Category = 'all' | 'complete' | 'incomplete' | 'photo' | 'no-photo' | 'active' | 'previous' | 'new'
type PreviousStatus = '' | 'yes' | 'no'

function hasText(value: unknown) {
  return typeof value === 'string' ? value.trim() !== '' : value !== null && value !== undefined && value !== ''
}

function isPreviousStudent(row: StudentRow) {
  const value = (row.previous_css_vista_student || '').trim()
  return value !== '' && value !== 'No'
}

function completion(row: StudentRow) {
  const checks = [
    Boolean(row.has_photo), hasText(row.display_name), hasText(row.phone) || hasText(row.whatsapp),
    hasText(row.date_of_birth), hasText(row.gender), hasText(row.city), hasText(row.province_region),
    hasText(row.country), hasText(row.css_attempt_year), hasText(row.preparation_level),
    Array.isArray(row.optional_subjects) && row.optional_subjects.length > 0, hasText(row.education),
  ]
  const done = checks.filter(Boolean).length
  return { done, total: checks.length, percent: Math.round((done / checks.length) * 100), complete: done === checks.length }
}

function friendlyDate(value: string | null) {
  if (!value) return 'Not yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not yet'
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function show(value: unknown) {
  return value === null || value === undefined || value === '' ? 'Not provided' : String(value)
}

function csv(value: unknown) {
  return '"' + String(value ?? '').replaceAll('"', '""') + '"'
}

function html(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function blobDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function StudentPhoto({ row, large = false }: { row: StudentRow; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  const size = large ? 'h-24 w-24' : 'h-14 w-14'
  if (!row.has_photo || failed) {
    return <div className={`${size} flex shrink-0 items-center justify-center rounded-full border bg-secondary text-muted-foreground`}><UserRound className={large ? 'h-10 w-10' : 'h-6 w-6'} /></div>
  }
  return <img src={`/api/admin/student-photo.php?user_id=${encodeURIComponent(row.user_id)}`} alt={`${row.display_name || 'Student'} profile`} className={`${size} shrink-0 rounded-full border object-cover`} loading="lazy" onError={() => setFailed(true)} />
}

async function getStudents() {
  const rows: StudentRow[] = []
  let total = 0
  let offset = 0
  do {
    const response = await fetch(`/api/admin/students.php?limit=100&offset=${offset}`, {
      credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' },
    })
    const body = await response.json().catch(() => null) as DirectoryResponse | null
    if (!response.ok || !body?.ok) throw new Error(body?.message || 'Could not load the protected student directory.')
    total = Number(body.total || 0)
    rows.push(...(body.students || []))
    offset = rows.length
  } while (offset < total)
  return rows
}

export default function StudentManagementPanelV2({ onOpenWebsiteTools }: { onOpenWebsiteTools: () => void }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [query, setQuery] = useState('')
  const [attempt, setAttempt] = useState('')
  const [city, setCity] = useState('')
  const [preparation, setPreparation] = useState('')
  const [batch, setBatch] = useState('')
  const [gender, setGender] = useState('')
  const [degree, setDegree] = useState('')
  const [previousStatus, setPreviousStatus] = useState<PreviousStatus>('')
  const [previousMentor, setPreviousMentor] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try { setRows(await getStudents()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load student records.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const counts = useMemo(() => ({
    all: rows.length,
    complete: rows.filter((row) => completion(row).complete).length,
    incomplete: rows.filter((row) => !completion(row).complete).length,
    photo: rows.filter((row) => row.has_photo).length,
    noPhoto: rows.filter((row) => !row.has_photo).length,
    active: rows.filter((row) => row.last_seen_at || row.last_sign_in_at).length,
    previous: rows.filter(isPreviousStudent).length,
    new: rows.filter((row) => (row.previous_css_vista_student || '').trim() === 'No').length,
  }), [rows])

  const choices = <T extends string | number>(values: T[]) => [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
  const attempts = useMemo(() => choices(rows.map((r) => r.css_attempt_year).filter((v): v is number => Boolean(v))), [rows])
  const cities = useMemo(() => choices(rows.map((r) => r.city?.trim()).filter((v): v is string => Boolean(v))), [rows])
  const preparations = useMemo(() => choices(rows.map((r) => r.preparation_level?.trim()).filter((v): v is string => Boolean(v))), [rows])
  const batches = useMemo(() => choices(rows.map((r) => r.batch_title?.trim()).filter((v): v is string => Boolean(v))), [rows])
  const genders = useMemo(() => choices(rows.map((r) => r.gender?.trim()).filter((v): v is string => Boolean(v))), [rows])
  const degrees = useMemo(() => choices(rows.map((r) => r.education?.trim()).filter((v): v is string => Boolean(v))), [rows])
  const previousMentors = ['Miss Sadia Zahoor', 'Sir Ali Hassan Sargana', 'Both']

  const visible = useMemo(() => rows.filter((row) => {
    const c = completion(row)
    const previous = isPreviousStudent(row)
    if (category === 'complete' && !c.complete) return false
    if (category === 'incomplete' && c.complete) return false
    if (category === 'photo' && !row.has_photo) return false
    if (category === 'no-photo' && row.has_photo) return false
    if (category === 'active' && !(row.last_seen_at || row.last_sign_in_at)) return false
    if (category === 'previous' && !previous) return false
    if (category === 'new' && (row.previous_css_vista_student || '').trim() !== 'No') return false
    if (attempt && String(row.css_attempt_year ?? '') !== attempt) return false
    if (city && (row.city?.trim() || '') !== city) return false
    if (preparation && (row.preparation_level?.trim() || '') !== preparation) return false
    if (batch && (row.batch_title?.trim() || '') !== batch) return false
    if (gender && (row.gender?.trim() || '') !== gender) return false
    if (degree && (row.education?.trim() || '') !== degree) return false
    if (previousStatus === 'yes' && !previous) return false
    if (previousStatus === 'no' && (row.previous_css_vista_student || '').trim() !== 'No') return false
    if (previousMentor && (row.previous_css_vista_student?.trim() || '') !== previousMentor) return false
    const q = query.trim().toLowerCase()
    return !q || [
      row.display_name, row.email, row.phone, row.whatsapp, row.city, row.batch_title,
      row.preparation_level, row.gender, row.education, row.previous_css_vista_student,
      row.previous_css_vista_services?.join(' '), row.previous_css_vista_details,
    ].some((value) => String(value ?? '').toLowerCase().includes(q))
  }), [rows, category, attempt, city, preparation, batch, gender, degree, previousStatus, previousMentor, query])

  const shortcuts: { id: Category; label: string; value: number; note: string }[] = [
    { id: 'all', label: 'All students', value: counts.all, note: 'Every account' },
    { id: 'previous', label: 'Previous students', value: counts.previous, note: 'Miss Sadia / Sir Ali / Both' },
    { id: 'new', label: 'New to mentors', value: counts.new, note: 'Answered No' },
    { id: 'complete', label: 'Complete profiles', value: counts.complete, note: 'All essentials complete' },
    { id: 'incomplete', label: 'Incomplete profiles', value: counts.incomplete, note: 'Needs follow-up' },
    { id: 'active', label: 'Active students', value: counts.active, note: 'Has sign-in activity' },
    { id: 'photo', label: 'With photo', value: counts.photo, note: 'Photo available' },
    { id: 'no-photo', label: 'Missing photo', value: counts.noPhoto, note: 'Photo required' },
  ]

  function reset() {
    setCategory('all')
    setQuery('')
    setAttempt('')
    setCity('')
    setPreparation('')
    setBatch('')
    setGender('')
    setDegree('')
    setPreviousStatus('')
    setPreviousMentor('')
  }

  function downloadCsv() {
    const heads = ['Name','Email','Photo','Profile Completion','Phone','WhatsApp','City','Province/Region','Country','Age','Gender','Attempt Year','Preparation Level','Optional Subjects','Education','Previous Academy/Mentor','Previous CSS Vista Student','Previous CSS Vista Services','Previous CSS Vista Details','Batch','Registration Code','Registration Status','Payment Status','Joined','Last Active','Activity Records','Quiz Attempts','Progress Synced']
    const data = visible.map((row) => [
      row.display_name,row.email,row.has_photo ? 'Yes' : 'No',`${completion(row).percent}%`,row.phone,row.whatsapp,row.city,row.province_region,row.country,row.age,row.gender,row.css_attempt_year,row.preparation_level,row.optional_subjects?.join('; '),row.education,row.previous_academy_mentor,row.previous_css_vista_student,row.previous_css_vista_services?.join('; '),row.previous_css_vista_details,row.batch_title,row.registration_code,row.registration_status,row.payment_status,row.created_at,row.last_seen_at || row.last_sign_in_at,row.activity_count,row.quiz_attempt_count,row.progress_updated_at,
    ])
    const blob = new Blob([[heads, ...data].map((line) => line.map(csv).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `student-list-${category}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  async function downloadWithPhotos() {
    if (!visible.length) return
    setExporting(true)
    setError('')
    try {
      const photos = new Map<string, string>()
      for (let index = 0; index < visible.length; index += 6) {
        await Promise.all(visible.slice(index, index + 6).map(async (row) => {
          if (!row.has_photo) return
          const response = await fetch(`/api/admin/student-photo.php?user_id=${encodeURIComponent(row.user_id)}`, { credentials: 'include', cache: 'no-store' }).catch(() => null)
          if (response?.ok) photos.set(row.user_id, await blobDataUrl(await response.blob()))
        }))
      }
      const cards = visible.map((row) => {
        const photo = photos.get(row.user_id)
        const services = row.previous_css_vista_services?.length ? row.previous_css_vista_services.join(', ') : 'None recorded'
        return `<article><div class="head">${photo ? `<img src="${photo}">` : '<div class="placeholder">No photo</div>'}<div><h2>${html(row.display_name || 'Student')}</h2><p>${html(row.email)}</p><b>${completion(row).percent}% complete</b></div></div><table><tr><th>Phone</th><td>${html(show(row.phone))}</td><th>WhatsApp</th><td>${html(show(row.whatsapp))}</td></tr><tr><th>City</th><td>${html(show(row.city))}</td><th>Gender</th><td>${html(show(row.gender))}</td></tr><tr><th>Attempt</th><td>${html(show(row.css_attempt_year))}</td><th>Preparation</th><td>${html(show(row.preparation_level))}</td></tr><tr><th>Previous student?</th><td>${isPreviousStudent(row) ? 'Yes' : row.previous_css_vista_student === 'No' ? 'No' : 'Not provided'}</td><th>Mentor</th><td>${html(show(row.previous_css_vista_student))}</td></tr><tr><th>Previous services</th><td colspan="3">${html(services)}</td></tr><tr><th>Previous study details</th><td colspan="3">${html(show(row.previous_css_vista_details))}</td></tr></table></article>`
      }).join('')
      const report = `<!doctype html><html><head><meta charset="utf-8"><title>CSS Vista Student List</title><style>body{font-family:Arial,sans-serif;margin:28px;color:#16352b}header{border-bottom:2px solid #1d6b4c;margin-bottom:18px;padding-bottom:12px}article{border:1px solid #dbe5df;border-radius:12px;padding:15px;margin-bottom:14px;break-inside:avoid}.head{display:flex;gap:14px;align-items:center}.head img,.placeholder{width:74px;height:74px;border-radius:50%;object-fit:cover;border:1px solid #dbe5df}.placeholder{display:flex;align-items:center;justify-content:center;background:#eef3f0;font-size:11px;color:#68766f}h2{margin:0 0 3px;font-size:18px}.head p{margin:0 0 5px;color:#66736d}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}th,td{border-top:1px solid #edf1ef;padding:7px;text-align:left}th{color:#66736d}@media print{body{margin:10mm}article{page-break-inside:avoid}}</style></head><body><header><h1>CSS Vista — Student Directory</h1><p>${visible.length} students · current filters · ${html(new Date().toLocaleString('en-PK'))}</p></header>${cards}</body></html>`
      const blob = new Blob([report], { type: 'text/html;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `student-list-with-photos-${new Date().toISOString().slice(0, 10)}.html`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not prepare the photo list.')
    } finally {
      setExporting(false)
    }
  }

  async function logout() {
    await fetch('/api/admin-auth/logout.php', { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } }).catch(() => null)
    navigate('/admin/login', { replace: true })
  }

  return <div>
    <PageHeader title="Student Management" description="Categorize, review and export CSS Vista students with profile photos, preparation details and previous CSS Vista history." />
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
        <span className="mr-auto inline-flex items-center gap-2 text-sm font-bold text-pine"><Users className="h-4 w-4" /> Student-based admin home</span>
        <button onClick={onOpenWebsiteTools} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"><Settings2 className="h-4 w-4" /> Website & content tools</button>
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"><ExternalLink className="h-4 w-4" /> View site</Link>
        <button onClick={() => void logout()} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"><LogOut className="h-4 w-4" /> Log out</button>
      </div>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-lg font-bold text-pine">Student categories</h2>
        <p className="mt-1 text-sm text-muted-foreground">Previous students and students new to Miss Sadia Zahoor / Sir Ali Hassan Sargana now have their own shortcuts.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((shortcut) => <button key={shortcut.id} onClick={() => setCategory(shortcut.id)} className={`rounded-xl border p-4 text-left ${category === shortcut.id ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700' : 'hover:bg-emerald-50/50'}`}><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{shortcut.label}</p><p className="mt-1 text-2xl font-bold text-pine">{shortcut.value}</p><p className="mt-1 text-xs text-muted-foreground">{shortcut.note}</p></button>)}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-bold text-pine">Filter students</h2><p className="mt-1 text-sm text-muted-foreground">Combine previous-student status, mentor, city, education, attempt, preparation and batch filters.</p></div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative md:col-span-2 xl:col-span-4"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Search students</span><Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone, city, mentor, service, batch or preparation" className={input + ' pl-9'} /></label>
          <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Previously a student?</span><select value={previousStatus} onChange={(event) => setPreviousStatus(event.target.value as PreviousStatus)} className={input}><option value="">All</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Previous CSS Vista mentor</span><select value={previousMentor} onChange={(event) => setPreviousMentor(event.target.value)} className={input}><option value="">All mentors</option>{previousMentors.map((mentor) => <option key={mentor}>{mentor}</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Gender</span><select value={gender} onChange={(event) => setGender(event.target.value)} className={input}><option value="">All genders</option>{genders.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">City</span><select value={city} onChange={(event) => setCity(event.target.value)} className={input}><option value="">All cities</option>{cities.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Degree / education</span><select value={degree} onChange={(event) => setDegree(event.target.value)} className={input}><option value="">All degrees / education</option>{degrees.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">CSS attempt year</span><select value={attempt} onChange={(event) => setAttempt(event.target.value)} className={input}><option value="">All CSS attempt years</option>{attempts.map((value) => <option key={value} value={value}>CSS {value}</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Preparation level</span><select value={preparation} onChange={(event) => setPreparation(event.target.value)} className={input}><option value="">All preparation levels</option>{preparations.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Batch</span><select value={batch} onChange={(event) => setBatch(event.target.value)} className={input}><option value="">All batches</option>{batches.map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={reset} className="rounded-md border px-3 py-2 text-sm font-medium">Reset filters</button>
          <span className="mr-auto text-sm text-muted-foreground">Showing <b className="text-pine">{visible.length}</b> of {rows.length}</span>
          <button onClick={downloadCsv} disabled={!visible.length} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"><Download className="h-4 w-4" /> CSV</button>
          <button onClick={() => void downloadWithPhotos()} disabled={!visible.length || exporting} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><ImageIcon className="h-4 w-4" /> {exporting ? 'Preparing…' : 'List with photos'}</button>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {!error && loading && <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading students…</div>}
      {!error && !loading && !visible.length && <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No students match these filters.</div>}

      {!error && !loading && visible.map((row) => {
        const complete = completion(row)
        const previous = isPreviousStudent(row)
        return <details key={row.user_id} className="group rounded-xl border bg-white p-4 sm:p-5">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4">
            <StudentPhoto row={row} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-pine">{row.display_name || 'Student'}</h3>
                <Badge tone={complete.complete ? 'green' : 'gold'}>{complete.complete ? 'Profile complete' : `${complete.percent}% complete`}</Badge>
                <Badge tone={previous ? 'green' : 'gray'}>{previous ? `Previous: ${row.previous_css_vista_student}` : row.previous_css_vista_student === 'No' ? 'New to mentors' : 'History not provided'}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{row.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">{[row.phone,row.city,row.gender,row.education,row.css_attempt_year ? `CSS ${row.css_attempt_year}` : '',row.preparation_level,row.batch_title].filter(Boolean).join(' · ') || 'Profile details not completed'}</p>
            </div>
            <span className="rounded-md border px-3 py-1.5 text-xs font-semibold group-open:bg-secondary">View student</span>
          </summary>

          <div className="mt-5 grid gap-4 border-t pt-5 lg:grid-cols-[150px_1fr]">
            <aside className="flex flex-col items-center rounded-lg bg-secondary/50 p-4 text-center"><StudentPhoto row={row} large /><p className="mt-3 text-xs font-bold text-pine">{row.has_photo ? 'Student photo' : 'Photo missing'}</p><p className="mt-1 text-xs text-muted-foreground">{complete.done}/{complete.total} profile essentials</p></aside>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <section className="rounded-lg bg-secondary/50 p-4"><h4 className="text-xs font-bold uppercase text-emerald-800">Contact</h4><p className="mt-3 text-sm"><b>Email:</b> {row.email}<br/><b>Phone:</b> {show(row.phone)}<br/><b>WhatsApp:</b> {show(row.whatsapp)}</p></section>
              <section className="rounded-lg bg-secondary/50 p-4"><h4 className="text-xs font-bold uppercase text-emerald-800">Personal</h4><p className="mt-3 text-sm"><b>Age:</b> {show(row.age)}<br/><b>Gender:</b> {show(row.gender)}<br/><b>City:</b> {show(row.city)}<br/><b>Province:</b> {show(row.province_region)}</p></section>
              <section className="rounded-lg bg-secondary/50 p-4"><h4 className="text-xs font-bold uppercase text-emerald-800">Preparation</h4><p className="mt-3 text-sm"><b>Attempt:</b> {show(row.css_attempt_year)}<br/><b>Level:</b> {show(row.preparation_level)}<br/><b>Degree / education:</b> {show(row.education)}<br/><b>Optionals:</b> {row.optional_subjects?.length ? row.optional_subjects.join(', ') : 'Not provided'}</p></section>
              <section className="rounded-lg bg-secondary/50 p-4"><h4 className="text-xs font-bold uppercase text-emerald-800">Previous CSS Vista history</h4><p className="mt-3 text-sm"><b>Previous student?</b> {previous ? 'Yes' : row.previous_css_vista_student === 'No' ? 'No' : 'Not provided'}<br/><b>Studied with:</b> {previous ? show(row.previous_css_vista_student) : '—'}<br/><b>Joined / purchased:</b> {row.previous_css_vista_services?.length ? row.previous_css_vista_services.join(', ') : 'None recorded'}<br/><b>Details:</b> {show(row.previous_css_vista_details)}<br/><b>Other mentor:</b> {show(row.previous_academy_mentor)}</p></section>
              <section className="rounded-lg bg-secondary/50 p-4"><h4 className="text-xs font-bold uppercase text-emerald-800">Activity</h4><p className="mt-3 text-sm"><b>Batch:</b> {show(row.batch_title)}<br/><b>Payment:</b> {show(row.payment_status)}<br/><b>Last active:</b> {friendlyDate(row.last_seen_at || row.last_sign_in_at)}<br/><b>Quiz attempts:</b> {row.quiz_attempt_count || 0}</p></section>
            </div>
          </div>
        </details>
      })}
    </div>
  </div>
}
