import { useEffect, useState } from 'react'
import type { AccountUser } from '@/lib/accountContext'
import { PROFILE_UPDATED_EVENT } from '@/lib/hostingerApi'

function AccountPhoto({ user }: { user: AccountUser }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!user.photo_complete) return
    let controller: AbortController | undefined
    let photoUrl = ''

    async function loadPhoto() {
      controller?.abort()
      const request = new AbortController()
      controller = request
      try {
        // Bind the private request to this account, including during session changes.
        const response = await fetch('/api/student/photo-view.php', {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'X-CSSV-User': user.id },
          signal: request.signal,
        })
        if (!response.ok || !response.headers.get('Content-Type')?.startsWith('image/')) throw new Error('Photo unavailable')
        const blob = await response.blob()
        if (request.signal.aborted) return
        const nextUrl = URL.createObjectURL(blob)
        if (photoUrl) URL.revokeObjectURL(photoUrl)
        photoUrl = nextUrl
        setSrc(nextUrl)
      } catch {
        if (request.signal.aborted) return
        if (photoUrl) URL.revokeObjectURL(photoUrl)
        photoUrl = ''
        setSrc('')
      }
    }

    void loadPhoto()
    window.addEventListener(PROFILE_UPDATED_EVENT, loadPhoto)
    return () => {
      controller?.abort()
      window.removeEventListener(PROFILE_UPDATED_EVENT, loadPhoto)
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
  }, [user.id, user.photo_complete])

  return <b className="ws-avatar" aria-hidden="true">
    {src ? <img src={src} alt="" width={38} height={38} onError={() => setSrc('')} /> : (user.display_name || 'S').slice(0, 1).toUpperCase()}
  </b>
}

export default function WorkspaceAvatar({ user }: { user: AccountUser | null }) {
  // Remount before painting a different account or a removed photo.
  return user ? <AccountPhoto key={`${user.id}:${Boolean(user.photo_complete)}`} user={user} /> : <b className="ws-avatar" aria-hidden="true">S</b>
}
