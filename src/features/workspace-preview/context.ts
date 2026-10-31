import { createContext, useContext } from 'react'
export type WorkspacePreviewState = { enabled: boolean; pending: boolean; entryEnabled: boolean; entryPending: boolean }
export const WorkspacePreviewContext = createContext<WorkspacePreviewState>({ enabled: false, pending: false, entryEnabled: false, entryPending: false })
export function useWorkspacePreview() { return useContext(WorkspacePreviewContext) }
