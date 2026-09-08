import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Lock } from 'lucide-react'
import AdminPanel from './AdminPanel'

export default function Admin() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    void fetch('/api/admin-auth/session.php', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error('Private admin sign-in required.')
        if (active) setReady(true)
      })
      .catch(() => {
        if (active) navigate('/admin/login', { replace: true })
      })
    return () => { active = false }
  }, [navigate])

  if (!ready) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center">
        <div className="rounded-xl border bg-white p-6">
          <Lock className="mx-auto h-8 w-8 animate-pulse text-pine" />
          <h1 className="mt-3 font-display text-xl font-bold text-pine">Checking private admin access</h1>
        </div>
      </div>
    )
  }

  return <AdminPanel />
}
