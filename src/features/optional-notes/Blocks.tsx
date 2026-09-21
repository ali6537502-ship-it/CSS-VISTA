import { useMemo } from 'react'
import { Lightbulb, BookOpen, Quote } from 'lucide-react'
import type { Block, Segment } from '@/data/optionalNotes'

function Runs({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((segment, index) => {
        const body = segment.b ? <strong className="font-semibold text-pine">{segment.text}</strong> : segment.text
        if (!segment.url) return <span key={index}>{body}</span>
        return (
          <a
            key={index}
            href={segment.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
          >
            {body}
          </a>
        )
      })}
    </>
  )
}

const CALLOUTS = {
  takeaway: { icon: Lightbulb, label: 'Key takeaway', className: 'border-amber-300 bg-amber-50/70 text-amber-950' },
  source: { icon: BookOpen, label: 'Source', className: 'border-emerald-200 bg-emerald-50/60 text-emerald-950' },
  intro: { icon: Quote, label: 'What this topic covers', className: 'border-slate-200 bg-secondary/50 text-foreground/90' },
} as const

/**
 * The notes as their authors wrote them.
 *
 * Headings keep their level so a long unit still reads as a structured
 * chapter, and the authors' own takeaway/source/intro styles are rendered as
 * callouts rather than flattened into ordinary paragraphs.
 */
export function NoteBlocks({ blocks }: { blocks: Block[] }) {
  // Anchor ids are numbered by heading order, matching topicOutline(), so the
  // "On this page" links resolve. Computed up front rather than counted during
  // render, which would mutate across renders.
  const headingIds = useMemo(() => {
    const ids = new Map<number, string>()
    let position = 0
    blocks.forEach((block, index) => {
      if (block.kind === 'heading') {
        ids.set(index, `section-${position}`)
        position += 1
      }
    })
    return ids
  }, [blocks])

  return (
    <div className="space-y-3.5">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading': {
            const size = block.level <= 2
              ? 'text-[17px] sm:text-[18px]'
              : block.level === 3 ? 'text-[15px]' : 'text-[14px]'
            return (
              <h2
                key={index}
                id={headingIds.get(index)}
                className={`scroll-mt-20 pt-1 font-display font-bold leading-snug text-pine ${size}`}
              >
                {block.text}
              </h2>
            )
          }
          case 'para':
            return (
              <p key={index} className="text-[14px] leading-relaxed text-foreground/90">
                <Runs segments={block.segments} />
              </p>
            )
          case 'list':
            return (
              <ul key={index} className="space-y-1.5">
                {block.items.map((item, position) => (
                  <li key={position} className="flex gap-2 text-[14px] leading-relaxed text-foreground/90">
                    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-emerald-700" />
                    <span><Runs segments={item} /></span>
                  </li>
                ))}
              </ul>
            )
          case 'callout': {
            const { icon: Icon, label, className } = CALLOUTS[block.tone]
            return (
              <div key={index} className={`flex gap-2.5 rounded-lg border px-3 py-2.5 ${className}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="text-[13.5px] leading-relaxed">
                  <span className="sr-only">{label}: </span>
                  <Runs segments={block.segments} />
                </p>
              </div>
            )
          }
          case 'table':
            return (
              <div key={index} className="overflow-x-auto rounded-lg border">
                <table className="w-full border-collapse text-[13px]">
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex === 0 ? 'bg-secondary/60' : 'border-t'}>
                        {row.map((cell, cellIndex) => (
                          rowIndex === 0
                            ? <th key={cellIndex} scope="col" className="px-3 py-2 text-left font-semibold text-pine">{cell}</th>
                            : <td key={cellIndex} className="px-3 py-2 align-top text-foreground/90">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
