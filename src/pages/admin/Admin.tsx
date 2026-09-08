import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Lock } from 'lucide-react'
import AdminPanel from './AdminPanel'
import StudentManagementPanelV2 from './StudentManagementPanelV2'

export default function Admin() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [workspace, setWorkspace] = useState<'students' | 'website'>('students')

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

  if (workspace === 'students') {
    return <StudentManagementPanelV2 onOpenWebsiteTools={() => setWorkspace('website')} />
  }

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-5">
        <button
          type="button"
          onClick={() => setWorkspace('students')}
          className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-2 text-sm font-semibold text-pine hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> Student management
        </button>
      </div>
      <AdminPanel />
    </div>
  )
}
