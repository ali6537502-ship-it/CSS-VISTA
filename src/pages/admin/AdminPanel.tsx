import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowDown, ArrowUp, Download, Eye, EyeOff, FilePlus, LogOut,
  Newspaper, CalendarDays, Bell, Megaphone, FileText, Database, Upload, Trash2, Save, HelpCircle, KeyRound,
  Timer, LayoutGrid, BellRing, Tags, ShieldAlert, Users, Banknote, PanelTop, Activity, RefreshCw,
  ClipboardCheck,
} from 'lucide-react'
import {
  CountdownEditor, HomeCardsEditor, UpdatesEditor, CategoriesEditor, McqManager, MentorsEditor, PricesEditor,
} from './AdminExtras'
import { PageHeader, Badge } from '@/components/shared'
import {
  getAdminContent, upsertCaTopic, deleteCaTopic, upsertDateRow,
  upsertNotification, deleteNotification, upsertAnnouncement, deleteAnnouncement,
  upsertPastPaper, deletePastPaper, addMcqsBatch, parseMcqCsv, exportAdminContent,
  importAdminContent, fileToDataUrl, flushAdminContentSave,
  ADMIN_CLOUD_STATUS_EVENT, type AdminCloudStatus, type CaTopic,
} from '@/lib/admin'
import { css2027Dates as seedDates, type CssDate, type FpscNotification2027 } from '@/data/css2027'
import { mergedDates, mergedNotifications, mergedAnnouncements, mergedPastPapers, mergedCaTopics } from '@/lib/admin'
import { notifications2027 as seedNotifs } from '@/data/css2027'
import { testSeriesAnnouncements as seedAnn } from '@/data/testSeries'
import { pastPapers as seedPapers, examinations, subjectTypes, paperParts, paperModes, ppSubjects, type PastPaper } from '@/data/pastPapers'
import { caIssues } from '@/data/currentAffairs'
import { quizCategories } from '@/data/quiz'
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
  auth_source: string
  created_at: string
  last_sign_in_at: string | null
  last_seen_at: string | null
  display_name: string
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
  profile_completed_at: string | null
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

function friendlyDate(value: string | null) {
  if (!value) return 'Not yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not yet'
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function showValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not provided'
  return String(value)
}

