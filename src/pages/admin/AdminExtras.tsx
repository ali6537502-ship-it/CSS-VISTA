import { useEffect, useState } from 'react'
import {
  ArrowDown, ArrowUp, Bell, BellRing, Eye, EyeOff, Plus, Save, Trash2, Timer,
} from 'lucide-react'
import { Badge } from '@/components/shared'
import {
  getCountdownConfig, saveCountdownConfig, mergedHomeCards, upsertHomeCard, deleteHomeCard,
  mergedUpdates, upsertUpdate, deleteUpdate, mergedCategoryOverrides, upsertCategoryOverride,
  deleteCategoryOverride, getReports, getCloudReports, deleteReport, getMcqOverride, upsertMcqOverride,
  getAdminContent, getMentorOverride, upsertMentorOverride, getPriceOverride, setPriceOverride,
  fileToDataUrl, type CountdownConfig, type HomeCard, type SiteUpdate, type MentorOverride,
} from '@/lib/admin'
import { defaultHomeCards } from '@/data/homeCards'
import { cardIcons } from '@/data/homeCardIcons'
import { getBankIndex, getQuestionById, type BankIndex } from '@/data/mcq'
import { mentors } from '@/data/site'
import { noteProducts, bundle } from '@/data/notes'

const uid = () => Math.random().toString(36).slice(2, 10)
const input = 'h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const textarea = 'w-full rounded-md border border-input p-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const UPDATE_TAGS = ['Mentors', 'Opinions', 'Test Series', 'FPSC', 'General']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}

// ---------------- Countdown ----------------
export function CountdownEditor() {
  const [cfg, setCfg] = useState<CountdownConfig>(getCountdownConfig())
  const [saved, setSaved] = useState(false)
  return (
    <div className="max-w-xl rounded-lg border bg-white p-5">
      <h3 className="flex items-center gap-2 font-semibold text-pine"><Timer className="h-4 w-4" /> Homepage live countdown</h3>
      <p className="mt-1 text-xs text-muted-foreground">The verified target is locked to the FPSC schedule: 27 January 2027 at 00:00 Pakistan Standard Time. FPSC has announced the calendar date but not an examination start time.</p>
      <div className="mt-4 grid gap-3">
        <div className="rounded-md border bg-secondary/50 px-3 py-2 text-sm">
          <span className="font-semibold text-pine">CSS 2027 Written Examination</span>
          <span className="ml-2 text-muted-foreground">27 January 2027 · 00:00 PKT</span>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={cfg.visible} onChange={(e) => setCfg({ ...cfg, visible: e.target.checked })} className="h-4 w-4 accent-emerald-800" />
          Countdown visible on the homepage
        </label>
        <button
          onClick={() => { saveCountdownConfig(cfg); setSaved(true); setTimeout(() => setSaved(false), 1500) }}
          className="inline-flex w-fit items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"
        >
          <Save className="h-4 w-4" /> {saved ? 'Saved ✓' : 'Save countdown'}
        </button>
      </div>
    </div>
  )
}

