import { useEffect, useState, type ReactNode } from 'react'
import { accountServiceConfigured } from '@/lib/supabase'
import { initialiseCloudAdminContent } from '@/lib/admin'

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!accountServiceConfigured)

  useEffect(() => {
    if (!accountServiceConfigured) return
    let active = true
    initialiseCloudAdminContent().finally(() => {
      if (active) setReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7faf8] px-6">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-800" />
          <p className="mt-3 text-sm font-medium text-emerald-950">Loading CSS Vista…</p>
        </div>
      </div>
    )
  }

  return children
}
