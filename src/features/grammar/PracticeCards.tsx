import { Eye, RotateCcw } from 'lucide-react'
import type { GrammarQuestion } from '@/data/grammarCourse'

const KIND_LABEL: Record<GrammarQuestion['kind'], string> = {
  choice: 'Choose the correct sentence', gap: 'Complete the sentence', spot: 'Find the error',
}
export function QuestionCard({ question, index, answer, onAnswer, onRetry, hidden }: {
  question: GrammarQuestion
  index: number
  answer: number | undefined
  onAnswer: (option: number, answeredAt: number) => void
  onRetry: () => void
  hidden?: boolean
}) {
  const answered = answer !== undefined
  const correct = answer === question.answer
  const isSpot = question.kind === 'spot'
  return (
    <li hidden={hidden} className="rounded-xl border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-slate-900">{index + 1}</span>
        <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-900">{KIND_LABEL[question.kind]}</span>
      </div>
      <p className="mt-3 text-[15px] font-medium leading-7 text-foreground">{question.prompt}</p>
      <div className={`mt-3 grid gap-2 ${isSpot ? 'grid-cols-2 sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
        {question.options.map((option, optionIndex) => {
          const isAnswer = optionIndex === question.answer
          const isChosen = optionIndex === answer
          const tone = !answered
            ? 'border-input hover:border-emerald-600 hover:bg-emerald-50'
            : isAnswer
              ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
              : isChosen
                ? 'border-red-400 bg-red-50 text-red-950'
                : 'border-input opacity-60'
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(optionIndex, Date.now())}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm leading-6 transition-colors ${isSpot ? 'justify-center font-bold' : 'text-left'} ${tone}`}
            >
              {!isSpot && <span className="mt-0.5 text-xs font-bold text-muted-foreground">{String.fromCharCode(65 + optionIndex)}</span>}
              <span>{isSpot ? `Part ${option}` : option}</span>
            </button>
          )
        })}
      </div>
      {answered && (
        <div role="status" className={`mt-3 rounded-lg px-3 py-2.5 text-sm leading-6 ${correct ? 'bg-emerald-50 text-emerald-950' : 'bg-amber-50 text-amber-950'}`}>
          <p className="font-semibold">
            {correct
              ? 'Correct.'
              : isSpot
                ? `Not quite — the error is in part ${question.options[question.answer]}.`
                : `Not quite — the answer is ${String.fromCharCode(65 + question.answer)}.`}
          </p>
          <p className="mt-1">{question.why}</p>
          {!correct && (
            <button type="button" onClick={onRetry} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-900 underline underline-offset-2">
              <RotateCcw className="h-3.5 w-3.5" /> Clear and try this one again
            </button>
          )}
        </div>
      )}
    </li>
  )
}

export function CorrectionCard({ index, task, model, note, draft, onDraft, revealed, onReveal, hidden }: {
  index: number
  task: string
  model: string
  note: string
  draft: string
  onDraft: (value: string) => void
  revealed: boolean
  onReveal: () => void
  hidden?: boolean
}) {
  return (
    <li hidden={hidden} className="rounded-xl border bg-white p-4 sm:p-5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-slate-900">{index + 1}</span>
        <p className="text-[15px] leading-7 text-red-950">{task}</p>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Write your corrected sentence</span>
        <textarea
          maxLength={20000}
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          rows={2}
          placeholder="Type the sentence as you would write it in the paper…"
          className="mt-1.5 w-full rounded-lg border bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      {revealed ? (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm leading-6 text-emerald-950">
          <p><span className="font-semibold">Model answer: </span>{model}</p>
          <p className="mt-1 text-emerald-900">{note}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onReveal}
          disabled={!draft.trim()}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-md border border-indigo-200 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"
        >
          <Eye className="h-3.5 w-3.5" /> Show the model answer
        </button>
      )}
    </li>
  )
}
