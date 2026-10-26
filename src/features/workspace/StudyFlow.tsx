import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { useWorkspace, type CatalogItem } from './api'
import { stageMinutes, studyLink, studyMinutes, studyStages } from './study'

function destinations(course: CatalogItem, premium: boolean) {
  const writing = premium ? ({ ability: '/account/analytical-skills', precis: '/account/precis', essay: '/account/essay-builder', argument: '/account/argumentation', analysis: '/account/analytical-skills', sentence: '/account/expression?view=studio' }[course.id] || '/account/expression') : '/account/preparation?new=writing'
  const topic = course.canonicalDestination.startsWith('/account/preparation?view=topics&topic=')
  return [course.canonicalDestination, topic ? course.canonicalDestination+'&topicMode=write' : writing, topic ? course.canonicalDestination+'&topicMode=check' : premium ? writing : '/grammar-course?view=lab', '/account/review?course='+encodeURIComponent(course.id)]
}
type Session = { owner: string; course: string; minutes: string; stage: string }
export default function StudyFlow({ compact = false, session }: { compact?: boolean; session?: Session }) {
  const { user } = useAccount(), [params] = useSearchParams(), location = useLocation()
  const [minutes, setMinutes] = useState(30), [choice, setChoice] = useState('')
  const selected = params.get('studyCourse') || session?.course
  const active = Boolean(user && selected)
  const load = useWorkspace('view=catalog')
  if (!user || compact && (!active || location.pathname === '/account/dashboard')) return null
  const courses = load.data?.catalog || [], course = courses.find(item => item.id === (active ? selected : choice)) || (!active ? courses[0] : undefined)
  const budget = active ? studyMinutes(params.get('studyMinutes') || session?.minutes) : minutes
  const stage = params.get('studyStage') || session?.stage || '0'
  const current = /^[0-3]$/.test(stage) ? Number(stage) : 0
  const timings = stageMinutes(budget)
  function start(event: FormEvent) { event.preventDefault() }
  if (compact && !load.data && !load.error) return <p role="status" className="p-4">Loading your study session…</p>
  if (compact && !course) return <p role="status" className="mx-auto max-w-7xl p-4 text-sm">This study plan is no longer available. <Link to="/account/dashboard" className="underline">Choose an available study session</Link>.</p>
  return <section aria-label="Daily study session" className={`${compact ? 'mx-auto max-w-7xl my-4' : ''} rounded-3xl border border-[#D7E0DA] bg-white p-5 shadow-sm sm:p-6`}>
    <p className="text-xs font-semibold uppercase tracking-widest text-[#47564D]">Your daily study session</p>
    <h2 className="mt-2 text-2xl font-semibold text-[#17251F]">{active && course ? course.title : 'One focus. Four connected steps.'}</h2>
    {!compact && <p className="mt-3 max-w-2xl text-sm leading-7 text-[#47564D]">Learn one idea, write your own response, inspect feedback, then revisit it. Time allocations are suggestions; each original tool records your actual work.</p>}
    {!active && !compact && <form onSubmit={start} className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><label htmlFor="daily-focus" className="block text-sm font-semibold">Study focus</label><select id="daily-focus" value={course?.id || ''} onChange={event => setChoice(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3">{courses.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
      <div><label htmlFor="daily-time" className="block text-sm font-semibold">Time available</label><select id="daily-time" value={minutes} onChange={event => setMinutes(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3">{[15,30,60].map(value => <option key={value} value={value}>{value} minutes</option>)}</select></div>
    </form>}
    {load.error && <p role="alert" className="mt-4 text-sm">{load.error} <button onClick={load.refresh} className="min-h-11 underline">Retry available lessons</button></p>}
    {!load.data && !load.error && <p role="status" className="mt-4">Finding available lessons…</p>}
    {course && <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{studyStages.map((title,index) => <li key={title} className={`min-w-0 rounded-2xl border p-4 ${active && current === index ? 'border-[#14543D] bg-[#EDF5EF]' : 'border-[#D7E0DA]'}`}>
      <p className="text-xs text-[#47564D]">Step {index+1} · about {timings[index]} min</p>
      <Link aria-current={active && current===index ? 'step' : undefined} className="mt-2 inline-flex min-h-11 items-center text-lg font-semibold text-[#14543D] underline" to={studyLink(destinations(course, Boolean(load.data?.premium_available))[index], course.id, budget, index)}>{title}</Link>
      {!compact && <p className="text-sm leading-6 text-[#47564D]">{['Read the lesson and work through an example.','Apply the idea in an independent response.','Inspect the tool’s available checks or feedback; revise your response.','Open scheduled recall and recorded mistakes for this course.'][index]}</p>}
    </li>)}</ol>}
    {active && <Link to="/account/dashboard" className="mt-4 inline-flex min-h-11 items-center text-sm text-[#14543D] underline">Choose a different session</Link>}
    {!compact && <p className="mt-4 text-xs leading-6 text-[#47564D]">Opening a step does not mark it complete. Free writing keeps saved versions; Free feedback here uses Grammar checks. Pro tools retain their own access and feedback rules.</p>}
  </section>
}
export function StudyRail() {
  const [params] = useSearchParams(), { user } = useAccount(), { pathname } = useLocation()
  const [session, setSession] = useState<Session>()
  const course = params.get('studyCourse'), minutes = params.get('studyMinutes'), stage = params.get('studyStage')
  useEffect(() => {
    if (user && course) setSession({ owner: user.id, course, minutes: minutes || '30', stage: stage || '0' })
    else if (!user || pathname === '/account/dashboard') setSession(undefined)
  }, [course, minutes, stage, user, pathname])
  return user && (course || session?.owner === user.id) ? <StudyFlow compact session={session?.owner === user.id ? session : undefined} /> : null
}
