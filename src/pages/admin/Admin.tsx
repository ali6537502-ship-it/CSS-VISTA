import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowDown, ArrowUp, Download, Eye, EyeOff, FilePlus, Lock, LogOut,
  Newspaper, CalendarDays, Bell, Megaphone, FileText, Database, Upload, Trash2, Save, HelpCircle, KeyRound,
  Timer, LayoutGrid, BellRing, Tags, ShieldAlert, Users, Banknote,
} from 'lucide-react'
import {
  CountdownEditor, HomeCardsEditor, UpdatesEditor, CategoriesEditor, McqManager, MentorsEditor, PricesEditor,
} from './AdminExtras'
import { PageHeader, Badge } from '@/components/shared'
import {
  isAuthed, login, logout, getAdminContent, upsertCaTopic, deleteCaTopic, upsertDateRow,
  upsertNotification, deleteNotification, upsertAnnouncement, deleteAnnouncement,
  upsertPastPaper, deletePastPaper, addMcqsBatch, parseMcqCsv, exportAdminContent,
  importAdminContent, fileToDataUrl, setPassword, type CaTopic,
} from '@/lib/admin'
import { css2027Dates as seedDates, type CssDate, type FpscNotification2027 } from '@/data/css2027'
import { mergedDates, mergedNotifications, mergedAnnouncements, mergedPastPapers, mergedCaTopics } from '@/lib/admin'
import { notifications2027 as seedNotifs } from '@/data/css2027'
import { testSeriesAnnouncements as seedAnn } from '@/data/testSeries'
import { pastPapers as seedPapers, examinations, subjectTypes, paperParts, paperModes, ppSubjects, type PastPaper } from '@/data/pastPapers'
import { caIssues } from '@/data/currentAffairs'
import { quizCategories } from '@/data/quiz'

const uid = () => Math.random().toString(36).slice(2, 10)

const adminTabs = [
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
          <Field label="Category"><select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
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
          <Field label="Examination"><select className={input} value={form.examination} onChange={(e) => setForm({ ...form, examination: e.target.value as any })}>{examinations.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Year"><input type="number" className={input} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></Field>
          <Field label="Subject"><select className={input} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>{ppSubjects.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Compulsory / Optional"><select className={input} value={form.subjectType} onChange={(e) => setForm({ ...form, subjectType: e.target.value as any })}>{subjectTypes.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Paper"><select className={input} value={form.paper} onChange={(e) => setForm({ ...form, paper: e.target.value as any })}>{paperParts.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Objective / Subjective"><select className={input} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as any })}>{paperModes.map((x) => <option key={x}>{x}</option>)}</select></Field>
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
      <p className="text-sm text-muted-foreground">MCQs added through admin: <strong className="text-pine">{total}</strong> (these appear in MPT quizzes on this device, and for everyone once you export site data and publish it).</p>
    </div>
  )
}

function DataSettings() {
  const [newPass, setNewPass] = useState('')
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Change admin password</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <input type="password" className={input + ' max-w-xs'} placeholder="New password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          <button onClick={() => { if (newPass.length < 6) return alert('Use at least 6 characters'); setPassword(newPass); setNewPass(''); alert('Password changed. Note it down - it is stored only on this device.') }} className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">Change</button>
        </div>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Publish your edits (important)</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your edits are saved in <strong>this browser</strong>. To make them visible to all visitors, click <strong>Export site data</strong> and send the downloaded file to your developer - it will be loaded into the published website. You can also Import a file on another device (e.g. move edits from laptop to phone).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => {
            const blob = new Blob([exportAdminContent()], { type: 'application/json' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cssvista-site-data-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href)
          }} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"><Download className="h-4 w-4" /> Export site data</button>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary">
            <Upload className="h-4 w-4" /> Import site data
            <input type="file" accept="application/json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const ok = importAdminContent(await f.text())
              alert(ok ? 'Imported successfully.' : 'Invalid file.')
            }} />
          </label>
        </div>
      </div>
    </div>
  )
}

function HelpGuide() {
  const items: [string, string][] = [
    ['Log in', 'Open the website and click the small “Admin” link in the footer (or go to /admin). Enter your admin password. On your own phone or laptop, stay logged in during your session; always log out on shared devices.'],
    ['Add a Current Affairs update', 'Admin → Current Affairs → fill Title, Date, Short description and Full content → optionally attach a PDF/image and paste a source link → press Publish. “Save as draft” keeps it hidden until you publish.'],
    ['Edit an old update', 'Admin → Current Affairs → find the topic in “Your topics” → press Edit → change anything → Save & publish. The same pattern works for notifications, announcements and past papers.'],
    ['Upload a PDF or image', 'In any editor, use the file field (≤ 2.5 MB). For larger files, upload them to Google Drive/Dropbox and paste the share link into the Source/Link field instead.'],
    ['Remove an update', 'Press the red trash icon next to the item and confirm. Deleting is permanent on that device.'],
    ['Reorder Current Affairs topics', 'Use the ↑ ↓ arrows next to each topic. “Important” adds a gold badge that appears on the public page.'],
    ['Update CSS 2027 dates', 'Admin → CSS 2027 Dates → pick the row, set the date and status (Official only when FPSC has announced it). The public “CSS 2027 Important Dates” tab updates immediately on your device.'],
    ['Add thousands of MCQs', 'Admin → MCQ Bulk Upload → download the CSV template, fill rows in Excel, save as CSV and upload. All new questions appear in MPT quizzes.'],
    ['Add a completely new section later', 'Sections (pages) are part of the website code. Ask your developer to add the page; once added, its content can usually be managed from this admin like the sections above.'],
    ['Change text, prices, contact numbers, photos', 'These core details live in the site’s settings file so they stay consistent everywhere. Tell your developer the new value (or ask for it to be added to this admin) - it is a one-line change, not a rebuild.'],
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

export default function Admin() {
  const [authed, setAuthed] = useState(isAuthed())
  const [pass, setPass] = useState('')
  const [tab, setTab] = useState<(typeof adminTabs)[number]['id']>('ca')
  const navigate = useNavigate()
  useEffect(() => { setAuthed(isAuthed()) }, [])

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20">
        <div className="rounded-lg border bg-white p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-pine" />
          <h1 className="mt-3 font-display text-xl font-bold text-pine">CSS Vista Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Owner access only.</p>
          <input
            type="password" value={pass} onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (login(pass) ? setAuthed(true) : alert('Wrong password'))}
            placeholder="Admin password" className={input + ' mt-4'} aria-label="Admin password"
          />
          <button onClick={() => (login(pass) ? setAuthed(true) : alert('Wrong password'))} className="mt-3 w-full rounded-md bg-pine py-2.5 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">Log in</button>
          <p className="mt-3 text-xs text-muted-foreground">If you have forgotten the password, ask the developer to reset it.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="CSS Vista Admin" description="Update Current Affairs, CSS 2027 dates, FPSC notifications, test-series posts, past papers and MCQs - no coding required. Changes save in this browser; export site data to publish them for everyone." />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          {adminTabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${tab === t.id ? 'bg-pine text-emerald-50' : 'bg-secondary hover:bg-emerald-100'}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
          <button onClick={() => { logout(); navigate('/') }} className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-secondary"><LogOut className="h-4 w-4" /> Log out</button>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-secondary">View site</Link>
        </div>
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
        {tab === 'data' && <DataSettings />}
        {tab === 'help' && <HelpGuide />}
      </div>
    </div>
  )
}
