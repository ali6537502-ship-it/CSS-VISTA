import { useState } from 'react'
import { ArrowLeft, ArrowRight, Lightbulb, RotateCcw } from 'lucide-react'
import { primary, secondary } from '@/features/preparation/api'
import type { GuidedResult, Question, Section } from './types'

type Send = (body: Record<string, unknown>) => Promise<void>

function GuidedQuestion({
  question,
  saved,
  blocked,
  send,
}: {
  question: Question
  saved?: GuidedResult
  blocked: boolean
  send: Send
}) {
  const [choice, setChoice] = useState<number>(),
    [retry, setRetry] = useState(false)
  if (saved && !retry)
    return (
      <div
        className={`rounded-2xl border p-5 ${saved.correct ? 'border-indigo-200 bg-indigo-50' : 'border-amber-200 bg-amber-50'}`}
      >
        <p className="text-sm font-semibold leading-7">{question.prompt}</p>
        <p className="mt-3 text-sm font-semibold">
          {saved.correct ? 'You got it.' : 'Let’s work through this.'}
        </p>
        <p className="mt-2 text-sm leading-7">Your answer: {question.options[saved.choice]}</p>
        {!saved.correct && (
          <p className="text-sm leading-7">Correct answer: {question.options[saved.answer]}</p>
        )}
        <p className="mt-3 text-sm leading-7 text-slate-700">{saved.explanation}</p>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          Feedback saved to this attempt. The complete understanding check remains separate.
        </p>
        <button
          className={`${secondary} mt-4`}
          disabled={blocked}
          onClick={() => {
            setRetry(true)
            setChoice(undefined)
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Try this question again
        </button>
      </div>
    )
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (choice !== undefined && !blocked)
          void send({
            action: 'guided_check',
            question_id: question.id,
            choice,
          })
      }}
    >
      <fieldset
        disabled={blocked}
        className="min-w-0 rounded-2xl border border-indigo-200 bg-white p-5"
      >
        <legend className="max-w-full px-1 text-sm font-semibold leading-7">
          {question.prompt}
        </legend>
        <div className="mt-2 grid gap-3">
          {question.options.map((option, index) => (
            <label
              key={index}
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${choice === index ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <input
                type="radio"
                name={`guided-${question.id}`}
                className="mt-1 h-4 w-4 shrink-0 accent-indigo-700"
                checked={choice === index}
                onChange={() => setChoice(index)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        <button className={`${primary} mt-4`} disabled={blocked || choice === undefined}>
          Check this answer
        </button>
      </fieldset>
    </form>
  )
}

export function GuidedSection({
  section,
  questions,
  results,
  blocked,
  send,
}: {
  section: Section
  questions: Question[]
  results: GuidedResult[]
  blocked: boolean
  send: Send
}) {
  const [idea, setIdea] = useState(0),
    [practice, setPractice] = useState(false)
  const last = idea === section.blocks.length - 1
  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-indigo-700">
        <span className="flex items-center gap-2" aria-live="polite">
          <Lightbulb className="h-4 w-4" aria-hidden="true" />
          Idea {idea + 1} of {section.blocks.length}
        </span>
        <span>{practice ? 'Apply the idea' : 'Understand the idea'}</span>
      </div>
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
        <p className="whitespace-pre-line break-words text-base leading-8 text-slate-800">
          {section.blocks[idea]}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          className={secondary}
          disabled={idea === 0}
          onClick={() => {
            setIdea((i) => i - 1)
            setPractice(false)
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Previous idea
        </button>
        {!last ? (
          <button
            className={primary}
            onClick={() => {
              setIdea((i) => i + 1)
              setPractice(false)
            }}
          >
            Next idea
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </button>
        ) : questions.length > 0 ? (
          <button className={primary} onClick={() => setPractice(true)} disabled={practice}>
            Try the checkpoint
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <p className="self-center text-xs leading-6 text-slate-500">
            Continue to the next section, then use the complete understanding check.
          </p>
        )}
      </div>
      {practice && (
        <section
          className="space-y-5 border-t border-indigo-100 pt-5"
          aria-label="Guided checkpoint"
        >
          <div>
            <h5 className="text-lg font-semibold">Put the idea to work</h5>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Choose an answer. You’ll get the reviewed explanation after it saves.
            </p>
          </div>
          {questions.map((q) => {
            const saved = results.find((r) => r.id === q.id)
            return (
              <GuidedQuestion
                key={`${q.id}:${saved?.check_id || 'new'}`}
                question={q}
                saved={saved}
                blocked={blocked}
                send={send}
              />
            )
          })}
        </section>
      )}
    </div>
  )
}

export function MistakeReview({
  results,
  revisit,
}: {
  results: GuidedResult[]
  revisit: (section: string) => void
}) {
  const mistakes = results.filter((r) => !r.correct)
  if (!mistakes.length) return null
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
      <h4 className="text-lg font-semibold">Ideas to revisit</h4>
      <p className="mt-2 text-sm leading-7 text-slate-700">
        Your latest checkpoint answers show where another pass could help. Correcting one updates
        this list and keeps the earlier answer in your history.
      </p>
      <div className="mt-4 grid gap-3">
        {mistakes.map((r) => (
          <div key={r.id} className="rounded-xl border border-amber-200 bg-white p-4">
            <p className="text-sm font-semibold leading-7">{r.prompt}</p>
            <button className={`${secondary} mt-3`} onClick={() => revisit(r.section_id)}>
              Revisit this concept
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
