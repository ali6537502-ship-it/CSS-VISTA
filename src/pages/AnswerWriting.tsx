import { useEffect, useRef, useState } from 'react'
import { Download, Maximize2, Minimize2, Pause, Play, RotateCcw, Save, Trash2 } from 'lucide-react'
import { PageHeader, Section, Badge } from '@/components/shared'
import { analyticalQuestions } from '@/data/challenges'
import { saveAnswer, getState, deleteAnswer } from '@/lib/store'
import { essayRubric } from '@/data/essay'
import { usePageBack } from '@/lib/backNavigation'

export default function AnswerWriting() {
  const [question, setQuestion] = useState(analyticalQuestions[0].question)
  const [subject, setSubject] = useState(analyticalQuestions[0].subject)
  const [minutes, setMinutes] = useState(20)
  const [secondsLeft, setSecondsLeft] = useState(20 * 60)
  const [running, setRunning] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  usePageBack(fullscreen, () => setFullscreen(false))
  const [outline, setOutline] = useState('')
  const [intro, setIntro] = useState('')
  const [body, setBody] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [saved, setSaved] = useState(false)
  const [rubric, setRubric] = useState<Record<string, boolean>>({})
  const [history, setHistory] = useState(() => getState().savedAnswers)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { setRunning(false); return 0 }
          return s - 1
        })
      }, 1000)
      return () => { if (ref.current) clearInterval(ref.current) }
    }
  }, [running])

  const wordCount = [intro, body, conclusion].join(' ').trim().split(/\s+/).filter(Boolean).length
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  function resetTimer(m: number) {
    setMinutes(m); setSecondsLeft(m * 60); setRunning(false)
  }

  function handleSave() {
    saveAnswer({ question, subject, outline, intro, text: body, conclusion, minutes })
    setHistory(getState().savedAnswers)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function downloadTxt() {
    const content = `Question: ${question}\nSubject: ${subject}\nTime: ${minutes} min · Words: ${wordCount}\n\nOUTLINE\n${outline}\n\nINTRODUCTION\n${intro}\n\nANSWER\n${body}\n\nCONCLUSION\n${conclusion}`
    const blob = new Blob([content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `css-vista-answer-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <PageHeader title="Answer-Writing Practice" description="Timed, structured answer practice with an outline area, word counter, local saving and a twelve-point self-assessment rubric." />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
        <Section title="Writing desk">
          <div className={`${fullscreen ? 'fixed inset-0 z-50 overflow-y-auto bg-white p-4 sm:p-8' : ''}`}>
            <div className="rounded-lg border bg-white">
              <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                <select
                  value={question}
                  onChange={(e) => {
                    const q = analyticalQuestions.find((x) => x.question === e.target.value)
                    setQuestion(e.target.value); if (q) setSubject(q.subject)
                  }}
                  className="h-9 max-w-full flex-1 rounded-md border border-input px-2 text-sm sm:max-w-md"
                  aria-label="Choose a question"
                >
                  {analyticalQuestions.map((q) => <option key={q.question} value={q.question}>{q.question}</option>)}
                </select>
                <Badge tone="gray">{subject}</Badge>
                <div className="ml-auto flex items-center gap-2">
                  {[20, 30].map((m) => (
                    <button key={m} onClick={() => resetTimer(m)} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${minutes === m ? 'bg-pine text-emerald-50' : 'bg-secondary'}`}>{m} min</button>
                  ))}
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    Custom
                    <input type="number" min={5} max={180} value={minutes} onChange={(e) => resetTimer(Number(e.target.value) || 20)} className="h-8 w-16 rounded-md border border-input px-2 text-sm" aria-label="Custom minutes" />
                  </label>
                  <button onClick={() => setFullscreen(!fullscreen)} className="rounded-md border p-2 hover:bg-secondary" aria-label="Toggle full-screen">
                    {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 border-b bg-secondary/40 px-4 py-2.5">
                <span className={`font-display text-2xl font-bold tabular-nums ${secondsLeft < 120 ? 'text-red-600' : 'text-pine'}`}>{fmt(secondsLeft)}</span>
                <button onClick={() => setRunning(!running)} className="rounded-md bg-pine p-2 text-emerald-50 hover:bg-emerald-900" aria-label={running ? 'Pause' : 'Start'}>
                  {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button onClick={() => resetTimer(minutes)} className="rounded-md border p-2 hover:bg-secondary" aria-label="Reset timer"><RotateCcw className="h-4 w-4" /></button>
                <span className="ml-auto text-sm text-muted-foreground">Words: <strong className="text-foreground">{wordCount}</strong></span>
                {secondsLeft === 0 && <Badge tone="red">Time up</Badge>}
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outline
                  <textarea value={outline} onChange={(e) => setOutline(e.target.value)} rows={12} placeholder="I. Introduction&#10;II. Background&#10;III. …" className="mt-1.5 w-full rounded-md border border-input p-3 text-sm font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Introduction
                  <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={12} className="mt-1.5 w-full rounded-md border border-input p-3 text-sm font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Main answer
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="mt-1.5 w-full rounded-md border border-input p-3 text-sm font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conclusion
                  <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={12} className="mt-1.5 w-full rounded-md border border-input p-3 text-sm font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-ring" />
                </label>
              </div>

              <div className="flex flex-wrap gap-2 border-t px-4 py-3">
                <button onClick={handleSave} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
                  <Save className="h-4 w-4" /> {saved ? 'Saved ✓' : 'Save in browser'}
                </button>
                <button onClick={downloadTxt} className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary">
                  <Download className="h-4 w-4" /> Download as text
                </button>
              </div>
            </div>
          </div>
        </Section>

        <div className="grid gap-8 lg:grid-cols-2">
          <Section title="Self-assessment rubric" description="This is a self-check tool - it is not official examiner feedback.">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {essayRubric.map((r) => (
                <label key={r} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${rubric[r] ? 'border-emerald-700 bg-emerald-50' : 'hover:bg-secondary/60'}`}>
                  <input type="checkbox" checked={!!rubric[r]} onChange={(e) => setRubric((x) => ({ ...x, [r]: e.target.checked }))} className="h-4 w-4 accent-emerald-800" />
                  {r}
                </label>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Score: <strong className="text-pine">{Object.values(rubric).filter(Boolean).length}/{essayRubric.length}</strong> - aim for 10+ before the real exam.
            </p>
          </Section>

          <Section title="Attempt history" description="Saved locally; export from the dashboard.">
            {history.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No saved answers yet. Write above and press “Save in browser”.</p>
            ) : (
              <ul className="space-y-2">
                {history.slice(0, 8).map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 rounded-md border bg-white px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{h.question}</div>
                      <div className="text-xs text-muted-foreground">{h.subject} · {h.minutes} min · {new Date(h.date).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => { deleteAnswer(h.id); setHistory(getState().savedAnswers) }} aria-label="Delete answer" className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
