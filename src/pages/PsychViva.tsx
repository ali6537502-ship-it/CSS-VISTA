import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { PageHeader, Section, OfficialNotice } from '@/components/shared'
import QuestionPagination from '@/components/QuestionPagination'
import { questionPageRange } from '@/lib/questionPagination'
import { getTextNotes, setTextNote } from '@/lib/progress'

import {
  psychVivaMockQuestions as mockQuestions,
  psychVivaSections as sections,
  psychVivaServicePreferences as servicePrefs,
} from '@/data/psychViva'

const SERVICE_NOTES_ID = 'psych-viva:service-prefs'

export default function PsychViva() {
  const [questionPage, setQuestionPage] = useState(1)
  const [serviceNotes, setServiceNotes] = useState<Record<string, string>>({})

  useEffect(() => { setServiceNotes(getTextNotes(SERVICE_NOTES_ID)) }, [])
  const questionRange = questionPageRange(questionPage, mockQuestions.length)
  const visibleMockQuestions = mockQuestions.slice(questionRange.start, questionRange.end)

  return (
    <div>
      <PageHeader title="Psychological Assessment & Viva Voce" description="What the final stages actually assess, how to prepare honestly, and how to avoid the classic mistakes. Viva carries 300 marks - it can rescue or sink a written score." />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10">
        <OfficialNotice />
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((s) => (
            <div key={s.title} className="rounded-lg border bg-white p-5">
              <h2 className="font-display text-lg font-bold text-pine">{s.title}</h2>
              <ul className="mt-3 space-y-2">
                {s.body.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Section title="Mock interview questions" description="Practise aloud with a timer; record and review yourself.">
          <div className="grid gap-2 md:grid-cols-2">
            {visibleMockQuestions.map((q, i) => (
              <div key={q} className="rounded-md border bg-white px-4 py-3 text-sm">
                <span className="mr-2 font-display font-bold text-pine">{questionRange.start + i + 1}.</span> {q}
              </div>
            ))}
          </div>
          <QuestionPagination currentPage={questionPage} totalItems={mockQuestions.length} onPageChange={setQuestionPage} itemLabel="Mock interview questions" className="mt-5" />
        </Section>

        <Section title="Service-group awareness worksheet" description="For your top three preferences, write one line each: role, first posting, one skill you bring. Saved in your browser as you type.">
          <p className="mb-3 text-sm text-muted-foreground">
            Read the full profile of each group - nature of work, postings, training and common misconceptions - on{' '}
            <Link to="/services" className="font-semibold text-emerald-800 underline underline-offset-2">Occupational Groups</Link>.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {servicePrefs.map((s) => (
              <div key={s} className="rounded-md border bg-white p-3.5">
                <div className="text-sm font-medium">{s}</div>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-input px-2 text-sm"
                  placeholder="Your one-line note…"
                  aria-label={`Note for ${s}`}
                  value={serviceNotes[s] ?? ''}
                  maxLength={500}
                  onChange={(event) => setServiceNotes(setTextNote(SERVICE_NOTES_ID, s, event.target.value))}
                />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
