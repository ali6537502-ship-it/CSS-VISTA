import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Save,
} from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { learningRequest, saveIdentity } from '@/features/learning/api'
import { panelStyle, primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import type { Overview, Progress, Question } from './api'
import {
  availableGuideChapters,
  guideCards,
  guidePath,
  guidePaths,
  guideQuestion,
  guideStep,
} from './guideModel'

function Reflection({ storageKey, prompt }: { storageKey: string; prompt: string }) {
  const [note, setNote] = useState(() => {
    try {
      return sessionStorage.getItem(storageKey) || ''
    } catch {
      return ''
    }
  })
  const [storageError, setStorageError] = useState(false)
  function change(value: string) {
    setNote(value)
    try {
      sessionStorage.setItem(storageKey, value)
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }
  return (
    <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5">
      <h3 className="font-semibold text-slate-900">Put it in your own words</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{prompt}</p>
      <label className="mt-3 block text-sm font-medium" htmlFor="precis-guide-note">
        Your working note
      </label>
      <textarea
        id="precis-guide-note"
        className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
        maxLength={1200}
        value={note}
        onChange={(event) => change(event.target.value)}
        placeholder="Explain the idea in your own words."
      />
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Private note on this browser tab only. It is not assessed or synced to your account.
        Copy anything important into your saved writing workspace.
      </p>
      {storageError && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          Browser storage is unavailable. Your note remains visible until this page is closed.
        </p>
      )}
    </section>
  )
}

function ReviewedCheck({
  question,
  attempt,
  refresh,
}: {
  question: Question
  attempt: string
  refresh: () => void
}) {
  const { user } = useAccount()
  const [choice, setChoice] = useState<number | null>(null)
  const [result, setResult] = useState<{ correct: boolean; explanation: string } | null>(null)
  const [hint, setHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function check() {
    if (!user || !attempt || choice === null || busy) return
    setBusy(true)
    setError('')
    const body = {
      action: 'drill_answer',
      attempt_id: attempt,
      question_id: question.id,
      choice,
    }
    try {
      const receipt = await saveIdentity(
        user.id,
        `precis:guide:drill:${attempt}:${question.id}`,
        body,
      )
      const checked = await learningRequest<{ correct: boolean; explanation: string }>(
        user.id,
        'precis.php',
        { ...body, request_id: receipt.id },
      )
      receipt.done()
      setResult(checked)
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your response was not saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-700">
        <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        Reviewed handbook exercise
      </div>
      <fieldset disabled={busy} className="mt-4">
        <legend className="text-base font-semibold leading-7">{question.prompt}</legend>
        <div className="mt-4 grid gap-2">
          {question.options.map((option, index) => (
            <label
              key={index}
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-6 ${choice === index ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}
            >
              <input
                className="mt-1 h-4 w-4 accent-indigo-600"
                type="radio"
                name={question.id}
                checked={choice === index}
                onChange={() => {
                  setChoice(index)
                  setResult(null)
                }}
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className={primaryStyle}
          disabled={!attempt || choice === null || busy}
          onClick={() => void check()}
        >
          {busy ? 'Saving response…' : 'Check my answer'}
        </button>
        <button
          type="button"
          className={secondaryStyle}
          aria-expanded={hint}
          onClick={() => setHint((value) => !value)}
        >
          {hint ? 'Hide hint' : 'Read a hint'}
        </button>
      </div>
      {!attempt && (
        <p className="mt-3 text-sm text-amber-800">
          Select a preparation attempt above to check and record your response.
        </p>
      )}
      {hint && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">{question.hint}</p>}
      {result && (
        <div role="status" className="mt-4 rounded-xl border border-indigo-200 p-4">
          <p className="font-semibold">
            {result.correct ? 'Correct for this exercise' : 'Review the distinction'}
          </p>
          <p className="mt-2 text-sm leading-7">{result.explanation}</p>
          <p className="mt-2 text-xs text-slate-500">
            This checks a fixed question, not the quality of original Précis writing.
            The first response remains in your practice record.
          </p>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
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
  const [busy, setBusy] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const catalog = data.catalog
  const requestedChapter = params.get('chapter')
  const fallbackPath = guidePaths.find((path) =>
    path.chapters.some((id) => id === requestedChapter),
  )
  const path = guidePath(params.get('guide_path') || fallbackPath?.id || null)
  const chapters = availableGuideChapters(path, catalog?.chapters || [])
  const savedChapter = progress ? String(progress.current_chapter) : null
  const selectedChapter =
    chapters.find((chapter) => chapter.id === requestedChapter) ||
    chapters.find((chapter) => chapter.id === savedChapter) ||
    chapters[0]
  const cards = selectedChapter ? guideCards(selectedChapter) : []
  const step = guideStep(params.get('guide_step'), cards.length)
  const end = step === cards.length
  const card = cards[step]
  const chapterIndex = chapters.findIndex((item) => item.id === selectedChapter?.id)
  const question = selectedChapter && guideQuestion(data, path, selectedChapter.id)

  function navigate(fields: Record<string, string>) {
    const next = new URLSearchParams(params)
    next.set('view', 'guide')
    Object.entries(fields).forEach(([key, value]) => next.set(key, value))
    setSaveMessage('')
    setParams(next)
  }

  function choosePath(id: string) {
    const selected = guidePath(id)
    const first = availableGuideChapters(selected, catalog?.chapters || [])[0]
    if (first) navigate({ guide_path: selected.id, chapter: first.id, guide_step: '0' })
  }

  function move(delta: number) {
    if (!selectedChapter) return
    const nextStep = step + delta
    if (nextStep >= 0 && nextStep <= cards.length) {
      navigate({ chapter: selectedChapter.id, guide_step: String(nextStep) })
    } else {
      const nextChapter = chapters[chapterIndex + (delta > 0 ? 1 : -1)]
      if (nextChapter) {
        const target = guideCards(nextChapter)
        navigate({
          chapter: nextChapter.id,
          guide_step: String(delta > 0 ? 0 : target.length),
        })
      }
    }
  }

  async function savePlace() {
    if (!user || !attempt || !progress || !selectedChapter || busy) return
    setBusy(true)
    setSaveMessage('')
    const body = {
      action: 'progress_save',
      attempt_id: attempt,
      expected_version: progress.version,
      current_day: progress.current_day,
      current_chapter: Number(selectedChapter.id),
      completed: progress.completed,
    }
    try {
      const receipt = await saveIdentity(
        user.id,
        `precis:guide:progress:${attempt}`,
        body,
      )
      await learningRequest(user.id, 'precis.php', { ...body, request_id: receipt.id })
      receipt.done()
      refresh()
      setSaveMessage('Chapter saved to your preparation attempt. The current screen remains in the page address.')
    } catch (cause) {
      setSaveMessage(cause instanceof Error ? cause.message : 'Could not save this chapter.')
    } finally {
      setBusy(false)
    }
  }

  if (!catalog || !selectedChapter) {
    return (
      <section className={panelStyle}>
        <h2 className="font-semibold">This learning route is unavailable</h2>
        <p className="mt-2 text-sm text-slate-600">
          The reviewed handbook catalogue has not returned the chapters for this route.
        </p>
      </section>
    )
  }

  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className={`${panelStyle} min-w-0`}>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          Learn with VISTA Guide
        </h2>
        <p className="mt-2 text-xs leading-6 text-slate-600">
          Choose a purpose, learn from the original handbook, then test a reviewed distinction.
        </p>
        <nav aria-label="Learning purposes" className="mt-5 grid gap-2">
          {guidePaths.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={path.id === option.id}
              onClick={() => choosePath(option.id)}
              className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${path.id === option.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <span className="block text-sm font-semibold">{option.title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">{option.description}</span>
            </button>
          ))}
        </nav>
        <div className="mt-5 border-t border-slate-200 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-600">
            In this route
          </h3>
          <ol className="mt-3 grid gap-1">
            {chapters.map((chapter, index) => (
              <li key={chapter.id}>
                <button
                  type="button"
                  aria-current={selectedChapter.id === chapter.id ? 'step' : undefined}
                  className={`flex w-full items-start gap-2 rounded-lg p-2 text-left text-sm leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${selectedChapter.id === chapter.id ? 'bg-indigo-50 font-semibold text-indigo-900' : 'text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => navigate({ chapter: chapter.id, guide_step: '0' })}
                >
                  <span className="shrink-0 text-xs text-slate-500">{index + 1}.</span>
                  <span>{chapter.title.replace(/^\\d+\\.\\s*/, '')}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <section className={`${panelStyle} min-w-0`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">
            {path.title} · Chapter {chapterIndex + 1} of {chapters.length}
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
            {selectedChapter.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Original handbook material, shown a step at a time.
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div
              className="h-full rounded-full bg-indigo-600"
              style={{ width: `${Math.round(((step + 1) / (cards.length + 1)) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500" aria-live="polite">
            {end ? 'Chapter review' : `Idea ${step + 1} of ${cards.length}`}
          </p>

          {!end && card ? (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">{card.label}</h3>
              {card.block.type === 'table' ? (
                <div
                  className="mt-4 overflow-x-auto rounded-xl border border-slate-200"
                  role="region"
                  aria-label="Handbook reference table"
                  tabIndex={0}
                >
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {card.block.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex ? 'border-t border-slate-200' : 'bg-slate-50'}>
                          {row.map((text, columnIndex) => (
                            <td key={columnIndex} className="min-w-32 p-3 align-top leading-6">
                              {text}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={`mt-4 text-base leading-8 text-slate-800 ${card.block.type === 'bullet' ? 'border-l-4 border-indigo-200 pl-4' : ''}`}>
                  {card.block.text}
                </p>
              )}
              <Reflection
                key={`${user?.id || 'guest'}:${attempt}:${selectedChapter.id}:${step}`}
                storageKey={`cssvista:guide:precis:v1:${user?.id || 'guest'}:${attempt}:${selectedChapter.id}:${step}`}
                prompt={path.prompt}
              />
            </div>
          ) : (
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                <h3 className="text-lg font-semibold">Apply what you have read</h3>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                You have reached the end of this chapter. A fixed-answer check can help
                confirm one distinction. It does not assess your original writing.
              </p>
              {question ? (
                <ReviewedCheck
                  key={`${attempt}:${question.id}`}
                  question={question}
                  attempt={attempt}
                  refresh={refresh}
                />
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  No reviewed exercise is mapped to this part of the handbook yet.
                </p>
              )}
              <Link
                className={`${secondaryStyle} mt-5`}
                to={`/account/precis?view=skills&attempt=${encodeURIComponent(attempt)}&skill=${path.skill}`}
              >
                More practice in this skill <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              className={secondaryStyle}
              onClick={() => move(-1)}
              disabled={step === 0 && chapterIndex === 0}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </button>
            <button
              type="button"
              className={primaryStyle}
              onClick={() => move(1)}
              disabled={end && chapterIndex === chapters.length - 1}
            >
              {end ? 'Next chapter' : 'Continue'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={secondaryStyle}
              disabled={!attempt || !progress || busy}
              onClick={() => void savePlace()}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {busy ? 'Saving…' : 'Save chapter'}
            </button>
          </div>
          {saveMessage && <p role="status" className="mt-3 text-xs leading-6">{saveMessage}</p>}
          {!attempt && (
            <p className="mt-3 text-xs text-slate-600">
              You can read the handbook now. Select a preparation attempt above to keep
              your place and your checked responses.
            </p>
          )}
          <p className="mt-3 text-xs leading-6 text-slate-500">
            Saving a chapter stores your position, not course completion or writing mastery.
          </p>
        </section>
        <div className="flex flex-wrap gap-3">
          <Link
            className={secondaryStyle}
            to={`/account/precis?view=course&attempt=${encodeURIComponent(attempt)}&chapter=${selectedChapter.id}`}
          >
            Read the complete handbook chapter
          </Link>
          <Link
            className={secondaryStyle}
            to={`/account/precis?view=write&attempt=${encodeURIComponent(attempt)}`}
          >
            Open writing workspace <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
