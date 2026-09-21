import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, ChevronDown, Info } from 'lucide-react'
import {
  essayThemeIndex, findThemeSummary, loadEssayThemeRoadmap, themeCheckpointIds,
  type EssayTheme, type EssayThemeRoadmap,
} from '@/data/essayThemes'
import { pruneStaleTicks } from '@/lib/studyProgress'
import { THEME_AREA, checkpointKey, completionOf, useTickedIds } from '@/features/essay-themes/progress'
import { ProgressBar, ProgressRing, TierBadge } from '@/features/essay-themes/ui'
import { ThemeSectionBlock } from '@/features/essay-themes/ThemeSection'

/**
 * The roadmap states its universal rules once and applies them to every theme.
 * Repeating them inside all 25 theme files is exactly what the document set out
 * to avoid, so they are rendered here as one collapsed layer instead.
 */
function UniversalModules({ roadmap }: { roadmap: EssayThemeRoadmap }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        <Info className="h-4 w-4 shrink-0 text-emerald-800" />
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-emerald-950">
          Universal research rules — apply to this and every other theme
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-emerald-800 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-emerald-200/70 px-3.5 py-3">
          {roadmap.universal.map((module) => (
            <div key={module.heading}>
              <h3 className="text-[13px] font-bold text-pine">{module.heading}</h3>
              {module.intro && <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{module.intro}</p>}
              {module.groups.map((group) => (
                <div key={group.heading} className="mt-2.5">
                  <p className="text-[12px] font-semibold text-emerald-900">{group.heading}</p>
                  {group.items.length > 0 && (
                    <ul className="mt-1 space-y-1">
                      {group.items.map((item) => (
                        <li key={item} className="flex gap-1.5 text-[12px] leading-relaxed text-foreground/80">
                          <span aria-hidden="true" className="text-emerald-700">·</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EssayThemeDetail() {
  const { slug = '' } = useParams()
  const summary = findThemeSummary(slug)
  const [roadmap, setRoadmap] = useState<EssayThemeRoadmap | null>(null)
  const [failed, setFailed] = useState(false)
  const { ticked, toggle, setMany } = useTickedIds()

  useEffect(() => {
    if (!summary) return
    const controller = new AbortController()
    setFailed(false)
    loadEssayThemeRoadmap(controller.signal)
      .then(setRoadmap)
      .catch((error: unknown) => {
        if ((error as Error)?.name !== 'AbortError') setFailed(true)
      })
    return () => controller.abort()
  }, [summary])

  const theme: EssayTheme | null = useMemo(
    () => roadmap?.themes.find((item) => item.slug === slug) ?? null,
    [roadmap, slug],
  )

  // A corrected source document can retire a direction. Drop ticks whose
  // checkpoint no longer exists so the theme can still reach 100%.
  useEffect(() => {
    if (!theme) return
    const valid = new Set(themeCheckpointIds(theme).map((id) => checkpointKey(theme.slug, id)))
    pruneStaleTicks(`${THEME_AREA}:${theme.slug}:`, valid)
  }, [theme])

  const allKeys = useMemo(
    () => (theme ? themeCheckpointIds(theme).map((id) => checkpointKey(theme.slug, id)) : []),
    [theme],
  )
  const completion = completionOf(allKeys, ticked)

  const all = essayThemeIndex()
  const position = all.findIndex((item) => item.slug === slug)
  const previous = position > 0 ? all[position - 1] : null
  const next = position >= 0 && position < all.length - 1 ? all[position + 1] : null

  if (!summary) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-pine">Theme not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This essay theme is not part of the 2027 roadmap.</p>
        <Link to="/study-material/essay-themes" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-emerald-50">
          <ArrowLeft className="h-4 w-4" /> All essay themes
        </Link>
      </main>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <Link to="/study-material/essay-themes" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-800 hover:underline underline-offset-2">
        <ArrowLeft className="h-3.5 w-3.5" /> All essay themes
      </Link>

      <header className="mt-3 rounded-xl border bg-white p-4">
        <div className="flex items-start gap-3.5">
          <ProgressRing percent={completion.percent} size={52} label={`${completion.percent}% complete`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold tabular-nums text-muted-foreground">Theme {summary.number}</span>
              <TierBadge tier={summary.tier} />
            </div>
            <h1 className="mt-0.5 font-display text-xl font-bold leading-tight text-pine sm:text-2xl">{summary.name}</h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{summary.brief}</p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar percent={completion.percent} />
          <p className="mt-1.5 text-[12px] font-medium tabular-nums text-muted-foreground">
            {completion.done} of {completion.total || summary.checkpointCount} research directions completed
          </p>
        </div>
        <nav aria-label="Research stages" className="mt-3 flex flex-wrap gap-1">
          {summary.sections.map((section) => (
            <a
              key={section.letter}
              href={`#section-${section.letter}`}
              title={section.title}
              className="rounded border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:border-emerald-700/50 hover:bg-emerald-50 hover:text-emerald-900"
            >
              {section.letter}
            </a>
          ))}
        </nav>
      </header>

      {roadmap && <div className="mt-3"><UniversalModules roadmap={roadmap} /></div>}

      {failed && (
        <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          The full roadmap could not be downloaded. Check your connection and reload the page.
        </p>
      )}

      {!roadmap && !failed && (
        <div className="mt-3 space-y-2" aria-hidden="true">
          {summary.sections.map((section) => (
            <div key={section.letter} className="h-14 animate-pulse rounded-xl border bg-white/60" />
          ))}
        </div>
      )}

      {theme && (
        <div className="mt-3 space-y-2.5">
          {theme.sections.map((section, position) => (
            <ThemeSectionBlock
              key={section.letter}
              section={section}
              themeSlug={theme.slug}
              themeName={theme.name}
              ticked={ticked}
              toggle={toggle}
              setMany={setMany}
              evidenceFields={roadmap?.evidenceCardFields ?? []}
              defaultOpen={position === 0}
            />
          ))}
        </div>
      )}

      <nav aria-label="Adjacent themes" className="mt-5 flex items-stretch justify-between gap-3">
        {previous ? (
          <Link to={`/study-material/essay-themes/${previous.slug}`} className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-3 py-2.5 hover:border-emerald-700/50">
            <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Theme {previous.number}</span>
              <span className="block truncate text-[13px] font-semibold text-pine group-hover:underline underline-offset-2">{previous.name}</span>
            </span>
          </Link>
        ) : <span className="flex-1" />}
        {next ? (
          <Link to={`/study-material/essay-themes/${next.slug}`} className="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded-lg border bg-white px-3 py-2.5 text-right hover:border-emerald-700/50">
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Theme {next.number}</span>
              <span className="block truncate text-[13px] font-semibold text-pine group-hover:underline underline-offset-2">{next.name}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ) : <span className="flex-1" />}
      </nav>
    </div>
  )
}
