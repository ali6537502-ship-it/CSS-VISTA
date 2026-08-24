import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowDown, ArrowUp, Download, Eye, EyeOff, FilePlus, Lock, LogOut,
  Newspaper, CalendarDays, Bell, Megaphone, FileText, Database, Upload, Trash2, Save, HelpCircle, KeyRound,
  Timer, LayoutGrid, BellRing, Tags, ShieldAlert, Users, Banknote, PanelTop, Activity, RefreshCw,
  ClipboardCheck,
} from 'lucide-react'
import {
  CountdownEditor, HomeCardsEditor, UpdatesEditor, CategoriesEditor, McqManager, MentorsEditor, PricesEditor,
} from './AdminExtras'
import { PageHeader, Badge } from '@/components/shared'
import {
  isAuthed, login, logout, hasLocalPassword, getAdminContent, upsertCaTopic, deleteCaTopic, upsertDateRow,
  upsertNotification, deleteNotification, upsertAnnouncement, deleteAnnouncement,
  upsertPastPaper, deletePastPaper, addMcqsBatch, parseMcqCsv, exportAdminContent,
  importAdminContent, fileToDataUrl, setPassword, flushAdminContentSave,
  ADMIN_CLOUD_STATUS_EVENT, type AdminCloudStatus, type CaTopic,
} from '@/lib/admin'
import { css2027Dates as seedDates, type CssDate, type FpscNotification2027 } from '@/data/css2027'
import { mergedDates, mergedNotifications, mergedAnnouncements, mergedPastPapers, mergedCaTopics } from '@/lib/admin'
import { notifications2027 as seedNotifs } from '@/data/css2027'
import { testSeriesAnnouncements as seedAnn } from '@/data/testSeries'
import { pastPapers as seedPapers, examinations, subjectTypes, paperParts, paperModes, ppSubjects, type PastPaper } from '@/data/pastPapers'
import { caIssues } from '@/data/currentAffairs'
import { quizCategories } from '@/data/quiz'
import { useAccount } from '@/lib/accountContext'
import { getSupabaseClient } from '@/lib/supabase'
import {
  getAdminTestSeriesRequests, updateTestSeriesRequestStatus,
  type CloudTestSeriesRequest,
} from '@/lib/testSeriesRequests'

const uid = () => Math.random().toString(36).slice(2, 10)

const adminTabs = [
  { id: 'students', label: 'Students', icon: Activity },
  { id: 'series-requests', label: 'Customized Series', icon: ClipboardCheck },
  { id: 'ca', label: 'Current Affairs', icon: Newspaper },
  { id: 'updates', label: 'Updates & Notify', icon: BellRing },
  { id: 'dates', label: 'CSS 2027 Dates', icon: CalendarDays },
  { id: 'notifs', label: 'FPSC Notifications', icon: Bell },
  { id: 'ts', label: 'Test Series Posts', icon: Megaphone },
  { id: 'pp', label: 'Past Papers', icon: FileText },
  { id: 'mcq', label: 'MCQ Bulk Upload', icon: Database },
  { id: 'mcqmgr', label: 'MCQ Reports', icon: ShieldAlert },
  { id: 'cats', label: 'GK Categories', icon: Tags },
  { id: 'countdown', label: 'Countdown', icon: Timer },
  { id: 'cards', label: 'Homepage Cards', icon: LayoutGrid },
  { id: 'mentors', label: 'Mentors', icon: Users },
  { id: 'prices', label: 'Note Prices', icon: Banknote },
  { id: 'ads', label: 'Ad Placements', icon: PanelTop },
  { id: 'data', label: 'Settings & Data', icon: KeyRound },
  { id: 'help', label: 'How to Use', icon: HelpCircle },
] as const

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}
const input = 'h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const textarea = 'w-full rounded-md border border-input p-3 text-sm outline-none focus:ring-2 focus:ring-ring'

