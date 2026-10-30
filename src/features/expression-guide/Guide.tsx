import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Download, PenLine, Save } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { canReview, emptyWork, findLesson, lessons, readGuideWork, type GuideWork, type Lesson, type LessonWork } from './lessons'
import './guide.css'

function UnderstandingCheck({ lesson }: { lesson: Lesson }) {
  const [choice, setChoice] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  return <section className="eg-card">
    <p className="eg-eyebrow">03 · Check a distinction</p><h3>{lesson.question}</h3>
    <fieldset><legend className="sr-only">Choose one answer</legend>{lesson.options.map((option, index) => <label className="eg-option" key={option}>
      <input type="radio" name={`check-${lesson.id}`} checked={choice === index} onChange={() => { setChoice(index); setChecked(false) }}/><span>{option}</span>
    </label>)}</fieldset>
    <button type="button" className="eg-button" disabled={choice === null} onClick={() => setChecked(true)}>Check answer</button>
    {checked && <div role="status" className="eg-feedback"><strong>{choice === lesson.answer ? 'Correct for this question.' : 'Review the distinction.'}</strong><p>{lesson.feedback}</p>{choice !== lesson.answer && <p>Suggested answer: {lesson.options[lesson.answer]}</p>}<p className="eg-small">This question checks one taught distinction. It does not assess your writing.</p></div>}
  </section>
}

