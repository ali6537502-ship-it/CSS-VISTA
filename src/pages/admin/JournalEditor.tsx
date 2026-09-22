import { useEffect, useState } from 'react'
import { Eye, EyeOff, ImagePlus, Pencil, Save, Star, Trash2, UserRound } from 'lucide-react'
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
  cover_url?: string
  author_photo_url?: string
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
    cover_url: '',
    author_photo_url: '',
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

function ownerCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)cssv_owner_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function uploadJournalMedia(articleId: string, kind: 'cover' | 'author', file: File) {
  const token = ownerCsrfToken()
  const body = new FormData()
  body.set('article_id', articleId)
  body.set('kind', kind)
  body.set('image', file)

  const response = await fetch('/api/admin/journal-media.php', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(token ? { 'X-CSRF-Token': token } : {}),
    },
    body,
  })
  const data = await response.json().catch(() => ({})) as { message?: string; url?: string }
  if (!response.ok) throw new Error(data.message || 'The image could not be uploaded.')
  return data.url || ''
}

function filePreview(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The selected image could not be previewed.'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })
}

function adminMediaUrl(article: JournalArticle | ArticleForm, kind: 'cover' | 'author') {
  if (!article.id) return ''
  const hasImage = kind === 'cover' ? Boolean(article.cover_url) : Boolean(article.author_photo_url)
  if (!hasImage) return ''
  const version = 'updated_at' in article ? String(article.updated_at || '') : String(Date.now())
  return `/api/admin/journal-media.php?id=${encodeURIComponent(article.id)}&kind=${kind}&v=${encodeURIComponent(version)}`
}

