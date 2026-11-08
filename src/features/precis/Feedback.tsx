import { useLearning } from '@/features/learning/api'
import { secondaryStyle } from '@/features/handwriting/styles'
import { feedbackStatus, type FeedbackComparison } from './api'
export function FeedbackChanges({
  before,
  after,
  skills,
}: {
  before: string
  after: string
  skills: Record<string, string>
}) {
  const read = useLearning<FeedbackComparison>(
      `precis-feedback.php?before=${before}&after=${after}`,
    ),
    data = read.data?.comparison
  return (
    <div className="space-y-4 rounded-xl border border-indigo-200 p-5">
      <h4 className="font-semibold">Source-bound feedback across revisions</h4>
      {!data ? (
        <p role={read.error ? 'alert' : 'status'} className="text-sm leading-7">
          {read.error || 'Loading saved comparisons…'}
        </p>
      ) : !data.available ? (
        <p className="text-sm leading-7 text-slate-600">
          No comparable feedback was saved for these earlier versions.
          Wording and length remain available above.
        </p>
      ) : (
        <>
          <p className="text-xs leading-6 text-slate-500">
            Each diagnosis compared its actual wording and title with the same original. A change in
            reported status is evidence to review, not proof that every issue is fixed. This
            comparison makes no new AI call.
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {data.skills.map((s) => (
              <div key={s.skill} className="rounded-lg bg-slate-50 p-3 text-sm">
                <dt className="font-semibold">{s.label}</dt>
                <dd className="mt-2 leading-6">
                  {feedbackStatus[s.before]} → {feedbackStatus[s.after]}
                </dd>
              </div>
            ))}
          </dl>
          {(['no_longer_reported', 'still_reported', 'newly_reported'] as const).map((key) => (
            <p className="text-sm leading-7" key={key}>
              <strong>{key.replaceAll('_', ' ')}: </strong>
              {data[key]
                .map((code) => read.data?.grammar_skills[code]?.label || skills[code] || code)
                .join(', ') || 'None'}
            </p>
          ))}
        </>
      )}
      <button className={secondaryStyle} onClick={read.refresh}>
        Refresh saved comparison
      </button>
    </div>
  )
}
