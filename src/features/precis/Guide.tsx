import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, BookOpen, Check, ClipboardCheck, RotateCcw } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { learningRequest, saveIdentity } from '@/features/learning/api'
import { panelStyle, primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import {
  buildStudyDays,
  coveredCount,
  firstPendingDay,
  handbookUnits,
  maximumDays,
  minimumDays,
  paceChoices,
  questionForDay,
  safeDay,
  safeUnitStep,
} from './guideModel'
import type { Overview, Progress, Question } from './api'
import Composer from './Composer'

function OriginalBlock({ block }: { block: ReturnType<typeof handbookUnits>[number]['blocks'][number]['block'] }) {
  if (block.type === 'table') {
    return (
      <div
        className="mt-5 overflow-x-auto rounded-xl border border-slate-200"
        role="region"
        tabIndex={0}
        aria-label="Original handbook table"
      >
        <table className="w-full border-collapse text-left text-sm">
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} className={i ? 'border-t border-slate-200' : 'bg-slate-50'}>
                {row.map((cell, j) => (
                  <td key={j} className="min-w-28 max-w-lg whitespace-pre-wrap p-4 align-top leading-7">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return (
    <p className={`mt-5 whitespace-pre-wrap text-base leading-8 text-slate-800 ${block.type === 'bullet' ? 'border-l-4 border-indigo-200 pl-4' : ''}`}>
      {block.text}
    </p>
  )
}

function WorkingNote({ storageKey }: { storageKey: string }) {
  const [value, setValue] = useState(() => {
    try { return sessionStorage.getItem(storageKey) || '' } catch { return '' }
  })
  const [warning, setWarning] = useState(false)
  function update(value: string) {
    setValue(value)
    try {
      sessionStorage.setItem(storageKey, value)
      setWarning(false)
    } catch { setWarning(true) }
  }
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <label htmlFor="precis-guide-reflection" className="block text-sm font-semibold">
        Explain what this section means in your own words
      </label>
      <textarea
        id="precis-guide-reflection"
        className="mt-3 min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm leading-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
        value={value}
        maxLength={1600}
        onChange={(event) => update(event.target.value)}
        placeholder="Write your understanding here, or continue reading."
      />
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Your note stays in this browser tab. To save a complete draft to your account, use the writing workspace.
      </p>
      {warning && <p role="alert" className="mt-1 text-xs text-red-700">Storage unavailable. Your note remains visible on this screen.</p>}
    </section>
  )
}

function DailyCheck({
  question,
  attempt,
  refresh,
}: { question: Question; attempt: string; refresh: () => void }) {
  const { user } = useAccount()
  const [choice, setChoice] = useState<number | null>(null)
  const [hint, setHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [explanation, setExplanation] = useState('')
  async function submit() {
    if (!user || !attempt || choice === null || busy) return
    const body = { action: 'drill_answer', attempt_id: attempt, question_id: question.id, choice }
    setBusy(true)
    setMessage('')
    setExplanation('')
    try {
      const receipt = await saveIdentity(user.id, `precis:guide:check:${attempt}:${question.id}`, body)
      const response = await learningRequest<{ correct: boolean; explanation: string }>(
        user.id, 'precis.php', { ...body, request_id: receipt.id },
      )
      receipt.done()
      setMessage(response.correct ? 'Correct for this reviewed question.' : 'Review the distinction.')
      setExplanation(response.explanation)
      refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your answer could not be recorded.')
    } finally { setBusy(false) }
  }
  return (
    <section className="mt-5 rounded-2xl border border-slate-200 p-4 sm:p-6">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-700">
        <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> From the reviewed question bank
      </p>
      <fieldset disabled={busy} className="mt-5">
        <legend className="text-base font-semibold leading-7">{question.prompt}</legend>
        <div className="mt-4 grid gap-2">
          {question.options.map((option, index) => (
            <label key={index} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-6 ${choice === index ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
              <input type="radio" name={question.id} checked={choice === index} onChange={() => {
                setChoice(index)
                setMessage('')
                setExplanation('')
              }} className="mt-1 h-4 w-4 shrink-0 accent-indigo-600" />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={primaryStyle} disabled={choice === null || busy} onClick={() => void submit()}>
          {busy ? 'Checking…' : 'Check answer'}
        </button>
        <button type="button" className={secondaryStyle} aria-expanded={hint} onClick={() => setHint(!hint)}>
          {hint ? 'Hide hint' : 'Show hint'}
        </button>
      </div>
      {hint && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-7">{question.hint}</p>}
      {message && (
        <div role="status" className="mt-4 rounded-xl border border-indigo-200 p-4">
          <p className="text-sm font-semibold">{message}</p>
          {explanation && <p className="mt-2 text-sm leading-7">{explanation}</p>}
        </div>
      )}
      <p className="mt-4 text-xs leading-6 text-slate-500">
        This question checks your choice. It does not mark a written précis.
      </p>
    </section>
  )
}

export default function Guide({
  data,
  attempt,
  progress,
  refresh,
}: {
  data: Overview
  attempt: string
  progress?: Progress
  refresh: () => void
}) {
  const { user } = useAccount()
  const [params, setParams] = useSearchParams()
  const units = useMemo(() => handbookUnits(data.catalog?.chapters || []), [data.catalog])
  const storedPlan = progress?.guide_plan
  const savedDays = storedPlan?.target_days
  const [paceOverride, setDaysInput] = useState<string | null>(null)
  const daysInput = paceOverride ?? String(savedDays ?? 14)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [changePace, setChangePace] = useState(false)
  const [showWriting, setShowWriting] = useState(false)

  const chosenDays = Number(daysInput)
  const validDays = Number.isInteger(chosenDays) && chosenDays >= minimumDays &&
    chosenDays <= Math.min(maximumDays, units.length)
  const candidate = useMemo(
    () => (validDays ? buildStudyDays(units, chosenDays) : []),
    [units, chosenDays, validDays],
  )
  const schedule = useMemo(
    () => (savedDays ? buildStudyDays(units, savedDays) : []),
    [units, savedDays],
  )
  const completed = storedPlan?.completed_units || []
  const covered = coveredCount(units, completed)
  const fallbackDay = schedule.length ? firstPendingDay(schedule, completed) : 1
  const dayNumber = safeDay(params.get('day'), schedule.length, fallbackDay)
  const today = schedule[dayNumber - 1]
  const step = safeUnitStep(params.get('unit_step'), today?.units.length || 0)
  const unit = today?.units[step]
  const dayCompleted = today?.units.filter((item) => completed.includes(item.id)).length || 0
  const dayQuestion = today ? questionForDay(data, today) : undefined
  const writingPassage = data.catalog?.passages.length ? data.catalog.passages[(dayNumber - 1) % data.catalog.passages.length] : undefined

  function nav(fields: Record<string, string>) {
    const next = new URLSearchParams(params)
    next.set('view', 'guide')
    Object.entries(fields).forEach(([key, value]) => next.set(key, value))
    setParams(next)
    setNotice('')
  }
  function goDay(day: number) {
    nav({ day: String(day), unit_step: '0' })
  }
  async function savePace() {
    if (!user || !attempt || !validDays || busy) return
    const body = {
      action: 'guide_setup',
      attempt_id: attempt,
      target_days: chosenDays,
      expected_version: storedPlan?.version || 0,
    }
    setBusy(true)
    setNotice('')
    try {
      const receipt = await saveIdentity(user.id, `precis:guide:pace:${attempt}`, body)
      await learningRequest(user.id, 'precis.php', { ...body, request_id: receipt.id })
      receipt.done()
      refresh()
      setChangePace(false)
      setDaysInput(null)
      nav({ day: '1', unit_step: '0' })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save your course duration.')
    } finally { setBusy(false) }
  }
  async function markRead() {
    if (!user || !attempt || !storedPlan || !unit || busy) return
    const body = {
      action: 'guide_mark',
      attempt_id: attempt,
      unit_id: unit.id,
      expected_version: storedPlan.version,
    }
    setBusy(true)
    setNotice('')
    try {
      const receipt = await saveIdentity(user.id, `precis:guide:unit:${attempt}`, body)
      await learningRequest(user.id, 'precis.php', { ...body, request_id: receipt.id })
      receipt.done()
      refresh()
      nav({ day: String(dayNumber), unit_step: String(step + 1) })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Your reading progress was not saved.')
    } finally { setBusy(false) }
  }
  function next() {
    if (!today) return
    if (step < today.units.length) nav({ unit_step: String(step + 1) })
    else if (dayNumber < schedule.length) goDay(dayNumber + 1)
  }
  function previous() {
    if (step > 0) nav({ unit_step: String(step - 1) })
    else if (dayNumber > 1) goDay(dayNumber - 1)
  }
  const choosePace = !storedPlan || changePace

  if (!data.catalog) return (
    <section className={panelStyle}>Your handbook is currently unavailable. Your saved work remains protected.</section>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-700">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          VISTA Guide · Master Précis Writing Handbook
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Learn Précis at your own pace
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Study all 22 chapters and three appendices in the handbook’s original order.
          Choose your course duration and follow your daily reading and practice.
        </p>
      </section>

      {choosePace && (
        <section className={panelStyle} aria-label="Create your personal learning plan">
          <h3 className="text-xl font-semibold">
            {storedPlan ? 'Change your learning duration' : 'How many days do you want to learn Précis?'}
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            All chapters remain in the course. Fewer days mean more reading each day;
            more days mean shorter sessions.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {paceChoices.filter((value) => value <= units.length).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={chosenDays === value}
                className={`min-h-14 rounded-xl border px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${chosenDays === value ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 hover:bg-slate-50'}`}
                onClick={() => setDaysInput(String(value))}
              >
                {value} days
              </button>
            ))}
          </div>
          <label className="mt-5 block text-sm font-semibold" htmlFor="precis-guide-days">
            Or set your own duration (3–{Math.min(maximumDays, units.length)} days)
          </label>
          <input
            id="precis-guide-days"
            className="mt-2 min-h-12 w-36 rounded-xl border border-slate-200 bg-white px-4 text-sm"
            type="number"
            min={minimumDays}
            max={Math.min(maximumDays, units.length)}
            step={1}
            value={daysInput}
            onChange={(event) => setDaysInput(event.target.value)}
          />
          {!validDays && <p role="alert" className="mt-3 text-sm text-amber-800">Choose a whole number of days within the range above.</p>}
          {validDays && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5">
              <h4 className="font-semibold">
                Your {chosenDays}-day course
              </h4>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                {units.length} original handbook lesson sections, divided by amount of source material.
                No chapter is omitted or repeated.
              </p>
              <ol className="mt-4 grid max-h-72 gap-2 overflow-y-auto pr-1">
                {candidate.map((day) => (
                  <li key={day.day} className="flex items-start gap-3 border-b border-slate-200 py-2 text-sm">
                    <span className="w-14 shrink-0 font-semibold text-indigo-700">Day {day.day}</span>
                    <span className="min-w-0 flex-1 text-slate-700">{day.title}</span>
                    <span className="shrink-0 text-xs text-slate-500">{day.units.length} sections</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {storedPlan && <p className="mt-4 text-sm leading-6 text-slate-600">
            Changing duration reorganises the schedule, but keeps your {covered} completed reading sections.
          </p>}
          {!attempt && <p className="mt-4 text-sm text-amber-800">Select a preparation attempt above to save your course.</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className={primaryStyle} disabled={!attempt || !validDays || busy} onClick={() => void savePace()}>
              {busy ? 'Saving…' : storedPlan ? 'Update my study plan' : 'Create my study plan'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            {storedPlan && (
              <button type="button" className={secondaryStyle} onClick={() => { setDaysInput(null); setChangePace(false) }}>Keep current plan</button>
            )}
          </div>
          {notice && <p role="alert" className="mt-4 text-sm text-red-700">{notice}</p>}
        </section>
      )}

      {storedPlan && !changePace && today && (
        <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className={panelStyle}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">My course</h3>
              <button type="button" className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-indigo-700 underline" onClick={() => setChangePace(true)}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Change days
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              {covered} / {units.length} handbook sections covered
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.round((covered / Math.max(1, units.length)) * 100)}%` }} />
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-500">Reading completed is not a score for writing proficiency.</p>
            <details className="mt-5" open>
              <summary className="cursor-pointer text-sm font-semibold">Your daily schedule</summary>
              <nav aria-label="Choose a study day" className="mt-3 grid max-h-80 gap-1 overflow-y-auto">
                {schedule.map((day) => {
                  const count = day.units.filter((item) => completed.includes(item.id)).length
                  const finished = count === day.units.length
                  return (
                    <button key={day.day} type="button" aria-current={dayNumber === day.day ? 'step' : undefined} onClick={() => goDay(day.day)}
                      className={`flex min-h-11 items-start gap-2 rounded-lg px-3 py-2 text-left text-sm leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${day.day === dayNumber ? 'bg-indigo-50 font-semibold text-indigo-900' : 'hover:bg-slate-50'}`}>
                      <span className="w-12 shrink-0 text-xs">Day {day.day}</span>
                      <span className="min-w-0 flex-1 truncate">{day.title}</span>
                      {finished && <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" aria-label="Read" />}
                    </button>
                  )
                })}
              </nav>
            </details>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className={panelStyle}>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">
                Day {dayNumber} of {schedule.length}
              </p>
              <h3 className="mt-2 text-xl font-semibold">{today.title}</h3>
              <p className="mt-3 text-sm text-slate-600">
                {dayCompleted} of {today.units.length} sections covered today
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.round((dayCompleted / Math.max(1, today.units.length)) * 100)}%` }} />
              </div>

              {unit ? (
                <div className="mt-7">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Section {step + 1} of {today.units.length} · Chapter {unit.chapterId}
                  </p>
                  <h4 className="mt-3 text-lg font-semibold text-slate-950">
                    {unit.chapterTitle.replace(/^\d+\.\s*/, '')}
                  </h4>
                  <p className="mt-1 text-sm font-medium text-indigo-700">{unit.section}</p>
                  <div className="space-y-5">
                    {unit.blocks.map((item) => <OriginalBlock key={item.index} block={item.block} />)}
                  </div>
                  {unit.chapterId === '2' && <p className="mt-4 text-xs leading-6 text-amber-800">
                    Examination details in the original handbook are identified as pending official verification.
                    Follow the current question instructions.
                  </p>}
                  <WorkingNote key={`${user?.id}:${attempt}:${unit.id}`}
                    storageKey={`cssvista:precis:study-note:v1:${user?.id}:${attempt}:${unit.id}`} />
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button type="button" className={secondaryStyle} disabled={step === 0 && dayNumber === 1} onClick={previous}>
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous
                    </button>
                    <button type="button" className={primaryStyle} disabled={busy} onClick={() => void markRead()}>
                      {busy ? 'Saving…' : completed.includes(unit.id) ? 'Reviewed · Continue' : 'I have read this · Continue'}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  {notice && <p role="alert" className="mt-3 text-sm text-red-700">{notice}</p>}
                </div>
              ) : (
                <div className="mt-7">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-6 w-6 text-indigo-700" aria-hidden="true" />
                    <h4 className="text-xl font-semibold">Today's practice</h4>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    You can revisit any section. This question comes from the existing Précis practice bank.
                  </p>
                  {dayQuestion ? <DailyCheck key={`${attempt}:${dayNumber}:${dayQuestion.id}`} question={dayQuestion} attempt={attempt} refresh={refresh} /> :
                    <p className="mt-4 text-sm text-slate-600">No fixed-answer question is available for this section yet. Continue to the writing workspace for independent practice.</p>}
                  {writingPassage && (
                    <section className="mt-6 rounded-2xl border border-slate-200 p-4 sm:p-5">
                      <h5 className="font-semibold">Written Précis practice</h5>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Type a précis of an original handbook practice passage, check your writing
                        and save your revision. Only the six supplied practice passages are used;
                        a passage may recur in longer courses.
                      </p>
                      <p className="mt-3 text-sm font-medium">Practice passage: {writingPassage.label}</p>
                      <button type="button" className={secondaryStyle} aria-expanded={showWriting} onClick={() => setShowWriting((open) => !open)}>
                        {showWriting ? 'Close writing practice' : 'Open writing practice and checker'}
                      </button>
                    </section>
                  )}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" className={secondaryStyle} onClick={previous}>
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Review today
                    </button>
                    <button type="button" className={primaryStyle} onClick={next} disabled={dayNumber === schedule.length}>
                      {dayNumber === schedule.length ? 'Course reading finished' : 'Continue to next day'}
                      {dayNumber !== schedule.length && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              )}
            </section>
            {showWriting && !unit && writingPassage && (
              <div id="vista-guide-writing" className="space-y-4">
                <Composer
                  key={`${attempt}:${writingPassage.id || 'custom'}`}
                  data={data}
                  attempt={attempt}
                  source={writingPassage}
                  timed={false}
                  onSaved={(writing, version) => setParams({ writing, version })}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Link to={`/account/precis?view=course&attempt=${encodeURIComponent(attempt)}&chapter=${unit?.chapterId || today.chapters[0]}`} className={secondaryStyle}>
                Read full handbook chapter
              </Link>
              <Link to={`/account/precis?view=write&attempt=${encodeURIComponent(attempt)}`} className={secondaryStyle}>
                Open Précis writing practice
              </Link>
              <Link to={`/account/precis?view=review&attempt=${encodeURIComponent(attempt)}`} className={secondaryStyle}>
                Revise my recorded errors
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
