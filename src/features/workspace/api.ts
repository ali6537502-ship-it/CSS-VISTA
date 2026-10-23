import { useLearning } from '@/features/learning/api'
export type WorkspaceItem = {
  id: string; title: string; domain: string; destination: string; edition: string | null;
  evidence: string; updated_at: string; due_at: string | null
}
export type CatalogItem = {
  id: string; kind: 'area' | 'course' | 'unit' | 'lesson' | 'resource'; title: string;
  summary: string; parentId?: string; order: number; subjectIds: string[];
  syllabusRefs: string[]; tags: string[]; prerequisites: string[]; editionId: string | null;
  reviewState: string; accessClass: string; canonicalDestination: string; outcomeSummary: string
}
export type WorkspaceData = {
  user_id: string; paused: boolean; premium_available: boolean; items: WorkspaceItem[];
  catalog: CatalogItem[]; has_more: boolean; offset: number; scope: string; review_scope: string
}
export function useWorkspace(query = 'view=recent') {
  return useLearning<WorkspaceData>(`workspace.php?${query}`)
}
