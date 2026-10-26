import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Lock } from 'lucide-react'
import DailyPdfManager from '@/features/daily-pdf/Manager'
import CurrentAffairsAdmin from '@/features/current-affairs/Admin'
import AdminPanel from './AdminPanel'
import AccountMailPanel from './AccountMailPanel'
import StudentManagementPanelV2 from './StudentManagementPanelV2'
import MptAdminPanel from './MptAdminPanel'
import AiUsagePanel from './AiUsagePanel'
import PaymentsPanel from './PaymentsPanel'
import TopicsPanel from './TopicsPanel'
import LuckyDrawPanel from './LuckyDrawPanel'

export default function Admin() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [workspace, setWorkspace] = useState<'daily-pdf' | 'students' | 'website' | 'briefing' | 'mail' | 'mpt' | 'payments' | 'ai-usage' | 'topics' | 'lucky-draw'>('students')

  useEffect(() => {
    let active = true
    void fetch('/api/admin-auth/session.php', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error('Private admin sign-in required.')
        if (active) setReady(true)
      })
      .catch(() => {
        if (active) navigate('/sadiaali/login', { replace: true })
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
    return <><div className="mx-auto max-w-7xl px-4 pt-5"><button type="button" onClick={() => setWorkspace('briefing')} className="min-h-11 rounded-md border bg-white px-4 text-sm font-semibold text-pine">Daily briefing publications</button><button type="button" onClick={() => setWorkspace('topics')} className="ml-2 min-h-11 rounded-md border bg-white px-4 text-sm font-semibold text-pine">Pro topic learning</button><button type="button" onClick={() => setWorkspace('mail')} className="ml-2 min-h-11 rounded-md border bg-white px-4 text-sm font-semibold text-pine">Account emails</button><button type="button" onClick={() => setWorkspace('mpt')} className="ml-2 min-h-11 rounded-md border bg-white px-4 text-sm font-semibold text-pine">MPT examinations</button><button type="button" onClick={() => setWorkspace('payments')} className="ml-2 min-h-11 rounded-md border bg-white px-4 text-sm font-semibold text-pine">Membership payments</button><button type="button" onClick={() => setWorkspace('ai-usage')} className="ml-2 min-h-11 rounded-md border bg-white px-4 text-sm font-semibold text-pine">AI usage</button></div><div className="mx-auto max-w-7xl px-4 pt-4"><button className="min-h-11 rounded-md border px-4" onClick={() => setWorkspace('daily-pdf')}>Current Affairs Daily — PDF Manager</button></div><div className="mx-auto max-w-7xl px-4 pt-4"><button type="button" onClick={() => setWorkspace('lucky-draw')} className="min-h-11 rounded-md border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-pine">Lucky Draw Manager · Applications & Winners</button></div><StudentManagementPanelV2 onOpenWebsiteTools={() => setWorkspace('website')} /></>
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
      {workspace === 'daily-pdf' ? <DailyPdfManager /> : workspace === 'topics' ? <TopicsPanel /> : workspace === 'briefing' ? <CurrentAffairsAdmin /> : workspace === 'mail' ? <AccountMailPanel /> : workspace === 'mpt' ? <MptAdminPanel /> : workspace === 'payments' ? <PaymentsPanel /> : workspace === 'ai-usage' ? <AiUsagePanel /> : workspace === 'lucky-draw' ? <LuckyDrawPanel /> : <AdminPanel />}
    </div>
  )
}
