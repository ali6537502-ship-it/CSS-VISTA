import { Clock3, Video } from 'lucide-react'
import { PageHeader } from '@/components/shared'

export default function Lectures() {
  return (
    <div>
      <PageHeader title="CSS Vista Lectures" description="The lecture library is being prepared." />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-2xl border bg-white p-8 text-center shadow-sm sm:p-14">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-pine text-white"><Video className="h-7 w-7" /></span>
          <h1 className="mt-5 font-display text-2xl font-bold text-pine sm:text-3xl">CSS VISTA TEAM WORKING ON IT</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Have patience—you will get everything.</p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800"><Clock3 className="h-4 w-4" /> Complete lecture library in preparation</p>
        </section>
      </main>
    </div>
  )
}
