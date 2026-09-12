import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PageHeader, SourceNote, Badge } from '@/components/shared'
import { serviceGroups, servicesSource } from '@/data/services'

export default function Services() {
  // The group lived in component state, so twelve content-rich profiles had no
  // shareable link and no distinct surface for search engines.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('group')
  const active = serviceGroups.some((group) => group.slug === requested) ? requested! : serviceGroups[0].slug
  const svc = serviceGroups.find((s) => s.slug === active)!

  function setActive(slug: string) {
    const next = new URLSearchParams(searchParams)
    next.set('group', slug)
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${svc.name} - CSS Occupational Groups | CSS Vista`
    return () => { document.title = previousTitle }
  }, [svc.name])

  return (
    <div>
      <PageHeader title="CSS Services Guide" description="The twelve occupational groups explained honestly - role, postings, training, skills and challenges. No service is ranked “best”; the right group depends on your aptitude and preferences." />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="space-y-1 lg:sticky lg:top-20 lg:self-start">
            {serviceGroups.map((s) => (
              <button
                key={s.slug}
                onClick={() => setActive(s.slug)}
                className={`block w-full rounded-md px-3.5 py-2.5 text-left text-sm transition-colors ${active === s.slug ? 'bg-pine font-medium text-emerald-50' : 'bg-secondary hover:bg-emerald-100'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div id={svc.slug} className="rounded-lg border bg-white p-6 lg:col-span-3">
            <h2 className="font-display text-2xl font-bold text-pine">{svc.name}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">{svc.role}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ['Nature of work', svc.work],
                ['Typical postings', svc.postings],
                ['Training', svc.training],
                ['Skills useful for this group', svc.skills],
                ['Possible challenges', svc.challenges],
                ['Common misconception', svc.misconceptions],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-secondary/60 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-pine">{label}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5"><Badge tone="gold">Verify the current group structure from the official CSS Rules</Badge></div>
            <p className="mt-6 rounded-lg border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          Preparing your service preferences for the interview?{' '}
          <Link to="/psych-viva" className="font-semibold text-emerald-800 underline underline-offset-2">
            Work through the service-group awareness worksheet
          </Link>{' '}
          on the Psychological Assessment &amp; Viva page.
        </p>
        <SourceNote source={servicesSource.name} url={servicesSource.url} date={servicesSource.lastUpdated} />
          </div>
        </div>
      </div>
    </div>
  )
}