function StudentsPanel() {
  const [rows, setRows] = useState<StudentDirectoryRow[]>([])
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchStudents(search = '') {
    const collected: StudentDirectoryRow[] = []
    let expected = 0
    let offset = 0
    do {
      const params = new URLSearchParams({ limit: '100', offset: String(offset) })
      if (search.trim()) params.set('q', search.trim())
      const response = await fetch('/api/admin/students.php?' + params.toString(), {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      const body = await response.json().catch(() => null) as StudentDirectoryResponse | null
      if (!response.ok || !body?.ok) {
        throw new Error(body?.message || (response.status === 403
          ? 'This account does not have owner access.'
          : 'Could not load the protected student directory.'))
      }
      expected = Number(body.total || 0)
      collected.push(...(body.students || []))
      offset = collected.length
    } while (offset < expected)
    return { students: collected, total: expected }
  }

  async function load(search = query) {
    setLoading(true)
    setError('')
    try {
      const result = await fetchStudents(search)
      setRows(result.students)
      setTotal(result.total)
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
        if (active) {
          setRows(result.students)
          setTotal(result.total)
        }
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load student records.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const active = rows.filter((row) => row.last_seen_at || row.last_sign_in_at).length
  const attempts = rows.reduce((sum, row) => sum + Number(row.quiz_attempt_count || 0), 0)
  const complete = rows.filter((row) => row.profile_completed_at).length

  function downloadCsv() {
    const headings = [
      'Name', 'Email', 'Phone', 'WhatsApp', 'City', 'Province/Region', 'Country', 'Age', 'Gender',
      'Attempt Year', 'Preparation Level', 'Optional Subjects', 'Education', 'Previous Academy/Mentor',
      'Batch', 'Registration Code', 'Registration Status', 'Payment Status', 'Joined', 'Last Active',
      'Activity Records', 'Quiz Attempts', 'Progress Synced',
    ]
    const values = rows.map((row) => [
      row.display_name, row.email, row.phone, row.whatsapp, row.city, row.province_region, row.country,
      row.age, row.gender, row.css_attempt_year, row.preparation_level, row.optional_subjects?.join('; '),
      row.education, row.previous_academy_mentor, row.batch_title, row.registration_code,
      row.registration_status, row.payment_status, row.created_at, row.last_seen_at || row.last_sign_in_at,
      row.activity_count, row.quiz_attempt_count, row.progress_updated_at,
    ])
    const escape = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"'
    const csv = [headings, ...values].map((line) => line.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'student-directory-' + new Date().toISOString().slice(0, 10) + '.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Student accounts', total],
          ['Signed-in students', active],
          ['Complete profiles', complete],
          ['Quiz attempts', attempts],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-pine">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white">
        <div className="border-b p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-pine">Complete student directory</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Private owner view of student profiles, contact details, preparation, registration and learning activity.
                Passwords and security credentials are never displayed.
              </p>
            </div>
            <button onClick={downloadCsv} disabled={loading || rows.length === 0} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60">
              <Download className="h-4 w-4" /> Download list
            </button>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void load() }} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, phone or WhatsApp"
              className={input + ' flex-1'}
            />
            <button type="submit" disabled={loading} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-pine px-4 text-sm font-semibold text-white disabled:opacity-60">
              <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /> Search
            </button>
            {query && <button type="button" onClick={() => { setQuery(''); void load('') }} className="h-10 rounded-md border px-4 text-sm font-medium">Clear</button>}
          </form>
        </div>

        {error && <p className="m-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!error && loading && <p className="p-5 text-sm text-muted-foreground">Loading protected student records…</p>}
        {!error && !loading && rows.length === 0 && <p className="p-5 text-sm text-muted-foreground">No matching student accounts.</p>}
        {!error && !loading && rows.length > 0 && (
          <div className="divide-y">
            {rows.map((row) => (
              <details key={row.user_id} className="group p-5">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-pine">{row.display_name || 'Student'}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{row.email}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {[row.phone, row.city, row.css_attempt_year ? 'Attempt ' + row.css_attempt_year : ''].filter(Boolean).join(' · ') || 'Profile details not yet completed'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={row.profile_completed_at ? 'green' : 'gold'}>{row.profile_completed_at ? 'Profile complete' : 'Incomplete profile'}</Badge>
                    <span className="rounded-md border px-3 py-1.5 text-xs font-semibold group-open:bg-secondary">View everything</span>
                  </div>
                </summary>

                <div className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-2 xl:grid-cols-4">
                  <section className="rounded-lg bg-secondary/50 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-800">Contact</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="break-all font-medium">{row.email}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="font-medium">{showValue(row.phone)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">WhatsApp</dt><dd className="font-medium">{showValue(row.whatsapp)}</dd></div>
                    </dl>
                  </section>
                  <section className="rounded-lg bg-secondary/50 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-800">Personal & location</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="text-xs text-muted-foreground">Age / date of birth</dt><dd className="font-medium">{showValue(row.age)}{row.date_of_birth ? ' · ' + row.date_of_birth : ''}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Gender</dt><dd className="font-medium">{showValue(row.gender)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">City</dt><dd className="font-medium">{showValue(row.city)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Province / region</dt><dd className="font-medium">{showValue(row.province_region)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Country</dt><dd className="font-medium">{showValue(row.country)}</dd></div>
                    </dl>
                  </section>
                  <section className="rounded-lg bg-secondary/50 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-800">Preparation</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="text-xs text-muted-foreground">Attempt year</dt><dd className="font-medium">{showValue(row.css_attempt_year)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Preparation level</dt><dd className="font-medium">{showValue(row.preparation_level)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Education</dt><dd className="font-medium">{showValue(row.education)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Previous academy / mentor</dt><dd className="font-medium">{showValue(row.previous_academy_mentor)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Optional subjects</dt><dd className="font-medium">{row.optional_subjects?.length ? row.optional_subjects.join(', ') : 'Not provided'}</dd></div>
                    </dl>
                  </section>
                  <section className="rounded-lg bg-secondary/50 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-800">Registration & activity</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="text-xs text-muted-foreground">Batch</dt><dd className="font-medium">{showValue(row.batch_title)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Registration code</dt><dd className="font-medium">{showValue(row.registration_code)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Registration / payment</dt><dd className="font-medium">{showValue(row.registration_status)} · {showValue(row.payment_status)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Joined</dt><dd className="font-medium">{friendlyDate(row.created_at)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Last active</dt><dd className="font-medium">{friendlyDate(row.last_seen_at || row.last_sign_in_at)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Activity / quizzes</dt><dd className="font-medium">{row.activity_count || 0} records · {row.quiz_attempt_count || 0} attempts</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Progress synced</dt><dd className="font-medium">{friendlyDate(row.progress_updated_at)}</dd></div>
                    </dl>
                  </section>
                </div>
              </details>
            ))}
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

function DataSettings() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
        <h3 className="font-semibold text-pine">Separate private owner access is active</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          This panel uses its own website-database password and authenticator code. It is not connected to any student login.
          Use “Forgot admin password” on the private login page when you need to change it.
        </p>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Manual content backup</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Export a JSON copy before a large editing session as an additional backup.
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
                alert('Backup restored.')
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

export default function AdminPanel() {
  const [tab, setTab] = useState<(typeof adminTabs)[number]['id']>('students')
  const navigate = useNavigate()

  async function signOutOwner() {
    await fetch('/api/admin-auth/logout.php', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    }).catch(() => null)
    navigate('/admin/login', { replace: true })
  }

  return (
    <div>
      <PageHeader title="CSS Vista Admin" description="Private owner panel for student records and website management." />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <CloudPublishStatus enabled={false} />
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          {adminTabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${tab === t.id ? 'bg-pine text-emerald-50' : 'bg-secondary hover:bg-emerald-100'}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
          <button onClick={() => void signOutOwner()} className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-secondary"><LogOut className="h-4 w-4" /> Log out</button>
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
        {tab === 'data' && <DataSettings />}
        {tab === 'help' && <HelpGuide />}
      </div>
    </div>
  )
}
