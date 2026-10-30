import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { AccountProvider } from './components/AccountProvider.tsx'
import { SiteContentProvider } from './components/SiteContentProvider.tsx'
import { installChunkRecovery } from './lib/chunkRecovery.ts'
import { useAccount } from './lib/accountContext.ts'
import WorkspacePreviewProvider from './features/workspace-preview/WorkspacePreviewProvider.tsx'
import { ProReleaseProvider } from './features/membership/ProRelease.tsx'

installChunkRecovery()

const TaskReminderOverlay = lazy(() => import('./components/TaskReminderOverlay.tsx'))

function SignedInTaskReminderOverlay() {
  const { user } = useAccount()
  if (!user) return null
  return <Suspense fallback={null}><TaskReminderOverlay /></Suspense>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AccountProvider>
        <WorkspacePreviewProvider><SiteContentProvider>
          <ProReleaseProvider><App /></ProReleaseProvider>
          <SignedInTaskReminderOverlay />
        </SiteContentProvider></WorkspacePreviewProvider>
      </AccountProvider>
    </BrowserRouter>
  </StrictMode>,
)
