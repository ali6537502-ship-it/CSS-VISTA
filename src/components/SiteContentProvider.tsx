import { useEffect, type ReactNode } from 'react'
import { accountServiceConfigured, getSupabaseClient } from '@/lib/supabase'
import { initialiseCloudAdminContent, refreshCloudAdminContent } from '@/lib/admin'
import { useAccount } from '@/lib/accountContext'

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { user } = useAccount()

  useEffect(() => {
    if (!accountServiceConfigured) return
    // Render the static learning platform immediately; refresh the small CMS
    // overlay in the background so a slow network never blocks the first screen.
    void initialiseCloudAdminContent()
  }, [])

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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_content', filter: 'id=eq.published' }, () => void refreshCloudAdminContent())
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
