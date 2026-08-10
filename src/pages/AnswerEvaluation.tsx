import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { BadgeCheck, Clock3, MailCheck, Save, ShieldCheck, SquarePen, Trash2 } from 'lucide-react'
import { PageHeader, Section, Badge } from '@/components/shared'
import { useAccount } from '@/lib/accountContext'
import {
  getState,
  saveEvaluationDraft,
  markEvaluationRequestSent,
  deleteEvaluationDraft,
  type EvaluationRequest,
} from '@/lib/store'
import { mentors } from '@/data/site'

const COMPULSORY = [
  'English Essay',
  'English (Precis & Composition)',
  'General Science & Ability',
  'Current Affairs',
  'Pakistan Affairs',
  'Islamic Studies / Comparative Religion',
]
const OPTIONAL = ['Political Science', 'Criminology', 'European History', 'Environmental Science', 'Punjabi']
const ALL_SUBJECTS = [...COMPULSORY, ...OPTIONAL]

function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export default function AnswerEvaluation() {
  const [params] = useSearchParams()
  const initial = params.get('subject')
  const [subject, setSubject] = useState(initial && ALL_SUBJECTS.includes(initial) ? initial : ALL_SUBJECTS[0])
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState<EvaluationRequest | null>(null)
  const [requests, setRequests] = useState<EvaluationRequest[]>(() => getState().evaluationRequests ?? [])
  const { user, configured } = useAccount()
  const sadia = mentors.find((m) => m.id === 'sadia')
  const wordCount = useMemo(() => answer.trim().split(/\s+/).filter(Boolean).length, [answer])

  function handleSave() {
    if (!question.trim() || !answer.trim()) return
    const request = saveEvaluationDraft({ subject, question: question.trim(), answer: answer.trim(), notes: notes.trim(), wordCount })
    setSaved(request)
    setRequests(getState().evaluationRequests ?? [])
  }

  function handleRequest() {
    let request = saved
    if (!request || request.question !== question.trim() || request.answer !== answer.trim()) {
      if (!question.trim() || !answer.trim()) return
      request = saveEvaluationDraft({ subject, question: question.trim(), answer: answer.trim(), notes: notes.trim(), wordCount })
      setSaved(request)
    }
    markEvaluationRequestSent(request.id)
    setRequests(getState().evaluationRequests ?? [])
    const message = [
      'Assalam-o-Alaikum Ma’am, I want to request answer evaluation through CSS Vista.',
      `Subject: ${request.subject}`,
      `Question: ${request.question}`,
      `Word count: ${request.wordCount}`,
      'My answer draft is saved in CSS Vista. Please share the evaluation procedure, availability and fee.',
    ].join('\n')
    if (sadia) window.open(whatsappLink(sadia.whatsapp, message), '_blank', 'noopener,noreferrer')
  }

  function handleDelete(id: string) {
    deleteEvaluationDraft(id)
    setRequests(getState().evaluationRequests ?? [])
    if (saved?.id === id) setSaved(null)
  }

  const ready = question.trim().length >= 10 && answer.trim().length >= 50

  return (
    <div>
      <PageHeader
        title="Answer Evaluation by Miss Sadia Zahoor, PAS"
        description="Write and save your CSS answer, then request personalised manual evaluation for all compulsory papers and five supported optional subjects."
      />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="vista-card p-4">
            <SquarePen className="h-5 w-5 text-emerald-800" />
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
          <Section title="Prepare your answer for evaluation" description="Your answer is not sent automatically. The final button opens a direct evaluation request.">
            <div className="rounded-xl border bg-white p-5">
              <label className="block text-sm font-semibold text-pine">
                Subject
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal text-foreground">
                  <optgroup label="Compulsory subjects">
                    {COMPULSORY.map((s) => <option key={s}>{s}</option>)}
                  </optgroup>
                  <optgroup label="Optional subjects">
                    {OPTIONAL.map((s) => <option key={s}>{s}</option>)}
                  </optgroup>
                </select>
              </label>
              <label className="mt-4 block text-sm font-semibold text-pine">
                Original question
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="Paste or type the exact CSS question." className="mt-1.5 w-full rounded-md border p-3 font-normal text-foreground outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <label className="mt-4 block text-sm font-semibold text-pine">
                Your complete answer
                <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={18} placeholder="Write the outline and complete answer here." className="mt-1.5 w-full rounded-md border p-3 font-normal leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{wordCount.toLocaleString()} words</span>
                <span>Minimum draft: 50 characters</span>
              </div>
              <label className="mt-4 block text-sm font-semibold text-pine">
                What should the evaluator focus on? <span className="font-normal text-muted-foreground">(optional)</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="For example: thesis, structure, evidence, language or time management." className="mt-1.5 w-full rounded-md border p-3 font-normal text-foreground outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={handleSave} disabled={!ready} className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-bold text-pine hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50">
                  <Save className="h-4 w-4" /> Save evaluation draft
                </button>
                <button type="button" onClick={handleRequest} disabled={!ready} className="inline-flex h-10 items-center gap-2 rounded-md bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
                  <MailCheck className="h-4 w-4" /> Request evaluation
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Clicking “Request evaluation” opens WhatsApp with the subject and question details. Availability, turnaround time and any evaluation fee are confirmed directly by the mentor.
              </p>
            </div>
          </Section>

          <div className="space-y-6">
            <Section title="Supported papers">
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Compulsory</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {COMPULSORY.map((s) => <Badge key={s} tone="gray">{s}</Badge>)}
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-emerald-800">Optional</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {OPTIONAL.map((s) => <Badge key={s} tone="gold">{s}</Badge>)}
                </div>
              </div>
            </Section>
            <Section title="Saving and privacy">
              <div className="rounded-xl border bg-secondary/45 p-4 text-sm leading-relaxed text-muted-foreground">
                {user
                  ? 'Your draft is included in your signed-in progress record and can sync across your devices.'
                  : configured
                    ? 'Your draft stays on this device until you sign in and sync your progress.'
                    : 'Your draft currently stays in this browser. Do not use a shared device for private answers.'}
              </div>
            </Section>
          </div>
        </div>

        <Section title="My evaluation drafts" description="Saved drafts and requests from this device or synced account.">
          {requests.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No evaluation draft has been saved yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {requests.map((r) => (
                <article key={r.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge tone={r.status === 'request-sent' ? 'green' : 'gray'}>{r.status === 'request-sent' ? 'Request opened' : 'Draft'}</Badge>
                      <h3 className="mt-2 line-clamp-2 font-bold text-pine">{r.question}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.subject} · {r.wordCount} words · {new Date(r.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button type="button" onClick={() => handleDelete(r.id)} className="rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700" aria-label="Delete evaluation draft">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {r.status === 'request-sent' && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                      <BadgeCheck className="h-4 w-4" /> Contact request opened. Await direct confirmation from the mentor.
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
