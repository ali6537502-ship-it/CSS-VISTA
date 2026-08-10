import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { AccountProvider } from './components/AccountProvider.tsx'
import { SiteContentProvider } from './components/SiteContentProvider.tsx'

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

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The site remains fully usable if service-worker registration is blocked.
    })
  })
} else if ('serviceWorker' in navigator) {
  // A production preview may previously have registered a worker on localhost.
  // Remove it during development so stale cached chunks cannot mask live edits.
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => void registration.unregister())
  })
}
