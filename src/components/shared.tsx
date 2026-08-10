import type { ReactNode } from 'react'
import { AlertTriangle, ExternalLink, FileQuestion } from 'lucide-react'

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="pattern-grid border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:py-9">
        <h1 className="font-display text-2xl font-bold tracking-tight text-pine sm:text-3xl">{title}</h1>
        <span className="mt-3 block h-0.5 w-10 rounded-full bg-amber-500" aria-hidden="true" />
        {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{description}</p>}
        {children}
      </div>
    </div>
  )
}

export function Section({ title, description, children, id }: { title: string; description?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-bold text-pine sm:text-2xl">{title}</h2>
      <span className="mt-2 block h-0.5 w-8 rounded-full bg-amber-500" aria-hidden="true" />
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function SourceNote({ source, url, date }: { source: string; url?: string; date?: string }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>Source: {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-emerald-800 hover:underline underline-offset-2">
          {source} <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="font-medium">{source}</span>
      )}</span>
      {date && <span>· Last updated: {date}</span>}
    </p>
  )
}

export function OfficialNotice() {
  return (
    <div className="flex gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Rules and dates may change. Always confirm current information from the official{' '}
        <a href="https://www.fpsc.gov.pk/" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
          FPSC notice
        </a>{' '}
        linked on this page.
      </p>
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-secondary/40 px-6 py-10 text-center">
      <FileQuestion className="h-8 w-8 text-muted-foreground/60" />
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 max-w-md text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'gold' | 'gray' | 'red' }) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-900',
    gold: 'bg-amber-100 text-amber-900',
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-100 text-red-800',
  }
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>
}
