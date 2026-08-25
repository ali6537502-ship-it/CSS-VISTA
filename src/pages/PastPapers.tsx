import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Search, Eye, FileText, Bookmark, BookmarkCheck, Download } from 'lucide-react'
import { PageHeader, Badge, EmptyState } from '@/components/shared'
import PrintMenu from '@/components/PrintMenu'
import { examinations, subjectTypes, paperModes, type PastPaper } from '@/data/pastPapers'
import { pastPapers as seedPapers } from '@/data/pastPapers'
import { mergedPastPapers } from '@/lib/admin'
import { toggleBookmark, isBookmarked } from '@/lib/store'
import { recordActivity } from '@/lib/progress'
import { optionalGroups } from '@/data/syllabus'
import { formatFileSize, safeDownloadName } from '@/lib/resourceFiles'

const PAPERS_PER_PAGE = 30

interface PdfFileMetadata {
  pages: number
  sizeBytes: number
}

const optionalGroupBySubject = new Map(
  optionalGroups.flatMap((group) => group.subjects.map((subject) => [subject.name, group.group] as const)),
)

function groupForPaper(paper: PastPaper) {
  return paper.optionalGroup ?? optionalGroupBySubject.get(paper.subject)
}

export default function PastPapers() {
  const routeParams = useParams<{ exam?: string; year?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const papers = useMemo(() => mergedPastPapers(seedPapers), [])
  const routeExam = examinations.find((name) => name.toLowerCase() === routeParams.exam?.toLowerCase()) ?? 'All'
  const routeYear = /^\d{4}$/.test(routeParams.year ?? '') ? routeParams.year! : 'All'
  const [q, setQ] = useState(() => searchParams.get('search') ?? '')
  const [exam, setExam] = useState(() => routeExam !== 'All' ? routeExam : searchParams.get('exam') ?? 'All')
  const [subject, setSubject] = useState(() => searchParams.get('subject') ?? 'All')
  const [year, setYear] = useState(() => routeYear !== 'All' ? routeYear : searchParams.get('year') ?? 'All')
  const [stype, setStype] = useState(() => searchParams.get('subjectType') ?? 'All')
  const [optionalGroup, setOptionalGroup] = useState(() => searchParams.get('group') ?? 'All')
  const [mode, setMode] = useState(() => searchParams.get('mode') ?? 'All')
  const [savedOnly, setSavedOnly] = useState(() => searchParams.get('saved') === '1')
  const [currentPage, setCurrentPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1))
  const [pdfIndex, setPdfIndex] = useState<Record<string, PdfFileMetadata>>({})
  const filtersMounted = useRef(false)
  const [, forceRefresh] = useState(0)
  const isYearCollection = routeExam !== 'All' && routeYear !== 'All'
  const pageTitle = isYearCollection ? `${routeExam} ${routeYear} Past Papers` : 'Past Papers'
  const pageDescription = isYearCollection
    ? `Browse the owner-provided ${routeExam} ${routeYear} watermarked past-paper PDFs in this verified collection.`
    : 'Owner-provided watermarked CSS, PMS, PPSC and MPT past-paper PDFs organised by examination, subject and year.'

  useEffect(() => {
    const controller = new AbortController()
    fetch('/pdf-page-counts.json', { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<Record<string, PdfFileMetadata>> : {})
      .then((records) => setPdfIndex(records))
      .catch(() => { /* Cards remain usable when optional file metadata is blocked. */ })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const defaultTitle = 'CSS Vista - CSS Exam Preparation Platform'
    const title = isYearCollection ? `${pageTitle} — All Subjects | CSS Vista` : 'CSS, PMS, PPSC & MPT Past Papers | CSS Vista'
    document.title = title
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const previousDescription = description?.content
    if (description) description.content = pageDescription
    return () => {
      document.title = defaultTitle
      if (description && previousDescription) description.content = previousDescription
    }
  }, [isYearCollection, pageDescription, pageTitle])

  const papersForSelectedExam = papers.filter((paper) => exam === 'All' || paper.examination === exam)
  const years = [...new Set(papersForSelectedExam.map((p) => p.year))].sort((a, b) => b - a)
  const subjects = [...new Set(papersForSelectedExam.map((p) => p.subject))].sort((a, b) => a.localeCompare(b))
  const examinationCounts = examinations
    .map((name) => ({ name, count: papers.filter((paper) => paper.examination === name).length }))
    .filter(({ count }) => count > 0)
  const optionalGroupOptions = [
    ...new Set(
      papers
        .filter((paper) => paper.subjectType === 'Optional' && (exam === 'All' || paper.examination === exam))
        .map(groupForPaper)
        .filter((group): group is string | number => group !== undefined),
    ),
  ].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))

  const filtered = papers.filter(
    (p) =>
      (exam === 'All' || p.examination === exam) &&
      (subject === 'All' || p.subject === subject) &&
      (year === 'All' || p.year === Number(year)) &&
      (stype === 'All' || p.subjectType === stype) &&
      (optionalGroup === 'All' || (p.subjectType === 'Optional' && String(groupForPaper(p)) === optionalGroup)) &&
      (mode === 'All' || p.mode === mode) &&
      (!savedOnly || isBookmarked(`pp-${p.id}`)) &&
      (!q || `${p.examination} ${p.year} ${p.title} ${p.subject} past paper`.toLowerCase().includes(q.toLowerCase()))
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAPERS_PER_PAGE))
  const pagedPapers = filtered.slice((currentPage - 1) * PAPERS_PER_PAGE, currentPage * PAPERS_PER_PAGE)

  useEffect(() => {
    if (!filtersMounted.current) {
      filtersMounted.current = true
      return
    }
    setCurrentPage(1)
  }, [exam, mode, optionalGroup, q, savedOnly, stype, subject, year])

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount)
  }, [currentPage, pageCount])

  useEffect(() => {
    const next = new URLSearchParams()
    if (q.trim()) next.set('search', q.trim())
    if (exam !== 'All') next.set('exam', exam)
    if (subject !== 'All') next.set('subject', subject)
    if (year !== 'All') next.set('year', year)
    if (stype !== 'All') next.set('subjectType', stype)
    if (optionalGroup !== 'All') next.set('group', optionalGroup)
    if (mode !== 'All') next.set('mode', mode)
    if (savedOnly) next.set('saved', '1')
    if (currentPage > 1) next.set('page', String(currentPage))
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [currentPage, exam, mode, optionalGroup, q, savedOnly, searchParams, setSearchParams, stype, subject, year])

  const grouped = useMemo(() => {
    const map = new Map<string, PastPaper[]>()
    for (const p of pagedPapers) {
      const group = p.subjectType === 'Optional' ? `Optional Group ${groupForPaper(p) ?? '-'}` : p.subjectType
      const key = `${p.examination} · ${group} · ${p.subject}`
      map.set(key, [...(map.get(key) ?? []), p])
    }
    return [...map.entries()]
      .map(([key, list]) => [key, [...list].sort((a, b) => b.year - a.year || a.paper.localeCompare(b.paper))] as const)
      .sort(([, a], [, b]) => {
        const first = a[0]
        const second = b[0]
        if (first.examination !== second.examination) return first.examination.localeCompare(second.examination)
        if (first.subjectType !== second.subjectType) {
          const order = { Compulsory: 0, General: 1, Optional: 2 }
          return order[first.subjectType] - order[second.subjectType]
        }
        const groupDifference = String(groupForPaper(first) ?? '').localeCompare(
          String(groupForPaper(second) ?? ''),
          undefined,
          { numeric: true },
        )
        return groupDifference || first.subject.localeCompare(second.subject)
      })
  }, [pagedPapers])

  const pagination = pageCount > 1 && (
    <nav aria-label="Past paper archive pages" className="no-print flex flex-wrap items-center justify-center gap-2 rounded-xl border bg-white p-3">
      <button type="button" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="h-9 rounded-lg border px-3 text-sm font-bold text-pine disabled:opacity-40">Previous</button>
      <span className="px-2 text-sm text-muted-foreground">Page <strong className="text-pine">{currentPage}</strong> of {pageCount} · {filtered.length} papers</span>
      <button type="button" onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="h-9 rounded-lg border px-3 text-sm font-bold text-pine disabled:opacity-40">Next</button>
    </nav>
  )

  return (
    <div>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      >
        <div className="no-print mt-4 flex flex-wrap items-center gap-2">
          <PrintMenu answersAvailable={false} label="Print list" />
          <button
            onClick={() => setSavedOnly(!savedOnly)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold ${savedOnly ? 'bg-pine text-emerald-50' : 'border bg-white text-pine hover:bg-secondary'}`}
          >
            <Bookmark className="h-4 w-4" /> {savedOnly ? 'Showing saved only' : 'Show saved papers'}
          </button>
        </div>
      </PageHeader>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <section aria-label="Past paper categories" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {examinationCounts.map(({ name, count }) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setExam(name)
                setOptionalGroup('All')
                setSubject('All')
                setYear('All')
              }}
              aria-pressed={exam === name}
              className={`rounded-lg border p-4 text-left transition-colors ${
                exam === name
                  ? 'border-pine bg-pine text-emerald-50'
                  : 'bg-white text-foreground hover:border-emerald-700/40 hover:bg-emerald-50'
              }`}
            >
              <span className="block font-display text-lg font-bold">{name} Past Papers</span>
              <span className={`mt-1 block text-sm ${exam === name ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                {count} papers
                {name === 'PMS' ? ' · Compulsory and Groups A–G' : ''}
              </span>
            </button>
          ))}
        </section>

        {/* Filters */}
        <div className="grid gap-2.5 rounded-lg border bg-white p-4 sm:grid-cols-3 lg:grid-cols-7">
          <div className="relative sm:col-span-3 lg:col-span-2">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search papers…" className="h-10 w-full rounded-md border border-input pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" aria-label="Search past papers" />
          </div>
          <select
            value={exam}
            onChange={(e) => {
              setExam(e.target.value)
              setOptionalGroup('All')
              setSubject('All')
              setYear('All')
            }}
            className="h-10 rounded-md border border-input px-2 text-sm"
            aria-label="Examination"
          >
            <option value="All">Examination</option>{examinations.map((e) => <option key={e}>{e}</option>)}
          </select>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 rounded-md border border-input px-2 text-sm" aria-label="Subject">
            <option value="All">Subject</option>{subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={stype} onChange={(e) => setStype(e.target.value)} className="h-10 rounded-md border border-input px-2 text-sm" aria-label="Compulsory or optional">
            <option value="All">Subject type</option>{subjectTypes.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={optionalGroup} onChange={(e) => setOptionalGroup(e.target.value)} className="h-10 rounded-md border border-input px-2 text-sm" aria-label="Optional subject group">
            <option value="All">Optional group</option>{optionalGroupOptions.map((group) => <option key={group} value={group}>Group {group}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2.5">
            <select value={year} onChange={(e) => setYear(e.target.value)} className="h-10 rounded-md border border-input px-2 text-sm" aria-label="Year">
              <option value="All">Year</option>{years.map((y) => <option key={y}>{y}</option>)}
            </select>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="h-10 rounded-md border border-input px-2 text-sm" aria-label="Objective or subjective">
              <option value="All">Paper type</option>{paperModes.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Papers list */}
        {papers.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-secondary/40 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h2 className="mt-3 font-semibold text-foreground">No verified past papers are available</h2>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
              Only owner-provided or official documents are published. Please return after verified papers have been added to the archive.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No papers match your filters" hint="Try clearing a filter or the search term." />
        ) : (
          <div className="space-y-4">
            {pagination}
            <div className="print-area space-y-6">
            {grouped.map(([group, list]) => (
              <div key={group}>
                <h2 className="font-display text-lg font-bold text-pine">{group}</h2>
                <div className="mt-2 grid gap-2">
                  {list.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-white px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground">{p.title}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                          <Badge tone="gray">{p.examination}</Badge>
                          <Badge tone="gray">{p.year}</Badge>
                          <Badge tone="gray">{p.subjectType}</Badge>
                          {p.subjectType === 'Optional' && <Badge tone="gray">Group {groupForPaper(p) ?? '-'}</Badge>}
                          <Badge tone="gray">{p.paper}</Badge>
                          <Badge tone="gray">{p.mode}</Badge>
                          <Badge tone="gray">PDF</Badge>
                          {p.fileUrl && pdfIndex[p.fileUrl] && <span className="self-center text-[11px]">{pdfIndex[p.fileUrl].pages} pages · {formatFileSize(pdfIndex[p.fileUrl].sizeBytes)}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => { toggleBookmark(`pp-${p.id}`); forceRefresh((f) => f + 1) }}
                        className="no-print rounded-md p-2 text-muted-foreground hover:bg-secondary"
                        aria-label={isBookmarked(`pp-${p.id}`) ? 'Remove from saved papers' : 'Save paper'}
                      >
                        {isBookmarked(`pp-${p.id}`) ? <BookmarkCheck className="h-4 w-4 text-emerald-700" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                      {p.fileUrl ? (
                        <div className="flex gap-2">
                          <Link
                            to={`/past-papers/view/${p.id}`}
                            onClick={() => recordActivity({ type: 'past-paper', label: p.title, path: `/past-papers/view/${p.id}` })}
                            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"
                          >
                            <Eye className="h-4 w-4" /> View Paper
                          </Link>
                          <a
                            href={p.fileUrl}
                            download={safeDownloadName(`${p.examination}-${p.year}-${p.title}`)}
                            data-google-vignette="false"
                            onClick={() => recordActivity({ type: 'past-paper', label: `${p.title} download`, path: p.fileUrl! })}
                            className="inline-flex items-center gap-1.5 rounded-md bg-pine px-3 py-2 text-sm font-medium text-white hover:bg-emerald-900"
                          >
                            <Download className="h-4 w-4" /> Download PDF
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">File being uploaded</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </div>
            {pagination}
          </div>
        )}

      </div>
    </div>
  )
}
