import { Link, useSearchParams } from 'react-router'
import type { FormEvent } from 'react'
import { AccountPage } from '@/pages/account/shared'
import { useWorkspace } from '@/features/workspace/api'
import { WorkspaceHold, WorkspaceLoad } from '@/features/workspace/Records'
const control = 'min-h-11 w-full rounded-lg border bg-white px-3 text-sm'
export default function CourseIndex() {
  const [params, setParams] = useSearchParams()
  const offset = Math.max(0, Number(params.get('offset')) || 0), query = params.get('q') || '', subject = params.get('subject') || ''
  const request = new URLSearchParams({ view: 'catalog', offset: String(offset), q: query, subject })
  const load = useWorkspace(request.toString())
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget), next = new URLSearchParams()
    for (const key of ['q', 'subject']) { const value = String(data.get(key) || '').trim(); if (value) next.set(key, value) }
    setParams(next)
  }
  function page(nextOffset: number) { const next = new URLSearchParams(params); next.set('offset', String(nextOffset)); setParams(next) }
  return <AccountPage title="Learn" intro="Browse a course before choosing a preparation attempt. Your personal work stays in its existing workspace.">
    <form onSubmit={search} className="mb-6 grid gap-4 rounded-xl border bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
      <label className="grid gap-2 text-sm font-semibold">Find a course<input key={query} name="q" defaultValue={query} maxLength={120} className={control} type="search" /></label>
      <div className="grid gap-2 text-sm font-semibold"><label htmlFor="catalog-subject">Subject or study area</label><select id="catalog-subject" key={`${subject}:${Boolean(load.data)}`} name="subject" defaultValue={subject} className={control}><option value="">All subjects</option>{(load.data?.catalog_subjects || []).map(item => <option key={item.id} value={item.id}>{item.title} ({item.count})</option>)}</select></div>
      <button type="submit" className="min-h-11 self-end rounded-lg bg-pine px-5 py-3 text-sm font-semibold text-white">Find courses</button>
      {(query || subject) && <Link className="inline-flex min-h-11 items-center text-[#14543D] underline" to="/account/learn">Clear course filters</Link>}
    </form>
    {!load.data ? <WorkspaceLoad error={load.error} retry={load.refresh} /> : <div className="space-y-6">
      <WorkspaceHold paused={load.data.paused} />
      <p className="text-sm leading-7 text-[#47564D]">Subject labels follow the existing course or published edition. Opening a course does not record completion.</p>
      {load.data.catalog.length === 0 && <p role="status" className="rounded-xl border border-dashed p-5">No available courses match these filters. Clear them or choose another subject.</p>}
      {Array.from(new Set(load.data.catalog.map(item => item.parentId))).map(area => <section key={area}>
        <h2 className="mb-3 text-lg font-semibold capitalize">{area?.replaceAll('_', ' ') || 'Courses'}</h2>
        <ul className="divide-y rounded-xl border bg-white">{load.data!.catalog.filter(item => item.parentId === area).map(item => <li key={item.id} className="p-4">
          <Link to={item.canonicalDestination} className="inline-flex min-h-11 items-center break-words text-lg font-semibold text-[#14543D] underline underline-offset-4">{item.title}</Link>
          <p className="max-w-[70ch] break-words text-sm leading-7 text-[#47564D]">{item.outcomeSummary}</p>
          <p className="mt-1 text-xs leading-6 text-[#47564D]">{item.accessClass === 'pro' ? 'Pro' : 'Free'} · Existing course edition{item.subjectIds.length > 0 && ` · ${item.subjectIds.map(id => load.data!.catalog_subjects?.find(value => value.id === id)?.title || id).join(', ')}`}</p>
        </li>)}</ul>
      </section>)}
      <div className="flex flex-wrap gap-3"><Link className="min-h-11 rounded-lg border px-4 py-3" to="/daily-briefing">Public Daily Briefing</Link><Link className="min-h-11 rounded-lg border px-4 py-3" to="/fpsc-syllabus">Official syllabus resources</Link></div>
      <nav aria-label="Course pages" className="flex flex-wrap gap-3">
        {offset > 0 && <button className="min-h-11 rounded-lg border px-4" onClick={() => page(Math.max(0, offset - 20))}>Previous courses</button>}
        {load.data.has_more && <button className="min-h-11 rounded-lg border px-4" onClick={() => page(offset + 20)}>More courses</button>}
      </nav>
    </div>}
  </AccountPage>
}
