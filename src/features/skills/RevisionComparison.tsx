import { useState } from "react";
import { inputStyle } from "@/features/handwriting/styles";
import type { Saved, Source } from "./api";

/** Compare immutable responses, never infer quality from a text difference. */
export default function RevisionComparison({
  source,
  before,
  after,
}: {
  source: Source;
  before: Saved;
  after: Saved;
}) {
  const activities = source.stages.filter(
    (stage) =>
      before.answers[stage.id] !== undefined ||
      after.answers[stage.id] !== undefined,
  );
  const changed = activities.filter(
    (stage) => before.answers[stage.id] !== after.answers[stage.id],
  );
  const [selected, setSelected] = useState(
    changed[0]?.id || activities[0]?.id || "",
  );
  const stage = activities.find((item) => item.id === selected);
  function wording(version: Saved, id: string) {
    const answer = version.answers[id];
    if (answer === undefined) return "No response saved in this version.";
    if (id === "check" && typeof answer === "number")
      return (
        version.evidence.check_feedback?.chosen ||
        source.check?.options[answer] ||
        "Saved recognition choice is unavailable."
      );
    return String(answer);
  }
  return (
    <section aria-label="Revision comparison" className="space-y-4">
      <h4 className="font-semibold">Compare by activity</h4>
      <p className="text-sm leading-7">
        {changed.length} of {activities.length} saved activities differ. Changes
        show what you revised; they do not prove improved quality or mastery.
      </p>
      {activities.length > 0 && (
        <label className="grid gap-2 text-sm font-semibold">
          Activity to compare
          <select
            className={inputStyle}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {activities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ·{" "}
                {before.answers[item.id] === after.answers[item.id]
                  ? "unchanged"
                  : before.answers[item.id] === undefined
                    ? "added"
                    : after.answers[item.id] === undefined
                      ? "not present in later version"
                      : "revised"}
              </option>
            ))}
          </select>
        </label>
      )}
      {stage && (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {[before, after].map((version) => (
            <article
              key={version.version_id}
              className="min-w-0 rounded-xl border p-4"
              aria-label={`Version ${version.version} · ${stage.title}`}
            >
              <h5 className="font-semibold">Version {version.version}</h5>
              <p className="mt-2 text-xs text-slate-500">{stage.title}</p>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-8">
                {wording(version, stage.id)}
              </p>
            </article>
          ))}
        </div>
      )}
      <details>
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          Compare the complete saved wording
        </summary>
        <div className="mt-3 grid min-w-0 gap-4 md:grid-cols-2">
          {[before, after].map((version) => (
            <article key={version.version_id} className="min-w-0 rounded-xl border p-4">
              <h5 className="font-semibold">
                Version {version.version} · {version.word_count} words
              </h5>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-8">
                {version.text}
              </p>
            </article>
          ))}
        </div>
      </details>
      <p className="text-xs leading-6 text-slate-500">
        Compare meaning, reasoning and qualifications yourself. A shorter
        response is not automatically better. Viewing this comparison uses no
        AI allowance and makes no changes to either version.
      </p>
    </section>
  );
}
