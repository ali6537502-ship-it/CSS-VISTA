import type { WritingVersion } from "@/features/learning/api";
export type Feature = "sentence" | "argument" | "analysis" | "essay";
export type Level = "beginner" | "intermediate" | "advanced";
export const names: Record<Feature, string> = {
  sentence: "Sentence Structure & Improvement",
  argument: "Argumentation Skills Builder",
  analysis: "Analytical Skills Builder",
  essay: "Essay Themes Builder",
};
export function skillsLink(
  feature: Feature,
  workspace?: string,
  version?: string,
) {
  const path =
    feature === "sentence"
      ? "/account/expression"
      : `/account/${feature === "argument" ? "argumentation" : feature === "analysis" ? "analytical-skills" : "essay-builder"}`;
  const query = new URLSearchParams(
    feature === "sentence" ? { view: "studio" } : {},
  );
  if (workspace) query.set("workspace", workspace);
  if (version) query.set("version", version);
  return path + (query.size ? `?${query}` : "");
}
export type Stage = {
  id: string;
  title: string;
  teach?: string;
  example?: string;
  question?: string;
  min_words: number; review?: string[];
};
export type Source = {
  id: string;
  feature: Feature;
  title: string;
  level: Level;
  explanation?: string;
  example?: string;
  task?: string;
  transfer_range?: { start: number; end: number };
  grammar_day?: number;
  attribution?: string;
  stages: Stage[];
  check?: { id: string; prompt: string; options: string[] };
  roadmap?: {
    slug: string;
    sections: {
      title: string;
      items: { id: string; text: string; label?: string }[];
    }[];
  };
};
export type Configuration = {
  enabled: boolean;
  limit: number;
  policy_version: string | null;
  policy_hash: string | null;
  processing_notice: string | null;
  basis: string;
};
export type Evidence = {
  recorded: string[];
  next: number;
  all_recorded: boolean;
  check_feedback: {
    correct: boolean;
    chosen: string;
    answer: string;
    explanation: string;
    choice_explanation?: string;
  } | null;
  basis: string;
};
export type Saved = WritingVersion & {
  version_id: string;
  answers: Record<string, string | number>;
  evidence: Evidence;
};
export type Feedback = {
  summary: string;
  assessment: string;
  next_question: string;
  findings: {
    code: string;
    excerpt: string;
    explanation: string;
    hint: string;
  }[];
  criteria: {
    code: string;
    label: string;
    status: string;
    excerpt: string;
    explanation: string;
    hint: string;
  }[];
  evidence_flags: { excerpt: string; status: string; explanation: string }[];
};
export type Operation = {
  id: string;
  version_id: string;
  feature: string;
  state: string;
  accounting: string;
  result: Feedback | null;
};
export type Overview = {
  membership: { status: string };
  configuration: Configuration;
  catalog: {
    id: string;
    title: string;
    level: Level | null;
    summary: string;
  }[];
  attempts: { id: string; target_year: number }[];
  history: {
    id: string;
    lesson_id: string;
    level: Level;
    version: number;
    position: number;
    updated_at: string;
  }[];
  has_more: boolean;
};
export type Detail = {
  membership: { status: string };
  configuration: Configuration;
  workspace: {
    id: string;
    writing_id: string | null;
    feature: Feature;
    attempt_id: string;
    level: Level;
    statement: string;
    version: number;
    position: number;
    source: Source;
    parent_id: string | null;
    parent_field: string | null;
    parent_feature: Feature | null;
  };
  saved: Saved | null;
  has_more_versions: boolean;
  versions: {
    id: string;
    version: number;
    word_count: number;
    created_at: string;
  }[];
  operations: Operation[];
  children_offset: number;
  has_more_children: boolean;
  children: {
    id: string;
    feature: Feature;
    lesson_id: string;
    version: number;
    writing_id: string | null;
    version_id: string | null;
  }[];
};
export type Receipt = {
  workspace_id?: string;
  feature?: Feature;
  version_id?: string;
  version?: number;
  evidence?: Evidence;
  operation?: Operation;
};
