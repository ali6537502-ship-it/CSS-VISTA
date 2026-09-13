import type {
  ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ button */

export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'tertiary'

const BUTTON_CLASS: Record<ButtonVariant, string> = {
  primary: 'cv-btn--primary',
  brand: 'cv-btn--brand',
  secondary: 'cv-btn--secondary',
  tertiary: 'cv-btn--tertiary',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * primary   ink fill - the one real action on a surface
   * brand     green fill - reserved for the brand moment, not every CTA
   * secondary glass - the common companion action
   * tertiary  text only - not every action deserves a filled button
   */
  variant?: ButtonVariant
  /** Square corners instead of the pill. For toolbars and segmented groups. */
  square?: boolean
}

export function Button({ variant = 'secondary', square = false, className, ...rest }: ButtonProps) {
  return <button type="button" className={cn('cv-btn', BUTTON_CLASS[variant], square && 'cv-btn--sq', className)} {...rest} />
}

/* ------------------------------------------------------------------- field */

interface FieldShellProps {
  label?: string
  hint?: string
  error?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}

function FieldShell({ label, hint, error, htmlFor, children, className }: FieldShellProps) {
  return (
    <div className={cn('cv-field-wrap', className)}>
      {label ? <label className="cv-field-label" htmlFor={htmlFor}>{label}</label> : null}
      {children}
      {error ? <span className="cv-field-error">{error}</span> : hint ? <span className="cv-field-hint">{hint}</span> : null}
    </div>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, className, id, ...rest }: InputProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id}>
      <input
        id={id}
        className={cn('cv-field', error && 'cv-field--invalid', className)}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </FieldShell>
  )
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Select({ label, hint, error, className, id, children, ...rest }: SelectProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id}>
      <select
        id={id}
        className={cn('cv-field', error && 'cv-field--invalid', className)}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  )
}

/* -------------------------------------------------------------------- chip */

export type ChipTone = 'neutral' | 'brand' | 'info' | 'good' | 'warn' | 'bad' | 'gold'

const CHIP_CLASS: Record<ChipTone, string> = {
  neutral: '',
  brand: 'cv-chip--brand',
  info: 'cv-chip--info',
  good: 'cv-chip--good',
  warn: 'cv-chip--warn',
  bad: 'cv-chip--bad',
  gold: 'cv-chip--gold',
}

export function Chip({ tone = 'neutral', className, children }: { tone?: ChipTone; className?: string; children: ReactNode }) {
  return <span className={cn('cv-chip', CHIP_CLASS[tone], className)}>{children}</span>
}

/* -------------------------------------------------------------------- tabs */

export interface TabsProps {
  tabs: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  className?: string
  'aria-label'?: string
}

export function Tabs({ tabs, value, onChange, className, ...rest }: TabsProps) {
  return (
    <div className={cn('cv-tabs', className)} role="tablist" {...rest}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`cv-tab-${tab.id}`}
          aria-selected={value === tab.id}
          className="cv-tab"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- filterbar */

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('cv-filterbar', className)}>{children}</div>
}

export function FilterSpacer() {
  return <div className="cv-filterbar-spacer" />
}