export default function JournalEditor() {
  const [articles, setArticles] = useState<JournalArticle[]>([])
  const [form, setForm] = useState<ArticleForm>(() => emptyArticle())
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [authorPhotoFile, setAuthorPhotoFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [authorPhotoPreview, setAuthorPhotoPreview] = useState('')
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

  function resetEditor() {
    setForm(emptyArticle())
    setCoverFile(null)
    setAuthorPhotoFile(null)
    setCoverPreview('')
    setAuthorPhotoPreview('')
  }

  function validate() {
    if (!form.title.trim()) return 'Title is required.'
    if (!form.category.trim()) return 'Category is required.'
    if (!form.author.trim()) return 'Author name is required.'
    if (!form.excerpt.trim()) return 'Short summary is required.'
    if (!form.body.trim()) return 'Full article text is required.'
    if (!form.published_on) return 'Publication date is required.'
    return ''
  }

  async function chooseImage(file: File | undefined, kind: 'cover' | 'author') {
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Use a JPG, PNG, or WebP image.')
      return
    }
    const max = kind === 'cover' ? 5 * 1024 * 1024 : 2 * 1024 * 1024
    if (file.size > max) {
      setError(kind === 'cover' ? 'Cover image must be 5 MB or smaller.' : 'Author photo must be 2 MB or smaller.')
      return
    }

    try {
      const preview = await filePreview(file)
      if (kind === 'cover') {
        setCoverFile(file)
        setCoverPreview(preview)
      } else {
        setAuthorPhotoFile(file)
        setAuthorPhotoPreview(preview)
      }
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The image could not be previewed.')
    }
  }

  async function save(published: boolean) {
    const validation = validate()
    if (validation) { setError(validation); return }
    setSaving(true); setError(''); setNotice('')

    try {
      const result = await ownerRequest<{ article: JournalArticle }>('admin/journal.php', {
        method: 'POST',
        body: JSON.stringify({
          article: {
            ...form,
            published,
          },
        }),
      })

      try {
        if (coverFile) await uploadJournalMedia(result.article.id, 'cover', coverFile)
        if (authorPhotoFile) await uploadJournalMedia(result.article.id, 'author', authorPhotoFile)
      } catch (mediaError) {
        setForm((current) => ({ ...current, id: result.article.id }))
        setNotice(published ? 'The article was published, but one image still needs to be uploaded.' : 'The draft was saved, but one image still needs to be uploaded.')
        setError(mediaError instanceof Error ? mediaError.message : 'One image could not be uploaded.')
        await load()
        return
      }

      setNotice(published ? 'Article published successfully. It is now available in VISTA Journal.' : 'Draft saved successfully.')
      resetEditor()
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
      cover_url: article.cover_url || '',
      author_photo_url: article.author_photo_url || '',
    })
    setCoverFile(null)
    setAuthorPhotoFile(null)
    setCoverPreview('')
    setAuthorPhotoPreview('')
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

  async function removeMedia(kind: 'cover' | 'author') {
    if (kind === 'cover' && coverPreview) {
      setCoverFile(null)
      setCoverPreview('')
      return
    }
    if (kind === 'author' && authorPhotoPreview) {
      setAuthorPhotoFile(null)
      setAuthorPhotoPreview('')
      return
    }
    if (!form.id) return

    setSaving(true); setError(''); setNotice('')
    try {
      await ownerRequest<{ ok: boolean }>('admin/journal-media.php', {
        method: 'DELETE',
        body: JSON.stringify({ id: form.id, kind }),
      })
      if (kind === 'cover') {
        setCoverFile(null)
        setCoverPreview('')
        setForm((current) => ({ ...current, cover_url: '' }))
      } else {
        setAuthorPhotoFile(null)
        setAuthorPhotoPreview('')
        setForm((current) => ({ ...current, author_photo_url: '' }))
      }
      setNotice(kind === 'cover' ? 'Cover image removed.' : 'Author photo removed.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The image could not be removed.')
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
      if (form.id === article.id) resetEditor()
      setNotice('Article deleted.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The article could not be deleted.')
    } finally {
      setSaving(false)
    }
  }

  const existingCover = form.cover_url ? adminMediaUrl(form, 'cover') : ''
  const existingAuthorPhoto = form.author_photo_url ? adminMediaUrl(form, 'author') : ''

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">VISTA Journal Publisher</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-pine">{form.id ? 'Edit article' : 'Publish a new article'}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Fill the required fields and press Publish. Cover image and author photo are optional.
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

          <div className="sm:col-span-2 grid gap-4 lg:grid-cols-[1.6fr_0.8fr]">
            <div className="rounded-xl border bg-secondary/20 p-4">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-pine">Article cover image <span className="font-normal text-muted-foreground">(optional)</span></h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or WebP · up to 5 MB. A wide editorial image works best.</p>
              {(coverPreview || existingCover) && (
                <div className="mt-3 overflow-hidden rounded-lg border bg-white">
                  <img src={coverPreview || existingCover} alt="Article cover preview" className="h-52 w-full object-cover" />
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-xs font-semibold hover:bg-secondary">
                  <ImagePlus className="h-3.5 w-3.5" /> {coverPreview || existingCover ? 'Replace cover' : 'Choose cover'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void chooseImage(event.target.files?.[0], 'cover')} />
                </label>
                {(coverPreview || existingCover) && (
                  <button type="button" disabled={saving} onClick={() => void removeMedia('cover')} className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                    Remove cover
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-secondary/20 p-4">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-pine">Author photo <span className="font-normal text-muted-foreground">(optional)</span></h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or WebP · up to 2 MB. A clear portrait works best.</p>
              <div className="mt-3 flex justify-center">
                {(authorPhotoPreview || existingAuthorPhoto) ? (
                  <img src={authorPhotoPreview || existingAuthorPhoto} alt="Author photo preview" className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-sm" />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border bg-white text-muted-foreground">
                    <UserRound className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-xs font-semibold hover:bg-secondary">
                  <UserRound className="h-3.5 w-3.5" /> {authorPhotoPreview || existingAuthorPhoto ? 'Replace photo' : 'Choose photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void chooseImage(event.target.files?.[0], 'author')} />
                </label>
                {(authorPhotoPreview || existingAuthorPhoto) && (
                  <button type="button" disabled={saving} onClick={() => void removeMedia('author')} className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

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
            <button type="button" onClick={resetEditor} className="min-h-11 rounded-md border px-5 text-sm hover:bg-secondary">
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
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {article.author_photo_url ? (
                    <img src={adminMediaUrl(article, 'author')} alt="" className="h-11 w-11 shrink-0 rounded-full border object-cover" />
                  ) : article.cover_url ? (
                    <img src={adminMediaUrl(article, 'cover')} alt="" className="h-11 w-16 shrink-0 rounded border object-cover" />
                  ) : null}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-pine">{article.title}</h3>
                      {article.featured && <Badge tone="gold">Featured</Badge>}
                      {article.published ? <Badge>Published</Badge> : <Badge tone="gray">Draft</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{article.category} · {article.author} · {article.published_on}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>
                  </div>
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
