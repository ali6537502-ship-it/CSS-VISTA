import { useMemo, useState } from 'react'
import { ChevronDown, ClipboardCheck, Copy, Search } from 'lucide-react'
import type { Checkpoint, ThemeSection as Section } from '@/data/essayThemes'
import { checkpointKey, completionOf } from './progress'
import { ProgressBar, TickItem } from './ui'

/** Sections whose items are short labels read best as a dense chip grid. */
const CHIP_KINDS = new Set(['terms', 'frameworks', 'sources'])

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(
          () => { setCopied(true); window.setTimeout(() => setCopied(false), 1600) },
          () => setCopied(false),
        )
      }}
      className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary"
    >
      {copied ? <ClipboardCheck className="h-3 w-3 text-emerald-700" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

/**
 * The roadmap's Evidence Capture Card, shown where the document requires it:
 * no statistic is collected without all six fields. Copying the template is
 * what a student pastes into their own evidence file.
 */
function EvidenceCardNote({ fields }: { fields: string[] }) {
  if (fields.length === 0) return null
  const template = `${fields.join(' | ')}\n${fields.map(() => '').join(' | ')}`
  return (
    <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50/70 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-amber-900">
          Capture every statistic with all six fields — tick only once the record is complete.
        </p>
        <CopyButton value={template} label="Copy card" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {fields.map((field) => (
          <span key={field} className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200">
            {field}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * The theme's search seed, made usable: the document says to replace the
 * placeholder with the exact thing being researched, so the page does that
 * substitution live instead of leaving the student to edit a sentence.
 */
function SearchSeed({ items, themeName }: { items: Checkpoint[]; themeName: string }) {
  const [subject, setSubject] = useState('')
  const query = `"${themeName} ${subject.trim() || 'official report'}"`
  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-white p-3">
        <label className="text-[12px] font-medium text-muted-foreground" htmlFor="search-seed-input">
          Replace “official report” with the exact indicator, policy, law or institution you need
        </label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <input
            id="search-seed-input"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="e.g. national AI policy 2024"
            className="h-9 min-w-0 flex-1 rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <CopyButton value={query} label="Copy query" />
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-pine px-3 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"
          >
            <Search className="h-3.5 w-3.5" /> Search
          </a>
        </div>
        <p className="mt-2 break-words rounded bg-secondary/60 px-2 py-1.5 font-mono text-[12px] text-foreground/80">{query}</p>
      </div>
      {items.map((item) => (
        <p key={item.id} className="text-[12px] leading-relaxed text-muted-foreground">{item.text}</p>
      ))}
    </div>
  )
}

export function ThemeSectionBlock({
  section, themeSlug, themeName, ticked, toggle, setMany, evidenceFields, defaultOpen,
}: {
  section: Section
  themeSlug: string
  themeName: string
  ticked: Set<string>
  toggle: (key: string) => void
  setMany: (keys: string[], value: boolean) => void
  evidenceFields: string[]
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const keys = useMemo(
    () => section.items.map((item) => checkpointKey(themeSlug, item.id)),
    [section.items, themeSlug],
  )
  const completion = completionOf(keys, ticked)
  const allDone = completion.total > 0 && completion.done === completion.total
  const chips = CHIP_KINDS.has(section.kind)

  return (
    <section id={`section-${section.letter}`} className="scroll-mt-24 rounded-xl border bg-white">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12px] font-bold ${allDone ? 'bg-emerald-600 text-white' : 'bg-secondary text-pine'}`}>
            {section.letter}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-pine">{section.title}</span>
            {section.instruction && (
              <span className="block truncate text-[12px] text-muted-foreground">{section.instruction}</span>
            )}
          </span>
          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-muted-foreground">
            {completion.done}/{completion.total}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <div className="px-3.5 pb-1"><ProgressBar percent={completion.percent} /></div>

      {open && (
        <div className="px-3.5 pb-3.5 pt-3">
          {section.kind === 'indicators' && <EvidenceCardNote fields={evidenceFields} />}

          {section.kind === 'search' ? (
            <SearchSeed items={section.items} themeName={themeName} />
          ) : (
            <>
              <div className={chips ? 'flex flex-wrap gap-1.5' : 'space-y-1.5'}>
                {section.items.map((item) => {
                  const key = checkpointKey(themeSlug, item.id)
                  const checked = ticked.has(key)
                  return (
                    <TickItem
                      key={item.id}
                      id={`cp-${item.id}`}
                      checked={checked}
                      onToggle={() => toggle(key)}
                      variant={chips ? 'chip' : 'row'}
                    >
                      {item.label ? (
                        <>
                          <span className="font-semibold text-pine">{item.label}:</span>{' '}
                          <span>{item.text}</span>
                        </>
                      ) : item.text}
                    </TickItem>
                  )
                })}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMany(keys, !allDone)}
                  className="rounded border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary"
                >
                  {allDone ? 'Clear this section' : 'Mark section done'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
