import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ExternalLink, Download } from 'lucide-react'
import { PageHeader, Section, Badge, OfficialNotice } from '@/components/shared'
import { css2027ScheduleSource, notifications2027 as seedNotifs, css2027Dates as seedDates, type FpscNotification2027 } from '@/data/css2027'
import { mergedNotifications, mergedDates } from '@/lib/admin'
import { css2026WrittenResult } from '@/data/css2026Result'

const notifCats: (FpscNotification2027['category'] | 'All')[] = [
  'All', 'MPT Advertisement', 'MPT Applications', 'MPT Examination', 'MPT Result',
  'Written Applications', 'Written Examination', 'Admission Certificate',
  'Rules & Eligibility', 'Psychological Assessment', 'Viva Voce', 'Final Result', 'General',
]

const statusTone = { Official: 'green', Tentative: 'gold', 'To Be Announced': 'gray' } as const

function formatDate(iso: string) {
  if (!iso) return 'No date recorded here.'
  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  }).format(new Date(`${iso}T00:00:00+05:00`))
}

export default function FpscUpdates() {
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') === 'dates' ? 'dates' : 'notifs'
  const setTab = (t: 'notifs' | 'dates') => setSp(t === 'dates' ? { tab: 'dates' } : {})
  const [cat, setCat] = useState<(typeof notifCats)[number]>('All')
  const notifs = useMemo(() => mergedNotifications(seedNotifs), [])
  const dates = useMemo(() => mergedDates(seedDates), [])
  const filtered = notifs.filter((n) => cat === 'All' || n.category === cat)

  return (
    <div data-cssv-ad-state={tab === 'notifs' && !filtered.length ? 'empty' : undefined}>
      <PageHeader title="FPSC Notifications & CSS Results" description="Recorded FPSC notices, CSS results and schedule dates. Check the official source for later changes." />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <OfficialNotice />

        <aside aria-label="Schedule source and currency" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
          <p>The bundled CSS 2027 schedule was last checked on <time dateTime={css2027ScheduleSource.lastVerified}>{formatDate(css2027ScheduleSource.lastVerified)}</time>. This is a notice archive; later announcements or changes may not be included. A missing entry means no date is recorded here, rather than confirmation that FPSC has made no announcement.</p>
          <a href="https://www.fpsc.gov.pk/" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold underline underline-offset-2">Check the latest notices at FPSC <ExternalLink className="h-3.5 w-3.5" /></a>
        </aside>

        <article className="overflow-hidden rounded-2xl border border-emerald-900/15 bg-white shadow-sm">
          <div className="border-b border-emerald-900/10 bg-emerald-950 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-50">
            CSS 2026 written result
          </div>
          <div className="p-5 sm:flex sm:items-center sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-700">Announced {css2026WrittenResult.announcedDateLabel}</p>
              <h2 className="mt-1 text-xl font-black text-emerald-950">CSS 2026 Written Result - Qualified Candidates</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">The complete {css2026WrittenResult.pageCount}-page list contains {css2026WrittenResult.qualifiedCandidates} candidates who qualified the written portion.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0">
              <Link to={css2026WrittenResult.pagePath} className="inline-flex min-h-10 items-center rounded-lg bg-pine px-4 py-2 text-sm font-bold text-emerald-50 hover:bg-emerald-900">View result</Link>
              <a href={css2026WrittenResult.pdfUrl} download={css2026WrittenResult.downloadFilename} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-bold text-pine hover:bg-secondary"><Download className="h-4 w-4" /> Download</a>
            </div>
          </div>
        </article>

        <div className="flex gap-2 border-b">
          {([['notifs', 'FPSC Notifications - CSS 2027'], ['dates', 'CSS 2027 Important Dates']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === id ? 'border-emerald-800 text-pine' : 'border-transparent text-muted-foreground hover:text-pine'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'notifs' && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {notifCats.map((c) => (
                <button key={c} onClick={() => setCat(c)} className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${cat === c ? 'bg-pine text-emerald-50' : 'bg-secondary'}`}>{c}</button>
              ))}
            </div>
            <div className="space-y-3">
              {filtered.map((n) => (
                <div key={n.id} className="rounded-lg border bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={n.category === 'Rules & Eligibility' ? 'green' : 'gray'}>{n.category}</Badge>
                    {n.date && <span className="text-xs text-muted-foreground">Date: {formatDate(n.date)}</span>}
                  </div>
                  <h3 className="mt-2 font-semibold text-foreground">{n.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={n.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-pine px-3.5 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
                      View official source <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {n.officialUrl.toLowerCase().endsWith('.pdf') && (
                      <a href={n.officialUrl} download className="inline-flex items-center gap-1 rounded-md border px-3.5 py-2 text-sm font-medium hover:bg-secondary">
                        <Download className="h-4 w-4" /> Download PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No notices are recorded in this category. Check the official FPSC source above for later announcements.
                </p>
              )}
            </div>
          </>
        )}

        {tab === 'dates' && (
          <Section title="CSS 2027 Important Dates" description="Statuses describe the recorded notices: Official = confirmed in the source · Tentative = published subject to change · Not recorded here = this archive has no date. Check FPSC for subsequent announcements; no dates are estimated.">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-2.5">Item</th><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Status</th></tr>
                </thead>
                <tbody>
                  {dates.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-4 py-3 font-medium text-foreground">{d.item}</td>
                      <td className="px-4 py-3 text-foreground/85">{formatDate(d.date)}</td>
                      <td className="px-4 py-3"><Badge tone={statusTone[d.status]}>{d.status === 'To Be Announced' ? 'Not recorded here' : d.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>
                Advance notice published {formatDate(css2027ScheduleSource.published)}. Tentative dates remain subject to change.
              </p>
              <a href={css2027ScheduleSource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline underline-offset-2">
                View FPSC advance notice <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
