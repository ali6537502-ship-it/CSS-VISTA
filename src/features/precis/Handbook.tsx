import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, BookOpen, Save } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { learningRequest, saveIdentity } from '@/features/learning/api'
import { primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import ChapterBody from './ChapterBody'
import { preparationDeviceKey } from '@/lib/preparationStorage'
import { bookChapter, precisHref } from './bookModel'
import type { Overview, Progress } from './api'

type EarlierUnits = NonNullable<Overview['catalog']>['legacy_reading']['units']
function EarlierNotes({ units, owner, attempt }: { units: EarlierUnits; owner: string; attempt: string }) {
  if (!owner) return null
  let notes: { section: string; text: string; id: string }[]
  let unavailable = false
  try {
    notes = units.map(unit => ({
      section: unit.section,
      text: sessionStorage.getItem(preparationDeviceKey(`cssvista:precis:study-note:v1:${owner}:${attempt}:${unit.id}`, owner)) || '',
      id: unit.id,
    })).filter(note => note.text.trim())
  } catch { notes = []; unavailable = true }
  if (unavailable) return <p role="status" className="pb-source-note">Earlier tab notes could not be read. Existing saved writing remains available under My drafts and revisions.</p>
  if (!notes.length) return null
  return <details className="rounded-xl border border-slate-200 p-4">
    <summary className="min-h-11 cursor-pointer font-semibold">My earlier notes for this chapter</summary>
    <p className="mb-4 text-xs leading-6 text-slate-600">These notes belong to your earlier reading edition and keep their original section labels. They have not been moved onto restored text. Notes remain local to this browser tab.</p>
    {notes.map(note => <section key={note.id} className="mt-3"><h4 className="text-sm font-semibold">Earlier section: {note.section}</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{note.text}</p></section>)}
  </details>
}

export default function Handbook({ data, attempt, progress, refresh }: { data: Overview; attempt: string; progress?: Progress; refresh: () => void }) {
  const { user } = useAccount()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  const chapters = data.catalog?.chapters || []
  const front = data.catalog?.front_matter || []
  const introduction = { id: '0', title: 'Purpose and contents', blocks: front }
  const chapter = params.get('chapter') === '0' && front.length ? introduction : bookChapter(chapters, params.get('chapter'), progress?.current_chapter)
  const previousChapter = useRef(chapter?.id)
  useEffect(() => {
    if (previousChapter.current !== chapter?.id) document.getElementById('precis-chapter-title')?.focus()
    previousChapter.current = chapter?.id
  }, [chapter?.id])
  if (!chapter) return <p role="status">The handbook is unavailable. Your saved writing is retained.</p>
  const ordered = front.length ? [introduction, ...chapters] : chapters
  const index = ordered.findIndex(item => item.id === chapter.id)
  const earlierUnits = data.catalog?.legacy_reading.units.filter(unit => unit.chapter_id === chapter.id) || []
  async function savePlace() {
    if (!user || !progress || !attempt || !chapter || chapter.id === '0' || busy) return
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
    <aside className="pb-contents">
      <h2><BookOpen size={19} aria-hidden="true"/>Contents</h2><p>22 chapters and appendices A–C</p>
      {front.length > 0 && <Link className="mb-4 block text-sm font-semibold underline" aria-current={chapter.id === '0' ? 'page' : undefined} to={precisHref(params, 'book', { chapter: '0' })}>Purpose and contents</Link>}
      <nav aria-label="Handbook chapters">{chapters.map(item => <Link key={item.id} aria-current={chapter.id === item.id ? 'page' : undefined} to={precisHref(params, 'book', { chapter: item.id })}>{item.title}</Link>)}</nav>
    </aside>
    <div className="pb-reading" key={chapter.id}>
      <div className="pb-chapter-bar"><span>{chapter.id === '0' ? 'Introduction' : Number(chapter.id) > 22 ? `Appendix ${String.fromCharCode(65 + Number(chapter.id) - 23)}` : `Chapter ${chapter.id} of 22`}</span>{chapter.id !== '0' && <button type="button" className={secondaryStyle} disabled={!attempt || !progress || busy} onClick={() => void savePlace()}><Save size={15} aria-hidden="true"/>{busy ? 'Saving…' : 'Save my place'}</button>}</div>
      {['2','25'].includes(chapter.id) && <aside className="pb-source-note" aria-label="Current examination instructions"><strong>Study note</strong><p>The author’s examination references are reproduced below as part of the book. Follow the current FPSC syllabus and the instructions printed in your question.</p></aside>}
      <ChapterBody chapter={chapter}/>
      {chapter.id === '18' && <section className="rounded-xl border border-slate-200 p-5"><h3 className="font-semibold">Practise a worked passage</h3><p className="mt-2 text-sm leading-7 text-slate-600">Use the same passages in your own writing workspace. Your saved drafts and revisions stay together.</p><div className="mt-4 flex flex-wrap gap-3">{data.catalog?.passages.filter(passage => passage.id?.startsWith('example-')).map((passage, i) => <Link key={passage.id} className={secondaryStyle} to={precisHref(params, 'write', { passage: passage.id || '' })}>Write my own response to example {i + 1}</Link>)}</div></section>}
      <EarlierNotes units={earlierUnits} owner={user?.id || ''} attempt={attempt}/>
      {notice && <p role="status" className="pb-source-note">{notice}</p>}
      {!attempt && <p className="mt-4 text-xs leading-6 text-slate-600">You can read every chapter without creating a study schedule. Select a preparation attempt above if you want to save your chapter position.</p>}
      {progress?.guide_plan && <details className="mt-5 rounded-xl border border-slate-200 p-4 text-sm"><summary className="min-h-11 cursor-pointer font-semibold">My earlier reading plan</summary><p className="leading-7">Your {progress.guide_plan.target_days}-day plan and {progress.guide_plan.completed_units.length} recorded reading sections are retained.</p>{progress.guide_plan.edition_status === 'earlier' && <p className="mt-2 leading-7">{progress.guide_plan.verified_current_units.length} completed sections are unchanged in this edition. Newly restored material is still unread. Your earlier record has not been rewritten.</p>}{progress.guide_plan.edition_status === 'unknown' && <p className="mt-2 leading-7">This plan belongs to another edition. Its recorded sections are retained for review and are not treated as completion of the restored book.</p>}</details>}
      <nav className="pb-chapter-nav" aria-label="Previous and next chapter">{index > 0 ? <Link className={secondaryStyle} to={precisHref(params, 'book', { chapter: ordered[index - 1].id })}><ArrowLeft size={15} aria-hidden="true"/>Previous chapter</Link> : <span/>}{index < ordered.length - 1 && <Link className={primaryStyle} to={precisHref(params, 'book', { chapter: ordered[index + 1].id })}>Next chapter<ArrowRight size={15} aria-hidden="true"/></Link>}</nav>
    </div>
  </div>
}
