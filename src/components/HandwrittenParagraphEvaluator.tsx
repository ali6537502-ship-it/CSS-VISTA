import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, FileCheck2, LoaderCircle, ScanText, Upload } from 'lucide-react'
import { HostingerApiError, hostingerRequest } from '@/lib/hostingerApi'

type LimitState = { limit: number; used: number; remaining: number }
type StatusResponse = {
  ok: boolean
  enabled: boolean
  limits: { scan: LimitState; evaluation: LimitState }
}
type OcrResponse = {
  ok: boolean
  text: string
  confidence: number | null
  remaining: number
  message: string
}
type Issue = {
  category: string
  error_code: string
  severity: 'low' | 'medium' | 'high'
  excerpt: string
  explanation: string
  hint: string
}
type Evaluation = {
  overall_score: number
  summary: string
  strengths: string[]
  issues: Issue[]
  dimensions: Record<'grammar' | 'sentence_structure' | 'coherence' | 'vocabulary' | 'punctuation' | 'expression', number>
  rewrite_task: string
}
type EvaluationResponse = { ok: boolean; attempt_id: string; evaluation: Evaluation; remaining: number }

const dimensionLabels: Record<keyof Evaluation['dimensions'], string> = {
  grammar: 'Grammar',
  sentence_structure: 'Sentence structure',
  coherence: 'Coherence',
  vocabulary: 'Vocabulary',
  punctuation: 'Punctuation',
  expression: 'Expression',
}

