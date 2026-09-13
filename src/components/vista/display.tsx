import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------ iconcapsule */

export function IconCapsule({ children, small = false, className }: { children: ReactNode; small?: boolean; className?: string }) {
  return <span className={cn('cv-capsule', small && 'cv-capsule--sm', className)} aria-hidden="true">{children}</span>
}

/* ------------------------------------------------------------------ avatar
   Initials are the default. A photo is optional and never part of onboarding,
   so the initials state is the one that has to look deliberate. §8. */

export type AvatarSize = 'sm' | 'md' | 'lg'

const AVATAR_CLASS: Record<AvatarSize, string> = { sm: 'cv-avatar--sm', md: '', lg: 'cv-avatar--lg' }

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, src, size = 'md', className }: { name: string; src?: string; size?: AvatarSize; className?: string }) {
  return (
    <span className={cn('cv-avatar', AVATAR_CLASS[size], className)}>
      {src ? <img src={src} alt="" /> : <span aria-hidden="true">{initialsFrom(name)}</span>}
      <span className="sr-only">{name}</span>
    </span>
  )
}

/* ------------------------------------------------------------- emptystate
   Renders a neutral absence, never a plausible-looking fake number. §1. */

export function EmptyState({ icon, title, body, action, className }: {
  icon?: ReactNode
  title: string
  body?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('cv-empty', className)}>
      {icon ? <IconCapsule>{icon}</IconCapsule> : null}
      <p className="cv-head cv-head--h4">{title}</p>
      {body ? <p className="cv-body cv-body--sm cv-prose">{body}</p> : null}
      {action}
    </div>
  )
}

/* ---------------------------------------------------------------- skeleton */

export function Skeleton({ width, height, className }: { width?: string; height?: string; className?: string }) {
  return <span className={cn('cv-skeleton', className)} style={{ width, height, display: 'block' }} aria-hidden="true" />
}
