import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Download, Expand, ExternalLink,
  FileText, Maximize2, MessageCircle, Minimize2, RotateCcw, ZoomIn, ZoomOut,
  RefreshCw,
} from 'lucide-react'
import { Badge, EmptyState, PageHeader } from '@/components/shared'
import { findNoteDocument, notesPurchaseActionLabel } from '@/data/notes'
import { mentors, waLink } from '@/data/site'
import { formatFileSize, safeDownloadName } from '@/lib/resourceFiles'

function useDocumentMetadata(title: string | undefined) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} Sample Notes | CSS Vista`
    return () => { document.title = previous }
  }, [title])
}

export default function NoteViewer() {
  const { productId, documentId } = useParams()
  const record = findNoteDocument(productId, documentId)
  const noteDoc = record?.document
  const product = record?.product
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [pdfAvailable, setPdfAvailable] = useState<boolean | null>(null)
  const [pdfRetry, setPdfRetry] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const viewerRef = useRef<HTMLDivElement>(null)
  useDocumentMetadata(noteDoc?.title)

  useEffect(() => {
    if (!noteDoc || noteDoc.kind !== 'pdf' || !noteDoc.url) {
      setPdfAvailable(null)
      return
    }
    let active = true
    setPdfAvailable(null)
    fetch(noteDoc.url, { method: 'HEAD' })
      .then((response) => {
        const type = response.headers.get('content-type')?.toLowerCase() ?? ''
        if (active) setPdfAvailable(response.ok && type.includes('application/pdf'))
      })
      .catch(() => active && setPdfAvailable(false))
    return () => { active = false }
  }, [noteDoc, pdfRetry])

  useEffect(() => {
    const update = () => setIsFullscreen(document.fullscreenElement === viewerRef.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])

  const goToPage = useCallback((nextPage: number) => {
    if (!noteDoc) return
    const bounded = Math.max(1, Math.min(noteDoc.pages, nextPage))
    viewerRef.current?.querySelector<HTMLElement>(`[data-note-page="${bounded}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setPage(bounded)
  }, [noteDoc])

  useEffect(() => {
    if (!noteDoc || noteDoc.kind !== 'image-pages') return
    const root = viewerRef.current?.querySelector('[data-page-scroller]') ?? null
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setPage(Number((visible.target as HTMLElement).dataset.page ?? 1))
    }, { root, threshold: [0.45, 0.7] })
    viewerRef.current?.querySelectorAll('[data-note-page]').forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [noteDoc])

  useEffect(() => {
    if (!noteDoc || noteDoc.kind !== 'image-pages') return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') goToPage(page - 1)
      if (event.key === 'ArrowRight' || event.key === 'PageDown') goToPage(page + 1)
      if (event.key === '+' || event.key === '=') setZoom((value) => Math.min(160, value + 10))
      if (event.key === '-') setZoom((value) => Math.max(60, value - 10))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goToPage, noteDoc, page])

  async function toggleFullscreen() {
    if (!viewerRef.current || !document.fullscreenEnabled) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await viewerRef.current.requestFullscreen()
  }

  if (!record || !product || !noteDoc) {
    return (
      <div>
        <PageHeader title="Notes Viewer" description="Open an authorised public sample from the CSS Vista Notes Library." />
        <main className="mx-auto max-w-4xl px-4 py-12">
          <EmptyState title="This sample is unavailable" hint="Return to the Notes Library and select another authorised sample." />
          <p className="mt-5 text-center"><Link to="/notes" className="font-bold text-emerald-800 underline underline-offset-2">Return to Notes Library</Link></p>
        </main>
      </div>
    )
  }

  const ali = mentors.find((mentor) => mentor.id === 'ali')!
  const inquiry = waLink(ali.whatsapp, `Assalam-o-Alaikum, I would like to inquire about the ${product.subject} notes available on CSS VISTA. Please share the price and purchase details.`)
  const pdfName = safeDownloadName(`${product.subject}-${noteDoc.title}`)

  return (
    <div>
      <PageHeader title={noteDoc.title} description={`${noteDoc.kind === 'pdf' ? 'Complete supplied note' : 'Three-page preview'} from ${product.subject}.`}>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="green">{noteDoc.kind === 'pdf' ? 'Complete supplied note' : 'Preview'}</Badge>
          <Badge tone="gray">{noteDoc.kind === 'pdf' ? 'PDF document' : 'Page images'}</Badge>
          <Badge tone="gray">{noteDoc.pages} pages</Badge>
          <Badge tone="gray">{formatFileSize(noteDoc.sizeBytes)}</Badge>
        </div>
      </PageHeader>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-7">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3 shadow-sm">
          <Link to="/notes" className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-bold text-pine hover:bg-secondary"><ArrowLeft className="h-4 w-4" /> Notes Library</Link>
          <span className="mr-auto text-sm text-muted-foreground">{noteDoc.kind === 'pdf' ? 'Complete supplied document' : 'Available preview'} · {noteDoc.pages} pages</span>
          {noteDoc.kind === 'pdf' && noteDoc.url && pdfAvailable && <>
            <a href={noteDoc.url} target="_blank" rel="noopener noreferrer" data-google-vignette="false" className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-bold text-pine hover:bg-secondary"><ExternalLink className="h-4 w-4" /> Open PDF</a>
            <a href={noteDoc.url} download={pdfName} data-google-vignette="false" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-pine px-3 text-sm font-bold text-white hover:bg-emerald-900"><Download className="h-4 w-4" /> Download PDF</a>
          </>}
          <a href={inquiry} target="_blank" rel="noopener noreferrer" data-google-vignette="false" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700"><MessageCircle className="h-4 w-4" /> {notesPurchaseActionLabel}</a>
        </div>

        {noteDoc.kind === 'image-pages' ? (
          <section ref={viewerRef} aria-label={`${noteDoc.title} complete sample viewer`} className="overflow-hidden rounded-xl border bg-slate-900 text-white shadow-lg">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/15 bg-slate-950 px-3 py-2.5">
              <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 1} className="grid h-9 w-9 place-items-center rounded-lg border border-white/20 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              <label className="flex items-center gap-1 text-sm"><span className="sr-only">Current page</span><input type="number" min={1} max={noteDoc.pages} value={page} onChange={(event) => goToPage(Number(event.target.value))} className="h-9 w-16 rounded-lg border border-white/20 bg-white/10 px-2 text-center" /> <span className="text-white/65">of {noteDoc.pages}</span></label>
              <button type="button" onClick={() => goToPage(page + 1)} disabled={page === noteDoc.pages} className="grid h-9 w-9 place-items-center rounded-lg border border-white/20 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
              <span className="mx-1 h-6 w-px bg-white/15" />
              <button type="button" onClick={() => setZoom((value) => Math.max(60, value - 10))} className="grid h-9 w-9 place-items-center rounded-lg border border-white/20" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
              <span className="w-12 text-center text-xs font-bold">{zoom}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(160, value + 10))} className="grid h-9 w-9 place-items-center rounded-lg border border-white/20" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
              <button type="button" onClick={() => setZoom(100)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/20" aria-label="Reset zoom"><RotateCcw className="h-4 w-4" /></button>
              <button type="button" onClick={() => setZoom(75)} className="hidden h-9 items-center gap-1 rounded-lg border border-white/20 px-3 text-xs font-bold sm:inline-flex"><Expand className="h-4 w-4" /> Fit width</button>
              <button type="button" onClick={() => setZoom(60)} className="hidden h-9 items-center gap-1 rounded-lg border border-white/20 px-3 text-xs font-bold lg:inline-flex">Fit page</button>
              <button type="button" onClick={toggleFullscreen} className="ml-auto grid h-9 w-9 place-items-center rounded-lg border border-white/20" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
            </div>
            <div data-page-scroller className="h-[72vh] min-h-[520px] overflow-auto overscroll-contain bg-slate-800 px-3 py-5 sm:px-6">
              <div className="mx-auto space-y-5" style={{ width: `${zoom}%`, maxWidth: `${zoom * 10}px` }}>
                {Array.from({ length: noteDoc.pages }, (_, index) => (
                  <figure key={index} data-note-page={index + 1} className="scroll-mt-4 overflow-hidden rounded bg-white shadow-2xl">
                    <img src={`/note-previews/${noteDoc.previewFolder}/page-${index + 1}.webp`} alt={`${noteDoc.title}, page ${index + 1} of ${noteDoc.pages}`} loading={index === 0 ? 'eager' : 'lazy'} draggable={false} className="w-full" />
                    <figcaption className="border-t px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">CSS Vista sample · Page {index + 1} of {noteDoc.pages}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        ) : pdfAvailable === false ? (
          <section role="alert" className="rounded-xl border bg-white p-6 text-center">
            <FileText className="mx-auto h-9 w-9 text-muted-foreground" />
            <h2 className="mt-3 font-display text-xl font-bold text-pine">Sample PDF is temporarily unavailable</h2>
            <p className="mt-1 text-sm text-muted-foreground">The document could not be verified. Return to the library or retry after refreshing this page.</p>
            <button type="button" onClick={() => setPdfRetry((value) => value + 1)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-bold text-pine hover:bg-secondary"><RefreshCw className="h-4 w-4" /> Retry</button>
          </section>
        ) : (
          <section aria-label={`${noteDoc.title} PDF viewer`} className="overflow-hidden rounded-xl border bg-white shadow-sm">
            {pdfAvailable === null && <p className="p-4 text-sm text-muted-foreground" role="status" aria-live="polite">Verifying the authorised PDF…</p>}
            {noteDoc.url && <iframe src={noteDoc.url} title={`${noteDoc.title}, ${noteDoc.pages}-page sample`} className="h-[76vh] min-h-[560px] w-full" />}
          </section>
        )}

        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-950">
          This viewer contains every supplied page of this file. PDF entries are shown in full; three-page image entries remain labelled as previews because no complete source file is present in the project.
        </p>
      </main>
    </div>
  )
}
