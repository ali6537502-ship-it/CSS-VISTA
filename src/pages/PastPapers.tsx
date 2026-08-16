import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Search, Download, Eye, FileText, PenLine, Bookmark, BookmarkCheck } from 'lucide-react'
import { PageHeader, Badge, EmptyState } from '@/components/shared'
import PrintMenu from '@/components/PrintMenu'
import { examinations, subjectTypes, paperModes, type PastPaper } from '@/data/pastPapers'
import { pastPapers as seedPapers } from '@/data/pastPapers'
import { mergedPastPapers } from '@/lib/admin'
import { toggleBookmark, isBookmarked } from '@/lib/store'
import { recordActivity } from '@/lib/progress'
import { optionalGroups } from '@/data/syllabus'

const optionalGroupBySubject = new Map(
  optionalGroups.flatMap((group) => group.subjects.map((subject) => [subject.name, group.group] as const)),
)

function groupForPaper(paper: PastPaper) {
  return paper.optionalGroup ?? optionalGroupBySubject.get(paper.subject)
}

// Recurring-theme guidance (clearly labelled; exact counts come from uploaded papers)
const repeatedThemes: { subject: string; themes: string[] }[] = [
  { subject: 'Essay', themes: ['Education crises', 'Democracy & governance', 'Climate change', 'Gender equality', 'Technology & society'] },
  { subject: 'Pakistan Affairs', themes: ['Ideology of Pakistan', 'Constitutional development', 'Federalism & 18th Amendment', 'Water & economy issues'] },
  { subject: 'Current Affairs', themes: ['CPEC & geo-economics', 'Afghanistan', 'Climate diplomacy', 'IMF & economy'] },
  { subject: 'Islamic Studies', themes: ['Seerah as a model', 'Human rights in Islam', 'Ijtihad & modernity'] },
]

export default function PastPapers() {
  const [searchParams] = useSearchParams()
  const papers = useMemo(() => mergedPastPapers(seedPapers), [])
  const [q, setQ] = useState(() => searchParams.get('search') ?? '')
  const [exam, setExam] = useState('All')
  const [subject, setSubject] = useState('All')
  const [year, setYear] = useState('All')
  const [stype, setStype] = useState('All')
  const [optionalGroup, setOptionalGroup] = useState('All')
  const [mode, setMode] = useState('All')
  const [savedOnly, setSavedOnly] = useState(false)
  const [, forceRefresh] = useState(0)

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
      (!q || `${p.title} ${p.subject}`.toLowerCase().includes(q.toLowerCase()))
  )

  const grouped = useMemo(() => {
    const map = new Map<string, PastPaper[]>()
    for (const p of filtered) {
      const group = p.subjectType === 'Optional' ? `Optional Group ${groupForPaper(p) ?? '-'}` : 'Compulsory'
      const key = `${p.examination} · ${group} · ${p.subject}`
      map.set(key, [...(map.get(key) ?? []), p])
    }
    return [...map.entries()]
      .map(([key, list]) => [key, [...list].sort((a, b) => b.year - a.year || a.paper.localeCompare(b.paper))] as const)
      .sort(([, a], [, b]) => {
        const first = a[0]
        const second = b[0]
        if (first.examination !== second.examination) return first.examination.localeCompare(second.examination)
        if (first.subjectType !== second.subjectType) return first.subjectType === 'Compulsory' ? -1 : 1
        const groupDifference = String(groupForPaper(first) ?? '').localeCompare(
          String(groupForPaper(second) ?? ''),
          undefined,
          { numeric: true },
        )
        return groupDifference || first.subject.localeCompare(second.subject)
      })
  }, [filtered])

  return (
    <div>
      <PageHeader
        title="Past Papers"
        description="CSS, PMS and PPSC papers organised by examination, subject, year and paper - each with view and download controls. Papers are added as the owner provides them; only authentic papers appear here."
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
            <option>All</option>{examinations.map((e) => <option key={e}>{e}</option>)}
          </select>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 rounded-md border border-input px-2 text-sm" aria-label="Subject">
            <option>All</option>{subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={stype} onChange={(e) => setStype(e.target.value)} className="h-10 rounded-md border border-input px-2 text-sm" aria-label="Compulsory or optional">
            <option>All</option>{subjectTypes.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={optionalGroup} onChange={(e) => setOptionalGroup(e.target.value)} className="h-10 rounded-md border border-input px-2 text-sm" aria-label="Optional subject group">
            <option>All</option>{optionalGroupOptions.map((group) => <option key={group} value={group}>Group {group}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2.5">
            <select value={year} onChange={(e) => setYear(e.target.value)} className="h-10 rounded-md border border-input px-2 text-sm" aria-label="Year">
              <option>All</option>{years.map((y) => <option key={y}>{y}</option>)}
            </select>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="h-10 rounded-md border border-input px-2 text-sm" aria-label="Objective or subjective">
              <option>All</option>{paperModes.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Papers list */}
        {papers.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-secondary/40 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h2 className="mt-3 font-semibold text-foreground">Archive ready - papers being collected</h2>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
              The structure is fully prepared: every paper will be filed by examination (CSS / PMS / PPSC), subject, year, compulsory/optional, Paper One/Two and objective/subjective, with a preview and download button. The first papers will appear here as the owner provides them - no fake or placeholder papers are ever shown.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No papers match your filters" hint="Try clearing a filter or the search term." />
        ) : (
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
                            <Eye className="h-4 w-4" /> View
                          </Link>
                          <a href={p.fileUrl} download data-google-vignette="false" className="inline-flex items-center gap-1.5 rounded-md bg-pine px-3 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"><Download className="h-4 w-4" /> Download</a>
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
        )}

        {/* Attempt mode */}
        <div className="rounded-lg border bg-white p-5">
          <h2 className="font-semibold text-foreground">Attempt mode</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Practise answer writing under exam time while the paper archive grows:
          </p>
          <Link to="/answer-writing" className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
            <PenLine className="h-4 w-4" /> Open answer-writing practice
          </Link>
        </div>

        {/* Repeated themes (guidance) */}
        <section>
          <h2 className="font-display text-lg font-bold text-pine">Recurring themes - guidance</h2>
          <p className="mt-1 text-sm text-muted-foreground">Frequently recurring areas in recent compulsory papers (guidance only, not extracted counts).</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {repeatedThemes.map((t) => (
              <div key={t.subject} className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t.subject}</h3>
                  <Badge tone="gold">Guidance</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.themes.map((th) => <span key={th} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{th}</span>)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
