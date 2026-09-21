import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BookOpenCheck, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { essayThemeIndex, totalCheckpoints, type EssayThemeSummary } from '@/data/essayThemes'
import { countsUnderPrefixes, onStudyProgressChange, storageAvailable } from '@/lib/studyProgress'
import { THEME_AREA } from '@/features/essay-themes/progress'
import { ProgressRing, TierBadge } from '@/features/essay-themes/ui'

const themePrefix = (slug: string) => `${THEME_AREA}:${slug}:`

/**
 * The roadmap holds over 2,600 directions, so a whole-number percentage sits
 * at "0%" for the first twenty-five ticks and reads as though nothing saved.
 * One decimal below 10% keeps early progress visible without implying
 * precision the figure does not have.
 */
function formatPercent(percent: number): string {
  if (percent <= 0) return '0%'
  if (percent >= 10) return `${Math.round(percent)}%`
  return `${percent.toFixed(1)}%`
}

function ThemeCard({ theme, done }: { theme: EssayThemeSummary; done: number }) {
  const percent = theme.checkpointCount ? Math.round((Math.min(done, theme.checkpointCount) / theme.checkpointCount) * 100) : 0
  return (
    <Link
      to={`/study-material/essay-themes/${theme.slug}`}
      className="group flex gap-3 rounded-xl border bg-white p-3.5 transition-colors hover:border-emerald-700/50 hover:bg-emerald-50/30"
    >
      <ProgressRing percent={percent} label={`${percent}% complete`} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-bold tabular-nums text-muted-foreground">{theme.number}</span>
          <TierBadge tier={theme.tier} />
        </span>
        <span className="mt-1 block text-[15px] font-semibold leading-snug text-pine group-hover:underline underline-offset-2">
          {theme.name}
        </span>
        <span className="mt-1 block line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{theme.brief}</span>
        <span className="mt-1.5 block text-[11px] font-medium text-muted-foreground tabular-nums">
          {Math.min(done, theme.checkpointCount)} of {theme.checkpointCount} directions done
        </span>
      </span>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

export default function EssayThemes() {
  const themes = essayThemeIndex()
  const total = totalCheckpoints()
  const [query, setQuery] = useState('')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [persistent, setPersistent] = useState(true)

  const prefixes = useMemo(() => themes.map((theme) => themePrefix(theme.slug)), [themes])

  useEffect(() => {
    const refresh = () => setCounts(countsUnderPrefixes(prefixes))
    refresh()
    setPersistent(storageAvailable())
    return onStudyProgressChange(refresh)
  }, [prefixes])

  const doneFor = (theme: EssayThemeSummary) => Math.min(counts[themePrefix(theme.slug)] ?? 0, theme.checkpointCount)
  const overallDone = themes.reduce((sum, theme) => sum + doneFor(theme), 0)
  const overallPercent = total ? (overallDone / total) * 100 : 0
  const completedThemes = themes.filter((theme) => doneFor(theme) === theme.checkpointCount && theme.checkpointCount > 0).length
  const startedThemes = themes.filter((theme) => doneFor(theme) > 0).length

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return themes
    return themes.filter((theme) =>
      theme.name.toLowerCase().includes(needle)
      || theme.brief.toLowerCase().includes(needle)
      || theme.sections.some((section) => section.title.toLowerCase().includes(needle)))
  }, [themes, query])

  const tierA = filtered.filter((theme) => theme.tier === 'A')
  const tierB = filtered.filter((theme) => theme.tier !== 'A')

  return (
    <div>
      <PageHeader
        title="Essay Themes 2027 — Research Roadmap"
        description="Twenty-five priority essay themes, each broken into thirteen research stages from concepts and origins to Pakistan evidence, counterarguments, reforms and title banks. Tick each direction as you complete it and the roadmap keeps your place."
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Overall progress', value: formatPercent(overallPercent), hint: `${overallDone} of ${total} directions` },
            { label: 'Themes started', value: `${startedThemes}`, hint: `of ${themes.length} themes` },
            { label: 'Themes completed', value: `${completedThemes}`, hint: `of ${themes.length} themes` },
            { label: 'Research directions', value: `${total}`, hint: 'across 13 stages each' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-white p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-pine">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.hint}</p>
            </div>
          ))}
        </div>

        {!persistent && (
          <p role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            This browser is blocking site storage, so your ticks will not be kept after you leave. Allow site data for css-vista.com to save your progress.
          </p>
        )}

        <div className="relative mt-5">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search themes and research stages…"
            aria-label="Search essay themes"
            className="h-10 w-full rounded-lg border border-input bg-white pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {filtered.length === 0 && (
          <p className="mt-6 rounded-lg border border-dashed bg-secondary/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No theme matches “{query}”.
          </p>
        )}

        {[
          { tier: 'A', list: tierA, title: 'Tier A — priority themes', note: 'Build these first; they carry the heaviest examination weight.' },
          { tier: 'B', list: tierB, title: 'Tier B — second band', note: 'Prepare after Tier A, reusing evidence already collected.' },
        ].filter((group) => group.list.length > 0).map((group) => (
          <div key={group.tier} className="mt-7">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="font-display text-lg font-bold text-pine">{group.title}</h2>
              <p className="text-[12px] text-muted-foreground">{group.note}</p>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.list.map((theme) => <ThemeCard key={theme.slug} theme={theme} done={doneFor(theme)} />)}
            </div>
          </div>
        ))}

        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
          <BookOpenCheck className="h-5 w-5 shrink-0 text-emerald-800" />
          <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
            The roadmap gives research directions, not ready-made notes. Verify every statistic, law and quotation against a primary source before you use it.
          </p>
          <Link to="/essay" className="text-[13px] font-semibold text-emerald-800 hover:underline underline-offset-2">
            Essay writing module →
          </Link>
        </div>
      </div>
    </div>
  )
}
