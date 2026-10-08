import { useState } from 'react'
import { Link } from 'react-router'
import { useLearning } from '@/features/learning/api'
import { field, primary, secondary, type Unit, type Capacity, type PreparationAction } from './api'
function EvidencePicker({
  attempt,
  unit,
  action,
}: {
  attempt: string
  unit: Unit
  action: PreparationAction
}) {
  const [kind, setKind] = useState('mcq'),
    [offset, setOffset] = useState(0),
    [chosen, setChosen] = useState('')
  const source = useLearning<{
    records: { source_id: string | number; title: string }[]
    has_more: boolean
  }>(
    `planner.php?attempt=${attempt}&view=sources&unit=${encodeURIComponent(unit.id)}&kind=${kind}&offset=${offset}`,
  )
  return (
    <div className="mt-3 space-y-3">
      <label className="grid gap-1 text-sm">
        Evidence type
        <select
          aria-label="Evidence type"
          className={field}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value)
            setOffset(0)
            setChosen('')
          }}
        >
          <option value="mcq">Recorded MCQ first response</option>
          <option value="past_paper">Report a mapped past-paper review</option>
          <option value="mentor">My human mentor answer record</option>
          <option value="test">Recorded practice test</option>
          <option value="mpt">Released native MPT result</option>
        </select>
      </label>
      <p className="text-xs leading-5 text-slate-500">
        Choose the section this record concerns. MCQ and test records come from your account. Paper
        review is self-reported; human marks stay in their own record. Linking an old result
        preserves its original date.
      </p>
      {source.error ? (
        <p role="alert">
          {source.error}
          <button className={`${secondary} ml-2`} onClick={source.refresh}>
            Retry sources
          </button>
        </p>
      ) : !source.data ? (
        <p role="status">Loading owned evidence…</p>
      ) : (
        <>
          <label className="grid gap-1 text-sm">
            Source record
            <select
              aria-label="Source record"
              className={field}
              value={chosen}
              onChange={(e) => setChosen(e.target.value)}
            >
              <option value="">Choose a record</option>
              {source.data.records.map((r) => (
                <option key={r.source_id} value={String(r.source_id)}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          {!source.data.records.length && (
            <p className="text-sm text-slate-500">
              No eligible record on this page. Complete real practice, save an answer record, or
              select another evidence type.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={action.blocked || !chosen}
              className={primary}
              onClick={() =>
                void action.send({
                  action: 'evidence_link',
                  kind,
                  source_id: chosen,
                  unit_id: unit.id,
                })
              }
            >
              Link this evidence
            </button>
            <button
              className={secondary}
              disabled={offset === 0}
              onClick={() => {
                setOffset((v) => Math.max(0, v - 50))
                setChosen('')
              }}
            >
              Previous sources
            </button>
            <button
              className={secondary}
              disabled={!source.data.has_more}
              onClick={() => {
                setOffset((v) => v + 50)
                setChosen('')
              }}
            >
              More sources
            </button>
          </div>
        </>
      )}
    </div>
  )
}
function UnitCard({
  unit,
  attempt,
  action,
}: {
  unit: Unit
  attempt: string
  action: PreparationAction
}) {
  const [coverage, setCoverage] = useState(unit.coverage),
    [linking, setLinking] = useState(false)
  return (
    <article className="min-w-0 rounded-2xl border p-4 sm:p-5">
      <p className="text-xs font-semibold text-indigo-700">
        {unit.subject} ·{' '}
        {unit.source_kind === 'syllabus_section'
          ? 'Syllabus section'
          : 'Separate learning resource'}
      </p>
      <h3 className="mt-1 break-words text-lg font-semibold">{unit.title}</h3>
      {unit.source_changed && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          The stored syllabus mapping changed. Earlier progress is retained but excluded from
          current coverage. A reviewed content migration is required before editing this section.
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <p>
          MCQs linked
          <br />
          <strong>{unit.mcq_count}</strong>
        </p>
        <p>
          Paper reviews
          <br />
          <strong>{unit.paper_reviews}</strong>
        </p>
        <p>
          Written / evaluated
          <br />
          <strong>
            {unit.written_answers} / {unit.mentor_evaluated}
          </strong>
        </p>
        <p>
          Tests linked
          <br />
          <strong>{unit.tests}</strong>
        </p>
        <p>
          Last reported study
          <br />
          <strong>{unit.last_studied ?? 'Unknown'}</strong>
        </p>
        <p>
          Next revision
          <br />
          <strong>{unit.next_revision ?? 'Not scheduled'}</strong>
        </p>
      </div>
      <label className="mt-4 grid gap-1 text-sm">
        My reported coverage
        <select
          aria-label="My reported coverage"
          disabled={unit.source_changed}
          className={field}
          value={coverage}
          onChange={(e) => setCoverage(e.target.value)}
        >
          <option value="not_started">Not started</option>
          <option value="learning">Learning</option>
          <option value="covered">Covered</option>
        </select>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={primary}
          disabled={action.blocked || unit.source_changed || coverage === unit.coverage}
          onClick={() =>
            void action.send({
              action: 'coverage_save',
              unit_id: unit.id,
              expected_version: unit.version,
              coverage,
            })
          }
        >
          Save coverage
        </button>
        <Link to={unit.to} className={secondary}>
          Open section
        </Link>
        <button
          className={secondary}
          disabled={unit.source_changed}
          onClick={() => setLinking((v) => !v)}
        >
          Link practice evidence
        </button>
      </div>
      {linking && <EvidencePicker attempt={attempt} unit={unit} action={action} />}
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer py-1 font-medium">
          Source lines and earlier records
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
          {unit.items.map((item, i) => (
            <li key={i} className="break-words">
              {item}
            </li>
          ))}
        </ul>
        {unit.imported_states && (
          <p className="mt-3 text-xs">
            Copied legacy item states:{' '}
            {Object.values(unit.imported_states).filter((v) => v === 'completed').length} completed
            of {Object.keys(unit.imported_states).length} available lines. No earlier study date
            inferred.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          {unit.paper_count} question appearances in existing repository mappings. Coverage is your
          report; practice, evaluation and revision remain distinct.
        </p>
      </details>
    </article>
  )
}
function ImportCoverage({ attempt, action }: { attempt: string; action: PreparationAction }) {
  const preview = useLearning<{
    items: { unit_id: string; coverage: string }[]
    hash: string
    basis: string
  }>(`planner.php?attempt=${attempt}&view=import`)
  return (
    <details className="rounded-2xl border p-5">
      <summary className="cursor-pointer font-semibold">
        Review earlier synced syllabus coverage
      </summary>
      {preview.error ? (
        <p role="alert">{preview.error}</p>
      ) : !preview.data ? (
        <p role="status">Loading earlier records…</p>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-6 text-slate-600">
            {preview.data.basis} Copying is available once, into an empty configured attempt.
          </p>
          <p className="text-sm">{preview.data.items.length} matching sections found.</p>
          <ul className="max-h-60 space-y-1 overflow-y-auto text-xs">
            {preview.data.items.map((i) => (
              <li key={i.unit_id}>
                {i.unit_id} · {i.coverage.replaceAll('_', ' ')}
              </li>
            ))}
          </ul>
          <button
            className={primary}
            disabled={action.blocked || !preview.data.items.length}
            onClick={() =>
              void action.send({ action: 'coverage_import', import_hash: preview.data!.hash })
            }
          >
            Copy reviewed earlier coverage
          </button>
        </div>
      )}
    </details>
  )
}
export default function Coverage({
  attempt,
  action,
}: {
  attempt: string
  action: PreparationAction
}) {
  const [subject, setSubject] = useState(''),
    [offset, setOffset] = useState(0)
  const data = useLearning<{
    units: Unit[]
    subjects: string[]
    coverage: Capacity
    has_more: boolean
  }>(
    `planner.php?attempt=${attempt}&view=coverage&offset=${offset}${subject ? `&subject=${encodeURIComponent(subject)}` : ''}`,
  )
  if (!data.data)
    return (
      <p role={data.error ? 'alert' : 'status'}>
        {data.error ?? 'Loading coverage…'}
        {data.error && (
          <button className={secondary} onClick={data.refresh}>
            Retry coverage
          </button>
        )}
      </p>
    )
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Coverage matrix</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {data.data.coverage.basis} {data.data.coverage.covered} of {data.data.coverage.total}{' '}
          sections reported covered. Learned, practised, evaluated and revised are separate.
        </p>
      </div>
      <ImportCoverage attempt={attempt} action={action} />
      <label className="grid gap-1 text-sm">
        Subject
        <select
          aria-label="Subject"
          className={field}
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value)
            setOffset(0)
          }}
        >
          <option value="">All selected subjects</option>
          {data.data.subjects.map((s) => (
            <option value={s} key={s}>
              {s.replaceAll('-', ' ')}
            </option>
          ))}
        </select>
      </label>
      {data.data.units.map((u) => (
        <UnitCard key={`${u.id}:${u.version}`} unit={u} attempt={attempt} action={action} />
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          className={secondary}
          disabled={offset === 0}
          onClick={() => setOffset((v) => Math.max(0, v - 20))}
        >
          Previous sections
        </button>
        <button
          className={secondary}
          disabled={!data.data.has_more}
          onClick={() => setOffset((v) => v + 20)}
        >
          More sections
        </button>
      </div>
    </div>
  )
}
