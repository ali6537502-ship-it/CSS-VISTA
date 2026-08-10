import { useMemo } from 'react'
import { MessageCircle, Megaphone, CalendarDays } from 'lucide-react'
import { PageHeader, Badge } from '@/components/shared'
import { testSeriesAnnouncements as seed } from '@/data/testSeries'
import { mergedAnnouncements } from '@/lib/admin'
import { mentors, waLink } from '@/data/site'

export default function TestSeries() {
  const announcements = useMemo(() => mergedAnnouncements(seed), [])
  const sadia = mentors[0]

  return (
    <div>
      <PageHeader
        title="Test Series Announcement"
        description="Announcements, posters, schedules, registration details and starting dates for the CSS 2027 Test Series and Grand Mocks. New announcements appear here as they are posted."
      />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        {announcements.length === 0 && (
          <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            No announcements yet. Test-series schedules, posters and registration details will be posted here.
          </p>
        )}
        {announcements.map((a) => (
          <article key={a.id} className="overflow-hidden rounded-xl border bg-white">
            {a.posterUrl && (
              <img src={a.posterUrl} alt={`Poster - ${a.title}`} className="max-h-96 w-full object-contain bg-secondary" />
            )}
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge><Megaphone className="mr-1 h-3 w-3" /> Announcement</Badge>
                <span className="text-xs text-muted-foreground">{a.date}</span>
                {a.startDate && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800">
                    <CalendarDays className="h-3.5 w-3.5" /> Starts: {a.startDate}
                  </span>
                )}
              </div>
              <h2 className="mt-2 font-display text-xl font-bold text-pine">{a.title}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{a.body}</p>
              {a.registrationInfo && (
                <p className="mt-3 rounded-md bg-secondary/70 px-3.5 py-2.5 text-sm font-medium text-foreground">{a.registrationInfo}</p>
              )}
              <a
                href={waLink(sadia.whatsapp, sadia.message)}
                target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-md bg-pine px-5 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-900"
              >
                <MessageCircle className="h-4 w-4" /> Register / Contact - {sadia.whatsappDisplay}
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
