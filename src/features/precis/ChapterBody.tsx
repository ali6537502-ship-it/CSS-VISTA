import { panelStyle } from '@/features/handwriting/styles'
import type { Chapter } from './api'
export default function ChapterBody({ chapter }: { chapter: Chapter }) {
  return (
    <article className={`${panelStyle} min-w-0`}>
      <h3 id="precis-chapter-title" tabIndex={-1} className="text-xl font-semibold tracking-tight">{chapter.title}</h3>
      <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
        {chapter.blocks.map((block, i) =>
          block.type === 'table' ? (
            <div
              key={i}
              className="overflow-x-auto rounded-xl border border-slate-200"
              tabIndex={0}
              role="region"
              aria-label={`${chapter.title} reference table`}
            >
              <table className="w-full text-left">
                <tbody>
                  {block.rows.map((row, j) => (
                    <tr
                      key={j}
                      className={
                        j === 0 ? 'bg-slate-50 font-semibold' : 'border-t border-slate-200'
                      }
                    >
                      {row.map((cell, k) =>
                        j === 0 ? (
                          <th key={k} scope="col" className="min-w-36 p-3">
                            {cell}
                          </th>
                        ) : (
                          <td key={k} className="min-w-36 p-3 align-top">
                            {cell}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : block.type === 'heading' ? (
            <h4 key={i} className="pt-3 font-semibold text-slate-950">
              {block.text}
            </h4>
          ) : block.type === 'bullet' ? (
            <p key={i} className="border-l-2 border-indigo-200 pl-4">
              {block.text}
            </p>
          ) : (
            <p key={i} className="whitespace-pre-wrap break-words">
              {block.text}
            </p>
          ),
        )}
      </div>
    </article>
  )
}
