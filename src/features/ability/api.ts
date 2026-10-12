export type Exercise = {
  id: string;
  prompt: string;
  unit: string;
  kind?: "choice";
  options?: string[];
};
export type Lesson = {
  id: string;
  title: string;
  idea: string;
  rule: string;
  example: { problem: string; steps: string[] };
  exercise: Exercise;
};
export type Question = Exercise & { options: string[] };
export type Topic = {
  id: string;
  title: string;
  stage: string;
  summary: string;
  lessons: Lesson[];
  quiz: Question[];
};
export type TopicSummary = Pick<Topic, "id" | "title" | "stage" | "summary"> & {
  lessons: { id: string; title: string }[];
  lesson_count: number;
  completed_lessons: string[];
  quiz_best: number | null;
  quiz_tries: number;
  complete: boolean;
};
export type ExerciseFeedback = {
  lesson_id: string;
  question_id: string;
  prompt: string;
  unit: string;
  submitted: string;
  correct: boolean;
  answer: string;
  explanation: string;
};
export type QuizFeedback = {
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  results: {
    question_id: string;
    prompt: string;
    options: string[];
    unit: string;
    choice: number;
    correct: boolean;
    answer: number;
    explanation: string;
  }[];
};
export type Receipt = {
  ability_course_version: string;
  unit_id: string;
  mode: "exercise" | "quiz" | "position";
  response_id?: string;
  feedback?: ExerciseFeedback | QuizFeedback;
};
export type CourseData = {
  course_version: string;
  edition: string;
  attribution: string;
  units: TopicSummary[];
  position: { unit_id: string; lesson_id: string } | null;
  compatible_versions?: string[];
  unit?: Topic;
  latest?: Receipt[];
};
export type HistoryData = {
  history: (Receipt & { saved_at: string })[];
  has_more: boolean;
};
export const stages = [
  "Foundations",
  "Applied maths",
  "Algebra & geometry",
  "Logical reasoning",
];
export function courseLink(unit?: string, lesson?: string) {
  const params = new URLSearchParams();
  if (unit) params.set("unit", unit);
  if (lesson) params.set("lesson", lesson);
  return "/account/general-ability" + (params.size ? "?" + params : "");
}
