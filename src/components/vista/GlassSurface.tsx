import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type GlassTier = 1 | 2 | 3 | 4 | 5
export type GlassRadius = 'sm' | 'md' | 'lg' | 'xl'
export type GlassElevation = 1 | 2 | 3 | 'flat'

const TIER_CLASS: Record<GlassTier, string> = {
  1: 'cv-surface--t1',
  2: 'cv-surface--t2',
  3: 'cv-surface--t3',
  4: 'cv-surface--t4',
  5: 'cv-surface--t5',
}

const RADIUS_CLASS: Record<GlassRadius, string> = {
  sm: 'cv-surface--r-sm',
  md: '',
  lg: 'cv-surface--r-lg',
  xl: 'cv-surface--r-xl',
}

const ELEVATION_CLASS: Record<string, string> = {
  1: '',
  2: 'cv-surface--e2',
  3: 'cv-surface--e3',
  flat: 'cv-surface--flat',
}

export interface GlassSurfaceProps extends HTMLAttributes<HTMLElement> {
  /**
   * Which material tier this surface is made of. Choose by what the surface
   * has to do, not by how it should look:
   *
   *   1  large feature panels, hero surfaces, section canvases
   *   2  standard cards - gateway tiles, subject blocks, categories
   *   3  info-dense - dashboard modules, list rows, past-paper modules
   *   4  readability first - notes, articles, tables, mock questions
   *   5  floating chrome - header, mega menu, drawer, modal, toast
   *
   * Tiers 1, 2 and 5 composite a backdrop-filter. The blur budget is three
   * per viewport, so anything that repeats belongs on 3 or 4.
   */
  tier?: GlassTier
  radius?: GlassRadius
  elevation?: GlassElevation
  /** Adds the hover lift. Only for surfaces that are actually clickable. */
  lift?: boolean
  as?: ElementType
  children?: ReactNode
}

/**
 * The one surface primitive. Every card, panel, sheet and floating control in
 * CSS Vista is a GlassSurface at some tier - pages never style their own
 * backgrounds, borders or shadows.
 */
export default function GlassSurface({
  tier = 3,
  radius = 'md',
  elevation = 1,
  lift = false,
  as: Tag = 'div',
  className,
  children,
  ...rest
}: GlassSurfaceProps) {
  return (
    <Tag
      className={cn(
        'cv-surface',
        TIER_CLASS[tier],
        RADIUS_CLASS[radius],
        ELEVATION_CLASS[String(elevation)],
        lift && 'cv-surface--lift',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
