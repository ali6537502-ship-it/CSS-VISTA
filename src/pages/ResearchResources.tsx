import { useMemo, useState } from 'react'
import {
  ArrowUpRight, BookOpenText, Bookmark, Check, CircleHelp, Database, ExternalLink,
  Globe2, Landmark, Leaf, Newspaper, Search, ShieldCheck, Scale, X,
} from 'lucide-react'
import { researchResources, resourceCategories, type ResourceCategory, type ResearchResource } from '@/data/researchResources'

type CategoryChoice = ResourceCategory | 'All sources'
const savedKey = 'cssvista:research-bookmarks:v1'

function initialBookmarks(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(savedKey) || '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

const categoryIcons = {
  'Daily reading': Newspaper,
  'Pakistan statistics': Landmark,
  'Global data': Globe2,
  'Research & journals': BookOpenText,
  'Governance & law': Scale,
  'Climate & environment': Leaf,
} as const

const categoryGuides = [
  { title: 'Reading for arguments', body: 'Start with an editorial or opinion article. Separate the writer’s claim from the supporting facts, then check those facts against a primary source.' },
  { title: 'Finding a Pakistan figure', body: 'For population use the census or PBS. For GDP, employment and prices consult the Economic Survey, PBS or State Bank, taking care to record the year and indicator definition.' },
  { title: 'Comparing countries', body: 'Use datasets such as World Bank, UNDP and UN agencies. Note the reference year, measurement unit and methodology before using a number in an answer.' },
]

function ResourceTile({ item, saved, toggle }: { item: ResearchResource; saved: boolean; toggle: (id: string) => void }) {
  const Icon = categoryIcons[item.category]
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-[#e9e6dd] bg-white p-4 shadow-[0_5px_20px_rgba(25,36,50,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[#c9d6d2] hover:shadow-[0_12px_30px_rgba(25,36,50,0.075)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f3] text-[#24544f]"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
        <button type="button" onClick={() => toggle(item.id)} aria-label={saved ? 'Remove ' + item.title + ' from saved sources' : 'Save ' + item.title} aria-pressed={saved} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e7e8e4] text-[#53636a] transition hover:border-[#b2c2bd] hover:bg-[#f5f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24544f]">
          {saved ? <Check size={17} className="text-[#1d6556]" /> : <Bookmark size={17} />}
        </button>
      </div>
      <span className="mt-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#52766e]">{item.category}</span>
      <h3 className="mt-1 text-[17px] font-semibold leading-snug text-[#172b38]">{item.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-[#5b6770]">{item.description}</p>
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#f0efe9] pt-3">
        <span className="text-[11px] text-[#6c7a7f]">{item.cadence}</span>
        <a href={item.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1.5 text-sm font-semibold text-[#16584d] underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#24544f]" aria-label={'Open ' + item.title + ' on the source website in a new tab'}>
          Open source <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
    </article>
  )
}

export default function ResearchResources() {
  const [category, setCategory] = useState<CategoryChoice>('All sources')
  const [query, setQuery] = useState('')
  const [bookmarks, setBookmarks] = useState<string[]>(initialBookmarks)
  const [savedOnly, setSavedOnly] = useState(false)
  const savedIds = useMemo(() => new Set(bookmarks), [bookmarks])

  function toggle(id: string) {
    setBookmarks((previous) => {
      const next = previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]
      try { window.localStorage.setItem(savedKey, JSON.stringify(next)) } catch { /* Storage is optional. */ }
      return next
    })
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return researchResources.filter((item) => {
      if (category !== 'All sources' && item.category !== category) return false
      if (savedOnly && !savedIds.has(item.id)) return false
      if (!term) return true
      return [item.title, item.category, item.description, item.tags].some((part) => part.toLocaleLowerCase().includes(term))
    })
  }, [category, query, savedOnly, savedIds])

  const featured = researchResources.filter((item) => item.featured)
  const clearFilters = () => { setQuery(''); setCategory('All sources'); setSavedOnly(false) }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#172b38]">
      <section className="relative overflow-hidden border-b border-[#e9e6dc] bg-[radial-gradient(circle_at_92%_5%,#dfebe6_0%,transparent_40%),linear-gradient(140deg,#f9f7f0_0%,#fffdfa_80%)]">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d9e1da] bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2c6559]">
            <Database size={14} aria-hidden="true" /> CSS Vista · Research & Data Library
          </span>
          <div className="mt-6 max-w-3xl">
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#172b38] sm:text-5xl sm:leading-[1.1]">Good answers begin with good sources.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#54626b] sm:text-lg">Your reading desk for newspapers, Pakistan’s official statistics, international data, policy research and academic journals. Find the right source and go straight to it.</p>
          </div>
          <div className="mt-7 flex flex-wrap gap-2.5 text-xs font-semibold text-[#435d59]">
            <span className="rounded-full border border-[#dce5df] bg-white px-3 py-2"><ShieldCheck size={14} className="mr-1.5 inline" aria-hidden="true" />Direct publisher links</span>
            <span className="rounded-full border border-[#dce5df] bg-white px-3 py-2"><Search size={14} className="mr-1.5 inline" aria-hidden="true" />Search by topic</span>
            <span className="rounded-full border border-[#dce5df] bg-white px-3 py-2"><Bookmark size={14} className="mr-1.5 inline" aria-hidden="true" />Save favourite sources</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-9 sm:px-6 sm:py-12">
        <section aria-labelledby="featured-resources">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#718579]">Start here</p>
              <h2 id="featured-resources" className="mt-1 font-display text-2xl font-semibold">Most-used starting points</h2>
            </div>
            <span className="text-xs text-[#728087]">The source website provides the latest available content</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((item) => (
              <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="group flex items-start justify-between gap-3 rounded-2xl border border-[#dde4de] bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a9c6bc] hover:shadow-md">
                <span className="min-w-0"><span className="block text-sm font-semibold leading-5 text-[#183a39]">{item.title}</span><span className="mt-1 block text-xs leading-5 text-[#657277]">{item.category}</span></span>
                <ExternalLink size={17} className="shrink-0 text-[#377568] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>

        <section aria-labelledby="browse-source-heading">
          <div className="rounded-[24px] border border-[#e6e5dd] bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#718579]">Explore the directory</p>
                <h2 id="browse-source-heading" className="mt-1 font-display text-2xl font-semibold">Find your source</h2>
              </div>
              <span className="rounded-full bg-[#f3f6f3] px-3 py-1.5 text-xs font-semibold text-[#396159]">{researchResources.length} curated links</span>
            </div>
            <div className="relative mt-5">
              <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7f7b]" aria-hidden="true" />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search: inflation, population, governance, criminology, gender…" aria-label="Search research sources" className="h-12 w-full rounded-xl border border-[#d8e2dc] bg-[#fcfcfa] py-2 pl-11 pr-12 text-sm text-[#22363d] outline-none transition placeholder:text-[#8a9595] focus:border-[#468877] focus:ring-2 focus:ring-[#dcece4]" />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-[#627875] hover:text-[#1f4c46]"><X size={17} /></button>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter resources by category">
              {(['All sources', ...resourceCategories] as CategoryChoice[]).map((choice) => (
                <button key={choice} type="button" onClick={() => setCategory(choice)} aria-pressed={category === choice} className={category === choice
                  ? 'rounded-full bg-[#214f49] px-3.5 py-2 text-xs font-semibold text-white shadow-sm'
                  : 'rounded-full border border-[#e0e5df] bg-white px-3.5 py-2 text-xs font-semibold text-[#52646a] transition hover:border-[#b7c8c1] hover:bg-[#f7faf8]'}>
                  {choice}
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#eceee8] pt-4">
              <span role="status" aria-live="polite" className="text-sm text-[#637179]">Showing <strong className="text-[#1e333a]">{filtered.length}</strong> of {researchResources.length} sources</span>
              <button type="button" onClick={() => setSavedOnly((value) => !value)} aria-pressed={savedOnly} className={savedOnly ? 'inline-flex items-center gap-2 rounded-lg bg-[#e8f3ed] px-3 py-2 text-xs font-semibold text-[#16594e]' : 'inline-flex items-center gap-2 rounded-lg border border-[#e3e8e2] px-3 py-2 text-xs font-semibold text-[#4c6061] hover:bg-[#f4f8f5]'}>
                <Bookmark size={15} aria-hidden="true" /> Saved only ({bookmarks.length})
              </button>
            </div>
          </div>
          {filtered.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => <ResourceTile key={item.id} item={item} saved={savedIds.has(item.id)} toggle={toggle} />)}
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-[#d9e1dc] bg-white px-5 py-12 text-center">
              <CircleHelp size={28} className="text-[#50756c]" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold">No matching sources</h3>
              <p className="mt-1 text-sm text-[#6b7a80]">Try another topic or remove a filter.</p>
              <button type="button" onClick={clearFilters} className="mt-4 rounded-lg bg-[#214f49] px-4 py-2 text-sm font-semibold text-white">Show all sources</button>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[#e4e5dc] bg-[#f5f4ee] p-5 sm:p-7" aria-labelledby="use-data-well">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#658079]">Research notes</p>
          <h2 id="use-data-well" className="mt-1 font-display text-2xl font-semibold">Turn a source into a stronger answer</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {categoryGuides.map((item, index) => (
              <div key={item.title} className="rounded-2xl border border-[#e4e5df] bg-white p-4">
                <span className="text-xs font-bold text-[#357466]">0{index + 1}</span>
                <h3 className="mt-2 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#637077]">{item.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-[#657075]">CSS Vista links to independent third-party websites; it does not host their content or control their publication schedules. Always record the original publisher, date, indicator definition and source URL before quoting a claim or statistic. Saved links are stored in this browser only.</p>
        </section>
      </div>
    </div>
  )
}
