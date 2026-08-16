import { useEffect, type ReactNode } from 'react'
import { accountServiceConfigured, getSupabaseClient } from '@/lib/supabase'
import { initialiseCloudAdminContent, refreshCloudAdminContent } from '@/lib/admin'
import { useAccount } from '@/lib/accountContext'

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { user } = useAccount()

  useEffect(() => {
    if (!accountServiceConfigured) return
    // Static academic content renders immediately; the small CMS overlay is
    // refreshed in the background and cached for temporary outages.
    void initialiseCloudAdminContent()
  }, [])

  useEffect(() => {
    // Keep public traffic off Realtime so the site remains free-tier friendly.
    // Only an authenticated owner/admin needs an immediate CMS refresh.
    if (!accountServiceConfigured || !user) return
    let active = true
    let removeChannel: (() => Promise<unknown>) | undefined

    void getSupabaseClient().then(async (client) => {
      if (!active || !client) return
      const { data: isAdmin } = await client.rpc('is_css_vista_admin')
      if (!active || isAdmin !== true) return
      const channel = client
        .channel('css-vista-published-content')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_content', filter: 'id=eq.published' },
          () => void refreshCloudAdminContent(),
        )
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
