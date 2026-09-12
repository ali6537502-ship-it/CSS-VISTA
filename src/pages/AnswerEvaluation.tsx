import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  CheckCircle2, Clock3, FileCheck2, MessageCircle, Save, ShieldCheck, Trash2,
} from 'lucide-react'
import { Badge, PageHeader, Section } from '@/components/shared'
import { mentors, waLink } from '@/data/site'
import {
  deleteEvaluationRequest, getState, markEvaluationRequestSent, saveEvaluationRequest,
  type EvaluationRequest,
} from '@/lib/store'
import { useAccount } from '@/lib/accountContext'
import ConsultationCard from '@/components/ConsultationCard'
import { useAutosavedDraft } from '@/hooks/useAutosavedDraft'
import { useUnsavedWorkGuard } from '@/hooks/useUnsavedWorkGuard'

const compulsorySubjects = [
  'English Essay',
  'English (Precis & Composition)',
  'General Science & Ability',
  'Current Affairs',
  'Pakistan Affairs',
  'Islamic Studies / Comparative Religion',
]

const optionalSubjects = [
  'Political Science',
  'Criminology',
  'European History',
  'Environmental Science',
  'Punjabi',
]

const supportedSubjects = [...compulsorySubjects, ...optionalSubjects]

export default function AnswerEvaluation() {
  const [searchParams] = useSearchParams()
  const requestedSubject = searchParams.get('subject')
  const initialSubject = requestedSubject && supportedSubjects.includes(requestedSubject)
    ? requestedSubject
    : supportedSubjects[0]
  const [subject, setSubject] = useState(initialSubject)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [notes, setNotes] = useState('')
  const [savedRequest, setSavedRequest] = useState<EvaluationRequest | null>(null)
  const [restoreDismissed, setRestoreDismissed] = useState(false)
  const [handedOff, setHandedOff] = useState(false)
  const [history, setHistory] = useState(() => getState().evaluationRequests ?? [])
  const { user, configured } = useAccount()
  const sadia = mentors.find((mentor) => mentor.id === 'sadia')!
  const wordCount = useMemo(
    () => answer.trim().split(/\s+/).filter(Boolean).length,
    [answer],
  )

  // Accept a handoff from the writing desk. The answer is far too large for a
  // URL parameter, so it travels through the draft the writing desk already
  // autosaves - previously the student had to re-paste it by hand.
  useEffect(() => {
    if (searchParams.get('from') !== 'answer-writing') return
    try {
      const raw = localStorage.getItem('cssvista:draft:answer-writing')
      if (!raw) return
      const draft = JSON.parse(raw) as { subject?: string; question?: string; intro?: string; body?: string; conclusion?: string }
      const composed = [draft.intro, draft.body, draft.conclusion].filter(Boolean).join('\n\n').trim()
      if (!composed) return
      setQuestion((current) => current || (draft.question ?? ''))
      setAnswer((current) => current || composed)
      if (draft.subject && supportedSubjects.includes(draft.subject)) setSubject(draft.subject)
      setHandedOff(true)
    } catch {
      /* unreadable draft - the student can still paste manually */
    }
  }, [searchParams])

  // Autosave so a refresh no longer discards a long answer typed in the box.
  const draft = useMemo(() => ({ subject, question, answer, notes }), [subject, question, answer, notes])
  const hasContent = Boolean(question.trim() || answer.trim() || notes.trim())
  const { status: draftStatus, restored, clearDraft } = useAutosavedDraft<typeof draft>('answer-evaluation', draft, { enabled: hasContent })
  const canRestore = !hasContent && !restoreDismissed && Boolean(restored && (restored.question?.trim() || restored.answer?.trim()))

  useUnsavedWorkGuard(hasContent && !savedRequest)

  function restoreDraft() {
    if (!restored) return
    setSubject(restored.subject ?? subject)
    setQuestion(restored.question ?? '')
    setAnswer(restored.answer ?? '')
    setNotes(restored.notes ?? '')
    setRestoreDismissed(true)
  }

  function saveDraft() {
    if (!question.trim() || !answer.trim()) return
    const request = saveEvaluationRequest({
      subject,
      question: question.trim(),
      answer: answer.trim(),
      notes: notes.trim(),
      wordCount,
    })
    setSavedRequest(request)
    setHistory(getState().evaluationRequests ?? [])
    clearDraft()
    setRestoreDismissed(true)
  }

  function requestEvaluation() {
    let request = savedRequest
    if (!request || request.question !== question.trim() || request.answer !== answer.trim()) {
      if (!question.trim() || !answer.trim()) return
      request = saveEvaluationRequest({
        subject,
        question: question.trim(),
        answer: answer.trim(),
        notes: notes.trim(),
        wordCount,
      })
      setSavedRequest(request)
    }
    markEvaluationRequestSent(request.id)
    setHistory(getState().evaluationRequests ?? [])
    const message = [
      'Assalam-o-Alaikum Ma’am, I want to request answer evaluation through CSS Vista.',
      `Subject: ${request.subject}`,
      `Question: ${request.question}`,
      `Word count: ${request.wordCount}`,
      'My answer draft is saved in CSS Vista. Please share the evaluation procedure, availability and fee.',
    ].join('\n')
    window.open(waLink(sadia.whatsapp, message), '_blank', 'noopener,noreferrer')
  }

  function removeRequest(id: string) {
    deleteEvaluationRequest(id)
    setHistory(getState().evaluationRequests ?? [])
    if (savedRequest?.id === id) setSavedRequest(null)
  }

  const canSubmit = question.trim().length >= 10 && answer.trim().length >= 50

  return (
    <div>
      <PageHeader
        title="Answer Evaluation by Miss Sadia Zahoor, PAS"
        description="Write and save your CSS answer, then request personalised manual evaluation for all compulsory papers and five supported optional subjects."
      />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <section className="flex items-center gap-3 rounded-xl border border-emerald-900/10 bg-emerald-50/60 p-3">
          <img src={sadia.photo} alt="Miss Sadia Zahoor, PAS" className="h-14 w-14 rounded-xl object-cover shadow-sm" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Personalised evaluation</p>
            <p className="mt-0.5 text-sm font-bold text-pine">Miss Sadia Zahoor, PAS</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Manual review, feedback and improvement guidance.</p>
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="vista-card p-4">
            <FileCheck2 className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-2xl font-bold text-pine">11</p>
            <p className="text-xs text-muted-foreground">Supported CSS subjects</p>
          </div>
          <div className="vista-card p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-lg font-bold text-pine">Manual feedback</p>
            <p className="text-xs text-muted-foreground">No automatic score is presented as mentor feedback</p>
          </div>
          <div className="vista-card p-4">
            <Clock3 className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-lg font-bold text-pine">Draft first</p>
            <p className="text-xs text-muted-foreground">Save before contacting the evaluator</p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.55fr_0.8fr]">
          <Section
            title="Prepare your answer for evaluation"
            description="Your answer is not sent automatically. The final button opens a direct evaluation request."
          >
            <div className="rounded-xl border bg-white p-5">
              <label className="block text-sm font-semibold text-pine">
                Subject
                <select
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal text-foreground"
                >
                  <optgroup label="Compulsory subjects">
                    {compulsorySubjects.map((name) => <option key={name}>{name}</option>)}
                  </optgroup>
                  <optgroup label="Optional subjects">
                    {optionalSubjects.map((name) => <option key={name}>{name}</option>)}
                  </optgroup>
                </select>
              </label>

              <label className="mt-4 block text-sm font-semibold text-pine">
                Original question
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={3}
                  placeholder="Paste or type the exact CSS question."
                  className="mt-1.5 w-full rounded-md border p-3 font-normal text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="mt-4 block text-sm font-semibold text-pine">
                Your complete answer
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  rows={18}
                  placeholder="Write the outline and complete answer here."
                  className="mt-1.5 w-full rounded-md border p-3 font-normal leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{wordCount.toLocaleString()} words</span>
                <span>Minimum draft: 50 characters</span>
              </div>

              <label className="mt-4 block text-sm font-semibold text-pine">
                What should the evaluator focus on? <span className="font-normal text-muted-foreground">(optional)</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="For example: thesis, structure, evidence, language or time management."
                  className="mt-1.5 w-full rounded-md border p-3 font-normal text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              {handedOff && (
                <p role="status" aria-live="polite" className="mt-5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Brought across from your answer-writing desk. Edit it here before sending.
                </p>
              )}
              {canRestore && (
                <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <span className="flex-1">You have an unfinished answer from a previous session.</span>
                  <button type="button" onClick={restoreDraft} className="inline-flex h-9 items-center rounded-md bg-amber-800 px-3 text-xs font-bold text-white">Restore it</button>
                  <button type="button" onClick={() => { clearDraft(); setRestoreDismissed(true) }} className="inline-flex h-9 items-center rounded-md border border-amber-400 px-3 text-xs font-bold text-amber-900">Discard</button>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!canSubmit}
                  className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-bold text-pine hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> Save evaluation draft
                </button>
                <button
                  type="button"
                  onClick={requestEvaluation}
                  disabled={!canSubmit}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageCircle className="h-4 w-4" /> Request evaluation
                </button>
                {hasContent && (
                  <span role="status" aria-live="polite" className="inline-flex h-10 items-center text-xs font-medium text-muted-foreground">
                    {draftStatus === 'error' ? 'Could not autosave - your browser storage may be full' : draftStatus === 'saved' ? 'Draft autosaved' : 'Autosaving…'}
                  </span>
                )}
              </div>
              {!canSubmit && hasContent && (
                <p className="mt-3 text-xs font-medium text-amber-800">
                  To enable the buttons, the question needs at least 10 characters and the answer at least 50.
                </p>
              )}
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Clicking “Request evaluation” opens WhatsApp with the subject and question details. Availability,
                turnaround time and any evaluation fee are confirmed directly by the mentor.
              </p>
            </div>
          </Section>

          <div className="space-y-6">
            <Section title="Supported papers">
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Compulsory</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {compulsorySubjects.map((name) => <Badge key={name} tone="gray">{name}</Badge>)}
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-emerald-800">Optional</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {optionalSubjects.map((name) => <Badge key={name} tone="gold">{name}</Badge>)}
                </div>
              </div>
            </Section>

            <Section title="Saving and privacy">
              <div className="rounded-xl border bg-secondary/45 p-4 text-sm leading-relaxed text-muted-foreground">
                {user
                  ? 'Your draft is included in your signed-in progress record and can sync across your devices.'
                  : configured
                    ? 'Sign in to sync this draft with your progress.'
                    : 'Sign in to protect and sync private answer drafts.'}
              </div>
            </Section>
          </div>
        </div>

        <ConsultationCard mentorIds={['sadia']} variant="compact" heading="Want broader preparation guidance?" description="A 1-on-1 consultation with Ms. Sadia Zahoor is separate from answer evaluation and can cover strategy, subject planning, study management and examination approach." />

        <Section title="My evaluation drafts" description="Your saved drafts, requests and synced account history.">
          {history.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No evaluation draft has been saved yet.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {history.map((request) => (
                <article key={request.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge tone={request.status === 'request-sent' ? 'green' : 'gray'}>
                        {request.status === 'request-sent' ? 'Request opened' : 'Draft'}
                      </Badge>
                      <h3 className="mt-2 line-clamp-2 font-bold text-pine">{request.question}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.subject} · {request.wordCount} words · {new Date(request.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRequest(request.id)}
                      className="rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                      aria-label="Delete evaluation draft"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {request.status === 'request-sent' && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      Contact request opened. Await direct confirmation from the mentor.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
