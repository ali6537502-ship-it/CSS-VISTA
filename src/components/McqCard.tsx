import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, Bookmark, BookmarkCheck, Check, ChevronRight, Eye, Flag,
  Clock3, Printer, RotateCcw, Share2, X,
} from 'lucide-react'
import type { BankQuestion } from '@/data/mcq'
import { addMistake, getAttempt, getMistakes, recordAttempt, recordQuestionTiming, toggleSavedMcq, savedMcqIds } from '@/lib/progress'
import { addReport } from '@/lib/admin'
import { isRtlText } from '@/lib/utils'
import { printPage } from '@/components/PrintMenu'

interface Props {
  q: BankQuestion
  num?: number
  catName?: string
  onAction?: () => void // ask parent to refresh (saved/mistakes changed)
}

const nowMs = () => Date.now()

export function printSingleQuestion(cardId: string) {
  printPage(true, `#${cardId}`)
}

export default function McqCard({ q, num, catName, onAction }: Props) {
  const cardId = `mcq-${q.id}`
  const cardRef = useRef<HTMLDivElement>(null)
  const visibleSinceRef = useRef<number | null>(null)
  const accumulatedMsRef = useRef(0)
  const visibleRef = useRef(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportNote, setReportNote] = useState('')
  const [reportSent, setReportSent] = useState(false)
  const [shared, setShared] = useState(false)
  const [responseSeconds, setResponseSeconds] = useState<number | null>(null)
  const rtl = isRtlText(q.q)

  useEffect(() => {
    const a = getAttempt(q.id)
    if (a) {
      const previousMistake = a.c ? null : getMistakes().find((mistake) => mistake.id === q.id)
      setSelected(a.c ? q.a : previousMistake?.sel ?? null)
      setRevealed(true)
    } else {
      setSelected(null)
      setRevealed(false)
    }
    setSaved(savedMcqIds().includes(q.id))
  }, [q.a, q.id])

  useEffect(() => {
    accumulatedMsRef.current = 0
    visibleSinceRef.current = null
    visibleRef.current = false
    const element = cardRef.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      visibleRef.current = true
      visibleSinceRef.current = Date.now()
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      const now = Date.now()
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.55
      if (visible && !visibleRef.current) {
        visibleSinceRef.current = now
      } else if (!visible && visibleRef.current && visibleSinceRef.current !== null) {
        accumulatedMsRef.current += now - visibleSinceRef.current
        visibleSinceRef.current = null
      }
      visibleRef.current = visible
    }, { threshold: [0.55] })
    observer.observe(element)
    return () => observer.disconnect()
  }, [q.id])

  const showAnswer = revealed || selected !== null

  function choose(i: number) {
    if (selected !== null) return
    setSelected(i)
    const correct = i === q.a
    const category = catName ?? q.id.replace(/-\d+$/, '')
    const visibleMs = visibleSinceRef.current === null ? 0 : nowMs() - visibleSinceRef.current
    const seconds = Math.max(1, Math.round((accumulatedMsRef.current + visibleMs) / 1000))
    setResponseSeconds(seconds)
    recordQuestionTiming({ questionId: q.id, category, mode: 'gk', seconds, correct })
    recordAttempt(q.id, correct, category)
    if (!correct) addMistake(q.id, i, category)
    onAction?.()
  }

  function retry() {
    setSelected(null)
    setRevealed(false)
    setResponseSeconds(null)
    accumulatedMsRef.current = 0
    visibleSinceRef.current = visibleRef.current ? Date.now() : null
  }

  async function share() {
    const text = `${q.q}\nA) ${q.o[0]}\nB) ${q.o[1]}\nC) ${q.o[2]}\nD) ${q.o[3]}\n- CSS Vista GK World`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CSS Vista MCQ', text })
      } else {
        await navigator.clipboard.writeText(text)
        setShared(true)
        setTimeout(() => setShared(false), 1500)
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div ref={cardRef} id={cardId} className="mcq-card rounded-lg border bg-white p-4 transition-shadow hover:shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {num !== undefined && <span className="font-semibold text-pine">Q{num}</span>}
        {catName && <span className="rounded bg-secondary px-1.5 py-0.5 font-medium">{catName}</span>}
        {q.s && <span className="rounded bg-secondary/60 px-1.5 py-0.5">{q.s}</span>}
        {q.d && (
          <span className={`rounded px-1.5 py-0.5 font-medium ${q.d === 'Advanced' ? 'bg-red-50 text-red-700' : q.d === 'Intermediate' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {q.d}
          </span>
        )}
        {responseSeconds !== null && (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800">
            <Clock3 className="h-3 w-3" /> {responseSeconds}s
          </span>
        )}
      </div>

      <p
        dir={rtl ? 'rtl' : undefined}
        lang={rtl ? 'ur' : undefined}
        className={`mt-2 text-[15px] font-medium leading-relaxed text-foreground ${rtl ? 'urdu-text text-right' : ''}`}
      >
        {q.q}
      </p>

      <div className="mt-3 grid gap-2">
        {q.o.map((opt, i) => {
          const optionRtl = isRtlText(opt)
          const isAns = i === q.a
          const isSel = i === selected
          let cls = 'border bg-white hover:border-emerald-700/50 hover:bg-emerald-50/40'
          if (showAnswer) {
            if (isAns) cls = 'border-emerald-600 bg-emerald-50'
            else if (isSel) cls = 'border-red-400 bg-red-50'
            else cls = 'border bg-white opacity-70'
          }
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={selected !== null}
              dir={optionRtl ? 'rtl' : undefined}
              lang={optionRtl ? 'ur' : undefined}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${optionRtl ? 'text-right' : 'text-left'} ${cls}`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${showAnswer && isAns ? 'border-emerald-600 bg-emerald-600 text-white' : 'text-muted-foreground'}`}>
                {showAnswer && isAns ? <Check className="h-3 w-3" /> : showAnswer && isSel && !isAns ? <X className="h-3 w-3" /> : 'ABCD'[i]}
              </span>
              <span className={optionRtl ? 'urdu-text' : 'leading-snug'}>{opt}</span>
            </button>
          )
        })}
      </div>

      <div className={`answer-block overflow-hidden transition-all duration-300 ${showAnswer ? 'mt-3 max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className={`rounded-md border-l-4 px-3 py-2.5 text-sm ${selected !== null && selected !== q.a ? 'border-red-400 bg-red-50/60' : 'border-emerald-500 bg-emerald-50/60'}`}>
          <p className="font-semibold text-pine">
            Correct answer: {'ABCD'[q.a]}){' '}
            <span
              dir={isRtlText(q.o[q.a]) ? 'rtl' : undefined}
              lang={isRtlText(q.o[q.a]) ? 'ur' : undefined}
              className={isRtlText(q.o[q.a]) ? 'urdu-text inline-block' : undefined}
            >
              {q.o[q.a]}
            </span>
          </p>
          {q.e && <p className="mt-1.5 leading-relaxed text-foreground/80">{q.e}</p>}
          {q.sourceUrl && (
            <a href={q.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex text-xs font-semibold text-emerald-800 underline underline-offset-2">
              Review source
            </a>
          )}
        </div>
      </div>

      <div className="no-print mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2.5">
        {selected === null && !revealed && (
          <button onClick={() => setRevealed(true)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50">
            <Eye className="h-3.5 w-3.5" /> Reveal Answer
          </button>
        )}
        {showAnswer && (
          <button onClick={retry} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-pine hover:bg-secondary">
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </button>
        )}
        <button
          onClick={() => { setSaved(toggleSavedMcq(q.id)); onAction?.() }}
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold hover:bg-secondary ${saved ? 'text-emerald-700' : 'text-muted-foreground'}`}
        >
          {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />} {saved ? 'Saved' : 'Save'}
        </button>
        <button
          onClick={() => { addMistake(q.id, selected ?? -1, catName ?? q.id.replace(/-\d+$/, '')); onAction?.() }}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary"
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Mistake Notebook
        </button>
        <button onClick={share} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary">
          <Share2 className="h-3.5 w-3.5" /> {shared ? 'Copied!' : 'Share'}
        </button>
        <button onClick={() => printSingleQuestion(cardId)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary">
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
        <button onClick={() => setReportOpen(!reportOpen)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary">
          <Flag className="h-3.5 w-3.5" /> Report
        </button>
      </div>

      {reportOpen && (
        <div className="no-print mt-2 rounded-md border bg-secondary/40 p-3">
          {reportSent ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <ChevronRight className="h-3.5 w-3.5" /> Thank you - the error report has been saved for review.
            </p>
          ) : (
            <>
              <p className="text-xs font-medium text-foreground">What is wrong with this question? (optional note)</p>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="e.g. answer seems incorrect / spelling"
                  className="h-8 flex-1 rounded border bg-white px-2 text-xs"
                />
                <button
                  onClick={() => { addReport({ questionId: q.id, note: reportNote || 'Reported without note' }); setReportSent(true) }}
                  className="h-8 rounded bg-pine px-3 text-xs font-semibold text-white"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
