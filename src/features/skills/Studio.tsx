import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAccount } from "@/lib/accountContext";
import { readDraft, useAutosavedDraft } from "@/hooks/useAutosavedDraft";
import { useLearning } from "@/features/learning/api";
import {
  inputStyle,
  panelStyle,
  primaryStyle,
  secondaryStyle,
} from "@/features/handwriting/styles";
import { ProBadge } from "@/features/membership/AccountSections";
import { grammarLink } from "@/features/expression/api";
import { useStudioSave } from "./useStudioSave";
import {
  names,
  skillsLink,
  type Configuration,
  type Detail,
  type Feature,
  type Level,
  type Overview,
  type Receipt,
  type Stage,
} from "./api";

type Saver = ReturnType<typeof useStudioSave>;
function Recovery({ save }: { save: Saver }) {
  return (
    <>
      {save.pending && (
        <section
          className={`${panelStyle} space-y-3 border-amber-300`}
          aria-label="Save recovery"
        >
          <h3 className="font-semibold">Check your last save</h3>
          <p className="text-sm leading-7">
            A request is awaiting confirmation. Reopening or refreshing does not
            send it again.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={save.busy}
              className={secondaryStyle}
              onClick={() => void save.recover()}
            >
              Check saved result
            </button>
            {save.pending.missing && (
              <>
                <button
                  disabled={save.busy}
                  className={secondaryStyle}
                  onClick={save.retry}
                >
                  Retry same request
                </button>
                <button
                  disabled={save.busy}
                  className={secondaryStyle}
                  onClick={save.discard}
                >
                  Discard unsaved request
                </button>
              </>
            )}
          </div>
        </section>
      )}
      {save.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 p-4 text-sm leading-7 text-red-800"
        >
          {save.error}
        </p>
      )}
    </>
  );
}
function Availability({ config }: { config: Configuration }) {
  return (
    <p
      role="status"
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7"
    >
      {config.enabled
        ? "Instructional AI feedback is available on your saved writing. It uses the displayed daily allowance."
        : "Personal AI feedback is unavailable. Lessons, fixed checks, independent writing and saved revisions remain available."}
    </p>
  );
}
function Start({
  feature,
  data,
  save,
  selected,
}: {
  feature: Feature;
  data: Overview;
  save: Saver;
  selected?: string;
}) {
  const [level, setLevel] = useState<Level>("beginner"),
    [lesson, setLesson] = useState(selected || ""),
    [attempt, setAttempt] = useState(data.attempts[0]?.id || ""),
    [statement, setStatement] = useState("");
  const catalog = data.catalog.filter(
    (item) => feature === "essay" || item.level === level,
  );
  const chosen = catalog.find((item) => item.id === lesson);
  async function start(e: FormEvent) {
    e.preventDefault();
    if (!chosen) return;
    await save.save({
      action: "start",
      feature,
      lesson,
      level,
      attempt_id: attempt,
      statement,
    });
  }
  return (
    <form className={`${panelStyle} space-y-5`} onSubmit={(e) => void start(e)}>
      <h3 className="text-xl font-semibold">Choose your next practice</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Learning level
          <select
            className={inputStyle}
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as Level);
              if (feature !== "essay") setLesson("");
            }}
          >
            <option value="beginner">Beginner · clear foundations</option>
            <option value="intermediate">
              Intermediate · relationships and precision
            </option>
            <option value="advanced">
              Advanced · qualified, critical judgement
            </option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Preparation attempt
          <select
            required
            className={inputStyle}
            value={attempt}
            onChange={(e) => setAttempt(e.target.value)}
          >
            <option value="">Choose your attempt</option>
            {data.attempts.map((a) => (
              <option key={a.id} value={a.id}>
                CSS {a.target_year}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!data.attempts.length && (
        <p className="text-sm leading-7">
          Create your account-owned preparation attempt first.{" "}
          <Link
            className="font-semibold underline"
            to="/account/preparation?new=attempt"
          >
            Create an attempt
          </Link>
        </p>
      )}
      <label className="grid gap-2 text-sm font-semibold">
        {feature === "essay" ? "Existing essay theme" : "Lesson"}
        <select
          required
          className={inputStyle}
          value={chosen?.id || ""}
          onChange={(e) => setLesson(e.target.value)}
        >
          <option value="">Choose a topic</option>
          {catalog.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      {chosen && (
        <p className="text-sm leading-7 text-slate-600">{chosen.summary}</p>
      )}
      {["argument", "analysis"].includes(feature) && (
        <label className="grid gap-2 text-sm font-semibold">
          Your own statement or issue (optional)
          <textarea
            className={`${inputStyle} min-h-28`}
            maxLength={1000}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          />
          <span className="font-normal leading-6 text-slate-500">
            Leave this empty to use the lesson’s hypothetical practice issue. We
            do not treat supplied factual claims as verified.
          </span>
        </label>
      )}
      <button
        disabled={!chosen || !attempt || save.busy || !!save.pending}
        className={primaryStyle}
      >
        Start guided practice
      </button>
    </form>
  );
}
function Exercise({
  user,
  detail,
  stage,
  index,
  save,
  old,
}: {
  user: string;
  detail: Detail;
  stage: Stage;
  index: number;
  save: Saver;
  old: boolean;
}) {
  const { workspace: w, saved } = detail,
    key = `skills:v1:${user}:${w.id}:${stage.id}`;
  const [draft, setDraft] = useState<{
    base: number;
    response: string | number;
  }>(() => {
    const local = readDraft<{ base: number; response: string | number }>(key);
    return local &&
      Number.isInteger(local.base) &&
      ["string", "number"].includes(typeof local.response)
      ? local
      : {
          base: w.version,
          response:
            saved?.answers[stage.id] ?? (stage.id === "check" ? -1 : ""),
        };
  });
  const { status, clearDraft } = useAutosavedDraft(key, draft, {
    enabled: !old,
  });
  const stale = draft.base !== w.version;
  async function submit(advance = false) {
    if (stale || old) return;
    const result = await save.save({
      action: "save",
      workspace_id: w.id,
      expected_version: draft.base,
      stage: stage.id,
      response: draft.response,
      advance,
    });
    if (result) clearDraft();
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className={`${panelStyle} space-y-5`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Guided activity {index + 1} of {w.source.stages.length}
        </p>
        <h3 className="mt-2 text-xl font-semibold">{stage.title}</h3>
      </div>
      {stage.teach && <p className="text-base leading-8">{stage.teach}</p>}
      {stage.example && (
        <details className="rounded-lg bg-slate-50 p-4">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold">
            A different worked example
          </summary>
          <p className="mt-3 text-sm leading-7">{stage.example}</p>
        </details>
      )}
      {stage.id === "check" && w.source.check ? (
        <fieldset className="space-y-3">
          <legend className="mb-3 font-semibold leading-7">
            {w.source.check.prompt}
          </legend>
          {w.source.check.options.map((option, i) => (
            <label
              key={option}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-7"
            >
              <input
                type="radio"
                name="recognition"
                required
                disabled={old || save.busy}
                checked={draft.response === i}
                onChange={() => setDraft({ base: w.version, response: i })}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <label className="grid gap-3 font-semibold leading-7">
          {stage.question || "Saved response"}
          <textarea
            required
            disabled={old}
            className={`${inputStyle} min-h-52 font-normal leading-8`}
            maxLength={
              w.feature === "essay" && stage.id === "practice" ? 20000 : 6000
            }
            value={String(draft.response)}
            onChange={(e) => setDraft({ ...draft, response: e.target.value })}
          />
          <span className="text-xs font-normal text-slate-500">
            This stage needs at least {stage.min_words} words for a recorded
            practice response. Length does not prove correctness.
          </span>
        </label>
      )}
      {status === "error" && (
        <p role="alert" className="text-sm text-red-700">
          This browser cannot save the draft. Keep a copy until the account save
          is confirmed.
        </p>
      )}
      {stale && (
        <section className="space-y-3 rounded-xl border border-amber-300 p-4">
          <p className="text-sm leading-7">
            This draft began before a newer account save. Compare it with the
            latest response below before choosing what to keep.
          </p>
          <blockquote className="whitespace-pre-wrap break-words text-sm leading-7">
            {String(
              saved?.answers[stage.id] ?? "No saved response at this stage.",
            )}
          </blockquote>
          <button
            type="button"
            className={secondaryStyle}
            onClick={() => setDraft((d) => ({ ...d, base: w.version }))}
          >
            Keep my draft for a new version
          </button>
          <button
            type="button"
            className={secondaryStyle}
            onClick={() =>
              setDraft({
                base: w.version,
                response: saved?.answers[stage.id] ?? "",
              })
            }
          >
            Use the latest saved response
          </button>
        </section>
      )}
      {!old && (
        <div className="flex flex-wrap gap-3">
          <button
            disabled={
              stale ||
              save.busy ||
              !!save.pending ||
              (stage.id === "check" && draft.response === -1)
            }
            className={primaryStyle}
          >
            {save.busy
              ? "Saving…"
              : stage.id === "check"
                ? "Check & save response"
                : "Save independent response"}
          </button>
          <button
            type="button"
            disabled={
              stale ||
              save.busy ||
              !!save.pending ||
              (stage.id === "check" && draft.response === -1)
            }
            className={secondaryStyle}
            onClick={() => void submit(true)}
          >
            Save & continue
          </button>
        </div>
      )}
      <p className="text-xs leading-6 text-slate-500">
        {status === "saved" ? "Draft saved in this browser. " : ""}Confirmed
        responses are saved to your account. Reading or opening a lesson creates
        no understanding credit.
      </p>
    </form>
  );
}
function FeedbackPanel({ detail, save }: { detail: Detail; save: Saver }) {
  const [accepted, setAccepted] = useState(false),
    current = detail.saved;
  const op = detail.operations.find(
    (o) => o.version_id === current?.version_id,
  );
  const blocked =
    !!op &&
    ["reserved", "in_flight", "unknown", "succeeded"].includes(op.state);
  return (
    <section
      className={`${panelStyle} space-y-4`}
      aria-label="Instructional feedback"
    >
      <h3 className="text-xl font-semibold">Review your saved writing</h3>
      <Availability config={detail.configuration} />
      {op && (
        <p role="status" className="text-sm leading-7">
          Saved feedback request: {op.state.replaceAll("_", " ")}.{" "}
          {op.state === "unknown"
            ? "The provider outcome is unresolved. Refresh saved status; do not send another request for this version."
            : ""}
        </p>
      )}
      {op?.result && (
        <div className="space-y-4">
          <p className="text-sm leading-7">{op.result.assessment}</p>
          <p className="whitespace-pre-wrap leading-8">{op.result.summary}</p>
          {op.result.criteria.map((c) => (
            <article key={c.code} className="space-y-2 rounded-xl border p-4">
              <h4 className="font-semibold">
                {c.label} · {c.status.replaceAll("_", " ")}
              </h4>
              <blockquote className="whitespace-pre-wrap break-words border-l-2 pl-3 text-sm leading-7">
                {c.excerpt}
              </blockquote>
              <p className="text-sm leading-7">{c.explanation}</p>
              <p className="text-sm leading-7">
                <strong>Try:</strong> {c.hint}
              </p>
            </article>
          ))}
          {op.result.evidence_flags.map((flag, i) => (
            <p
              key={i}
              className="break-words rounded-xl bg-amber-50 p-4 text-sm leading-7"
            >
              <strong>{flag.status.replaceAll("_", " ")}:</strong> “
              {flag.excerpt}” — {flag.explanation}
            </p>
          ))}
          <p className="rounded-xl bg-slate-50 p-4 leading-7">
            <strong>Next question:</strong> {op.result.next_question}
          </p>
          {op.result.findings.map((f, i) => (
            <article key={i} className="space-y-2 text-sm leading-7">
              <blockquote>{f.excerpt}</blockquote>
              <p>{f.explanation}</p>
              <p>{f.hint}</p>
              <Link
                className="font-semibold underline"
                to={`/grammar-course?view=lab&attempt=${detail.workspace.attempt_id}`}
              >
                Open Grammar Error Lab
              </Link>
            </article>
          ))}
        </div>
      )}
      {!blocked && current && (
        <>
          <p className="whitespace-pre-wrap text-sm leading-7">
            {detail.configuration.processing_notice}
          </p>
          <label className="flex min-h-11 items-start gap-3 text-sm leading-7">
            <input
              type="checkbox"
              disabled={
                !detail.configuration.enabled ||
                detail.membership.status !== "active"
              }
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span>
              I reviewed this saved wording and the processing notice.
            </span>
          </label>
          <button
            disabled={
              !accepted ||
              !detail.configuration.enabled ||
              detail.membership.status !== "active" ||
              save.busy ||
              !!save.pending
            }
            className={primaryStyle}
            onClick={() =>
              void save.save({
                action: "evaluate",
                workspace_id: detail.workspace.id,
                version_id: current.version_id,
                policy_version: detail.configuration.policy_version,
                  policy_hash: detail.configuration.policy_hash,
                accepted: true,
              })
            }
          >
            Request instructional feedback
          </button>
        </>
      )}
    </section>
  );
}
function Transfers({ detail, save }: { detail: Detail; save: Saver }) {
  const [range, setRange] = useState<{start:number;end:number} | null>(null);
  const [field, setField] = useState(""),
    [target, setTarget] = useState<Feature>("argument");
  const [review, setReview] = useState("");
  const returned = useLearning<Detail>(
    review ? `skills.php?workspace_id=${review}` : undefined,
  );
  const child = returned.data;
  const finalField = child
    ? (
        {
          sentence: "revision",
          argument: "final",
          analysis: "conclusion",
          essay: "practice",
        } as const
      )[child.workspace.feature]
    : "";
  const replacement = child?.saved?.answers[finalField];
  const choices = Object.entries(detail.saved?.answers || {}).filter(
    ([id, text]) =>
      id !== "check" && typeof text === "string" && text.length > 0,
  );
  const catalog = useLearning<Overview>(`skills.php?view=catalog&feature=${target}`);
  const lesson =
    catalog.data?.catalog.find((c) => c.level === detail.workspace.level) ||
    catalog.data?.catalog[0];
  return (
    <section className={`${panelStyle} space-y-4`}>
      <h3 className="text-xl font-semibold">Develop this saved work further</h3>
      <p className="text-sm leading-7">
        Open a linked practice with a saved response. The original stays intact.
        Bring back a final revision only when you choose to save it.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Saved response
          <select
            className={inputStyle}
            value={field}
            onChange={(e) => { setField(e.target.value); setRange(null) }}
          >
            <option value="">Choose a response</option>
            {choices.map(([id]) => (
              <option key={id} value={id}>
                {detail.workspace.source.stages.find((s) => s.id === id)
                  ?.title || id}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Practice workspace
          <select
            className={inputStyle}
            value={target}
            onChange={(e) => setTarget(e.target.value as Feature)}
          >
            {(["argument", "analysis", "sentence"] as Feature[]).map((f) => (
              <option key={f} value={f}>
                {names[f]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {field && <label className="grid gap-2 text-sm font-semibold">Select a passage (optional)
      <textarea readOnly className={`${inputStyle} min-h-36 font-normal leading-7`} value={String(detail.saved?.answers[field] || '')} onSelect={event=>{const element=event.currentTarget;const start=Array.from(element.value.slice(0,element.selectionStart)).length;const end=Array.from(element.value.slice(0,element.selectionEnd)).length;setRange(end>start?{start,end}:null)}} />
      <span className="font-normal leading-7">{range ? `${range.end-range.start} characters selected. Only that passage will be refined and returned.` : 'Highlight one sentence or paragraph to refine part of a longer response. With no selection, the whole response is linked.'}</span>
    </label>}
    <button
        disabled={
          !field ||
          !lesson ||
          detail.membership.status !== "active" ||
          save.busy ||
          !!save.pending
        }
        className={secondaryStyle}
        onClick={() =>
          void save.save({
            action: "transfer",
            workspace_id: detail.workspace.id,
            version_id: detail.saved?.version_id,
            field,
            ...(range || {}),
            feature: target,
            lesson: lesson?.id,
            level: lesson?.level || detail.workspace.level,
          })
        }
      >
        Open linked practice
      </button>
      {catalog.error && (
        <p role="alert" className="text-sm">
          {catalog.error}
        </p>
      )}
      {detail.workspace.parent_id && detail.workspace.parent_feature && (
        <Link
          className="inline-flex min-h-11 items-center text-sm font-semibold underline"
          to={skillsLink(
            detail.workspace.parent_feature,
            detail.workspace.parent_id,
          )}
        >
          Return to the original workspace
        </Link>
      )}
      {detail.children.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold">Linked revisions</h4>
          {detail.children.map((child) => (
            <div
              key={child.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <Link
                className="min-h-11 py-3 text-sm underline"
                to={skillsLink(child.feature, child.id)}
              >
                {names[child.feature]} · {child.version} saved versions
              </Link>
              <button
                className={secondaryStyle}
                disabled={
                  save.busy ||
                  !!save.pending ||
                  !child.version_id ||
                  detail.membership.status !== "active"
                }
                onClick={() => setReview(child.id)}
              >
                Compare returned revision
              </button>
            </div>
          ))}
        </div>
      )}
      {review && !child && (
        <p role={returned.error ? "alert" : "status"} className="text-sm">
          {returned.error || "Loading the linked revision…"}
        </p>
      )}
      {child && (
        <section className="space-y-4 rounded-xl border p-4">
          <h4 className="font-semibold">Compare before bringing it back</h4>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <article className="min-w-0">
              <h5 className="text-sm font-semibold">
                Original workspace’s current response
              </h5>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">
                {String(detail.saved?.answers[child.workspace.parent_field || ""] || "No current response.")}
              </p>
            </article>
            <article className="min-w-0">
              <h5 className="text-sm font-semibold">Linked final revision</h5>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">
                {typeof replacement === "string"
                  ? replacement
                  : "Complete the linked practice and save its final revision first."}
              </p>
            </article>
          </div>
          <button
            className={primaryStyle}
            disabled={
              save.busy ||
              !!save.pending ||
              !child.saved?.evidence.all_recorded ||
              typeof replacement !== "string"
            }
            onClick={() =>
              void save.save({
                action: "adopt",
                workspace_id: detail.workspace.id,
                expected_version: detail.workspace.version,
                child_id: child.workspace.id,
                child_version_id: child.saved?.version_id,
              })
            }
          >
            {child.workspace.source.transfer_range ? 'Save revision of the selected passage' : 'Save this returned revision as a new version'}
          </button>
          <p className="text-xs leading-6 text-slate-500">
            The original wording and the linked revision remain in their
            histories. A conflicting account update must be compared before
            another save.
          </p>
        </section>
      )}
    </section>
  );
}
function Session({
  user,
  detail,
  save,
  refresh,
}: {
  user: string;
  detail: Detail;
  save: Saver;
  refresh: () => void;
}) {
  const { workspace: w, saved } = detail,
    [position, setPosition] = useState(w.position);
  const navigate = useNavigate();
  const [versionParams] = useSearchParams();
  const versionOffset = Math.max(
    0,
    Number(versionParams.get("versions_offset")) || 0,
  );
  const [compare, setCompare] = useState("");
  const earlier = useLearning<Detail>(
    compare
      ? `skills.php?workspace_id=${w.id}&version_id=${compare}`
      : undefined,
  );
  const active = detail.membership.status === "active";
  const old = !!saved && Number(saved.version) !== w.version;
  const stage = w.source.stages[Math.min(position, w.source.stages.length - 1)];
  return (
    <div className="space-y-6">
      <section className={`${panelStyle} space-y-4`}>
        <div className="flex flex-wrap gap-3">
          <h2 className="text-2xl font-semibold">{w.source.title}</h2>
          <ProBadge />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {w.level} · {w.version} saved versions
        </p>
        {w.source.explanation && (
          <p className="text-base leading-8">{w.source.explanation}</p>
        )}
        {w.source.example && (
          <details>
            <summary className="min-h-11 cursor-pointer text-sm font-semibold">
              Worked example of the idea
            </summary>
            <p className="text-sm leading-8">{w.source.example}</p>
          </details>
        )}
        {active && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm leading-7">
            {w.statement || w.source.task}
          </p>
        )}
        {w.source.grammar_day && (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-semibold underline"
            to={grammarLink(w.source.grammar_day, undefined, undefined, w.attempt_id)}
          >
            Review the existing Grammar lesson · day {w.source.grammar_day}
          </Link>
        )}
        {w.writing_id && (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-semibold underline"
            to={`/account/preparation?writing=${w.writing_id}${saved ? `&version=${saved.version_id}` : ""}`}
          >
            Open this wording in saved writing
          </Link>
        )}
        {w.source.roadmap && (
          <>
            <Link
              className="inline-flex min-h-11 items-center text-sm font-semibold underline"
              to={`/study-material/essay-themes/${w.source.roadmap.slug}`}
            >
              Open the preserved research roadmap
            </Link>
            <details>
              <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                Research directions for this theme
              </summary>
              {w.source.roadmap.sections.map((section) => (
                <div key={section.title} className="mt-4">
                  <h3 className="font-semibold">{section.title}</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-7">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        {item.label ? `${item.label}: ` : ""}
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </details>
          </>
        )}
        <p className="text-xs leading-6 text-slate-500">
          {w.source.attribution}
        </p>
      </section>
      {saved?.evidence.check_feedback && (
        <section role="status" className={`${panelStyle} space-y-2`}>
          <h3 className="font-semibold">
            {saved.evidence.check_feedback.correct
              ? "Understanding check saved"
              : "Review the distinction and try again"}
          </h3>
          <p className="text-sm leading-7">
            {saved.evidence.check_feedback.explanation}
          </p>
          <p className="text-sm leading-7">
            Defensible answer: {saved.evidence.check_feedback.answer}
          </p>
        </section>
      )}
      {!active && (
        <p role="status" className="rounded-xl border p-5 text-sm leading-7">
          Your saved versions and feedback remain here.{" "}
          <Link className="font-semibold underline" to="/account/membership">
            Renew Pro
          </Link>{" "}
          to open lessons and record new paid practice.
        </p>
      )}
      {old && (
        <p className="text-sm leading-7">
          You are viewing an earlier immutable version.{" "}
          <Link
            className="font-semibold underline"
            to={skillsLink(w.feature, w.id)}
          >
            Open the latest version before revising
          </Link>
          .
        </p>
      )}
      <nav aria-label="Guided stages" className="flex flex-wrap gap-2">
        {w.source.stages.map((item, i) => (
          <button
            key={item.id}
            className={`${secondaryStyle} ${position === i ? "border-slate-900 bg-slate-100" : ""}`}
            disabled={active && i > (saved?.evidence.next ?? 0)}
            aria-current={position === i ? "step" : undefined}
            onClick={() => setPosition(i)}
          >
            {item.title}
            {saved?.evidence.recorded.includes(item.id) ? " · recorded" : ""}
          </button>
        ))}
      </nav>
      {active && stage && (
        <Exercise
          key={`${w.id}:${stage.id}:${w.version}:${saved?.version_id || "new"}`}
          user={user}
          detail={detail}
          stage={stage}
          index={position}
          save={save}
          old={old}
        />
      )}
      {saved && (
        <section className={`${panelStyle} space-y-4`}>
          <h3 className="text-xl font-semibold">
            Saved work and earlier versions
          </h3>
          <p className="text-sm leading-7">{saved.evidence.basis}</p>
          <p className="text-sm leading-7">
            {saved.evidence.all_recorded
              ? "Every stage has a recorded practice response. Review and revision remain available."
              : `${saved.evidence.recorded.length} stages have recorded responses.`}
          </p>
          <label className="grid gap-2 text-sm font-semibold">
            Saved version
            <select
              className={inputStyle}
              value={saved.version_id}
              onChange={(e) =>
                navigate(skillsLink(w.feature, w.id, e.target.value))
              }
            >
              {!detail.versions.some((v) => v.id === saved.version_id) && (
                <option value={saved.version_id}>
                  Selected version {saved.version}
                </option>
              )}
              {detail.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.version} · {v.word_count} words
                </option>
              ))}
            </select>
          </label>
          <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-8">
            {saved.text}
          </p>
          <label className="grid gap-2 text-sm font-semibold">
            Compare an earlier version
            <select
              className={inputStyle}
              value={compare}
              onChange={(e) => setCompare(e.target.value)}
            >
              <option value="">Choose earlier wording</option>
              {detail.versions
                .filter((v) => Number(v.version) < saved.version)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    Version {v.version}
                  </option>
                ))}
            </select>
          </label>
          <nav
            aria-label="Saved version pages"
            className="flex flex-wrap gap-3"
          >
            {versionOffset > 0 && (
              <Link
                className={secondaryStyle}
                to={
                  skillsLink(w.feature, w.id, saved.version_id) +
                  `&versions_offset=${Math.max(0, versionOffset - 50)}`
                }
              >
                Newer versions
              </Link>
            )}
            {detail.has_more_versions && (
              <Link
                className={secondaryStyle}
                to={
                  skillsLink(w.feature, w.id, saved.version_id) +
                  `&versions_offset=${versionOffset + 50}`
                }
              >
                Earlier versions
              </Link>
            )}
          </nav>
          {earlier.data?.saved && (
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              {[earlier.data.saved, saved].map((v) => (
                <article
                  key={v.version_id}
                  className="min-w-0 rounded-xl border p-4"
                >
                  <h4 className="font-semibold">Version {v.version}</h4>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-8">
                    {v.text}
                  </p>
                </article>
              ))}
            </div>
          )}
          {earlier.error && (
            <p role="alert" className="text-sm">
              {earlier.error}
            </p>
          )}
        </section>
      )}
      {active && stage && (
        <Link
          className={secondaryStyle}
          to={`/account/ask-vista?context=${encodeURIComponent(`skills:${w.id}:${saved?.version_id || "new"}:${stage.id}`)}&attempt=${w.attempt_id}`}
        >
          Ask VISTA about this activity
        </Link>
      )}
      <FeedbackPanel key={`${detail.saved?.version_id || "new"}:${detail.configuration.policy_hash || "disabled"}`} detail={detail} save={save} />
      {active && saved && !old && <Transfers detail={detail} save={save} />}
      <button className={secondaryStyle} onClick={refresh}>
        Refresh saved status
      </button>
    </div>
  );
}
export default function Studio({ feature }: { feature: Feature }) {
  const { user } = useAccount(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const workspace = params.get("workspace"),
    version = params.get("version"),
    offset = Math.max(0, Number(params.get("offset")) || 0);
  const overview = useLearning<Overview>(
    workspace ? undefined : `skills.php?feature=${feature}&offset=${offset}`,
  );
  const detail = useLearning<Detail>(
    workspace
      ? `skills.php?workspace_id=${encodeURIComponent(workspace)}${version ? `&version_id=${encodeURIComponent(version)}` : ""}&offset=${Math.max(0, Number(params.get("versions_offset")) || 0)}`
      : undefined,
  );
  function confirmed(result: Receipt) {
    if (result.workspace_id)
      navigate(
        skillsLink(
          result.feature || detail.data?.workspace.feature || feature,
          result.workspace_id,
        ),
      );
    overview.refresh();
    detail.refresh();
  }
  const save = useStudioSave(user?.id || "", confirmed);
  const load = workspace ? detail : overview;
  if (!user) return null;
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold">{feature === "sentence" ? names[feature] : "Your learning workspace"}</h2>
          <ProBadge />
        </div>
        <p className="text-sm leading-7 text-slate-600">
          Learn an idea, attempt one activity, review your own work and save an
          independent revision.
        </p>
        <nav
          aria-label="Connected skills"
          className="flex flex-wrap gap-4 text-sm"
        >
          {(Object.keys(names) as Feature[]).map((f) => (
            <Link
              key={f}
              className="inline-flex min-h-11 items-center font-semibold underline"
              to={skillsLink(f)}
            >
              {names[f]}
            </Link>
          ))}
          <Link
            className="inline-flex min-h-11 items-center underline"
            to="/account/preparation"
          >
            Saved writing & preparation
          </Link>
        </nav>
      </header>
      <Recovery save={save} />
      {!load.data ? (
        <section role={load.error ? "alert" : "status"} className={panelStyle}>
          {load.error || "Loading your learning workspace…"}
          {load.error && (
            <button className={`${secondaryStyle} mt-3`} onClick={load.refresh}>
              Try again
            </button>
          )}
        </section>
      ) : workspace && detail.data ? (
        <>
          <Link
            className="inline-flex min-h-11 items-center text-sm font-semibold underline"
            to={skillsLink(feature)}
          >
            All lessons and saved work
          </Link>
          <Session
            key={`${workspace}:${detail.data.saved?.version_id || "new"}:${detail.data.workspace.version}`}
            user={user.id}
            detail={detail.data}
            save={save}
            refresh={detail.refresh}
          />
        </>
      ) : (
        overview.data && (
          <>
            <Availability config={overview.data.configuration} />
            {overview.data.membership.status === "active" ? (
              <Start
                key={feature}
                feature={feature}
                data={overview.data}
                save={save}
                selected={params.get("theme") || undefined}
              />
            ) : (
              <p className={`${panelStyle} text-sm leading-7`}>
                An active Pro membership is required for new lessons and paid
                practice. Your own earlier work remains in the list below.{" "}
                <Link
                  className="font-semibold underline"
                  to="/account/membership"
                >
                  View membership
                </Link>
              </p>
            )}
            <section className={`${panelStyle} space-y-4`}>
              <h3 className="text-xl font-semibold">Continue saved work</h3>
              {overview.data.history.length ? (
                <ul className="space-y-3">
                  {overview.data.history.map((w) => (
                    <li key={w.id}>
                      <Link
                        className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border p-4 text-sm font-semibold"
                        to={skillsLink(feature, w.id)}
                      >
                        <span>
                          {overview.data!.catalog.find(
                            (l) => l.id === w.lesson_id,
                          )?.title || w.lesson_id.replaceAll("-", " ")}
                        </span>
                        <span className="font-normal text-slate-500">
                          {w.level} · {w.version} saved versions
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  No guided practice saved yet.
                </p>
              )}
              <nav aria-label="Saved work pages" className="flex gap-3">
                {offset > 0 && (
                  <Link
                    className={secondaryStyle}
                    to={
                      skillsLink(feature) +
                      (feature === "sentence" ? "&" : "?") +
                      `offset=${Math.max(0, offset - 20)}`
                    }
                  >
                    Previous
                  </Link>
                )}
                {overview.data.has_more && (
                  <Link
                    className={secondaryStyle}
                    to={
                      skillsLink(feature) +
                      (feature === "sentence" ? "&" : "?") +
                      `offset=${offset + 20}`
                    }
                  >
                    Next
                  </Link>
                )}
              </nav>
            </section>
          </>
        )
      )}
    </div>
  );
}
