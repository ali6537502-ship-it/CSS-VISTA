import MyCssVistaNav from '@/components/MyCssVistaNav'
import DailyEnglishPanel from '@/components/DailyEnglishPanel'

export default function MyCssVistaEnglishPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <MyCssVistaNav />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <DailyEnglishPanel />
      </div>
    </main>
  )
}
