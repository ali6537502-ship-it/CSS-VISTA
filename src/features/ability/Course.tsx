import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  ChevronRight,
  Layers,
  RotateCcw,
  Target,
} from "lucide-react";
import { useAccount } from "@/lib/accountContext";
import { useLearning } from "@/features/learning/api";
import { AccountPage } from "@/pages/account/shared";
import { ProBadge } from "@/features/membership/AccountSections";
import {
  courseLink,
  stages,
  type CourseData,
  type ExerciseFeedback,
  type HistoryData,
  type Lesson,
  type QuizFeedback,
  type Receipt,
  type Topic,
} from "./api";
import { useCourseSave } from "./useCourseSave";
import Explorer from "./Explorers";

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50";
const secondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50";
const panel = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-7";

function Feedback({ receipt }: { receipt: Receipt }) {
  if (!receipt.feedback)
    return (
      <p role="status" className="text-sm text-slate-600">
        Your place is saved.
      </p>
    );
  if (receipt.mode === "exercise") {
    const value = receipt.feedback as ExerciseFeedback;
    return (
      <div
        role="status"
        className={`rounded-xl border p-4 ${value.correct ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
      >
        <p className="font-semibold text-slate-950">
          {value.correct
            ? "Correct — exercise saved"
            : "Review this step — attempt saved"}
        </p>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          {value.explanation}
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Answer: <strong>{value.answer}</strong> {value.unit}
        </p>
      </div>
    );
  }
  const value = receipt.feedback as QuizFeedback;
  return (
    <section className="space-y-4" aria-label="Saved quiz feedback">
      <div role="status" className="rounded-xl bg-slate-950 p-5 text-white">
        <p className="text-2xl font-bold">
          {value.correct} / {value.total}
        </p>
        <p className="mt-2 text-sm text-slate-200">
          {value.passed
            ? "Quiz passed. Complete the three lesson exercises to finish this topic."
            : "Use the explanations below, then try again when you are ready."}
        </p>
      </div>
      {value.results.map((row, index) => (
        <article key={row.question_id} className={panel}>
          <p className="text-xs font-semibold text-slate-500">
            Question {index + 1} · {row.correct ? "Correct" : "Review"}
          </p>
          <h3 className="mt-2 font-semibold text-slate-950">{row.prompt}</h3>
          <p className="mt-3 text-sm text-slate-600">
            Your answer: {row.options[row.choice]} {row.unit}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Correct answer: <strong>{row.options[row.answer]}</strong>{" "}
            {row.unit}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {row.explanation}
          </p>
        </article>
      ))}
    </section>
  );
}
function useDraft<T>(key: string, initial: T, fallback: string[] = []) {
  const [value, setValue] = useState<T>(() => {
    try {
      for (const candidate of [key, ...fallback]) {
        const raw = localStorage.getItem(candidate);
        if (raw !== null) return JSON.parse(raw) as T;
      }
      return initial;
    } catch {
      return initial;
    }
  });
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setStorageError("");
    } catch {
      setStorageError(
        "This browser could not keep an unsent draft. Keep this page open until your answer is saved.",
      );
    }
  }, [key, value]);
  return { value, setValue, storageError };
}
function WorkedExample({ lesson }: { lesson: Lesson }) {
  const [visible, setVisible] = useState(0);
  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/50">
      <div className="border-b border-indigo-100 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
          Worked example
        </p>
        <h3 className="mt-3 text-lg font-semibold leading-7 text-slate-950">
          {lesson.example.problem}
        </h3>
      </div>
      <div className="p-5 sm:p-6">
        <ol className="space-y-4">
          {lesson.example.steps.slice(0, visible).map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                {index + 1}
              </span>
              <p className="text-sm leading-7 text-slate-700">{step}</p>
            </li>
          ))}
        </ol>
        {visible < lesson.example.steps.length ? (
          <button
            className={`${secondary} ${visible ? "mt-5" : ""}`}
            onClick={() => setVisible((v) => v + 1)}
          >
            Reveal {visible ? "next" : "first"} step{" "}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-indigo-700">
            <Check className="h-4 w-4" /> Now try a different problem below.
          </p>
        )}
      </div>
    </section>
  );
}
function Practice({
  lesson,
  user,
  version,
  unit,
  save,
  disabled,
  compatible = [],
}: {
  lesson: Lesson;
  user: string;
  version: string;
  unit: string;
  save: (body: Record<string, unknown>) => Promise<void>;
  disabled: boolean;
  compatible?: string[];
}) {
  const draft = useDraft<string>(
    `cssvista:ability:draft:v1:${user}:${version}:${lesson.id}`,
    "",
    compatible.map(
      (v) => `cssvista:ability:draft:v1:${user}:${v}:${lesson.id}`,
    ),
  );
  return (
    <form
      className={panel}
      onSubmit={(event) => {
        event.preventDefault();
        void save({
          action: "exercise",
          course_version: version,
          unit,
          lesson: lesson.id,
          answer: draft.value,
        });
      }}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
        Your turn
      </p>
      <h3 className="mt-3 text-lg font-semibold leading-7 text-slate-950">
        {lesson.exercise.prompt}
      </h3>
      <label className="mt-5 block text-sm font-semibold text-slate-700">
        Your answer{" "}
        <span className="font-normal text-slate-500">
          ({lesson.exercise.unit})
        </span>
        {lesson.exercise.kind === "choice" ? (
          <select
            required
            value={String(draft.value || "")}
            onChange={(e) => draft.setValue(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base"
          >
            <option value="">Choose one option</option>
            {lesson.exercise.options?.map((option, i) => (
              <option key={i} value={String(i)}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            required
            maxLength={60}
            type="text"
            autoComplete="off"
            value={typeof draft.value === "string" ? draft.value : ""}
            onChange={(event) => draft.setValue(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-lg text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            aria-describedby="ability-answer-format"
          />
        )}
      </label>
      <p
        id="ability-answer-format"
        className="mt-2 text-xs leading-6 text-slate-500"
      >
        {lesson.exercise.kind === "choice"
          ? "Use only the stated conditions. Fixed options are checked against reviewed stored answers, without AI."
          : "Enter digits, a decimal or a fraction such as 3/4. Equivalent fractions are accepted. Round recurring decimal answers to two places; do not round exact decimals."}
      </p>
      {draft.storageError && (
        <p role="alert" className="mt-3 text-sm text-amber-800">
          {draft.storageError}
        </p>
      )}
      <button
        className={`${button} mt-5`}
        disabled={disabled || !String(draft.value).trim()}
        type="submit"
      >
        Check & save answer <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
function Quiz({
  topic,
  user,
  version,
  save,
  disabled,
  compatible = [],
}: {
  topic: Topic;
  user: string;
  version: string;
  save: (body: Record<string, unknown>) => Promise<void>;
  disabled: boolean;
  compatible?: string[];
}) {
  const draft = useDraft<Record<string, number>>(
    `cssvista:ability:quiz:v1:${user}:${version}:${topic.id}`,
    {},
    compatible.map((v) => `cssvista:ability:quiz:v1:${user}:${v}:${topic.id}`),
  );
  const choices =
    draft.value &&
    typeof draft.value === "object" &&
    !Array.isArray(draft.value)
      ? draft.value
      : {};
  const all = topic.quiz.every((q) => Number.isInteger(choices[q.id]));
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void save({
          action: "quiz",
          course_version: version,
          unit: topic.id,
          choices,
        });
      }}
    >
      <section className="rounded-2xl bg-slate-950 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">
          Topic check
        </p>
        <h2 className="mt-3 text-2xl font-bold">
          Five problems. Show what you understand.
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Work independently before submitting. Four correct answers pass the
          quiz. Your previous attempts remain saved.
        </p>
      </section>
      {topic.quiz.map((question, index) => (
        <fieldset key={question.id} className={panel}>
          <legend className="px-2 text-xs font-bold text-slate-500">
            Question {index + 1} of 5
          </legend>
          <p className="text-lg font-semibold leading-7 text-slate-950">
            {question.prompt}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Answer unit: {question.unit}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {question.options.map((option, i) => (
              <label
                key={i}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-4 ${choices[question.id] === i ? "border-emerald-700 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
              >
                <input
                  type="radio"
                  required
                  name={question.id}
                  checked={choices[question.id] === i}
                  value={i}
                  onChange={() =>
                    draft.setValue({ ...choices, [question.id]: i })
                  }
                  className="h-4 w-4 shrink-0 accent-emerald-800"
                />
                <span className="text-sm font-semibold text-slate-800">
                  {option}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {draft.storageError && (
        <p role="alert" className="text-sm text-amber-800">
          {draft.storageError}
        </p>
      )}
      <button className={button} disabled={disabled || !all} type="submit">
        Submit & save quiz <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
function CourseHome({ data, preparation }: { data: CourseData; preparation?: string }) {
  const done = data.units.filter((u) => u.complete).length;
  const topics = data.units.length, lessons = data.units.reduce((sum, unit) => sum + unit.lessons.length, 0);
  const current =
    data.units.find((u) => u.id === data.position?.unit_id && !u.complete) ||
    data.units.find((u) => !u.complete) ||
    data.units[0];
  const savedLesson =
    data.position?.unit_id === current.id ? data.position.lesson_id : undefined;
  const nextLesson =
    savedLesson &&
    (savedLesson === "quiz" ||
      current.lessons.some((l) => l.id === savedLesson))
      ? savedLesson
      : current.lessons.find((l) => !current.completed_lessons.includes(l.id))
          ?.id || "quiz";
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-9">
        <div
          className="absolute -right-14 -top-14 h-60 w-60 rounded-full border-[32px] border-white/5"
          aria-hidden="true"
        />
        <div className="relative grid gap-8 sm:grid-cols-[1fr_170px] sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-200">
              Your maths learning path
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
              Build the method.
              <br />
              <span className="text-slate-300">Then solve it yourself.</span>
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">
              Start with numbers and fractions. Work through everyday
              calculations, then tackle equations, patterns and geometry.
            </p>
            <Link
              className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
              to={courseLink(current.id, nextLesson, preparation)}
            >
              {done ? "Continue learning" : "Start learning"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
            <Calculator className="h-7 w-7 text-amber-200" />
            <p className="mt-5 text-4xl font-bold tabular-nums">
              {done}
              <span className="text-lg font-normal text-slate-400"> / {topics}</span>
            </p>
            <p className="mt-2 text-xs text-slate-300">topics completed</p>
            <div
              className="mt-4 h-1.5 rounded-full bg-white/15"
              role="progressbar"
              aria-label="Topics completed"
              aria-valuenow={done}
              aria-valuemin={0}
              aria-valuemax={topics}
            >
              <div
                className="h-full rounded-full bg-amber-200"
                style={{ width: `${(done / Math.max(1, topics)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [BookOpen, `${lessons} guided lessons`, "A clear idea and a worked example."],
          [
            Calculator,
            `${lessons} practice exercises`,
            "Enter an answer and review the method.",
          ],
          [Target, `${topics} topic quizzes`, "Five questions with saved feedback."],
        ].map(([Icon, title, desc]) => {
          const Component = Icon as typeof BookOpen;
          return (
            <div
              key={String(title)}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <Component className="h-5 w-5 text-emerald-800" />
              <p className="mt-3 font-semibold text-slate-950">
                {String(title)}
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                {String(desc)}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-sm leading-7 text-slate-600">
        Finish a topic by answering its three lesson exercises correctly and
        scoring at least 4/5 in its quiz. You can revisit any topic; completion
        records practice, not examination mastery.
      </p>
      {stages.map((stage, stageIndex) => (
        <section key={stage} aria-labelledby={`ability-stage-${stageIndex}`}>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white">
              0{stageIndex + 1}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Stage {stageIndex + 1}
              </p>
              <h2
                id={`ability-stage-${stageIndex}`}
                className="text-xl font-bold text-slate-950"
              >
                {stage}
              </h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.units
              .filter((u) => u.stage === stage)
              .map((unit) => (
                <Link
                  key={unit.id}
                  to={courseLink(unit.id, undefined, preparation)}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold leading-6 text-slate-950">
                      {unit.title}
                    </h3>
                    {unit.complete ? (
                      <CheckCircle2
                        className="h-5 w-5 shrink-0 text-emerald-700"
                        aria-label="Completed"
                      />
                    ) : (
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-700" />
                    )}
                  </div>
                  <p className="mt-3 text-xs leading-6 text-slate-500">
                    {unit.summary}
                  </p>
                  <p className="mt-4 text-xs font-semibold text-emerald-800">
                    {unit.completed_lessons.length}/3 exercises ·{" "}
                    {unit.quiz_best === null
                      ? "Quiz not taken"
                      : `Best quiz: ${unit.quiz_best}%`}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      ))}
      <p className="text-xs leading-6 text-slate-500">{data.attribution}</p>
      <Link className={secondary} to="/gk/category/general-ability">
        Open the existing Ability question bank{" "}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
function History() {
  const [params, setParams] = useSearchParams();
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  const preparation = params.get("preparation");
  const context: Record<string, string> = preparation ? { preparation } : {};
  const history = useLearning<HistoryData>(
    `ability.php?view=history&offset=${offset}`,
  );
  if (!history.data)
    return (
      <p role={history.error ? "alert" : "status"}>
        {history.error || "Opening saved maths work…"}
        {history.error && (
          <button className={`${secondary} ml-3`} onClick={history.refresh}>
            Retry
          </button>
        )}
      </p>
    );
  return (
    <section className="space-y-5">
      <h2 className="text-xl font-bold">Saved attempts</h2>
      {!history.data.history.length && (
        <p className={panel}>
          Your exercise and quiz attempts will appear here after you submit
          them.
        </p>
      )}
      {history.data.history.map((receipt) => (
        <details key={receipt.response_id} className={panel}>
          <summary className="cursor-pointer text-sm font-semibold">
            {receipt.unit_id.replaceAll("-", " ")} · {receipt.mode} ·{" "}
            {new Date(receipt.saved_at).toLocaleString()}
          </summary>
          <div className="mt-5">
            <Feedback receipt={receipt} />
          </div>
        </details>
      ))}
      <div className="flex flex-wrap gap-3">
        {offset > 0 && (
          <button
            className={secondary}
            onClick={() =>
              setParams({
                ...context,
                view: "history",
                offset: String(Math.max(0, offset - 20)),
              })
            }
          >
            Previous
          </button>
        )}
        {history.data.has_more && (
          <button
            className={secondary}
            onClick={() =>
              setParams({ ...context, view: "history", offset: String(offset + 20) })
            }
          >
            Next
          </button>
        )}
      </div>
    </section>
  );
}
function Workspace({ user, preparation }: { user: string; preparation?: string }) {
  const [params] = useSearchParams(),
    unit = params.get("unit"),
    lessonId = params.get("lesson");
  const course = useLearning<CourseData>(
    params.get("view") === "history"
      ? undefined
      : "ability.php" + (unit ? `?unit=${encodeURIComponent(unit)}` : ""),
  );
  const saver = useCourseSave(user, course.refresh);
  const data = course.data,
    topic = data?.unit;
  const lesson =
    topic?.lessons.find((l) => l.id === lessonId) || topic?.lessons[0];
  const isQuiz = lessonId === "quiz",
    summary = data?.units.find((u) => u.id === topic?.id);
  const currentResult =
    saver.result?.ability_course_version === data?.course_version &&
    saver.result?.unit_id === unit &&
    (isQuiz
      ? saver.result.mode === "quiz"
      : saver.result.mode === "exercise" &&
        (saver.result.feedback as ExerciseFeedback)?.lesson_id === lesson?.id)
      ? saver.result
      : undefined;
  const prior = data?.latest?.find((r) =>
    isQuiz
      ? r.mode === "quiz"
      : r.mode === "exercise" &&
        (r.feedback as ExerciseFeedback)?.lesson_id === lesson?.id,
  );
  const index = topic?.lessons.findIndex((l) => l.id === lesson?.id) ?? 0;
  const next =
    topic && !isQuiz ? topic.lessons[index + 1]?.id || "quiz" : undefined;
  if (params.get("view") === "history") return <History />;
  return (
    <div className="space-y-5">
      {saver.pending && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="font-semibold">An ability save needs confirmation</h2>
          <p className="mt-2 text-sm leading-7">
            Check its saved result before sending another answer. This protects
            your attempt from being recorded twice.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className={secondary}
              disabled={saver.busy}
              onClick={() => void saver.recover()}
            >
              Check saved result
            </button>
            {saver.pending.missing && (
              <>
                <button
                  className={button}
                  disabled={saver.busy}
                  onClick={saver.retry}
                >
                  Retry same request
                </button>
                <button
                  className={secondary}
                  disabled={saver.busy}
                  onClick={saver.discard}
                >
                  Discard unsent request
                </button>
              </>
            )}
          </div>
        </section>
      )}
      {saver.error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          {saver.error}
        </p>
      )}
      {!data ? (
        <section className={panel} role={course.error ? "alert" : "status"}>
          {course.error || "Opening your General Ability course…"}
          {course.error && (
            <button className={`${secondary} mt-4`} onClick={course.refresh}>
              Try again
            </button>
          )}
        </section>
      ) : !unit ? (
        <CourseHome data={data} preparation={preparation} />
      ) : topic && lesson ? (
        <>
          <Link
            to={courseLink(undefined, undefined, preparation)}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" /> All topics
          </Link>
          <header className="rounded-2xl bg-slate-950 p-6 text-white">
            <p className="text-xs font-semibold text-amber-200">
              {topic.stage}
            </p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
              {topic.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {topic.summary}
            </p>
            <p className="mt-4 text-xs font-semibold text-slate-300">
              {summary?.complete
                ? "Topic completed — revisit whenever you need."
                : `${summary?.completed_lessons.length || 0}/3 exercises completed`}
            </p>
          </header>
          <nav aria-label="Topic lessons" className="grid gap-2 sm:grid-cols-4">
            {topic.lessons.map((l, i) => (
              <Link
                key={l.id}
                to={courseLink(unit, l.id, preparation)}
                aria-current={
                  !isQuiz && lesson.id === l.id ? "page" : undefined
                }
                className={`${secondary} justify-start ${!isQuiz && lesson.id === l.id ? "border-emerald-700 bg-emerald-50 text-emerald-900" : ""}`}
              >
                <span className="text-xs">{i + 1}.</span>
                <span className="min-w-0 text-xs leading-5">{l.title}</span>
                {summary?.completed_lessons.includes(l.id) && (
                  <Check
                    className="h-4 w-4 shrink-0"
                    aria-label="Exercise completed"
                  />
                )}
              </Link>
            ))}
            <Link
              to={courseLink(unit, "quiz", preparation)}
              aria-current={isQuiz ? "page" : undefined}
              className={`${secondary} ${isQuiz ? "border-emerald-700 bg-emerald-50 text-emerald-900" : ""}`}
            >
              <Target className="h-4 w-4" /> Topic quiz
            </Link>
          </nav>
          {isQuiz ? (
            <Quiz
              key={`${data.course_version}:${unit}`}
              topic={topic}
              user={user}
              version={data.course_version}
              compatible={data.compatible_versions}
              save={saver.save}
              disabled={saver.busy || !!saver.pending}
            />
          ) : (
            <div className="space-y-5">
              <article className={panel}>
                <p className="text-xs font-semibold text-slate-500">
                  Lesson {index + 1} of 3
                </p>
                <h2 className="mt-3 text-2xl font-bold text-slate-950">
                  {lesson.title}
                </h2>
                <p className="mt-4 text-sm leading-8 text-slate-700">
                  {lesson.idea}
                </p>
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Method to keep
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-800">
                    {lesson.rule}
                  </p>
                </div>
              </article>
              <Link className={secondary} to={`/account/ask-vista?context=${encodeURIComponent(`ability:${unit}:${lesson.id}`)}${preparation ? `&attempt=${encodeURIComponent(preparation)}` : ""}`}>Ask VISTA about this method</Link>
              <Explorer key={`${unit}:${lesson.id}`} unit={unit} />
              <WorkedExample key={lesson.id} lesson={lesson} />
              <Practice
                key={`${data.course_version}:${lesson.id}`}
                lesson={lesson}
                user={user}
                version={data.course_version}
                compatible={data.compatible_versions}
                unit={unit}
                save={saver.save}
                disabled={saver.busy || !!saver.pending}
              />
            </div>
          )}
          {currentResult && <Feedback receipt={currentResult} />}
          {!currentResult && prior && (
            <details className={panel}>
              <summary className="cursor-pointer text-sm font-semibold">
                View your last saved {isQuiz ? "quiz" : "exercise"} feedback
              </summary>
              <div className="mt-4">
                <Feedback receipt={prior} />
              </div>
            </details>
          )}
          <div className="flex flex-wrap gap-3">
            {next && (
              <Link className={button} to={courseLink(unit, next, preparation)}>
                {next === "quiz" ? "Open topic quiz" : "Next lesson"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {!isQuiz && (
              <button
                className={secondary}
                disabled={saver.busy || !!saver.pending}
                onClick={() =>
                  void saver.save({
                    action: "position",
                    course_version: data.course_version,
                    unit,
                    lesson: lesson.id,
                  })
                }
              >
                <Layers className="h-4 w-4" /> Save my place
              </button>
            )}
            <Link className={secondary} to={courseLink(undefined, undefined, preparation)}>
              <RotateCcw className="h-4 w-4" /> Return to topic path
            </Link>
          </div>
          {saver.result?.mode === "position" &&
            saver.result.unit_id === unit && (
              <p role="status" className="text-sm text-slate-600">
                Your place is saved.
              </p>
            )}
        </>
      ) : (
        <p role="alert" className={panel}>
          This topic is unavailable.{" "}
          <Link className="underline" to={courseLink(undefined, undefined, preparation)}>
            Return to the course
          </Link>
          .
        </p>
      )}
    </div>
  );
}
function PreparationReturn({ preparation }: { preparation: string }) {
  const load = useLearning<{ attempt: { id: string; target_year: number } }>(`learning.php?attempt_id=${encodeURIComponent(preparation)}`);
  return <section className={`${panel} mb-5`} aria-label="Preparation context">
    {load.data ? <><Link className={secondary} to={`/account/preparation?attempt=${load.data.attempt.id}`}><ArrowLeft className="h-4 w-4" />Return to CSS {load.data.attempt.target_year} preparation</Link><p className="mt-3 text-sm leading-7 text-slate-600">General Ability progress belongs to your account and is shared across preparation attempts. Returning here does not count the same exercise as new work.</p></> : <p role={load.error ? "alert" : "status"} className="text-sm leading-7">{load.error ? "This preparation reference is unavailable. Your course progress remains with your account." : "Checking your preparation link…"}</p>}
  </section>;
}
export default function GeneralAbility() {
  const { user } = useAccount();
  const [params] = useSearchParams();
  const requested = params.get("preparation") || "";
  const preparation = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requested) ? requested : undefined;
  return (
    <AccountPage
      title="General Ability"
      intro="Learn the method, work through examples and keep your maths practice in one place."
      action={<ProBadge />}
    >
      {preparation && <PreparationReturn key={`${user?.id}:${preparation}`} preparation={preparation} />}
      <nav
        aria-label="General Ability workspace"
        className="mb-7 flex flex-wrap gap-3"
      >
        <Link className={secondary} to={courseLink(undefined, undefined, preparation)}>
          <BookOpen className="h-4 w-4" /> Course
        </Link>
        <Link className={secondary} to={`/account/general-ability?view=history${preparation ? `&preparation=${encodeURIComponent(preparation)}` : ""}`}>
          Saved work
        </Link>
      </nav>
      {user && <Workspace key={user.id} user={user.id} preparation={preparation} />}
    </AccountPage>
  );
}