function messageFrom(error: unknown) {
  if (error instanceof HostingerApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

export default function HandwrittenParagraphEvaluator() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [confidence, setConfidence] = useState<number | null>(null)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    hostingerRequest<StatusResponse>('ai/handwritten-paragraph.php', { signal: controller.signal })
      .then(setStatus)
      .catch((err) => {
        if ((err as Error)?.name !== 'AbortError') setError(messageFrom(err))
      })
    return () => controller.abort()
  }, [])

  const confidenceLabel = useMemo(() => {
    if (confidence === null) return null
    const pct = Math.round(confidence * 100)
    return `OCR confidence: ${pct}%`
  }, [confidence])

  async function scan() {
    if (!file) return
    setError('')
    setEvaluation(null)
    setScanning(true)
    try {
      const body = new FormData()
      body.append('mode', 'ocr')
      body.append('image', file)
      const response = await hostingerRequest<OcrResponse>('ai/handwritten-paragraph.php', { method: 'POST', body })
      setText(response.text)
      setConfidence(response.confidence)
      setStatus((current) => current ? {
        ...current,
        limits: { ...current.limits, scan: { ...current.limits.scan, used: current.limits.scan.limit - response.remaining, remaining: response.remaining } },
      } : current)
    } catch (err) {
      setError(messageFrom(err))
    } finally {
      setScanning(false)
    }
  }

  async function evaluate() {
    const confirmed = text.trim()
    if (confirmed.length < 40) {
      setError('Please confirm at least one complete paragraph before evaluation.')
      return
    }
    setError('')
    setEvaluating(true)
    try {
      const response = await hostingerRequest<EvaluationResponse>('ai/handwritten-paragraph.php', {
        method: 'POST',
        body: JSON.stringify({ mode: 'evaluate', text: confirmed }),
      })
      setEvaluation(response.evaluation)
      setStatus((current) => current ? {
        ...current,
        limits: { ...current.limits, evaluation: { ...current.limits.evaluation, used: current.limits.evaluation.limit - response.remaining, remaining: response.remaining } },
      } : current)
    } catch (err) {
      setError(messageFrom(err))
    } finally {
      setEvaluating(false)
    }
  }

  if (!status && !error) {
    return <div className="flex min-h-28 items-center justify-center rounded-2xl border bg-white"><LoaderCircle className="h-5 w-5 animate-spin text-emerald-800" /></div>
  }

  if (status && !status.enabled) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-100 p-2.5"><ScanText className="h-5 w-5 text-slate-700" /></div>
          <div>
            <h2 className="font-display text-xl font-bold text-pine">Handwritten Paragraph Evaluator</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">The evaluator is installed but not enabled for student accounts yet.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5"><ScanText className="h-5 w-5 text-emerald-800" /></div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-700">Writing Lab · Pilot</p>
            <h2 className="mt-1 font-display text-xl font-bold text-pine">Handwritten Paragraph Evaluator</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Upload one clear page containing one handwritten paragraph. First check the extracted text, then ask for feedback.</p>
          </div>
        </div>
        {status && <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full border px-3 py-1.5">Scans {status.limits.scan.remaining}/{status.limits.scan.limit}</span>
          <span className="rounded-full border px-3 py-1.5">Evaluations {status.limits.evaluation.remaining}/{status.limits.evaluation.limit}</span>
        </div>}
      </div>

      {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}

      <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <label className="text-sm font-bold text-slate-800" htmlFor="handwritten-paragraph-image">1. Upload one page</label>
          <input
            id="handwritten-paragraph-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setText('')
              setEvaluation(null)
              setConfidence(null)
              setError('')
            }}
            className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-emerald-900"
          />
          <button
            type="button"
            onClick={scan}
            disabled={!file || scanning || (status?.limits.scan.remaining ?? 0) <= 0}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-pine px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scanning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {scanning ? 'Reading handwriting…' : 'Scan my paragraph'}
          </button>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">JPG, PNG or WebP. Keep the page straight, well lit and readable.</p>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-bold text-slate-800" htmlFor="confirmed-paragraph">2. Confirm the extracted text</label>
            {confidenceLabel && <span className="text-xs font-semibold text-slate-500">{confidenceLabel}</span>}
          </div>
          <textarea
            id="confirmed-paragraph"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setEvaluation(null)
            }}
            placeholder="The OCR result will appear here. Correct any word that was read incorrectly."
            rows={9}
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-[#fffef9] p-4 text-base leading-7 text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={evaluate}
            disabled={evaluating || text.trim().length < 40 || (status?.limits.evaluation.remaining ?? 0) <= 0}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-800 bg-emerald-50 px-4 text-sm font-bold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {evaluating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
            {evaluating ? 'Professor is evaluating…' : 'Evaluate confirmed paragraph'}
          </button>
        </div>
      </div>

      {evaluation && (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
            <div className="rounded-2xl bg-emerald-950 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-200">Writing score</p>
              <p className="mt-2 text-4xl font-black">{evaluation.overall_score}<span className="text-lg font-semibold text-emerald-200">/100</span></p>
            </div>
            <div className="rounded-2xl border bg-[#fffef9] p-5">
              <h3 className="font-bold text-pine">Professor’s diagnosis</h3>
              <p className="mt-2 text-sm leading-7 text-slate-700">{evaluation.summary}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(evaluation.dimensions).map(([key, value]) => (
              <div key={key} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-slate-700">{dimensionLabels[key as keyof Evaluation['dimensions']]}</span><strong className="text-pine">{value}%</strong></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-800" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
              </div>
            ))}
          </div>

          {evaluation.strengths.length > 0 && <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-950"><CheckCircle2 className="h-4 w-4" /> What you did well</h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-emerald-950/80">{evaluation.strengths.map((item, index) => <li key={index}>• {item}</li>)}</ul>
          </div>}

          <div className="mt-5">
            <h3 className="font-display text-lg font-bold text-pine">Mistakes to work on</h3>
            {evaluation.issues.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No major writing issue was detected in this paragraph.</p> : (
              <div className="mt-3 space-y-3">
                {evaluation.issues.map((issue, index) => (
                  <article key={index} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{issue.category}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">{issue.severity}</span>
                    </div>
                    {issue.excerpt && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-700">“{issue.excerpt}”</p>}
                    <p className="mt-2 text-sm leading-6 text-slate-700">{issue.explanation}</p>
                    {issue.hint && <p className="mt-2 text-sm font-semibold text-emerald-900">Hint: {issue.hint}</p>}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[.12em] text-amber-800">Your rewrite task</p>
            <p className="mt-2 text-sm leading-6 text-amber-950">{evaluation.rewrite_task}</p>
          </div>
        </div>
      )}
    </section>
  )
}