export default function ExpressionGuide() {
  const { user } = useAccount()
  const [params, setParams] = useSearchParams()
  const lesson = findLesson(params.get('lesson'))
  const index = lessons.indexOf(lesson)
  const storageKey = `cssvista:english-guide:v1:${user?.id || 'guest'}`
  const [initial] = useState(() => {
    try { return { work: readGuideWork(localStorage.getItem(storageKey)), error: '' } }
    catch { return { work: {} as GuideWork, error: 'Saved guide work could not be read. You can practise here and download your writing. Existing browser data will not be overwritten.' } }
  })
  const [work, setWork] = useState<GuideWork>(initial.work)
  const baseline = useRef<GuideWork>(initial.work)
  const [error, setError] = useState(initial.error)
  const [message, setMessage] = useState('')
  const [showSample, setShowSample] = useState(false)
  const current = work[lesson.id] || emptyWork()
  const dirty = JSON.stringify(current) !== JSON.stringify(baseline.current[lesson.id] || emptyWork())
  const reviewed = lessons.filter(item => work[item.id]?.reviewed && canReview(work[item.id])).length
  useEffect(() => {
    const unsaved = Object.entries(work).some(([id, value]) => JSON.stringify(value) !== JSON.stringify(baseline.current[id] || emptyWork()))
    if (!unsaved) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [work])
  function update(patch: Partial<LessonWork>) {
    setWork(previous => ({ ...previous, [lesson.id]: { ...(previous[lesson.id] || emptyWork()), ...patch, reviewed: false } }))
    setMessage('')
  }
  function save(markReviewed = false) {
    if (!user) { setError('Sign in to save guide work on this device.'); return }
    const nextWork = { ...current, reviewed: markReviewed ? canReview(current) : current.reviewed }
    try {
      const latest = readGuideWork(localStorage.getItem(storageKey))
      if (JSON.stringify(latest[lesson.id] || emptyWork()) !== JSON.stringify(baseline.current[lesson.id] || emptyWork())) {
        throw Error('This lesson was saved in another tab. Download your writing before reloading to compare the saved version.')
      }
      const next = { ...latest, [lesson.id]: nextWork }
      localStorage.setItem(storageKey, JSON.stringify(next))
      baseline.current = { ...baseline.current, [lesson.id]: nextWork }
      setWork(previous => ({ ...previous, [lesson.id]: nextWork }))
      setError(''); setMessage(markReviewed ? 'Lesson marked as self-reviewed and saved on this device.' : 'Draft and revision saved on this device.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Saving failed. Your writing is still visible; download a copy before leaving.')
    }
  }
  function navigate(id: string) {
    const next = new URLSearchParams(params); next.set('view', 'guide'); next.set('lesson', id)
    setParams(next); setMessage(''); setShowSample(false)
    requestAnimationFrame(() => document.getElementById('eg-lesson-title')?.focus())
  }
  function download() {
    const text = lessons.filter(item => work[item.id]).map(item => `${item.title}\n\nFirst draft\n${work[item.id].draft}\n\nRevision and notes\n${work[item.id].revision}`).join('\n\n--------\n\n')
    const url = URL.createObjectURL(new Blob([text || 'No writing recorded yet.'], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'my-english-expression-practice.txt'; anchor.click(); URL.revokeObjectURL(url)
  }
  return <div className="eg-root">
    <header className="eg-hero"><div><p className="eg-eyebrow"><BookOpen size={16} aria-hidden="true"/> Free English Expression Guide</p><h2>Clear thinking.<br/>Clearer English.</h2><p>Learn one idea, see it in action, then improve your own writing. Start at the beginning or choose the skill you need.</p><div className="eg-tags"><span>8 focused lessons</span><span>No AI or external service</span><span>Learn at your pace</span></div></div><div className="eg-progress"><PenLine size={30} aria-hidden="true"/><strong>{reviewed}<small> / {lessons.length}</small></strong><span>lessons self-reviewed</span><progress max={lessons.length} value={reviewed} aria-label="Lessons self-reviewed"/><small>Practice record, not a proficiency score.</small></div></header>
    <div className="eg-layout"><aside className="eg-sidebar"><h2>Your learning path</h2><p>Read → check → write → revise</p><nav aria-label="English guide lessons">{lessons.map((item, position) => <button type="button" key={item.id} aria-current={item.id === lesson.id ? 'step' : undefined} onClick={() => navigate(item.id)}><span className="eg-number">{work[item.id]?.reviewed && canReview(work[item.id]) ? <Check size={15} aria-hidden="true"/> : String(position + 1).padStart(2, '0')}</span><span>{item.title}<small>About {item.minutes} minutes</small></span></button>)}</nav><p className="eg-small">Your drafts stay in memory as you move between lessons. Save before closing this page. Saved work is local to this browser and account; it is not synced.</p><button type="button" className="eg-button eg-secondary" onClick={download}><Download size={16} aria-hidden="true"/>Download my writing</button></aside>
    <div className="eg-body"><header className="eg-lesson-heading"><p className="eg-eyebrow">Lesson {index + 1} of {lessons.length} · about {lesson.minutes} minutes</p><h2 id="eg-lesson-title" tabIndex={-1}>{lesson.title}</h2><p>{lesson.aim}</p></header>
      <section className="eg-card"><p className="eg-eyebrow">01 · Understand</p><h3>The idea</h3>{lesson.teaching.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>
      <section className="eg-card"><p className="eg-eyebrow">02 · See the change</p><h3>A worked example</h3><div className="eg-examples"><div><span>Before</span><p>{lesson.before}</p></div><div><span>After</span><p>{lesson.after}</p></div></div><p><strong>Why it works:</strong> {lesson.explanation}</p></section>
      <UnderstandingCheck key={lesson.id} lesson={lesson}/>
      <section className="eg-card"><p className="eg-eyebrow">04 · Write and revise</p><h3>Make it your own</h3><p>{lesson.task}</p>
        <div className="eg-field"><label htmlFor="eg-draft">Your first draft</label><textarea id="eg-draft" value={current.draft} maxLength={12000} onChange={event => update({ draft: event.target.value })} placeholder="Try it yourself before looking at the sample."/></div>
        <button className="eg-text-button" type="button" aria-expanded={showSample} onClick={() => setShowSample(value => !value)}>{showSample ? 'Hide' : 'Show'} a possible response</button>{showSample && <div className="eg-feedback"><p>{lesson.sample}</p><p className="eg-small">One teaching example. Other clear, accurate responses can work.</p></div>}
        <fieldset className="eg-review"><legend>Read your draft against these two checks</legend>{lesson.checklist.map((check, position) => <label key={check}><input type="checkbox" checked={current.checks[position] === true} onChange={event => update({ checks: current.checks.map((value, i) => i === position ? event.target.checked : value) })}/><span>{check}</span></label>)}</fieldset>
        <div className="eg-field"><label htmlFor="eg-revision">Your revised version and change notes</label><textarea id="eg-revision" value={current.revision} maxLength={12000} onChange={event => update({ revision: event.target.value })} placeholder="Rewrite, then explain one change you made and why it helps."/></div>
        <p className="eg-small">Your writing is not sent for automated feedback. Use the examples and checklist to make your own judgement. Each field allows 12,000 characters.</p>
        <div className="eg-actions"><button type="button" className="eg-button" onClick={() => save()}><Save size={16} aria-hidden="true"/>Save my work</button><button type="button" className="eg-button eg-secondary" disabled={!canReview(current)} onClick={() => save(true)}><CheckCircle2 size={16} aria-hidden="true"/>Mark as self-reviewed</button></div>
        <p className="eg-small" role="status">{dirty ? 'Unsaved changes in this lesson. Save or download before leaving.' : current.reviewed ? 'Self-review recorded on this device.' : 'Save your draft whenever you are ready.'}</p>
        {message && <p role="status" className="eg-feedback">{message}</p>}{error && <p role="alert" className="eg-error">{error} Your current writing remains in this page. Use “Download my writing” to keep a copy.</p>}
      </section>
      <nav className="eg-lesson-nav" aria-label="Previous and next lesson"><button className="eg-button eg-secondary" type="button" disabled={index === 0} onClick={() => navigate(lessons[index - 1].id)}><ArrowLeft size={16} aria-hidden="true"/>Previous lesson</button>{index < lessons.length - 1 ? <button className="eg-button" type="button" onClick={() => navigate(lessons[index + 1].id)}>Next lesson<ArrowRight size={16} aria-hidden="true"/></button> : <Link className="eg-button" to="/account/expression?view=studio">Continue with sentence practice<ArrowRight size={16} aria-hidden="true"/></Link>}</nav>
    </div></div>
  </div>
}
