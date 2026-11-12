import './daily-study.css'
import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { useLearning } from '@/features/learning/api'
import { studyDestinations, writingDestination } from './handoffs'
import type { CatalogItem } from './types'
import { useStudySession, saveStudySession, endStudySession } from './useSession'
import { stageMinutes, studyLesson, studyLink, studyMinutes, studyStages } from './study'

export default function StudyFlow({ compact = false }: { compact?: boolean }) {
  const { user } = useAccount(), [params] = useSearchParams(), location = useLocation()
  const session = useStudySession(user?.id)
  const [page, setPage] = useState(0)
  const [minutes, setMinutes] = useState(30), [choice, setChoice] = useState('')
  const selected = params.get('studyCourse') || session?.course
  const active = Boolean(user && selected)
  const load = useLearning<{ catalog: CatalogItem[]; has_more: boolean }>(active ? 'daily-study.php?course='+encodeURIComponent(selected!) : `daily-study.php?offset=${page}`)
  const courses = load.data?.catalog || [], course = courses.find(item => item.id === (active ? selected : choice)) || (!active ? courses[0] : undefined)
  const budget = active ? studyMinutes(params.get('studyMinutes') || String(session?.minutes || 30)) : minutes
  const stage = params.get('studyStage') || String(session?.stage || 0)
  const current = /^[0-3]$/.test(stage) ? Number(stage) : 0
  const timings = stageMinutes(budget)
  const lesson = course && current === 0 ? studyLesson(location.pathname + location.search + location.hash, course.canonicalDestination, course.id) : undefined
  const retainedLesson = course && session?.course === course.id && session.lesson ? studyLesson(session.lesson, course.canonicalDestination, course.id) : undefined
  const work = course && (current === 1 || current === 2) ? studyLesson(location.pathname + location.search + location.hash, writingDestination(course), course.id, 'work') : undefined
  const retainedWork = course && session?.course === course.id && session.work ? studyLesson(session.work, writingDestination(course), course.id, 'work') : undefined
  const startedAt = session?.course === course?.id ? session?.startedAt : undefined
  useEffect(() => {
    if (user && active && course) saveStudySession({ schema: 1, owner: user.id, course: course.id, minutes: budget, stage: current, startedAt: startedAt ?? Date.now(), lesson: lesson || retainedLesson || course.canonicalDestination, work: work || retainedWork })
  }, [user, active, course, budget, current, startedAt, lesson, retainedLesson, work, retainedWork])
  if (!user || compact && (!active || location.pathname === '/account/dashboard')) return null
  if (compact && !load.data && !load.error) return <p role="status" className="p-4">Loading your study session…</p>
  if (active && load.data && !course) return <p role="status" className="mx-auto max-w-7xl p-4 text-sm">This study plan is no longer available. <Link onClick={() => endStudySession(user.id)} to="/account/dashboard" className="underline">Choose an available study session</Link>.</p>
  return <section aria-label="Daily study session" className={`${compact ? 'mx-auto max-w-7xl my-4' : ''} daily-study-panel ws-panel`}>
    <p className="text-xs font-semibold uppercase tracking-widest text-[#47564D]">Your daily study session</p>
    <h2 className="mt-2 text-2xl font-semibold text-[#17251F]">{active && course ? course.title : 'Your next focused study session'}</h2>
    {!compact && <p className="mt-3 max-w-2xl text-sm leading-7 text-[#47564D]">Learn one idea, write your own response, inspect feedback, then revisit it. Time allocations are suggestions; each original tool records your actual work.</p>}
    {!active && !compact && <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><label htmlFor="daily-focus" className="block text-sm font-semibold">Study focus</label><select id="daily-focus" value={course?.id || ''} onChange={event => setChoice(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3">{courses.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
      <div><label htmlFor="daily-time" className="block text-sm font-semibold">Time available</label><select id="daily-time" value={minutes} onChange={event => setMinutes(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3">{[15,30,60].map(value => <option key={value} value={value}>{value} minutes</option>)}</select></div>
    </div>}
    {!active && !compact && load.data && <div className="mt-3 flex flex-wrap gap-3" aria-label="Study focus pages">{page > 0 && <button className="min-h-11 rounded-xl border px-4 text-sm" onClick={() => { setChoice('');setPage(value => Math.max(0,value-20)) }}>Previous study focuses</button>}{load.data.has_more && <button className="min-h-11 rounded-xl border px-4 text-sm" onClick={() => { setChoice('');setPage(value => value+20) }}>More study focuses</button>}</div>}
    {load.error && <p role="alert" className="mt-4 text-sm">{load.error} <button onClick={load.refresh} className="min-h-11 underline">Retry available lessons</button></p>}
    {!load.data && !load.error && <p role="status" className="mt-4">Finding available lessons…</p>}
    {course && <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{studyStages.map((title,index) => <li key={title} className={`min-w-0 rounded-2xl border p-4 ${active && current === index ? 'border-[#14543D] bg-[#EDF5EF]' : 'border-[#D7E0DA]'}`}>
      <p className="text-xs text-[#47564D]">Step {index+1} · about {timings[index]} min</p>
      <Link onClick={() => saveStudySession({ schema: 1, owner: user.id, course: course.id, minutes: budget, stage: index, startedAt: startedAt ?? Date.now(), lesson: lesson || retainedLesson || course.canonicalDestination, work: work || retainedWork })} aria-current={active && current===index ? 'step' : undefined} className="mt-2 inline-flex min-h-11 items-center text-lg font-semibold text-[#14543D] underline" to={studyLink(studyDestinations(course, lesson || retainedLesson, work || retainedWork)[index], course.id, budget, index)}>{title}</Link>
      {!compact && <p className="text-sm leading-6 text-[#47564D]">{['Read the lesson and work through an example.','Apply the idea in an independent response.','Inspect the tool’s available checks or feedback; revise your response.','Revisit the original checks, saved responses and revisions.'][index]}</p>}
    </li>)}</ol>}
    {active && <Link onClick={() => endStudySession(user.id)} to="/account/dashboard" className="mt-4 inline-flex min-h-11 items-center text-sm text-[#14543D] underline">Choose a different session</Link>}
    {!compact && <p className="mt-4 text-xs leading-6 text-[#47564D]">Study links do not award completion. Use the existing lesson checks and feedback, then revise your own work. No external evaluation or payment is started. Your session stays in this browser for up to 24 hours.</p>}
  </section>
}
export function StudyRail() {
  const [params] = useSearchParams(), { user } = useAccount(), { pathname } = useLocation()
  const session = useStudySession(user?.id)
  const studyPage = pathname.startsWith('/account/') || ['/grammar-course','/mistakes','/answer-writing','/answer-timer'].includes(pathname)
  return studyPage && user && (params.has('studyCourse') || session) ? <StudyFlow key={user.id} compact /> : null
}