function CaEditor() {
  const seed: CaTopic[] = caIssues.map((c, i) => ({
    id: `seed-${c.slug}`, title: c.title, date: c.lastUpdated, summary: c.background.slice(0, 160),
    content: c.background, important: false, published: true, order: i,
  }))
  const [topics, setTopics] = useState<CaTopic[]>(() => mergedCaTopics(seed))
  const blank: CaTopic = { id: '', title: '', date: new Date().toISOString().slice(0, 10), summary: '', content: '', sourceUrl: '', important: false, published: false, order: topics.length }
  const [form, setForm] = useState<CaTopic>(blank)
  const [editing, setEditing] = useState<string | null>(null)

  function refresh() { setTopics(mergedCaTopics(seed)) }
  function save(publish: boolean) {
    if (!form.title.trim()) { alert('Title is required'); return }
    const t = { ...form, id: form.id || `ca-${uid()}`, published: publish ? true : form.published }
    upsertCaTopic(t)
    setForm(blank); setEditing(null); refresh()
  }
  function move(id: string, dir: -1 | 1) {
    const sorted = [...topics].sort((a, b) => a.order - b.order)
    const i = sorted.findIndex((t) => t.id === id)
    const j = i + dir
    if (j < 0 || j >= sorted.length) return
    const oi = sorted[i].order, oj = sorted[j].order
    upsertCaTopic({ ...sorted[i], order: oj })
    upsertCaTopic({ ...sorted[j], order: oi })
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">{editing ? 'Edit topic' : 'Add a new Current Affairs topic'}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Title *"><input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className={input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Short description"><input className={input} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Full content"><textarea rows={6} className={textarea} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field></div>
          <Field label="Source link (optional)"><input className={input} placeholder="https://…" value={form.sourceUrl ?? ''} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} /></Field>
          <Field label="Attach PDF / image / document (optional)">
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="text-sm" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) {
                if (f.size > 2_500_000) { alert('Keep files under 2.5 MB for browser storage. For bigger files, host them and paste the link in Source link.'); return }
                const data = await fileToDataUrl(f)
                setForm({ ...form, fileData: data, fileName: f.name })
              }
            }} />
            {form.fileName && <span className="mt-1 block text-xs text-emerald-800">Attached: {form.fileName}</span>}
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.important} onChange={(e) => setForm({ ...form, important: e.target.checked })} className="h-4 w-4 accent-emerald-800" /> Mark as important / new</label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => save(true)} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"><Save className="h-4 w-4" /> {editing ? 'Save & publish' : 'Publish'}</button>
          <button onClick={() => { upsertCaTopic({ ...form, id: form.id || `ca-${uid()}`, published: false }); setForm(blank); setEditing(null); refresh() }} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary">Save as draft</button>
          {editing && <button onClick={() => { setForm(blank); setEditing(null) }} className="rounded-md border px-4 py-2 text-sm hover:bg-secondary">Cancel</button>}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Your topics ({topics.length})</h3>
        <ul className="mt-3 divide-y">
          {[...topics].sort((a, b) => a.order - b.order).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{t.title}</span>
                  {t.important && <Badge tone="gold">Important</Badge>}
                  {t.published ? <Badge>Published</Badge> : <Badge tone="gray">Draft</Badge>}
                  {t.id.startsWith('seed-') && <Badge tone="gray">Built-in</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{t.date} · {t.summary.slice(0, 80)}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(t.id, -1)} aria-label="Move up" className="rounded border p-1.5 hover:bg-secondary"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => move(t.id, 1)} aria-label="Move down" className="rounded border p-1.5 hover:bg-secondary"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button onClick={() => { upsertCaTopic({ ...t, published: !t.published }); refresh() }} aria-label="Toggle publish" className="rounded border p-1.5 hover:bg-secondary">{t.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                <button onClick={() => { setForm(t); setEditing(t.id) }} className="rounded border px-2.5 py-1.5 text-xs hover:bg-secondary">Edit</button>
                {!t.id.startsWith('seed-') && (
                  <button onClick={() => { if (confirm('Delete this topic permanently?')) { deleteCaTopic(t.id); refresh() } }} aria-label="Delete" className="rounded border border-red-300 p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DatesEditor() {
  const [rows, setRows] = useState<CssDate[]>(() => mergedDates(seedDates))
  const statuses: CssDate['status'][] = ['Official', 'Tentative', 'To Be Announced']
  return (
    <div className="rounded-lg border bg-white p-5">
      <h3 className="font-semibold text-pine">CSS 2027 Important Dates</h3>
      <p className="mt-1 text-sm text-muted-foreground">Edit a date and choose its status. Never mark a date “Official” unless it appears in an FPSC notice.</p>
      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="grid items-center gap-2 rounded-md border p-3 sm:grid-cols-[1fr_180px_170px_auto]">
            <span className="text-sm font-medium">{r.item}</span>
            <input type="date" className={input} value={r.date} onChange={(e) => { const nr = { ...r, date: e.target.value }; upsertDateRow(nr); setRows(mergedDates(seedDates)) }} />
            <select className={input} value={r.status} onChange={(e) => { const nr = { ...r, status: e.target.value as CssDate['status'] }; upsertDateRow(nr); setRows(mergedDates(seedDates)) }}>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
            <Badge tone={r.status === 'Official' ? 'green' : r.status === 'To Be Announced' ? 'gray' : 'gold'}>{r.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotifsEditor() {
  const [items, setItems] = useState<FpscNotification2027[]>(() => mergedNotifications(seedNotifs))
  const blank: FpscNotification2027 = { id: '', title: '', date: '', category: 'General', summary: '', officialUrl: 'https://www.fpsc.gov.pk/' }
  const [form, setForm] = useState<FpscNotification2027>(blank)
  const cats: FpscNotification2027['category'][] = ['MPT Advertisement', 'MPT Applications', 'MPT Examination', 'MPT Result', 'Written Applications', 'Written Examination', 'Admission Certificate', 'Rules & Eligibility', 'Psychological Assessment', 'Viva Voce', 'Final Result', 'General']
  function refresh() { setItems(mergedNotifications(seedNotifs)) }
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Add official FPSC notification (CSS 2027)</h3>
        <p className="mt-1 text-xs text-muted-foreground">Add only notifications you have verified on fpsc.gov.pk. Paste the official link.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Notification title *"><input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Publication date"><input type="date" className={input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Category"><select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as FpscNotification2027['category'] })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Official link / PDF"><input className={input} value={form.officialUrl} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Short explanation"><textarea rows={3} className={textarea} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field></div>
        </div>
        <button onClick={() => { if (!form.title.trim()) return alert('Title required'); upsertNotification({ ...form, id: form.id || `n27-${uid()}` }); setForm(blank); refresh() }} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"><FilePlus className="h-4 w-4" /> Add notification</button>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Posted notifications ({items.length})</h3>
        <ul className="mt-3 divide-y">
          {items.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground">{n.category} · {n.date || 'no date'}</div>
              </div>
              <button onClick={() => setForm(n)} className="rounded border px-2.5 py-1.5 text-xs hover:bg-secondary">Edit</button>
              {n.id !== 'rules-standing' && (
                <button onClick={() => { if (confirm('Delete?')) { deleteNotification(n.id); refresh() } }} className="rounded border border-red-300 p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function TsEditor() {
  const [items, setItems] = useState(() => mergedAnnouncements(seedAnn))
  const blank = { id: '', title: '', date: new Date().toISOString().slice(0, 10), body: '', posterUrl: '', registrationInfo: '', startDate: '', published: true }
  const [form, setForm] = useState(blank)
  function refresh() { setItems(mergedAnnouncements(seedAnn)) }
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Post a test-series announcement</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Title *"><input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className={input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Announcement text (schedule, details)"><textarea rows={4} className={textarea} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field></div>
          <Field label="Poster image (optional)">
            <input type="file" accept="image/*" className="text-sm" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) { const d = await fileToDataUrl(f); setForm({ ...form, posterUrl: d }) }
            }} />
            {form.posterUrl && <span className="mt-1 block text-xs text-emerald-800">Poster attached</span>}
          </Field>
          <Field label="Registration info"><input className={input} value={form.registrationInfo} onChange={(e) => setForm({ ...form, registrationInfo: e.target.value })} /></Field>
          <Field label="Starting date"><input className={input} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="h-4 w-4 accent-emerald-800" /> Published</label>
        </div>
        <button onClick={() => { if (!form.title.trim()) return alert('Title required'); upsertAnnouncement({ ...form, id: form.id || `ts-${uid()}` }); setForm(blank); refresh() }} className="mt-4 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">Save announcement</button>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Announcements ({items.length})</h3>
        <ul className="mt-3 divide-y">
          {items.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.date} · {a.published ? 'Published' : 'Draft'}</div>
              </div>
              <button onClick={() => setForm({ ...a, posterUrl: a.posterUrl ?? '', registrationInfo: a.registrationInfo ?? '', startDate: a.startDate ?? '' })} className="rounded border px-2.5 py-1.5 text-xs hover:bg-secondary">Edit</button>
              {a.id !== 'ts-seed-1' && <button onClick={() => { if (confirm('Delete?')) { deleteAnnouncement(a.id); refresh() } }} className="rounded border border-red-300 p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PpEditor() {
  const [items, setItems] = useState(() => mergedPastPapers(seedPapers))
  const blank: PastPaper = { id: '', title: '', examination: 'CSS', subject: 'Essay', subjectType: 'Compulsory', year: new Date().getFullYear(), paper: 'Single Paper', mode: 'Subjective', source: 'Owner-provided' }
  const [form, setForm] = useState<PastPaper>(blank)
  function refresh() { setItems(mergedPastPapers(seedPapers)) }
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Add a past paper</h3>
        <p className="mt-1 text-xs text-muted-foreground">Add papers one by one as you collect them. Upload the file (small PDFs/images) or link it.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Paper title *"><input className={input} placeholder="e.g. CSS 2024 Essay Paper" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Examination"><select className={input} value={form.examination} onChange={(e) => setForm({ ...form, examination: e.target.value as PastPaper['examination'] })}>{examinations.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Year"><input type="number" className={input} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></Field>
          <Field label="Subject"><select className={input} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>{ppSubjects.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Compulsory / Optional"><select className={input} value={form.subjectType} onChange={(e) => setForm({ ...form, subjectType: e.target.value as PastPaper['subjectType'] })}>{subjectTypes.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Paper"><select className={input} value={form.paper} onChange={(e) => setForm({ ...form, paper: e.target.value as PastPaper['paper'] })}>{paperParts.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Objective / Subjective"><select className={input} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as PastPaper['mode'] })}>{paperModes.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Upload file (PDF/image, ≤ 2.5 MB)">
            <input type="file" accept=".pdf,image/*" className="text-sm" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) {
                if (f.size > 2_500_000) { alert('Keep files under 2.5 MB. For larger papers, host them and paste the link below.'); return }
                const d = await fileToDataUrl(f)
                setForm({ ...form, fileUrl: d })
              }
            }} />
            {form.fileUrl && <span className="mt-1 block text-xs text-emerald-800">File attached</span>}
          </Field>
          <Field label="…or paste file link"><input className={input} placeholder="https://…" onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} /></Field>
        </div>
        <button onClick={() => { if (!form.title.trim()) return alert('Title required'); upsertPastPaper({ ...form, id: form.id || `pp-${uid()}` }); setForm(blank); refresh() }} className="mt-4 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">Add paper</button>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Added papers ({items.length})</h3>
        {items.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No papers yet - add the first one above.</p>}
        <ul className="mt-3 divide-y">
          {items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm">{p.title} <span className="text-muted-foreground">({p.examination} · {p.year} · {p.subject})</span></span>
              <button onClick={() => setForm(p)} className="rounded border px-2.5 py-1.5 text-xs hover:bg-secondary">Edit</button>
              <button onClick={() => { if (confirm('Delete?')) { deletePastPaper(p.id); refresh() } }} className="rounded border border-red-300 p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function McqUploader() {
  const [result, setResult] = useState<string>('')
  const total = getAdminContent().mcqs.length
  const template = 'question,optionA,optionB,optionC,optionD,answer,explanation,subject,topic,difficulty\n"The capital of Japan is:",Tokyo,Osaka,Kyoto,Nagoya,A,"Tokyo is Japan\'s capital.",gk,Capitals,Easy'
  return (
    <div className="space-y-4 rounded-lg border bg-white p-5">
      <h3 className="font-semibold text-pine">Bulk MCQ upload (CSV / Excel)</h3>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>In Excel or Google Sheets, create columns: <code className="rounded bg-secondary px-1">question, optionA, optionB, optionC, optionD, answer, explanation, subject, topic, difficulty</code></li>
        <li><strong>answer</strong> = A, B, C or D. <strong>subject</strong> = an MPT subject ({quizCategories.map((c) => c.id).join(', ')}) <em>or</em> a GK World category slug (e.g. capitals, currencies, science, islamic-gk). <strong>difficulty</strong> = Easy / Medium / Hard.</li>
        <li>Upload a <strong>CSV</strong> or <strong>Excel (.xlsx)</strong> file. Thousands of rows can be added in one go - exact duplicate question text and duplicate IDs are skipped.</li>
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
          <Upload className="h-4 w-4" /> Upload CSV or Excel file
          <input type="file" accept=".csv,.xlsx,.xls,text/csv,text/plain" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            let text = ''
            if (/\.(xlsx|xls)$/i.test(f.name)) {
              try {
                const XLSX = await import('xlsx')
                const wb = XLSX.read(await f.arrayBuffer())
                const sheet = wb.Sheets[wb.SheetNames.find((n) => /mcq|all|bank|master/i.test(n)) ?? wb.SheetNames[0]]
                text = XLSX.utils.sheet_to_csv(sheet)
              } catch {
                setResult('Could not read that Excel file - try saving it as CSV and uploading again.')
                return
              }
            } else {
              text = await f.text()
            }
            const startId = 100000 + total * 10
            const { questions, errors } = parseMcqCsv(text, startId)
            const added = addMcqsBatch(questions)
            setResult(`Added ${added} MCQs (${questions.length} parsed). ${errors.length ? 'Issues: ' + errors.slice(0, 5).join(' | ') : 'No issues.'}`)
          }} />
        </label>
        <button onClick={() => {
          const blob = new Blob([template], { type: 'text/csv' })
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mcq-template.csv'; a.click(); URL.revokeObjectURL(a.href)
        }} className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary"><Download className="h-4 w-4" /> Download CSV template</button>
      </div>
      {result && <p className="rounded bg-secondary/70 px-3 py-2 text-sm">{result}</p>}
      <p className="text-sm text-muted-foreground">MCQs added through admin: <strong className="text-pine">{total}</strong>. Valid changes publish automatically for all visitors. For very large banks, use the verified Codex import workflow so the quiz stays fast.</p>
    </div>
  )
}

type StudentDirectoryRow = {
  user_id: string
  email: string
  display_name: string
  created_at: string
  last_sign_in_at: string | null
  last_seen_at: string | null
  progress_updated_at: string | null
  activity_count: number
  quiz_attempt_count: number
}

function friendlyDate(value: string | null) {
  if (!value) return 'Not yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not yet'
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function StudentsPanel() {
  const [rows, setRows] = useState<StudentDirectoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchStudents() {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Student records are available after Supabase is configured.')
    const { data, error: queryError } = await client.rpc('admin_student_directory')
    if (queryError) throw queryError
    return (data ?? []) as StudentDirectoryRow[]
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchStudents())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load student records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void fetchStudents()
      .then((result) => {
        if (active) setRows(result)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load student records.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const active = rows.filter((row) => row.last_seen_at || row.last_sign_in_at).length
  const attempts = rows.reduce((sum, row) => sum + Number(row.quiz_attempt_count || 0), 0)
  const events = rows.reduce((sum, row) => sum + Number(row.activity_count || 0), 0)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Student accounts', rows.length],
          ['Students who have signed in', active],
          ['Recorded quiz attempts', attempts],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-pine">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="font-bold text-pine">Student directory</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Account and study summaries only. Passwords are encrypted by Supabase and can never be viewed here. {events} activity records are stored.
            </p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        {error && <p className="m-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!error && loading && <p className="p-5 text-sm text-muted-foreground">Loading protected student records…</p>}
        {!error && !loading && rows.length === 0 && <p className="p-5 text-sm text-muted-foreground">No student accounts yet.</p>}
        {!error && !loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Last active</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Quizzes</th>
                  <th className="px-4 py-3">Progress synced</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.user_id}>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-pine">{row.display_name || 'Student'}</div>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{friendlyDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{friendlyDate(row.last_seen_at || row.last_sign_in_at)}</td>
                    <td className="px-4 py-3 font-medium">{row.activity_count}</td>
                    <td className="px-4 py-3 font-medium">{row.quiz_attempt_count}</td>
                    <td className="px-4 py-3 text-muted-foreground">{friendlyDate(row.progress_updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const testSeriesStatuses: CloudTestSeriesRequest['status'][] = [
  'submitted', 'contacted', 'approved', 'completed', 'cancelled',
]

function CustomizedSeriesPanel() {
  const [requests, setRequests] = useState<CloudTestSeriesRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRequests(await getAdminTestSeriesRequests())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load customized test-series requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void getAdminTestSeriesRequests()
      .then((result) => {
        if (active) setRequests(result)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load customized test-series requests.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function changeStatus(requestId: string, status: CloudTestSeriesRequest['status']) {
    try {
      await updateTestSeriesRequestStatus(requestId, status)
      setRequests((current) => current.map((request) => request.request_id === requestId ? { ...request, status } : request))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update request status.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Total requests', requests.length],
          ['Awaiting contact', requests.filter((request) => request.status === 'submitted').length],
          ['Approved series', requests.filter((request) => request.status === 'approved').length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-pine">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="font-bold text-pine">Customized test-series requests</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review each student’s subjects, dates and calculated fee, then update the request status.</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        {error && <p className="m-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!error && loading && <p className="p-5 text-sm text-muted-foreground">Loading protected requests…</p>}
        {!error && !loading && requests.length === 0 && <p className="p-5 text-sm text-muted-foreground">No customized test-series request has been submitted yet.</p>}
        {!error && !loading && requests.length > 0 && (
          <div className="divide-y">
            {requests.map((request) => (
              <article key={request.request_id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-pine">{request.student_name || 'Student'}</h3>
                      <Badge tone={request.status === 'approved' || request.status === 'completed' ? 'green' : request.status === 'cancelled' ? 'gray' : 'gold'}>{request.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{request.student_email}{request.phone ? ` · ${request.phone}` : ''} · {friendlyDate(request.created_at)}</p>
                  </div>
                  <select value={request.status} onChange={(event) => void changeStatus(request.request_id, event.target.value as CloudTestSeriesRequest['status'])} className="h-9 rounded-md border px-2 text-sm">
                    {testSeriesStatuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-md bg-secondary/60 p-3"><span className="block text-xs text-muted-foreground">Tests</span><strong>{request.test_count}</strong></div>
                  <div className="rounded-md bg-secondary/60 p-3"><span className="block text-xs text-muted-foreground">Starts</span><strong>{request.start_date}</strong></div>
                  <div className="rounded-md bg-secondary/60 p-3"><span className="block text-xs text-muted-foreground">Timing</span><strong>{request.scheduling_mode === 'automatic' ? `${request.duration_days} days` : `${request.gap_days}-day gap`}</strong></div>
                  <div className="rounded-md bg-secondary/60 p-3"><span className="block text-xs text-muted-foreground">Calculated fee</span><strong>{request.total_fee === null ? 'Confirm directly' : `Rs. ${new Intl.NumberFormat('en-PK').format(request.total_fee)}`}</strong></div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground"><strong className="text-pine">Subjects:</strong> {request.subjects.join(', ')}</p>
                <details className="mt-3 rounded-md border px-3 py-2">
                  <summary className="cursor-pointer text-sm font-semibold text-pine">View proposed schedule ({request.schedule.length} tests)</summary>
                  <div className="mt-3 max-h-64 overflow-y-auto text-xs">
                    {request.schedule.map((test) => <div key={`${test.number}-${test.date}`} className="grid grid-cols-[3rem_7rem_1fr] gap-2 border-t py-2 first:border-0"><strong>#{test.number}</strong><span>{test.date}</span><span>{test.subject}</span></div>)}
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CloudPublishStatus({ enabled }: { enabled: boolean }) {
  const [status, setStatus] = useState<AdminCloudStatus>({
    state: enabled ? 'idle' : 'saved',
    message: enabled ? 'Cloud publishing ready' : 'Local preview mode',
  })

  useEffect(() => {
    const listener = (event: Event) => {
      setStatus((event as CustomEvent<AdminCloudStatus>).detail)
    }
    window.addEventListener(ADMIN_CLOUD_STATUS_EVENT, listener)
    return () => window.removeEventListener(ADMIN_CLOUD_STATUS_EVENT, listener)
  }, [])

  const tone = status.state === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : status.state === 'saving'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800'

  return (
    <div className={`mb-5 flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm ${tone}`}>
      <span className="font-medium">{status.message}</span>
      {status.state === 'saving' && <RefreshCw className="h-4 w-4 animate-spin" />}
      {status.state === 'error' && (
        <button onClick={() => void flushAdminContentSave()} className="font-semibold underline underline-offset-2">Retry</button>
      )}
    </div>
  )
}

function DataSettings({ cloudAuth }: { cloudAuth: boolean }) {
  const [newPass, setNewPass] = useState('')
  return (
    <div className="space-y-4">
      {cloudAuth ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
          <h3 className="font-semibold text-pine">Secure owner access is active</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Administrator access is controlled by the signed-in Supabase account and the protected
            administrator table. Passwords are managed through the normal account system.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-5">
          <h3 className="font-semibold text-pine">Change local preview password</h3>
          <p className="mt-1 text-xs text-muted-foreground">This fallback is for local development only. Production uses account-based owner access.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input type="password" className={input + ' max-w-xs'} placeholder="New password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            <button onClick={() => { if (newPass.length < 6) return alert('Use at least 6 characters'); setPassword(newPass); setNewPass(''); alert('Local preview password changed.') }} className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">Change</button>
          </div>
        </div>
      )}
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Cloud publishing and manual backup</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {cloudAuth
            ? 'Admin edits publish automatically to the protected CSS Vista cloud content store and are cached on each device for speed. Export a JSON copy before a large editing session as an additional manual backup.'
            : 'This local preview has no cloud connection. Export a JSON copy to protect any test edits.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => {
            const blob = new Blob([exportAdminContent()], { type: 'application/json' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cssvista-site-data-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href)
          }} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"><Download className="h-4 w-4" /> Download content backup</button>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary">
            <Upload className="h-4 w-4" /> Restore content backup
            <input type="file" accept="application/json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const ok = importAdminContent(await f.text())
              if (ok) {
                await flushAdminContentSave()
                alert(cloudAuth ? 'Backup restored and published.' : 'Backup restored locally.')
              } else alert('Invalid backup file.')
            }} />
          </label>
        </div>
      </div>
    </div>
  )
}

function HelpGuide() {
  const items: [string, string][] = [
    ['Log in', 'Open /admin and sign in with the owner account. Access is checked against the protected administrator list. Always log out on a shared device.'],
    ['Add a Current Affairs update', 'Admin → Current Affairs → fill Title, Date, Short description and Full content → optionally attach a PDF/image and paste a source link → press Publish. “Save as draft” keeps it hidden until you publish.'],
    ['Edit an old update', 'Admin → Current Affairs → find the topic in “Your topics” → press Edit → change anything → Save & publish. The same pattern works for notifications, announcements and past papers.'],
    ['Upload a PDF or image', 'Small attachments can be added in an editor. Large notes and past papers belong in the permanent website file storage; ask Codex to import and classify them so every View and Download link remains stable.'],
    ['Remove an update', 'Press the red trash icon next to the item and confirm. Published content changes are synced to the cloud. Download a content backup before large deletions.'],
    ['Reorder Current Affairs topics', 'Use the ↑ ↓ arrows next to each topic. “Important” adds a gold badge that appears on the public page.'],
    ['Update CSS 2027 dates', 'Admin → CSS 2027 Dates → pick the row, set the date and status. Use “Official” only when FPSC has announced it. The public section updates automatically for all visitors.'],
    ['Add MCQs', 'Use MCQ Bulk Upload for a small verified batch. For thousands of questions, ask Codex to validate, deduplicate, classify, test and publish a code release; this keeps quizzes fast.'],
    ['See student records', 'Admin → Students shows account dates, last activity, progress sync and quiz-attempt totals. Passwords are encrypted and are never visible to an administrator.'],
    ['Add a new section or change website code', 'Ask Codex to make the change. Codex tests it, records it in private GitHub history and deploys the approved release. Routine content edits remain available here without coding.'],
  ]
  return (
    <div className="space-y-3">
      {items.map(([t, d]) => (
        <div key={t} className="rounded-lg border bg-white p-4">
          <h3 className="font-semibold text-pine">{t}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
        </div>
      ))}
    </div>
  )
}

function AdPlacementGuide() {
  const slotReady = Boolean((
    import.meta.env.VITE_ADSENSE_SLOT_CONTENT
    || import.meta.env.VITE_ADSENSE_SLOT_BOTTOM
    || import.meta.env.VITE_ADSENSE_SLOT_TOP
    || ''
  ).trim())
  const positions = [
    {
      title: 'Managed in-page opportunity',
      location: 'After eligible content and before the footer',
      detail: 'One responsive unit can appear after 60 seconds of active use or on every third distinct eligible content page. It never overlays content and unfilled space collapses.',
      ready: slotReady,
    },
    {
      title: 'Frequency protection',
      location: 'Session scoped',
      detail: 'The two triggers share one opportunity, each history entry is handled once, and a five-minute cooldown prevents rapid repeat requests.',
      ready: true,
    },
    {
      title: 'Google-controlled consent and vignette',
      location: 'AdSense Privacy & messaging / Auto ads dashboard',
      detail: 'Consent messages and any optional dismissible vignette must be controlled by Google. CSS Vista does not create a custom overlay or close button.',
      ready: false,
    },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-pine">Advertising placement map</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Development previews are labelled. Real advertisements appear only after the domain and AdSense account are approved and the environment IDs are configured.
            </p>
          </div>
          <Badge tone={slotReady ? 'green' : 'gold'}>
            {slotReady ? 'Publisher and in-page slot configured' : 'Publisher configured · slot ID required'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {positions.map((position) => (
          <article key={position.title} className="rounded-xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-pine">{position.title}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  {position.location}
                </p>
              </div>
              <Badge tone={position.ready ? 'green' : 'gray'}>
                {position.ready ? 'Configured' : 'Dashboard action'}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{position.detail}</p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
        <h3 className="font-bold text-pine">Protected study routes</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No advertisements appear on the homepage or inside GK/PMS quizzes, MPT preparation, scheduled mocks, full papers, the Five-Minute Challenge, answer writing, answer evaluation, account areas, private dashboards, timers or games.
        </p>
      </div>
    </div>
  )
}

export default function Admin() {
  const { configured, loading: accountLoading, user, signOut } = useAccount()
  const [authed, setAuthed] = useState(isAuthed())
  const [cloudAccess, setCloudAccess] = useState<'checking' | 'granted' | 'denied'>('checking')
  const [pass, setPass] = useState('')
  const [tab, setTab] = useState<(typeof adminTabs)[number]['id']>('students')
  const navigate = useNavigate()

  useEffect(() => {
    if (!configured || accountLoading) return
    if (!user) return
    let active = true
    getSupabaseClient()
      .then(async (client) => {
        if (!client) return false
        const { data, error } = await client.rpc('is_css_vista_admin')
        if (error) throw error
        return data === true
      })
      .then((allowed) => {
        if (active) setCloudAccess(allowed ? 'granted' : 'denied')
      })
      .catch(() => {
        if (active) setCloudAccess('denied')
      })
    return () => {
      active = false
    }
  }, [accountLoading, configured, user])

  const resolvedCloudAccess = !accountLoading && !user ? 'denied' : cloudAccess
  const localPasswordReady = hasLocalPassword()

  if (configured && (accountLoading || resolvedCloudAccess === 'checking')) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center">
        <div className="rounded-lg border bg-white p-6">
          <Lock className="mx-auto h-8 w-8 animate-pulse text-pine" />
          <h1 className="mt-3 font-display text-xl font-bold text-pine">Checking owner access</h1>
          <p className="mt-1 text-sm text-muted-foreground">Securely verifying this account.</p>
        </div>
      </div>
    )
  }

  if (configured && (!user || resolvedCloudAccess !== 'granted')) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20">
        <div className="rounded-lg border bg-white p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-pine" />
          <h1 className="mt-3 font-display text-xl font-bold text-pine">CSS Vista Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user ? 'This account does not have administrator access.' : 'Sign in with the owner account to continue.'}
          </p>
          <Link to="/account" className="mt-4 inline-flex rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
            {user ? 'Open account' : 'Sign in'}
          </Link>
        </div>
      </div>
    )
  }

  if (!configured && !authed) {
    if (!localPasswordReady && !import.meta.env.DEV) {
      return (
        <div className="mx-auto max-w-sm px-4 py-20">
          <div className="rounded-lg border bg-white p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-pine" />
            <h1 className="mt-3 font-display text-xl font-bold text-pine">Admin setup required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure Supabase owner authentication before enabling administration on a public deployment.
            </p>
            <Link to="/" className="mt-4 inline-flex rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
              Return to website
            </Link>
          </div>
        </div>
      )
    }

    const submitLocalPassword = () => {
      if (!localPasswordReady) {
        if (pass.length < 8) return alert('Use at least 8 characters')
        setPassword(pass)
      }
      if (login(pass)) setAuthed(true)
      else alert('Wrong password')
    }

    return (
      <div className="mx-auto max-w-sm px-4 py-20">
        <div className="rounded-lg border bg-white p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-pine" />
          <h1 className="mt-3 font-display text-xl font-bold text-pine">CSS Vista Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {localPasswordReady ? 'Owner access only.' : 'Create a password for this local development browser.'}
          </p>
          <input
            type="password" value={pass} onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitLocalPassword()}
            placeholder={localPasswordReady ? 'Admin password' : 'Create local password'} className={input + ' mt-4'} aria-label="Admin password"
          />
          <button onClick={submitLocalPassword} className="mt-3 w-full rounded-md bg-pine py-2.5 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
            {localPasswordReady ? 'Log in' : 'Create local password'}
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Local passwords never ship with the website and stay only in this development browser.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="CSS Vista Admin" description="Manage students and publish routine website content securely. Approved edits sync to the cloud and become available to all visitors." />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <CloudPublishStatus enabled={configured} />
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          {adminTabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${tab === t.id ? 'bg-pine text-emerald-50' : 'bg-secondary hover:bg-emerald-100'}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
          <button onClick={() => {
            if (configured) void signOut().then(() => navigate('/'))
            else { logout(); navigate('/') }
          }} className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-secondary"><LogOut className="h-4 w-4" /> Log out</button>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-secondary">View site</Link>
        </div>
        {tab === 'students' && <StudentsPanel />}
        {tab === 'series-requests' && <CustomizedSeriesPanel />}
        {tab === 'ca' && <CaEditor />}
        {tab === 'updates' && <UpdatesEditor />}
        {tab === 'dates' && <DatesEditor />}
        {tab === 'notifs' && <NotifsEditor />}
        {tab === 'ts' && <TsEditor />}
        {tab === 'pp' && <PpEditor />}
        {tab === 'mcq' && <McqUploader />}
        {tab === 'mcqmgr' && <McqManager />}
        {tab === 'cats' && <CategoriesEditor />}
        {tab === 'countdown' && <CountdownEditor />}
        {tab === 'cards' && <HomeCardsEditor />}
        {tab === 'mentors' && <MentorsEditor />}
        {tab === 'prices' && <PricesEditor />}
        {tab === 'ads' && <AdPlacementGuide />}
        {tab === 'data' && <DataSettings cloudAuth={configured} />}
        {tab === 'help' && <HelpGuide />}
      </div>
    </div>
  )
}
