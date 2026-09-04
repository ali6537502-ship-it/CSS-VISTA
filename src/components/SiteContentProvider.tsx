import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { accountServiceConfigured, getSupabaseClient } from '@/lib/supabase'
import { useAccount } from '@/lib/accountContext'
import { scheduleIdleWork } from '@/lib/idle'

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { user } = useAccount()
  const location = useLocation()
  const contentInitialised = useRef(false)

  useEffect(() => {
    if (!accountServiceConfigured || contentInitialised.current) return
    // Public pages render from static/local content immediately. The cloud CMS
    // refresh is deliberately deferred so anonymous mobile visitors do not
    // download and initialise Supabase during the critical first-load window.
    const contentCriticalRoute = /^\/admin(?:\/|$)/.test(location.pathname)
    return scheduleIdleWork(
      () => {
        if (contentInitialised.current) return
        contentInitialised.current = true
        void import('@/lib/admin')
          .then(({ initialiseCloudAdminContent }) => initialiseCloudAdminContent())
          .catch(() => {
            // Static/local content remains available when the optional CMS
            // runtime or network cannot be loaded.
          })
      },
      {
        timeout: contentCriticalRoute ? 1_800 : 15_000,
        fallbackDelay: contentCriticalRoute ? 0 : 6_000,
        immediate: contentCriticalRoute,
      },
    )
  }, [location.pathname])

  useEffect(() => {
    // Public visitors do not need a realtime subscription. Authenticated admins
    // receive immediate published-content refreshes without adding public load.
    if (!accountServiceConfigured || !user) return
    let active = true
    let removeChannel: (() => Promise<unknown>) | undefined
    void getSupabaseClient().then(async (client) => {
      if (!active || !client) return
      const { data: isAdmin } = await client.rpc('is_css_vista_admin')
      if (!active || isAdmin !== true) return
      const channel = client
        .channel('css-vista-published-content')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_content', filter: 'id=eq.published' }, () => {
          void import('@/lib/admin')
            .then(({ refreshCloudAdminContent }) => refreshCloudAdminContent())
            .catch(() => undefined)
        })
        .subscribe()
      removeChannel = () => client.removeChannel(channel)
    })
    return () => {
      active = false
      if (removeChannel) void removeChannel()
    }
  }, [user])

  return children
}
