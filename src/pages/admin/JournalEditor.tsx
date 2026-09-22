import { useEffect, useState } from 'react'
import { Eye, EyeOff, Pencil, Save, Star, Trash2 } from 'lucide-react'
import { Badge } from '@/components/shared'
import { ownerRequest } from '@/lib/hostingerApi'
import { JOURNAL_CATEGORIES, type JournalArticle } from '@/lib/journal'

type ArticleForm = {
  id: string
  title: string
  category: string
  author: string
  author_role: string
  excerpt: string
  body: string
  published_on: string
  featured: boolean
}

const input = 'h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const textarea = 'w-full rounded-md border border-input bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-ring'

function today() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function emptyArticle(): ArticleForm {
  return {
    id: '',
    title: '',
    category: 'Analysis',
    author: '',
    author_role: '',
    excerpt: '',
    body: '',
    published_on: today(),
    featured: false,
  }
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}{required ? ' *' : ''}
      <div className="mt-1">{children}</div>
    </label>
  )
}

export default function JournalEditor() {
  const [articles, setArticles] = useState<JournalArticle[]>([])
  const [form, setForm] = useState<ArticleForm>(() => emptyArticle())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const result = await ownerRequest<{ articles: JournalArticle[] }>('admin/journal.php')
      setArticles(Array.isArray(result.articles) ? result.articles : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Journal articles could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function validate() {
    if (!form.title.trim()) return 'Title is required.'
    if (!form.category.trim()) return 'Category is required.'
    if (!form.author.trim()) return 'Author name is required.'
    if (!form.excerpt.trim()) return 'Short summary is required.'
    if (!form.body.trim()) return 'Full article text is required.'
    if (!form.published_on) return 'Publication date is required.'
    return ''
  }

  async function save(published: boolean) {
    const validation = validate()
    if (validation) { setError(validation); return }
    setSaving(true); setError(''); setNotice('')
    try {
      await ownerRequest<{ article: JournalArticle }>('admin/journal.php', {
        method: 'POST',
        body: JSON.stringify({
          article: {
            ...form,
            published,
          },
        }),
      })
      setNotice(published ? 'Article published successfully. It is now available in VISTA Journal.' : 'Draft saved successfully.')
      setForm(emptyArticle())
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The article could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  function edit(article: JournalArticle) {
    setForm({
      id: article.id,
      title: article.title,
      category: article.category,
      author: article.author,
      author_role: article.author_role || '',
      excerpt: article.excerpt,
      body: article.body,
      published_on: article.published_on,
      featured: article.featured,
    })
    setNotice('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function patch(article: JournalArticle, values: Partial<JournalArticle>) {
    setSaving(true); setError(''); setNotice('')
    try {
      await ownerRequest<{ article: JournalArticle }>('admin/journal.php', {
        method: 'POST',
        body: JSON.stringify({ article: { ...article, ...values } }),
      })
      setNotice(values.published === false ? 'Article unpublished.' : values.published === true ? 'Article published.' : 'Article updated.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The article could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(article: JournalArticle) {
    if (!confirm(`Delete “${article.title}” permanently?`)) return
    setSaving(true); setError(''); setNotice('')
    try {
      await ownerRequest<{ ok: boolean }>('admin/journal.php', {
        method: 'DELETE',
        body: JSON.stringify({ id: article.id }),
      })
      if (form.id === article.id) setForm(emptyArticle())
      setNotice('Article deleted.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The article could not be deleted.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">VISTA Journal Publisher</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-pine">{form.id ? 'Edit article' : 'Publish a new article'}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Fill the required fields and press Publish. No image is required. The article will appear publicly in text form.
            </p>
          </div>
          {form.id && <Badge tone="gold">Editing existing article</Badge>}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Article title" required>
              <input className={input} maxLength={240} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Write the final publication title" />
            </Field>
          </div>

          <Field label="Category" required>
            <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {JOURNAL_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </Field>

          <Field label="Publication date" required>
            <input type="date" className={input} value={form.published_on} onChange={(e) => setForm({ ...form, published_on: e.target.value })} />
          </Field>

          <Field label="Author name" required>
            <input className={input} maxLength={180} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="e.g. Ali Hassan Sargana" />
          </Field>

          <Field label="Author designation">
            <input className={input} maxLength={180} value={form.author_role} onChange={(e) => setForm({ ...form, author_role: e.target.value })} placeholder="Optional: PAS Officer, Researcher, Student, etc." />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Short summary" required>
              <textarea className={textarea} rows={3} maxLength={1200} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="2–4 lines shown on the Journal homepage before the reader opens the article." />
            </Field>
            <p className="mt-1 text-right text-xs text-muted-foreground">{form.excerpt.length}/1200</p>
          </div>

          <div className="sm:col-span-2">
            <Field label="Full article" required>
              <textarea
                className={textarea + ' min-h-[420px] font-serif leading-7'}
                maxLength={120000}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder={"Paste or write the complete article here.\n\nLeave a blank line between paragraphs.\nUse ## Heading for a section heading.\nUse - item for a simple bullet list."}
              />
            </Field>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Plain text is safest. Simple ## headings and - bullet lists are supported.</span>
              <span>{form.body.length.toLocaleString()}/120,000</span>
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-lg border bg-secondary/30 p-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="h-4 w-4 accent-emerald-800"
            />
            <Star className="h-4 w-4 text-amber-600" />
            Make this the featured Journal article
          </label>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {notice && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-pine px-5 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : form.id ? 'Save & publish' : 'Publish article'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(false)}
            className="min-h-11 rounded-md border bg-white px-5 text-sm font-semibold text-pine hover:bg-secondary disabled:opacity-50"
          >
            Save draft
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyArticle())} className="min-h-11 rounded-md border px-5 text-sm hover:bg-secondary">
              Cancel editing
            </button>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-pine">Journal articles</h2>
            <p className="mt-1 text-sm text-muted-foreground">Edit, feature, unpublish or remove previously created text articles.</p>
          </div>
          <Badge tone="gray">{articles.length}</Badge>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-muted-foreground">Loading journal articles…</p>
        ) : articles.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No text articles have been published yet. Your first article will appear here after you save it.
          </div>
        ) : (
          <div className="mt-4 divide-y">
            {articles.map((article) => (
              <article key={article.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-pine">{article.title}</h3>
                    {article.featured && <Badge tone="gold">Featured</Badge>}
                    {article.published ? <Badge>Published</Badge> : <Badge tone="gray">Draft</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{article.category} · {article.author} · {article.published_on}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => edit(article)} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-secondary">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void patch(article, { published: !article.published })}
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    {article.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {article.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void patch(article, { featured: !article.featured })}
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    <Star className="h-3.5 w-3.5" /> {article.featured ? 'Remove feature' : 'Feature'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void remove(article)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
