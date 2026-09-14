import DailyEnglishPanel from '@/components/DailyEnglishPanel'
import MyCssVistaDashboard from '@/pages/MyCssVistaDashboard'

export default function MyCssVistaAccountHome() {
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:pt-8">
        <DailyEnglishPanel />
      </div>
      <MyCssVistaDashboard />
    </div>
  )
}
