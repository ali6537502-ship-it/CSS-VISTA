import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { AccountProvider } from './components/AccountProvider.tsx'
import { SiteContentProvider } from './components/SiteContentProvider.tsx'
import { installChunkRecovery } from './lib/chunkRecovery.ts'

installChunkRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountProvider>
      <SiteContentProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SiteContentProvider>
    </AccountProvider>
  </StrictMode>,
)
