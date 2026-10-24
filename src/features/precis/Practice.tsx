import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { learningRequest, saveIdentity } from '@/features/learning/api'
import { grammarLink } from '@/features/expression/api'
import { pakistanTime } from '@/features/membership/api'
import { inputStyle, panelStyle, primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import type { Overview, Progress, Question, SavedDrill } from './api'
function Drill({
  question,
  attempt,
  refresh,
  saved,
  onTouched,
  onBusyChange,
  blocked,
}: {
  question: Question
  attempt: string
  refresh: () => void
  saved?: SavedDrill
  onTouched: () => void
  onBusyChange: (busy: boolean) => void
  blocked: boolean
}) {
  const { user } = useAccount(),
    [choice, setChoice] = useState<number | null>(null),
    [hint, setHint] = useState(false),
    [result, setResult] = useState<{ correct: boolean; explanation: string }>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const displayedChoice = choice ?? saved?.choice ?? null
  const feedback = result || (saved?.choice === displayedChoice ? saved : undefined)
  async function check() {
    if (!user || displayedChoice === null || !attempt || busy || blocked) return
    onTouched()
    setBusy(true)
    onBusyChange(true)
    setError('')
    const body = { action: 'drill_answer', attempt_id: attempt, question_id: question.id, choice: displayedChoice }
    try {
      const id = await saveIdentity(user.id, `precis:drill:${attempt}:${question.id}`, body)
      const checked = await learningRequest<{ correct: boolean; explanation: string }>(
        user.id,
        'precis.php',
        { ...body, request_id: id.id },
      )
      id.done()
      setResult(checked)
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The response could not be saved.')
    } finally {
      setBusy(false)
      onBusyChange(false)
    }
  }
  return (
    <section className={panelStyle} aria-label="Précis drill">
      <fieldset disabled={busy || blocked}>
        <legend className="text-base font-semibold leading-7">{question.prompt}</legend>
        <div className="mt-4 space-y-2">
          {question.options.map((option, i) => (
            <label
              key={i}
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-6 ${displayedChoice === i ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}
            >
              <input
                type="radio"
                name={question.id}
                checked={displayedChoice === i}
                onChange={() => {
                  onTouched()
                  setChoice(i)
                  setResult(undefined)
                }}
                className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className={primaryStyle}
          disabled={busy || blocked || displayedChoice === null || !attempt}
          onClick={() => void check()}
        >
          {busy ? 'Checking…' : 'Check and save response'}
        </button>
        <button className={secondaryStyle} disabled={busy || blocked} onClick={() => { onTouched(); setHint((v) => !v) }} aria-expanded={hint}>
          {hint ? 'Hide hint' : 'Show a hint'}
        </button>
        <button className={secondaryStyle} disabled={busy || blocked || !attempt} onClick={() => { setChoice(null); setResult(undefined); setError(''); refresh() }}>
          Reload saved response
        </button>
      </div>
      {hint && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-7">{question.hint}</p>}
      {feedback && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-indigo-200 p-4 text-sm leading-7"
        >
          <p className="font-semibold">
            {feedback.correct ? 'Correct for this drill' : 'Review this distinction'}
          </p>
          <p>{feedback.explanation}</p>
          {!result && saved && (
            <p className="mt-2 text-xs text-slate-500">
              Last saved response: <time dateTime={saved.created_at}>{pakistanTime(saved.created_at)}</time>.
            </p>
          )}
          {question.grammar_day && (
            <Link
              to={grammarLink(question.grammar_day, undefined, undefined, attempt)}
              className="mt-2 inline-flex min-h-11 items-center font-semibold text-indigo-700 underline"
            >
              Review Grammar Day {question.grammar_day}
            </Link>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Your first response stays in the profile; a retry is practice.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-800">
          {error}
        </p>
      )}
    </section>
  )
}
export function SkillProfile({ progress, attempt }: { progress: Progress; attempt: string }) {
  return (
    <section className={panelStyle}>
      <h2 className="text-xl font-semibold">Précis Skill Profile</h2>
      <p className="mt-3 text-xs leading-7 text-slate-500">{progress.profile.basis}</p>
      <ul className="mt-5 divide-y divide-slate-200">
        {progress.profile.items.map((i) => (
          <li key={i.skill} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-semibold">{i.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                {i.first_correct} correct first responses / {i.questions} distinct drills
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                {i.state}
              </span>
              <Link
                className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline"
                to={`/account/precis?view=skills&attempt=${attempt}&skill=${i.skill}`}
              >
                Practise
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
export default function Practice({
  data,
  attempt,
  progress,
  refresh,
  review,
}: {
  data: Overview
  attempt: string
  progress?: Progress
  refresh: () => void
  review: boolean
}) {
  const [params, setParams] = useSearchParams(),
    requested = params.get('skill'),
    skill = requested && requested in data.skills ? requested : 'central_idea'
  const [busy, setBusy] = useState(false)
  const ids = progress?.profile.items.flatMap((i) => i.review_ids) || [],
    questions =
      data.catalog?.questions.filter((q) => (review ? ids.includes(q.id) : q.skill === skill)) || []
  const saved = new Map((progress?.saved_drills || []).map((response) => [response.question_id, response]))
  const selected = questions.find((q) => q.id === params.get('question')) || questions.find((q) => !saved.has(q.id)) || questions.find((q) => ids.includes(q.id)) || questions[0]
  const index = selected ? questions.findIndex((q) => q.id === selected.id) : -1
  const all = params.get('practice') === 'all'
  function select(id: string) {
    if (params.get('question') === id) return
    const next = new URLSearchParams(params)
    next.set('question', id)
    setParams(next, { replace: true })
  }
  return (
    <div className="space-y-6">
      <section className={panelStyle}>
        <h2 className="text-xl font-semibold">{review ? 'Error review' : 'Skill practice'}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Handbook-based recognition drills, checked without AI. Work through a hint, try again,
          then return after three days for a spaced check. Free-text meaning needs separate
          evaluation.
        </p>
        {!review && (
          <label className="mt-5 grid gap-2 text-sm font-semibold">
            Skill
            <select
              className={inputStyle}
              value={skill}
              disabled={busy}
              onChange={(e) => {
                const next = new URLSearchParams(params)
                next.set('skill', e.target.value)
                next.delete('question')
                setParams(next)
              }}
            >
              {Object.entries(data.skills).map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="mt-5 grid gap-2 text-sm font-semibold">
          Practice layout
          <select className={inputStyle} value={all ? 'all' : 'guided'} disabled={busy} onChange={(event) => {
            const next = new URLSearchParams(params)
            next.set('practice', event.target.value)
            if (selected) next.set('question', selected.id)
            setParams(next)
          }}>
            <option value="guided">Guided · one question at a time</option>
            <option value="all">All drills in this skill</option>
          </select>
        </label>
        {!all && selected && (!attempt || progress) && (
          <nav aria-label="Drill navigation" className="mt-5 space-y-4">
            <p className="text-sm leading-7">Question {index + 1} of {questions.length} · {saved.has(selected.id) ? 'Response saved' : 'Not attempted'}</p>
            <p className="text-xs leading-6 text-slate-500">Read, try the question, review the explanation, then continue. Opening a question does not record a response.</p>
            <div className="flex flex-wrap gap-3">
              <button className={secondaryStyle} disabled={busy || index <= 0} onClick={() => select(questions[index - 1].id)}>Previous question</button>
              <button className={secondaryStyle} disabled={busy || index >= questions.length - 1} onClick={() => select(questions[index + 1].id)}>Next question</button>
            </div>
          </nav>
        )}
        {!attempt && (
          <p className="mt-4 text-sm text-slate-500">
            Choose a preparation attempt to record responses.
          </p>
        )}
      </section>
      {attempt && !progress ? (
        <p role="status" className={panelStyle}>Loading your saved drill responses…</p>
      ) : (all ? questions : selected ? [selected] : []).map((q) => (
        <Drill key={`${attempt}:${q.id}`} question={q} attempt={attempt} refresh={refresh} saved={saved.get(q.id)} onTouched={() => select(q.id)} onBusyChange={setBusy} blocked={busy} />
      ))}
      {review && progress && questions.length === 0 && (
        <p className={panelStyle}>
          No drill errors are recorded for this attempt. This does not establish mastery of written
          Précis.
        </p>
      )}
      {progress && <SkillProfile progress={progress} attempt={attempt} />}
    </div>
  )
}
