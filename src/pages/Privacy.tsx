import { ExternalLink, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared'

export default function Privacy() {
  return (
    <div>
      <PageHeader
        title="Privacy, Cookies & Advertising"
        description="How CSS Vista handles account data, local study preferences, advertising technology and consent."
      />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 text-sm leading-relaxed text-foreground/85">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-800" />
            <div>
              <h2 className="font-display text-xl font-bold text-pine">Content and examinations come first</h2>
              <p className="mt-2">CSS Vista does not place site-managed advertising on the homepage, mocks, timed examinations, question screens, results, account areas, private study dashboards, payment or inquiry workflows, error pages, loading screens, or legal pages including this one.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-pine">Information used by CSS Vista</h2>
          <p className="mt-2">Guest study preferences and progress may be kept in browser storage so features work on the current device. If you choose to sign in, account and study-progress information may be synchronised through CSS Vista&apos;s account service. Advertising logic does not read or transmit answers, scores, study plans, account details, or other private academic information.</p>
          <p className="mt-3">VISTA Exam Intelligence uses only the student&apos;s own recorded study activity—such as question outcomes, subjects, topics, revision schedules, mock results and measured study sessions—to calculate private preparation summaries and recommendations. It does not manufacture marks or readiness data. Signed-in records are restricted to their owner through database access policies; guest records remain on the current device. This private analysis is excluded from site-managed advertising.</p>
        </section>

        <section className="rounded-2xl border bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-pine">Google AdSense</h2>
          <p className="mt-2">Eligible informational pages may use Google AdSense, publisher ID <span className="font-mono text-xs">ca-pub-6131271603014611</span>. Google and its advertising partners may use cookies or similar storage to deliver, limit, measure, and protect advertising. Depending on region, consent and account settings, advertising may be personalised, non-personalised, limited, or unavailable.</p>
          <p className="mt-3">CSS Vista does not use answers, scores, study plans or account details to decide when an advertisement is available. Auto-ad formats and their frequency are controlled through the connected AdSense account. A manual in-content unit is requested only when a valid Google-issued slot has been configured for an eligible public content page.</p>
          <a className="mt-3 inline-flex items-center gap-1 font-semibold text-emerald-800 underline underline-offset-2" href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
            How Google uses information for advertising <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        <section className="rounded-2xl border bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-pine">Consent and regional choices</h2>
          <p className="mt-2">Where consent is legally or contractually required, the site owner must activate and maintain a Google-certified consent-management platform connected to AdSense. In particular, Google requires an appropriately certified CMP for serving personalised ads in the EEA, the United Kingdom and Switzerland. CSS Vista does not create a consent record unless the approved consent system has actually collected it.</p>
          <p className="mt-3">When the approved privacy message is active, its privacy control should let eligible visitors revisit or revoke their choices. Browser controls can also clear or restrict cookies and local storage, although doing so may affect saved guest preferences.</p>
        </section>

        <section className="rounded-2xl border bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-pine">Advertising safety</h2>
          <p className="mt-2">Advertisements are separated from navigation, questions, answers, download controls and purchases. CSS Vista does not ask students to click advertisements, does not use a custom floating advertisement window or custom close button, and does not require advertising interaction to continue studying.</p>
        </section>

        <p className="text-xs text-muted-foreground">Last updated: 4 September 2026. Material changes to advertising or data handling should be reflected on this page before release.</p>
      </main>
    </div>
  )
}
