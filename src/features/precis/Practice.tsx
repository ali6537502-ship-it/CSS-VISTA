import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { learningRequest, saveIdentity } from '@/features/learning/api'
import { grammarLink } from '@/features/expression/api'
import { inputStyle, panelStyle, primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import type { Overview, Progress, Question } from './api'
function Drill({
  question,
  attempt,
  refresh,
}: {
  question: Question
  attempt: string
  refresh: () => void
}) {
  const { user } = useAccount(),
    [choice, setChoice] = useState<number | null>(null),
    [hint, setHint] = useState(false),
    [result, setResult] = useState<{ correct: boolean; explanation: string }>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function check() {
    if (!user || choice === null || !attempt || busy) return
    setBusy(true)
    setError('')
    const body = { action: 'drill_answer', attempt_id: attempt, question_id: question.id, choice }
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
    }
  }
  return (
    <section className={panelStyle}>
      <fieldset disabled={busy}>
        <legend className="text-base font-semibold leading-7">{question.prompt}</legend>
        <div className="mt-4 space-y-2">
          {question.options.map((option, i) => (
            <label
              key={i}
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-6 ${choice === i ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}
            >
              <input
                type="radio"
                name={question.id}
                checked={choice === i}
                onChange={() => {
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
          disabled={busy || choice === null || !attempt}
          onClick={() => void check()}
        >
          {busy ? 'Checking…' : 'Check and save response'}
        </button>
        <button className={secondaryStyle} onClick={() => setHint((v) => !v)} aria-expanded={hint}>
          {hint ? 'Hide hint' : 'Show a hint'}
        </button>
      </div>
      {hint && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-7">{question.hint}</p>}
      {result && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-indigo-200 p-4 text-sm leading-7"
        >
          <p className="font-semibold">
            {result.correct ? 'Correct for this drill' : 'Review this distinction'}
          </p>
          <p>{result.explanation}</p>
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
  const ids = progress?.profile.items.flatMap((i) => i.review_ids) || [],
    questions =
      data.catalog?.questions.filter((q) => (review ? ids.includes(q.id) : q.skill === skill)) || []
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
              onChange={(e) => {
                const next = new URLSearchParams(params)
                next.set('skill', e.target.value)
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
        {!attempt && (
          <p className="mt-4 text-sm text-slate-500">
            Choose a preparation attempt to record responses.
          </p>
        )}
      </section>
      {questions.map((q) => (
        <Drill key={`${attempt}:${q.id}`} question={q} attempt={attempt} refresh={refresh} />
      ))}
      {review && questions.length === 0 && (
        <p className={panelStyle}>
          No drill errors are recorded for this attempt. This does not establish mastery of written
          Précis.
        </p>
      )}
      {progress && <SkillProfile progress={progress} attempt={attempt} />}
    </div>
  )
}
