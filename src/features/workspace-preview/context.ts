import { createContext, useContext } from 'react'
export type WorkspacePreviewState = { enabled: boolean; pending: boolean }
export const WorkspacePreviewContext = createContext<WorkspacePreviewState>({ enabled: false, pending: false })
export function useWorkspacePreview() { return useContext(WorkspacePreviewContext) }
