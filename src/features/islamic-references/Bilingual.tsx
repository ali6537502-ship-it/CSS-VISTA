import type { BilingualBlock, Paragraph, WideBlock } from '@/data/islamicReferences'

/**
 * Which columns the reader wants. "both" is the default and the point of the
 * source documents; the single-language modes exist so a student revising in
 * one language is not made to scroll past the other.
 */
export type LanguageView = 'both' | 'en' | 'ur'

/** One paragraph, with the source's verify links kept live. */
function Line({ paragraph, urdu }: { paragraph: Paragraph; urdu?: boolean }) {
  return (
    <p className={urdu ? 'urdu-text text-[15px] leading-loose text-foreground/90' : 'text-[13.5px] leading-relaxed text-foreground/90'}>
      {paragraph.map((segment, index) => (
        segment.url
          ? (
            <a
              key={index}
              href={segment.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
            >
              {segment.text}
            </a>
          )
          : <span key={index}>{segment.text}</span>
      ))}
    </p>
  )
}

function Column({ paragraphs, urdu }: { paragraphs: Paragraph[]; urdu?: boolean }) {
  if (paragraphs.length === 0) return null
  return (
    <div
      dir={urdu ? 'rtl' : 'ltr'}
      lang={urdu ? 'ur' : 'en'}
      className={`space-y-1.5 ${urdu ? 'text-right' : 'text-left'}`}
    >
      {paragraphs.map((paragraph, index) => <Line key={index} paragraph={paragraph} urdu={urdu} />)}
    </div>
  )
}

/**
 * One English/Urdu pair.
 *
 * English is always the left column and Urdu always the right; they are two
 * separate elements with their own `dir`, so no line ever mixes the two
 * scripts. Below `md` they stack in the same order — English block, then Urdu
 * block — rather than interleaving paragraph by paragraph.
 */
export function BilingualRow({ block, view }: { block: BilingualBlock; view: LanguageView }) {
  const showEn = view !== 'ur' && block.en.length > 0
  const showUr = view !== 'en' && block.ur.length > 0
  if (!showEn && !showUr) return null
  const both = showEn && showUr
  return (
    <div className={both ? 'grid gap-x-6 gap-y-3 md:grid-cols-2' : ''}>
      {showEn && <Column paragraphs={block.en} />}
      {showUr && (
        <div className={both ? 'border-t pt-3 md:border-l md:border-t-0 md:pl-6 md:pt-0' : ''}>
          <Column paragraphs={block.ur} urdu />
        </div>
      )}
    </div>
  )
}

/**
 * A full-width row. The Arabic source passage belongs to neither column, so it
 * is set across both, right-to-left and larger than the commentary around it.
 */
export function WideRow({ block }: { block: WideBlock }) {
  const arabic = block.kind === 'arabic'
  return (
    <div
      dir="rtl"
      lang={arabic ? 'ar' : 'ur'}
      className={arabic
        ? 'rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-right'
        : 'rounded-lg bg-secondary/50 px-3 py-2 text-right'}
    >
      {block.paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className={arabic
            ? 'arabic-text text-[19px] text-emerald-950'
            : 'urdu-text text-[14px] leading-loose text-foreground/80'}
        >
          {paragraph.map((segment, position) => <span key={position}>{segment.text}</span>)}
        </p>
      ))}
    </div>
  )
}

/** The both / English / Urdu switch. */
export function LanguageSwitch({ view, onChange }: { view: LanguageView; onChange: (next: LanguageView) => void }) {
  const options: Array<{ value: LanguageView; label: string }> = [
    { value: 'both', label: 'Both' },
    { value: 'en', label: 'English' },
    { value: 'ur', label: 'اردو' },
  ]
  return (
    <div role="group" aria-label="Reading language" className="inline-flex rounded-lg border bg-white p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={view === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors ${
            view === option.value ? 'bg-pine text-emerald-50' : 'text-muted-foreground hover:bg-secondary'
          } ${option.value === 'ur' ? 'urdu-text' : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
