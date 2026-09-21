/**
 * Essay Themes 2027 research roadmap.
 *
 * Generated from data-archive/essay-themes/essay-themes-2027-roadmap.docx by
 * scripts/import_essay_themes.py, so the shipped data and the source document
 * cannot drift. `npm run audit:essay-themes` fails the build if they do.
 *
 * The full roadmap is ~430 KB, so it is a public asset fetched when a student
 * opens a theme. The bundled index carries only what the theme list needs
 * (names, tiers, briefs, section titles and counts), which keeps the first
 * paint free of a network round trip.
 */
import indexJson from './bundled/essay-themes-index.json'

/** How a section's items should be read, and therefore rendered. */
export type SectionKind =
  | 'terms' | 'frameworks' | 'dimensions' | 'indicators'
  | 'documents' | 'sources' | 'titles' | 'search' | 'directions'

export interface Checkpoint {
  /** Content-derived, so a corrected document keeps existing ticks. */
  id: string
  text: string
  /** Present on `dimensions`: the dimension this detail belongs to. */
  label?: string
}

export interface ThemeSection {
  letter: string
  title: string
  instruction: string
  kind: SectionKind
  items: Checkpoint[]
}

export interface EssayTheme {
  number: number
  slug: string
  name: string
  tier: string
  brief: string
  checkpointCount: number
  sections: ThemeSection[]
}

export interface UniversalGroup {
  heading: string
  items: string[]
}

export interface UniversalModule {
  heading: string
  intro?: string
  groups: UniversalGroup[]
}

export interface EssayThemeRoadmap {
  generatedFrom: string
  title: string
  /** Column headings of the roadmap's Evidence Capture Card. */
  evidenceCardFields: string[]
  /** Research rules the document states once and applies to every theme. */
  universal: UniversalModule[]
  themes: EssayTheme[]
}

export interface ThemeSectionSummary {
  letter: string
  title: string
  kind: SectionKind
  count: number
}

export interface EssayThemeSummary {
  number: number
  slug: string
  name: string
  tier: string
  brief: string
  checkpointCount: number
  sections: ThemeSectionSummary[]
}

interface ThemeIndex {
  title: string
  themes: EssayThemeSummary[]
}

const themeIndex = indexJson as ThemeIndex

/** Theme list, available synchronously for first paint and prerender. */
export function essayThemeIndex(): EssayThemeSummary[] {
  return themeIndex.themes
}

export function essayThemeIndexTitle(): string {
  return themeIndex.title
}

export function findThemeSummary(slug: string): EssayThemeSummary | null {
  return themeIndex.themes.find((theme) => theme.slug === slug) ?? null
}

/** Total tickable research directions across the whole roadmap. */
export function totalCheckpoints(): number {
  return themeIndex.themes.reduce((total, theme) => total + theme.checkpointCount, 0)
}

/** Tier A is the document's priority set; Tier B is the second band. */
export function themesByTier(tier: string): EssayThemeSummary[] {
  return themeIndex.themes.filter((theme) => theme.tier === tier)
}

// A public, version-independent asset: fetching it directly keeps the roadmap
// decoupled from a content-hashed JavaScript chunk across deployments.
let cached: EssayThemeRoadmap | null = null

export async function loadEssayThemeRoadmap(signal?: AbortSignal): Promise<EssayThemeRoadmap> {
  if (cached) return cached
  const response = await fetch('/study-material/essay-themes.json', {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('ESSAY_THEMES_UNAVAILABLE')
  const roadmap = (await response.json()) as EssayThemeRoadmap
  if (!Array.isArray(roadmap?.themes) || roadmap.themes.length === 0) {
    throw new Error('ESSAY_THEMES_INVALID')
  }
  cached = roadmap
  return roadmap
}

/** Every checkpoint id in a theme, for progress maths. */
export function themeCheckpointIds(theme: EssayTheme): string[] {
  return theme.sections.flatMap((section) => section.items.map((item) => item.id))
}
