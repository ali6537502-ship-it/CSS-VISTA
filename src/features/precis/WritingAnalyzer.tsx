import { useState } from 'react'
import { AlertCircle, BookOpen, CheckCircle2, FileSearch, PencilLine } from 'lucide-react'
import { panelStyle, primaryStyle } from '@/features/handwriting/styles'
import { analyzePrecisWriting, type WritingAnalysis, type WritingFinding } from './writingAnalyzer'

type Snapshot = {
  original: string
  draft: string
  title: string
  limit: number | null
}
const categories: Record<WritingFinding['group'], string> = {
  grammar: 'Grammar',
  punctuation: 'Punctuation',
  expression: 'Conciseness and expression',
  structure: 'Sentence and paragraph structure',
  source: 'Comparison with the original',
  length: 'Length control',
  title: 'Title',
}
const order: WritingFinding['group'][] = [
  'grammar','punctuation','expression','structure','source','length','title',
]

export default function WritingAnalyzer({ original, draft, title, limit }: Snapshot) {
  const [report, setReport] = useState<{ snapshot: Snapshot; analysis: WritingAnalysis } | null>(null)
  const [group, setGroup] = useState<WritingFinding['group'] | 'all'>('all')
  const current = !!report && report.snapshot.original === original &&
    report.snapshot.draft === draft && report.snapshot.title === title && report.snapshot.limit === limit
  const findings = current ? report.analysis.findings : []
  const detected = findings.filter((item)=>item.certainty === 'detected').length
  const review = findings.filter((item)=>item.certainty === 'review').length
  function check() {
    setGroup('all')
    setReport({ snapshot: { original, draft, title, limit },
      analysis: analyzePrecisWriting({ original, draft, title, limit }) })
  }
  return (
    <section className={panelStyle} aria-label="Précis writing checker">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-700">
            <FileSearch aria-hidden="true" className="h-4 w-4" /> Typed writing review
          </p>
          <h3 className="mt-2 text-xl font-semibold">Check my Précis</h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Check grammar, punctuation, sentence length and compression. Review how the wording
            relates to the original passage. Work directly with your typed answer; every finding explains what to review.
          </p>
        </div>
        <button type="button" className={primaryStyle} disabled={!draft.trim()} onClick={check}>
          <PencilLine aria-hidden="true" className="h-4 w-4" />
          {report ? 'Check updated answer' : 'Analyse my answer'}
        </button>
      </div>
      {!draft.trim() && <p className="mt-4 text-sm text-slate-600">Type your answer in the Précis box before checking it.</p>}
      {report && !current && (
        <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          You changed the passage or your answer after the previous check. Run the checker again to see updated findings.
        </p>
      )}
      {current && report && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Source', report.analysis.sourceWords + ' words'],
              ['Your answer', report.analysis.draftWords + ' words'],
              ['Detected issues', String(detected)],
              ['To review', String(review)],
            ].map(([label,value])=>(
              <div key={label} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-sm leading-7 text-slate-600">
            <strong>Detected issues</strong> are identifiable patterns to correct.
            <strong> To review</strong> identifies possible problems that require your judgment.
            Neither category is an examination mark.
          </p>
          {findings.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter writing findings">
                <button type="button" onClick={()=>setGroup('all')}
                  aria-pressed={group==='all'}
                  className={'min-h-10 rounded-full border px-4 text-xs font-semibold ' +
                    (group==='all'?'border-indigo-500 bg-indigo-50 text-indigo-800':'border-slate-200')}>
                  All ({findings.length})
                </button>
                {order.filter((category)=>findings.some((x)=>x.group===category)).map((category)=>(
                  <button type="button" key={category} onClick={()=>setGroup(category)}
                    aria-pressed={group===category}
                    className={'min-h-10 rounded-full border px-4 text-xs font-semibold ' +
                      (group===category?'border-indigo-500 bg-indigo-50 text-indigo-800':'border-slate-200')}>
                    {categories[category]} ({findings.filter((x)=>x.group===category).length})
                  </button>
                ))}
              </div>
              <ol className="space-y-3">
                {findings.filter((finding)=>group==='all'||finding.group===group)
                  .map((finding,index)=>(
                  <li key={finding.id+':'+(finding.start??index)} className="rounded-xl border border-slate-200 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {finding.certainty==='detected'?
                        <AlertCircle aria-hidden="true" className="h-4 w-4 text-amber-700" />:
                        <BookOpen aria-hidden="true" className="h-4 w-4 text-indigo-600" />}
                      <span className="font-semibold">{finding.label}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                        {finding.certainty==='detected'?'Detected':'Check in context'}
                      </span>
                      <span className="text-xs text-slate-500">{categories[finding.group]}</span>
                    </div>
                    {finding.excerpt && (
                      <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm leading-7">
                        <span className="text-xs font-semibold text-slate-500">Text to review: </span>
                        {finding.excerpt}
                      </p>
                    )}
                    <p className="mt-3 text-sm leading-7 text-slate-700">{finding.explanation}</p>
                    <p className="mt-2 text-sm leading-7"><strong>What to do: </strong>{finding.advice}</p>
                    <p className="mt-2 text-xs leading-6 text-slate-500">{finding.handbook}</p>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <div role="status" className="flex gap-3 rounded-xl border border-slate-200 p-4">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 text-emerald-700" />
              <p className="text-sm leading-7">
                No problems were found by the available rules. This does not prove the draft is
                grammatically flawless or that it preserves the entire argument. Review the
                original passage and handbook checklist before submitting.
              </p>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold">Before submitting your answer</p>
            <p className="mt-2 text-sm leading-7">
              Confirm the controlling idea, essential supports, cause and contrast, qualification,
              title and natural grammar yourself. This local checker cannot establish full
              semantic equivalence or reliably detect every English-language mistake.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
