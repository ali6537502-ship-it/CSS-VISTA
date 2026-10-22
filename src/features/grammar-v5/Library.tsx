import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import ConceptView from './ConceptView'
import { conceptHref, loadLesson, loadReference } from './content'
import { action, surface, type UpdateStudy } from './Exercise'
import type { StudyState } from './state'
import { TAXONOMY, type Catalog, type Depth, type Lesson } from './types'

export const RESOURCES = [
  { id: 'encyclopedia', label: 'Advanced grammar encyclopedia', description: 'Definitions, patterns, worked analysis and qualified usage across all 18 subject families.' },
  { id: 'glossary', label: 'Complete grammar glossary', description: 'Search terminology alphabetically and open its teaching context.' },
  { id: 'rules', label: 'Grammar rule index', description: 'Browse the course’s linked conceptual rules and their applications.' },
  { id: 'exceptions', label: 'Exceptions and special cases', description: 'Study restrictions, valid alternatives and misleading generalisations in their full context.' },
  { id: 'analysis', label: 'Sentence analysis lab', description: 'Analyse categories, functions, phrase structure and clause relationships.' },
  { id: 'transformations', label: 'Sentence transformation lab', description: 'Change structure while preserving meaning, scope and register.' },
  { id: 'editing', label: 'Correction and editing lab', description: 'Revise sentences and paragraphs with model solutions and explicit rubrics.' },
  { id: 'variation', label: 'British and American usage guide', description: 'Compare established grammatical and editorial alternatives.' },
  { id: 'formal', label: 'Formal writing grammar guide', description: 'Apply structure, cohesion, reporting, hedging and compression.' },
  { id: 'confused', label: 'Frequently confused constructions', description: 'Separate errors from grammatical alternatives with different meanings.' },
  { id: 'revision', label: 'Master revision bank', description: 'Return to topic-indexed practice after Day 30 or whenever a concept needs work.' },
] as const
export default function Library({ catalog, state, update, depth, conceptId, guide, onChoose, onGuide, attempt }: {
  catalog: Catalog; state: StudyState; update: UpdateStudy; depth: Depth; conceptId?: string; guide: string
  onChoose: (id: string) => void; onGuide: (id: string) => void; attempt?: string
}) {
  const [search, setSearch] = useState(''), [family, setFamily] = useState('all'), [prerequisite, setPrerequisite] = useState('all')
  const [loaded, setLoaded] = useState<{ day: number; lesson?: Lesson; error?: string }>(), [retry, setRetry] = useState(0)
  const selected = catalog.concepts.find(c => c.id === conceptId)
  useEffect(() => {
    if (!selected) return
    let active = true
    void (selected.referenceFile ? loadReference(selected.referenceFile) : loadLesson(selected.day)).then(lesson => { if (active) setLoaded({ day: selected.day, lesson }) }).catch(e => { if (active) setLoaded({ day: selected.day, error: e.message }) })
    return () => { active = false }
  }, [selected, retry])
  const query = search.trim().toLocaleLowerCase(), glossary = guide === 'glossary'
  const concepts = catalog.concepts.filter(c => (family === 'all' || c.taxonomy.includes(family)) && (prerequisite === 'all' || c.prerequisiteDays.includes(Number(prerequisite))) && (!query || c.searchText.toLocaleLowerCase().includes(query)) && (guide !== 'exceptions' || c.hasExceptions) && (guide !== 'variation' || c.taxonomy.includes('P')) && (guide !== 'formal' || c.taxonomy.some(x => ['N', 'R', 'M'].includes(x))) && (guide !== 'confused' || c.day === 25 || c.taxonomy.includes('L')))
  const terms = concepts.flatMap(c => c.glossary.map((g, i) => ({ ...g, id: `${c.id}-${i}`, concept: c }))).filter(g => !query || `${g.term} ${g.definition} ${g.example}`.toLocaleLowerCase().includes(query)).sort((a, b) => a.term.localeCompare(b.term, 'en'))
  const lesson = loaded && selected && loaded.day === selected.day && loaded.lesson?.modules.some(c => c.id === selected.id) ? loaded.lesson : undefined, concept = lesson?.modules.find(c => c.id === conceptId)
  return <section className="space-y-6" aria-label="Permanent grammar reference library">
    <div className={surface}><h2 className="text-2xl font-semibold">Grammar reference and learning tools</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">Every entry connects to the course and remains available after the structured programme. Begin with the definition, then open the deeper layers you need.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{RESOURCES.map(r => <button type="button" key={r.id} onClick={() => onGuide(r.id)} aria-pressed={guide === r.id} className={`rounded-xl border p-4 text-left ${guide === r.id ? 'border-indigo-700 bg-indigo-50' : 'border-slate-200 hover:border-indigo-700'}`}><span className="block text-sm font-semibold">{r.label}</span><span className="mt-2 block text-xs leading-6 text-slate-600">{r.description}</span></button>)}</div></div>
    <div className={`${surface} no-print`}><h3 className="text-lg font-semibold">{RESOURCES.find(r => r.id === guide)?.label ?? 'Grammar encyclopedia'}</h3><div className="mt-4 grid gap-4 md:grid-cols-3"><label className="text-sm font-semibold">Search grammar<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="A concept, term or construction" className="mt-2 min-h-12 w-full rounded-xl border border-slate-400 px-3 font-normal" /></label><label className="text-sm font-semibold">Subject family<select value={family} onChange={e => setFamily(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-400 bg-white px-3 font-normal"><option value="all">All subjects</option>{Object.entries(TAXONOMY).map(([key, name]) => <option key={key} value={key}>{key}. {name}</option>)}</select></label><label className="text-sm font-semibold">Builds on<select value={prerequisite} onChange={e => setPrerequisite(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-400 bg-white px-3 font-normal"><option value="all">Any prerequisites</option>{catalog.days.map(d => <option key={d.day} value={d.day}>Day {d.day} · {d.title}</option>)}</select></label></div><p className="mt-3 text-xs leading-6 text-slate-600" role="status">{glossary ? `${terms.length} glossary definitions` : `${concepts.length} reference entries`} found. Each entry offers all four depths; the depth control sets the layers initially open.</p></div>
    {selected && <div className="space-y-4"><button className={`${action} no-print`} onClick={() => onChoose('')}>Back to reference results</button>{concept && lesson ? <ConceptView {...{ concept, lesson, catalog, state, update, depth, attempt }} reference /> : loaded?.day === selected.day && loaded.error ? <div role="alert" className={surface}><p>{loaded.error}</p><button className={`${action} mt-3`} onClick={() => setRetry(n => n + 1)}>Retry entry</button></div> : <p role="status">Opening the reference entry…</p>}</div>}
    {!selected && (glossary ? <dl className="grid gap-4 md:grid-cols-2">{terms.map(g => <div key={g.id} className={surface}><dt className="text-lg font-semibold">{g.term}</dt><dd className="mt-2 text-sm leading-7"><p>{g.definition}</p><p className="mt-2 italic">{g.example}</p><button className={`${action} mt-3`} onClick={() => onChoose(g.concept.id)}>Study {g.concept.title}</button></dd></div>)}</dl> : <div className="grid gap-4 md:grid-cols-2">{concepts.map(c => <article key={c.id} className={surface}><p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">{c.taxonomy.map(t => `${t} · ${TAXONOMY[t]}`).join(' / ')}</p><h3 className="mt-3 text-lg font-semibold"><button className="text-left underline decoration-indigo-200 underline-offset-4" onClick={() => onChoose(c.id)}>{c.title}</button></h3><p className="mt-3 text-sm leading-7 text-slate-700">{c.definition}</p><div className="mt-4 flex flex-wrap gap-3"><button className={action} onClick={() => onChoose(c.id)}>Read reference</button><Link className={action} to={conceptHref(c, attempt)}>{c.referenceFile ? 'Permanent extension' : `Day ${c.day}`}</Link></div></article>)}</div>)}
    {!selected && !(glossary ? terms.length : concepts.length) && <p className={surface}>No matching entry. Try a broader term or clear the subject filter.</p>}
  </section>
}
