import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, BookOpen, Save } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { learningRequest, saveIdentity, useLearning } from '@/features/learning/api'
import { panelStyle, primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import ChapterBody from './ChapterBody'
import { preparationDeviceKey } from '@/lib/preparationStorage'
import { handbookUnits } from './guideModel'
import { bookChapter, precisHref } from './bookModel'
import type { Chapter, Overview, Progress, WorkedExample } from './api'

function WorkedExamples({ params }: { params: URLSearchParams }) {
  const examples = useLearning<{ examples: WorkedExample[] }>('precis.php?book_examples=1')
  return <section className={`${panelStyle} space-y-5`}>
    <h3 id="precis-chapter-title" tabIndex={-1} className="text-xl font-semibold">Worked examples: beginner to advanced</h3>
    <p className="text-sm leading-7 text-slate-600">Read the passage, follow the retained teaching notes and open the handbook response. These are teaching examples, not official examination answers. The full chapter commentary still needs comparison with the original book.</p>
    {!examples.data && <p role={examples.error ? 'alert' : 'status'}>{examples.error || 'Opening the handbook examples…'}{examples.error && <button type="button" className={secondaryStyle} onClick={examples.refresh}>Retry examples</button>}</p>}
    {examples.data?.examples.map((example, index) => <article key={example.id} className="rounded-2xl border border-slate-200 p-4 sm:p-6">
      <h4 className="text-lg font-semibold">Example {index + 1}: {example.label}</h4>
      <p className="mt-2 text-xs text-slate-500">{example.source}</p>
      <h5 className="mt-5 font-semibold">Original passage</h5><p className="mt-2 whitespace-pre-wrap text-base leading-8">{example.text}</p>
      {example.hint && <><h5 className="mt-5 font-semibold">Teaching notes</h5><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{example.hint}</p></>}
      <details className="mt-5 rounded-xl bg-slate-50 p-4"><summary className="min-h-11 cursor-pointer font-semibold">Read the handbook response</summary><h5 className="mt-3 font-semibold">{example.model_title}</h5><p className="mt-2 text-base leading-8">{example.model}</p><p className="mt-3 text-xs leading-6 text-slate-600">This is one teaching response. Compare its wording and qualifications with the original; it is not the only possible précis.</p></details>
      <Link className={`${secondaryStyle} mt-5`} to={precisHref(params, 'write', { passage: example.id || '' })}>Write my own response <ArrowRight size={16} aria-hidden="true"/></Link>
    </article>)}
  </section>
}

function EarlierNotes({ chapter, owner, attempt }: { chapter: Chapter; owner: string; attempt: string }) {
  if (!owner) return null
  let notes: { section: string; text: string; id: string }[]
  let unavailable = false
  try {
    notes = handbookUnits([chapter]).map(unit => ({
      section: unit.section,
      text: sessionStorage.getItem(preparationDeviceKey(`cssvista:precis:study-note:v1:${owner}:${attempt}:${unit.id}`, owner)) || '',
      id: unit.id,
    })).filter(note => note.text.trim())
  } catch { notes = []; unavailable = true }
  if (unavailable) return <p role="status" className="pb-source-note">Earlier tab notes could not be read. Existing saved writing remains available under My drafts and revisions.</p>
  if (!notes.length) return null
  return <details className="rounded-xl border border-slate-200 p-4"><summary className="min-h-11 cursor-pointer font-semibold">My earlier notes for this chapter</summary><p className="mb-4 text-xs leading-6 text-slate-600">These are your earlier tab-local reading notes. They have not been graded or synced to your account.</p>{notes.map(note => <section key={note.id} className="mt-3"><h4 className="text-sm font-semibold">{note.section}</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{note.text}</p></section>)}</details>
}

export default function Handbook({ data, attempt, progress, refresh }: { data: Overview; attempt: string; progress?: Progress; refresh: () => void }) {
  const { user } = useAccount()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  const chapters = data.catalog?.chapters || []
  const chapter = bookChapter(chapters, params.get('chapter'), progress?.current_chapter)
  const previousChapter = useRef(chapter?.id)
  useEffect(() => {
    if (previousChapter.current !== chapter?.id) document.getElementById('precis-chapter-title')?.focus()
    previousChapter.current = chapter?.id
  }, [chapter?.id])
  if (!chapter) return <p role="status" className={panelStyle}>The handbook is unavailable. Your saved writing is retained.</p>
  const index = chapters.indexOf(chapter)
  async function savePlace() {
    if (!user || !progress || !attempt || !chapter || busy) return
    setBusy(true); setNotice('')
    const body = { action: 'progress_save', attempt_id: attempt, expected_version: progress.version, current_day: progress.current_day, current_chapter: Number(chapter.id), completed: progress.completed }
    try {
      const receipt = await saveIdentity(user.id, `precis:book:position:${attempt}`, body)
      await learningRequest(user.id, 'precis.php', { ...body, request_id: receipt.id })
      receipt.done(); refresh(); setNotice('Chapter position saved. This records your place, not completion or writing proficiency.')
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Your place could not be saved. Please retry.') }
    finally { setBusy(false) }
  }
  return <div className="pb-layout">
    <aside className="pb-contents"><h2><BookOpen size={19} aria-hidden="true"/>Contents</h2><p>22 chapters and appendices A–C</p><nav aria-label="Handbook chapters">{chapters.map(item => <Link key={item.id} aria-current={chapter.id === item.id ? 'page' : undefined} to={precisHref(params, 'book', { chapter: item.id })}>{item.title}</Link>)}</nav></aside>
    <div className="pb-reading" key={chapter.id}>
      <div className="pb-chapter-bar"><span>Chapter {chapter.id} of {chapters.length}</span><button type="button" className={secondaryStyle} disabled={!attempt || !progress || busy} onClick={() => void savePlace()}><Save size={15} aria-hidden="true"/>{busy ? 'Saving…' : 'Save my place'}</button></div>
      {['2','25'].includes(chapter.id) && <p className="pb-source-note">This section currently contains editorial source notes. Its wording must be compared with the original book; it is not presented as a verbatim transcription.</p>}
      {chapter.id === '20' && <p className="pb-source-note">The stored edition is missing parts of the original answer key. The complete exercise-and-answer sequence will be restored from the original book.</p>}
      {chapter.id === '18' ? <WorkedExamples params={params}/> : <ChapterBody chapter={chapter}/>}
      <EarlierNotes chapter={chapter} owner={user?.id || ''} attempt={attempt}/>
      {notice && <p role="status" className="pb-source-note">{notice}</p>}
      {!attempt && <p className="mt-4 text-xs leading-6 text-slate-600">You can read every available chapter without creating a study schedule. Select a preparation attempt above if you want to save your chapter position.</p>}
      {progress?.guide_plan && <details className="mt-5 rounded-xl border border-slate-200 p-4 text-sm"><summary className="min-h-11 cursor-pointer font-semibold">My earlier reading plan</summary><p className="leading-7">Your {progress.guide_plan.target_days}-day plan and {progress.guide_plan.completed_units.length} recorded reading sections are retained. Opening the handbook does not erase or convert that progress.</p></details>}
      <nav className="pb-chapter-nav" aria-label="Previous and next chapter">{index > 0 ? <Link className={secondaryStyle} to={precisHref(params, 'book', { chapter: chapters[index - 1].id })}><ArrowLeft size={15} aria-hidden="true"/>Previous chapter</Link> : <span/>}{index < chapters.length - 1 && <Link className={primaryStyle} to={precisHref(params, 'book', { chapter: chapters[index + 1].id })}>Next chapter<ArrowRight size={15} aria-hidden="true"/></Link>}</nav>
    </div>
  </div>
}
