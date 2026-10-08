import { useState } from 'react'
import { useAccount } from '@/lib/accountContext'
import { learningRequest, saveIdentity, useLearning } from '@/features/learning/api'
import { pakistanTime } from '@/features/membership/api'
import { panelStyle, primaryStyle, secondaryStyle, inputStyle } from '@/features/handwriting/styles'
import { lengthInfo, type Detail } from './api'
import { FeedbackChanges } from './Feedback'
export default function History({
  detail,
  rubric,
  skills,
  active,
  refresh,
  onVersion,
}: {
  detail: Detail
  rubric: Record<string, string>
  skills: Record<string, string>
  active: boolean
  refresh: () => void
  onVersion: (id: string) => void
}) {
  const { user } = useAccount(),
    [before, setBefore] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const older = useLearning<Detail>(
    before ? `precis.php?writing_id=${detail.writing.id}&version_id=${before}` : undefined,
  )
  const current = lengthInfo(detail.source.text, detail.version.text, detail.source.limit),
    previous =
      older.data &&
      lengthInfo(older.data.source.text, older.data.version.text, older.data.source.limit)
  const noteLabels: Record<string, string> = {
    topic: 'Topic',
    central_idea: 'Central idea',
    skeleton: 'Argument skeleton',
    essential: 'Essential ideas',
    removable: 'Removable details',
    compression: 'Compression notes',
    paraphrase: 'Paraphrase notes',
    reflection: 'Reflection',
    rewrite_task: 'Rewrite task',
  }
  async function reveal() {
    if (!user || busy) return
    setBusy(true)
    setError('')
    const body = { action: 'reveal_model', writing_id: detail.writing.id }
    try {
      const identity = await saveIdentity(user.id, `precis:model:${detail.writing.id}`, body)
      await learningRequest(user.id, 'precis.php', { ...body, request_id: identity.id })
      identity.done()
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The model could not be loaded.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className={`${panelStyle} space-y-5`}>
      <h2 className="text-xl font-semibold">Saved Précis and revision history</h2>
      <label className="grid gap-2 text-sm font-semibold">
        Saved version
        <select
          className={inputStyle}
          value={detail.version.id}
          onChange={(e) => onVersion(e.target.value)}
        >
          {detail.writing.versions.map((v) => (
            <option key={v.id} value={v.id}>
              Version {v.version} · {pakistanTime(v.created_at)}
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-2xl border border-slate-200 p-5">
        <h3 className="break-words text-lg font-semibold">
          {detail.context?.title || 'Title not captured in this version'}
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          Version {detail.version.version} · {current.draft} words · {current.ratio}% retained
        </p>
        <p className="mt-5 whitespace-pre-wrap break-words text-base leading-8">
          {detail.version.text}
        </p>
      </div>
      <details className="rounded-xl border border-slate-200 p-4">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          Original passage and length instruction
        </summary>
        <p className="mt-3 break-words text-xs leading-6 text-slate-500">{detail.source.source}</p>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">
          {detail.source.text}
        </p>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          {detail.source.limit === null
            ? 'No explicit word limit. Ratios are teaching guidance.'
            : `Question limit: ${detail.source.limit} words, excluding the title.`}
        </p>
      </details>
      {detail.context && (
        <details className="rounded-xl border border-slate-200 p-4">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold">
            Saved scratch notes and self-check
          </summary>
          <dl className="mt-4 space-y-4 text-sm">
            {Object.entries(detail.context.scratch)
              .filter(([, text]) => !!text)
              .map(([id, text]) => (
                <div key={id}>
                  <dt className="font-semibold">{noteLabels[id] || id}</dt>
                  <dd className="mt-2 whitespace-pre-wrap break-words leading-7">{text}</dd>
                </div>
              ))}
          </dl>
          <p className="mt-5 text-xs leading-6 text-slate-500">
            Self-ratings are personal practice notes, not official marks or assessed mastery.
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-7">
            {Object.entries(detail.context.self_check).map(([id, score]) => (
              <li key={id}>
                {rubric[id] || id}: {score === null ? 'Unscored' : `${score} / 5`}
              </li>
            ))}
          </ul>
          {detail.context.timer && (
            <p className="mt-4 text-xs leading-6 text-slate-500">
              Self-timed practice: {detail.context.timer.minutes} minutes chosen.{' '}
              {detail.context.timer.finished_at
                ? 'Marked finished before this version was saved.'
                : 'No finish was recorded with this version.'}
            </p>
          )}
        </details>
      )}
      {detail.context?.scratch.rewrite_task && (
        <div className="rounded-xl bg-indigo-50 p-4">
          <h3 className="text-sm font-semibold text-indigo-900">Your recorded rewrite task</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
            {detail.context.scratch.rewrite_task}
          </p>
        </div>
      )}
      <label className="grid gap-2 text-sm font-semibold">
        Compare with an earlier version
        <select className={inputStyle} value={before} onChange={(e) => setBefore(e.target.value)}>
          <option value="">Choose a version</option>
          {detail.writing.versions
            .filter((v) => v.version < detail.version.version)
            .map((v) => (
              <option key={v.id} value={v.id}>
                Version {v.version}
              </option>
            ))}
        </select>
      </label>
      {before && !older.data && (
        <p role={older.error ? 'alert' : 'status'} className="text-sm leading-7">
          {older.error || 'Loading earlier wording…'}
          {older.error && (
            <button className={`${secondaryStyle} ml-3`} onClick={older.refresh}>
              Retry
            </button>
          )}
        </p>
      )}
      {older.data && previous && (
        <div className="space-y-4">
          <h3 className="font-semibold">What changed between your drafts</h3>
          <p className="text-sm leading-7 text-slate-500">
            Length: {previous.draft} → {current.draft} words; retained length: {previous.ratio}% →{' '}
            {current.ratio}%.{' '}
            {older.data.context?.title === detail.context?.title
              ? 'Title unchanged.'
              : 'Title changed.'}{' '}
            These are measured changes, not proof of better fidelity.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-xl bg-slate-50 p-4">
              <h4 className="font-semibold">Earlier wording</h4>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">
                {older.data.version.text}
              </p>
            </div>
            <div className="min-w-0 rounded-xl bg-indigo-50 p-4">
              <h4 className="font-semibold">Current wording</h4>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">
                {detail.version.text}
              </p>
            </div>
          </div>
          <FeedbackChanges
            key={`${before}:${detail.version.id}`}
            before={before}
            after={detail.version.id}
            skills={skills}
          />
          <p className="text-sm leading-7 text-slate-500">
            Compare both with the original. Check central idea, conditions, contrasts, retained
            details and language. Record what improved and what still needs work in your next
            revision.
          </p>
        </div>
      )}
      <div className="border-t border-slate-200 pt-5">
        <h3 className="font-semibold">Handbook comparison</h3>
        {detail.model ? (
          <div className="mt-4 rounded-xl border border-indigo-200 p-5">
            <h4 className="font-semibold">{detail.model.title}</h4>
            <p className="mt-3 text-sm leading-7">{detail.model.text}</p>
            <p className="mt-4 text-xs leading-6 text-slate-500">{detail.model.note}</p>
          </div>
        ) : detail.source.id ? (
          <>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Identify the central idea and save two different drafts before revealing the handbook
              model. Compare its choices with your own; preserve the original’s qualifications even
              if a model could be tightened.
            </p>
            <button
              disabled={busy || !active || detail.writing.versions.length < 2}
              onClick={() => void reveal()}
              className={`${primaryStyle} mt-4`}
            >
              {busy ? 'Opening…' : 'Compare with the handbook model'}
            </button>
          </>
        ) : (
          <p className="mt-3 text-sm leading-7 text-slate-500">
            This private source passage has no handbook model.
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      <button className={secondaryStyle} onClick={refresh}>
        Refresh saved history
      </button>
    </section>
  )
}