// ---------------- Homepage cards ----------------
export function HomeCardsEditor() {
  const [cards, setCards] = useState<HomeCard[]>(() => mergedHomeCards(defaultHomeCards))
  const [form, setForm] = useState({ title: '', desc: '', to: '/', icon: 'Globe' })

  function refresh() { setCards(mergedHomeCards(defaultHomeCards)) }
  function move(id: string, dir: -1 | 1) {
    const sorted = [...cards].sort((a, b) => a.order - b.order)
    const i = sorted.findIndex((c) => c.id === id)
    const j = i + dir
    if (j < 0 || j >= sorted.length) return
    upsertHomeCard({ ...sorted[i], order: sorted[j].order })
    upsertHomeCard({ ...sorted[j], order: sorted[i].order })
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Homepage feature cards ({cards.length})</h3>
        <p className="mt-1 text-xs text-muted-foreground">Hide, reorder or add cards on the app-style homepage dashboard.</p>
        <ul className="mt-3 divide-y">
          {[...cards].sort((a, b) => a.order - b.order).map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded bg-secondary">
                {(() => { const I = cardIcons[c.icon]; return I ? <I className="h-4 w-4 text-emerald-800" /> : null })()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.title}</p>
                <p className="truncate text-xs text-muted-foreground">{c.to}</p>
              </div>
              <button onClick={() => move(c.id, -1)} className="rounded border p-1.5 hover:bg-secondary" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => move(c.id, 1)} className="rounded border p-1.5 hover:bg-secondary" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button
                onClick={() => { upsertHomeCard({ ...c, visible: !c.visible }); refresh() }}
                className={`rounded p-1.5 ${c.visible ? 'text-emerald-700' : 'text-gray-400'} hover:bg-secondary`}
                aria-label={c.visible ? 'Hide card' : 'Show card'}
              >
                {c.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              {c.custom && (
                <button onClick={() => { deleteHomeCard(c.id); refresh() }} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete card"><Trash2 className="h-4 w-4" /></button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Add a custom card</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Title *"><input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Link (path or URL)"><input className={input} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="/gk or https://…" /></Field>
          <Field label="Short description"><input className={input} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></Field>
          <Field label="Icon">
            <select className={input} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {Object.keys(cardIcons).map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
        </div>
        <button
          onClick={() => {
            if (!form.title.trim()) return alert('Title is required')
            upsertHomeCard({ id: `custom-${uid()}`, title: form.title, desc: form.desc, to: form.to || '/', icon: form.icon, visible: true, order: cards.length + 1, custom: true })
            setForm({ title: '', desc: '', to: '/', icon: 'Globe' })
            refresh()
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"
        >
          <Plus className="h-4 w-4" /> Add card
        </button>
      </div>
    </div>
  )
}

// ---------------- Updates & notifications ----------------
export function UpdatesEditor() {
  const [updates, setUpdates] = useState<SiteUpdate[]>(() => mergedUpdates())
  const [form, setForm] = useState({ title: '', body: '', tag: 'General', notify: true })

  function refresh() { setUpdates(mergedUpdates()) }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <h3 className="flex items-center gap-2 font-semibold text-pine"><BellRing className="h-4 w-4" /> Announce an update to visitors</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Updates appear in the bell icon at the top of the website. If “push notification” is on, visitors who enabled
          notifications also receive a browser notification for this update when they visit. Choose the audience tag
          (e.g. “Opinions” reaches only those who subscribed to opinion alerts).
        </p>
        <div className="mt-4 grid gap-3">
          <Field label="Title *"><input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. New opinion published: The Next 48 Hours" /></Field>
          <Field label="Message *"><textarea rows={3} className={textarea} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <div className="flex flex-wrap items-center gap-4">
            <Field label="Audience tag">
              <select className={input + ' w-44'} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
                {UPDATE_TAGS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <label className="mt-5 flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} className="h-4 w-4 accent-emerald-800" />
              Also send as a browser push notification
            </label>
          </div>
          <button
            onClick={() => {
              if (!form.title.trim() || !form.body.trim()) return alert('Title and message are required')
              upsertUpdate({ id: `upd-${uid()}`, title: form.title, body: form.body, tag: form.tag, notify: form.notify, date: new Date().toISOString().slice(0, 10) })
              setForm({ title: '', body: '', tag: 'General', notify: true })
              refresh()
            }}
            className="inline-flex w-fit items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"
          >
            <Bell className="h-4 w-4" /> Post update
          </button>
        </div>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Posted updates ({updates.length})</h3>
        <ul className="mt-3 divide-y">
          {updates.map((u) => (
            <li key={u.id} className="flex items-start gap-2 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{u.title}</span>
                  <Badge tone="green">{u.tag}</Badge>
                  {u.notify && <Badge tone="gold">Push</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{u.date} · {u.body.slice(0, 120)}</p>
              </div>
              <button onClick={() => { deleteUpdate(u.id); refresh() }} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete update"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
          {updates.length === 0 && <p className="py-4 text-sm text-muted-foreground">No updates posted yet.</p>}
        </ul>
      </div>
    </div>
  )
}

// ---------------- GK categories ----------------
export function CategoriesEditor() {
  const [idx, setIdx] = useState<BankIndex | null>(null)
  const [, force] = useState(0)
  const [newName, setNewName] = useState('')
  useEffect(() => { getBankIndex().then(setIdx) }, [])
  const overrides = mergedCategoryOverrides()

  if (!idx) return <p className="text-sm text-muted-foreground">Loading categories…</p>

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">GK World categories ({idx.categories.length})</h3>
        <p className="mt-1 text-xs text-muted-foreground">Rename a category or hide it from GK World. Question counts come from the central bank.</p>
        <ul className="mt-3 divide-y">
          {idx.categories.map((c) => {
            const o = overrides.find((x) => x.slug === c.slug)
            const hidden = o?.hidden ?? false
            const name = o?.name ?? c.name
            return (
              <li key={c.slug} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-bold text-pine">{c.count.toLocaleString()}</span>
                <input
                  className="h-9 min-w-0 flex-1 rounded-md border border-input px-2 text-sm"
                  value={name}
                  onChange={(e) => upsertCategoryOverride({ slug: c.slug, name: e.target.value, hidden })}
                  onBlur={() => force((f) => f + 1)}
                />
                <button
                  onClick={() => { upsertCategoryOverride({ slug: c.slug, name, hidden: !hidden }); force((f) => f + 1) }}
                  className={`rounded p-1.5 ${hidden ? 'text-gray-400' : 'text-emerald-700'} hover:bg-secondary`}
                  aria-label={hidden ? 'Show category' : 'Hide category'}
                >
                  {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Add a new category</h3>
        <p className="mt-1 text-xs text-muted-foreground">It will appear in GK World immediately; fill it with questions through MCQ Bulk Upload.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className={input + ' max-w-xs'} placeholder="New category name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button
            onClick={() => {
              const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
              if (!slug) return alert('Enter a category name')
              upsertCategoryOverride({ slug, name: newName.trim(), custom: true })
              setNewName('')
              alert('Category added. Note: upload MCQs for it via MCQ Bulk Upload using the subject name exactly as: ' + newName.trim())
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50"
          >
            <Plus className="h-4 w-4" /> Add category
          </button>
        </div>
        {overrides.filter((o) => o.custom).length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {overrides.filter((o) => o.custom).map((o) => (
              <li key={o.slug} className="flex items-center gap-2 text-sm">
                <Badge tone="gray">Custom</Badge> {o.name}
                <button onClick={() => { deleteCategoryOverride(o.slug); force((f) => f + 1) }} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------- MCQ manager & reported errors ----------------
export function McqManager() {
  const [reports, setReports] = useState(getReports())
  const [qid, setQid] = useState('')
  const [, force] = useState(0)
  const [editQ, setEditQ] = useState<{ id: string; q: string; o: string[]; a: number; e: string } | null>(null)
  const overrides = getAdminContent().mcqOverrides

  useEffect(() => {
    void getCloudReports().then(setReports)
  }, [])

  async function loadForEdit(id: string) {
    const q = await getQuestionById(id)
    if (!q) return alert('Question not found. Check the ID (e.g. capitals-120).')
    const o = getMcqOverride(id)
    setEditQ({ id, q: o?.q ?? q.q, o: o?.o ?? q.o, a: o?.a ?? q.a, e: o?.e ?? q.e ?? '' })
  }

  function saveEdit() {
    if (!editQ) return
    upsertMcqOverride({ id: editQ.id, q: editQ.q, o: editQ.o, a: editQ.a, e: editQ.e })
    setEditQ(null)
    force((f) => f + 1)
    alert('Correction saved and queued for cloud publishing.')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Reported errors ({reports.length})</h3>
        <p className="mt-1 text-xs text-muted-foreground">Reports from signed-in students are stored securely in the cloud. Guest reports remain on their device until they sign in. Fix the question, then remove the report.</p>
        <ul className="mt-3 divide-y">
          {reports.map((r) => {
            const o = getMcqOverride(r.questionId)
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <code className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{r.questionId}</code>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{r.note} · {r.date}</span>
                {o?.disabled ? <Badge tone="red">Disabled</Badge> : null}
                <button
                  onClick={() => { upsertMcqOverride({ id: r.questionId, disabled: !(o?.disabled), disputed: true }); force((f) => f + 1) }}
                  className="rounded border px-2 py-1 text-xs font-semibold hover:bg-secondary"
                >
                  {o?.disabled ? 'Re-enable' : 'Disable question'}
                </button>
                <button onClick={() => { deleteReport(r.id); setReports((current) => current.filter((item) => item.id !== r.id)) }} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </li>
            )
          })}
          {reports.length === 0 && <p className="py-3 text-sm text-muted-foreground">No reports - the bank is clean.</p>}
        </ul>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-pine">Correct or disable a question</h3>
        <p className="mt-1 text-xs text-muted-foreground">Paste the question ID (visible in reports) to edit its text, options, answer or explanation - or to hide it everywhere.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className={input + ' max-w-xs'} placeholder="e.g. capitals-120" value={qid} onChange={(e) => setQid(e.target.value)} />
          <button onClick={() => qid.trim() && loadForEdit(qid.trim())} className="rounded-md border px-4 py-2 text-sm font-semibold text-pine hover:bg-secondary">
            Load &amp; edit
          </button>
          <button
            onClick={() => {
              if (!qid.trim()) return
              const o = getMcqOverride(qid.trim())
              upsertMcqOverride({ id: qid.trim(), disabled: !(o?.disabled), disputed: o?.disputed ?? true })
              setQid('')
              force((f) => f + 1)
            }}
            className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50"
          >
            Toggle disable
          </button>
        </div>

        {editQ && (
          <div className="mt-4 space-y-3 rounded-md border bg-secondary/40 p-4">
            <Field label="Question">
              <textarea rows={2} className={textarea} value={editQ.q} onChange={(e) => setEditQ({ ...editQ, q: e.target.value })} />
            </Field>
            <div className="grid gap-2 sm:grid-cols-2">
              {editQ.o.map((opt, i) => (
                <Field key={i} label={`Option ${'ABCD'[i]}`}>
                  <input className={input} value={opt} onChange={(e) => setEditQ({ ...editQ, o: editQ.o.map((x, j) => (j === i ? e.target.value : x)) })} />
                </Field>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Correct answer">
                <select className={input} value={editQ.a} onChange={(e) => setEditQ({ ...editQ, a: parseInt(e.target.value, 10) })}>
                  {[0, 1, 2, 3].map((i) => <option key={i} value={i}>{'ABCD'[i]}</option>)}
                </select>
              </Field>
              <Field label="Explanation">
                <input className={input} value={editQ.e} onChange={(e) => setEditQ({ ...editQ, e: e.target.value })} />
              </Field>
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50">
                <Save className="h-4 w-4" /> Save correction
              </button>
              <button onClick={() => setEditQ(null)} className="rounded-md border px-4 py-2 text-sm font-semibold">Cancel</button>
            </div>
          </div>
        )}
        {overrides.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-xs">
            {overrides.map((o) => (
              <li key={o.id} className="flex items-center gap-2">
                <code className="rounded bg-secondary px-1.5 py-0.5">{o.id}</code>
                {o.disabled && <Badge tone="red">Disabled</Badge>}
                {o.disputed && <Badge tone="gold">Disputed</Badge>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------- Mentors ----------------
export function MentorsEditor() {
  const [, force] = useState(0)
  return (
    <div className="space-y-6">
      {mentors.map((m) => {
        const o: MentorOverride = getMentorOverride(m.id) ?? { id: m.id }
        return (
          <div key={m.id} className="rounded-lg border bg-white p-5">
            <h3 className="font-semibold text-pine">{m.name}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Display name">
                <input className={input} defaultValue={o.name ?? m.name} onBlur={(e) => { upsertMentorOverride({ ...o, id: m.id, name: e.target.value }); force((f) => f + 1) }} />
              </Field>
              <Field label="Role / title">
                <input className={input} defaultValue={o.role ?? m.role} onBlur={(e) => { upsertMentorOverride({ ...o, id: m.id, role: e.target.value }); force((f) => f + 1) }} />
              </Field>
              <Field label="WhatsApp number (international format, e.g. 923001202251)">
                <input className={input} defaultValue={o.whatsapp ?? m.whatsapp} onBlur={(e) => { upsertMentorOverride({ ...o, id: m.id, whatsapp: e.target.value }); force((f) => f + 1) }} />
              </Field>
              <Field label="Replace photograph (JPG/PNG, ≤ 1.5 MB)">
                <input type="file" accept=".jpg,.jpeg,.png" className="text-sm" onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  if (f.size > 1_500_000) return alert('Keep the photo under 1.5 MB.')
                  const data = await fileToDataUrl(f)
                  upsertMentorOverride({ ...o, id: m.id, photoData: data })
                  force((f) => f + 1)
                  alert('Photo updated on this device. Export site data to publish it.')
                }} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Bio / description">
                  <textarea rows={3} className={textarea} defaultValue={o.bio ?? m.bio} onBlur={(e) => { upsertMentorOverride({ ...o, id: m.id, bio: e.target.value }); force((f) => f + 1) }} />
                </Field>
              </div>
            </div>
          </div>
        )
      })}
      <p className="text-xs text-muted-foreground">Edits apply on this device immediately. Use Settings & Data → Export site data to publish for all visitors.</p>
    </div>
  )
}

// ---------------- Prices ----------------
export function PricesEditor() {
  const [, force] = useState(0)
  const items = [...noteProducts.map((p) => ({ id: p.id, label: p.subject, price: p.price ?? '' })), { id: 'bundle', label: bundle.title, price: bundle.price }]
  return (
    <div className="max-w-xl rounded-lg border bg-white p-5">
      <h3 className="font-semibold text-pine">Notes prices</h3>
      <p className="mt-1 text-xs text-muted-foreground">Change any price - the Notes Library updates immediately on this device. Leave empty to restore the default.</p>
      <div className="mt-4 space-y-3">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{it.label}</span>
            <input
              className={input + ' w-36'}
              defaultValue={getPriceOverride(it.id) ?? it.price}
              placeholder="e.g. PKR 6,000"
              onBlur={(e) => { setPriceOverride(it.id, e.target.value); force((f) => f + 1) }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
