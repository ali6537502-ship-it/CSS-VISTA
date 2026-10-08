import { Link, useSearchParams } from 'react-router'
import { BookOpen, Check, ArrowRight } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { learningRequest, saveIdentity } from '@/features/learning/api'
import { panelStyle, primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import { useState } from 'react'
import type { Chapter, Overview, Progress } from './api'
function ChapterBody({ chapter }: { chapter: Chapter }) {
  return (
    <article className={`${panelStyle} min-w-0`}>
      <h3 className="text-xl font-semibold tracking-tight">{chapter.title}</h3>
      <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
        {chapter.blocks.map((block, i) =>
          block.type === 'table' ? (
            <div
              key={i}
              className="overflow-x-auto rounded-xl border border-slate-200"
              tabIndex={0}
              role="region"
              aria-label={`${chapter.title} reference table`}
            >
              <table className="w-full text-left">
                <tbody>
                  {block.rows.map((row, j) => (
                    <tr
                      key={j}
                      className={
                        j === 0 ? 'bg-slate-50 font-semibold' : 'border-t border-slate-200'
                      }
                    >
                      {row.map((cell, k) =>
                        j === 0 ? (
                          <th key={k} scope="col" className="min-w-36 p-3">
                            {cell}
                          </th>
                        ) : (
                          <td key={k} className="min-w-36 p-3 align-top">
                            {cell}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : block.type === 'heading' ? (
            <h4 key={i} className="pt-3 font-semibold text-slate-950">
              {block.text}
            </h4>
          ) : block.type === 'bullet' ? (
            <p key={i} className="border-l-2 border-indigo-200 pl-4">
              {block.text}
            </p>
          ) : (
            <p key={i} className="whitespace-pre-wrap break-words">
              {block.text}
            </p>
          ),
        )}
      </div>
    </article>
  )
}
export default function Course({
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
  const [params, setParams] = useSearchParams(),
    { user } = useAccount(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const day = Math.min(
      30,
      Math.max(1, Math.floor(Number(params.get('day')) || progress?.current_day || 1)),
    ),
    lesson = data.course[day - 1]
  const requestedChapter =
      params.get('chapter') ||
      (!params.get('day') && progress ? String(progress.current_chapter) : lesson.chapters[0]),
    chapter =
      data.catalog?.chapters.find((c) => c.id === requestedChapter) ||
      data.catalog?.chapters.find((c) => c.id === lesson.chapters[0]),
    chapterId = chapter?.id || lesson.chapters[0]
  function navigate(fields: Record<string, string>) {
    const next = new URLSearchParams(params)
    Object.entries(fields).forEach(([key, value]) => next.set(key, value))
    setParams(next)
  }
  async function save(complete: boolean) {
    if (!user || !progress || busy) return
    setBusy(true)
    setError('')
    const body = {
      action: 'progress_save',
      attempt_id: attempt,
      expected_version: progress.version,
      current_day: complete ? Math.min(30, day + 1) : day,
      current_chapter: Number(complete ? data.course[Math.min(29, day)].chapters[0] : chapterId),
      completed: complete ? [...new Set([...progress.completed, day])] : progress.completed,
    }
    try {
      const id = await saveIdentity(user.id, `precis:progress:${attempt}`, body)
      await learningRequest(user.id, 'precis.php', { ...body, request_id: id.id })
      id.done()
      refresh()
      if (complete)
        navigate({
          day: String(Math.min(30, day + 1)),
          chapter: data.course[Math.min(29, day)].chapters[0],
        })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Course position could not be saved.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className={panelStyle}>
        <h2 className="flex items-center gap-2 font-semibold">
          <BookOpen className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          30-day pathway
        </h2>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          Optional sequence from handbook chapter 21. Choose any day; completion records
          participation.
        </p>
        <div
          className="mt-4 grid max-h-96 gap-1 overflow-y-auto"
          role="group"
          aria-label="Course days"
        >
          {data.course.map((d) => (
            <button
              key={d.day}
              aria-pressed={day === d.day}
              className={`flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${day === d.day ? 'bg-indigo-50 font-semibold text-indigo-800' : 'hover:bg-slate-50'}`}
              onClick={() => navigate({ day: String(d.day), chapter: d.chapters[0] })}
            >
              <span>
                Day {d.day} · {d.title}
              </span>
              {progress?.completed.includes(d.day) && (
                <Check className="h-4 w-4 shrink-0" aria-label="Completed" />
              )}
            </button>
          ))}
        </div>
      </aside>
      <div className="min-w-0 space-y-6">
        <section className={panelStyle}>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">
            Day {day}
          </p>
          <h2 className="mt-3 text-2xl font-semibold">{lesson.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{lesson.task}</p>
          <p className="mt-3 text-xs leading-6 text-slate-500">
            The supplied passages are short skill examples. Reuse them for revision; add a suitably
            sourced longer passage for timed simulation.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to={`/account/precis?view=skills&attempt=${attempt}&skill=${lesson.skill}`}
              className={secondaryStyle}
            >
              Practise this skill
            </Link>
            <Link
              to={`/account/precis?view=${day >= 26 ? 'timed' : 'write'}&attempt=${attempt}`}
              className={primaryStyle}
            >
              Open writing workspace <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <label className="mt-6 grid gap-2 text-sm font-semibold">
            Handbook chapter
            <select
              className="min-h-12 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"
              value={chapterId}
              onChange={(e) => navigate({ chapter: e.target.value })}
            >
              {data.catalog?.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              disabled={busy || !progress}
              onClick={() => void save(false)}
              className={secondaryStyle}
            >
              Save course position
            </button>
            <button
              disabled={busy || !progress}
              onClick={() => void save(true)}
              className={secondaryStyle}
            >
              I completed this day
            </button>
          </div>
          {!attempt && (
            <p className="mt-4 text-xs text-slate-500">
              Choose a preparation attempt above to save your place.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-800">
              {error}
            </p>
          )}
        </section>
        {chapter && <ChapterBody chapter={chapter} />}
      </div>
    </div>
  )
}
