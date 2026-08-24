import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Download, ExternalLink, FileSearch, FileText, Loader2 } from 'lucide-react'
import { AdSlot } from '@/components/Ads'
import { Badge, EmptyState, PageHeader } from '@/components/shared'
import { pastPapers as seedPapers } from '@/data/pastPapers'
import { mergedPastPapers } from '@/lib/admin'
import { loadPastPaperAnalysis, type PastPaperQuestion } from '@/lib/pastPaperAnalysis'
import { recordActivity } from '@/lib/progress'

type Paper = (typeof seedPapers)[number]

interface TranscriptQuestion extends PastPaperQuestion {
  topic: string
}

const analysisSubjectAliases: Record<string, string> = {
  essay: 'english essay',
  'precis & composition': 'english (precis and composition)',
  'accounting & auditing': 'accountancy & auditing',
  'environmental sciences': 'environmental science',
}

function normalized(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}

function normalizedPaperLabel(value: string) {
  return normalized(value)
    .replace('paper one', 'paper i')
    .replace('paper two', 'paper ii')
}

function paperPageTitle(paper: Paper) {
  const part = paper.paper === 'Single Paper' ? '' : ` ${paper.paper.replace('One', 'I').replace('Two', 'II')}`
  return `${paper.examination} ${paper.year} ${paper.subject}${part} Past Paper`
}

function paperPageDescription(paper: Paper) {
  return `Explore the ${paper.examination} ${paper.year} ${paper.subject} ${paper.paper.toLowerCase()} past-paper record, with verified question text where recoverable.`
}

function questionBelongsToPaper(question: PastPaperQuestion, paper: Paper) {
  if (paper.paper === 'Single Paper' || paper.paper === 'Combined Papers') return true
  return normalizedPaperLabel(question.paper) === normalizedPaperLabel(paper.paper)
}

export default function PastPaperOpen() {
  const { id } = useParams()
  const paper = useMemo(
    () => mergedPastPapers(seedPapers).find((item) => item.id === id),
    [id],
  )
  const [pdfAvailable, setPdfAvailable] = useState<boolean | null>(null)
  const [transcript, setTranscript] = useState<TranscriptQuestion[]>([])
  const [transcriptReady, setTranscriptReady] = useState(false)
  const [analysisSubjectSlug, setAnalysisSubjectSlug] = useState('')

  useEffect(() => {
    if (!paper) return
    recordActivity({ type: 'past-paper', label: paper.title, path: `/past-papers/view/${paper.id}` })
    const title = `${paperPageTitle(paper)} | CSS Vista`
    const descriptionText = paperPageDescription(paper)
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const previousDescription = description?.content
    const previousCanonical = canonical?.href
    document.title = title
    if (description) description.content = descriptionText
    if (canonical) canonical.href = `${window.location.origin}/past-papers/view/${paper.id}`
    return () => {
      document.title = 'CSS Vista - CSS Exam Preparation Platform'
      if (description && previousDescription) description.content = previousDescription
      if (canonical && previousCanonical) canonical.href = previousCanonical
    }
  }, [paper])

  useEffect(() => {
    let active = true
    setPdfAvailable(null)
    setTranscript([])
    setTranscriptReady(false)
    setAnalysisSubjectSlug('')
    if (!paper) return () => { active = false }

    if (paper.fileUrl) {
      fetch(paper.fileUrl, { method: 'HEAD' })
        .then((response) => {
          const contentType = response.headers.get('content-type') ?? ''
          if (active) setPdfAvailable(response.ok && contentType.toLowerCase().includes('pdf'))
        })
        .catch(() => active && setPdfAvailable(false))
    } else {
      setPdfAvailable(false)
    }

    if (paper.examination !== 'CSS') {
      setTranscriptReady(true)
      return () => { active = false }
    }

    const requestedSubject = analysisSubjectAliases[normalized(paper.subject)] ?? normalized(paper.subject)
    loadPastPaperAnalysis()
      .then((data) => {
        if (!active) return
        const subject = data.subjects.find((item) => normalized(item.name) === requestedSubject)
        setAnalysisSubjectSlug(subject?.slug ?? '')
        const questions = subject?.sections.flatMap((section) => section.topics.flatMap((topic) => (
          topic.questions
            .filter((question) => question.year === paper.year && questionBelongsToPaper(question, paper))
            .map((question) => ({ ...question, topic: topic.title }))
        ))) ?? []
        const unique = [...new Map(questions.map((question) => [question.id, question])).values()]
          .sort((left, right) => Number.parseInt(left.number.replace(/\D/g, ''), 10) - Number.parseInt(right.number.replace(/\D/g, ''), 10))
        setTranscript(unique)
        setTranscriptReady(true)
      })
      .catch(() => active && setTranscriptReady(true))

    return () => { active = false }
  }, [paper])

  if (!paper) {
    return (
      <div>
        <PageHeader title="Past Paper Viewer" description="Open a supplied past-paper record from the organised archive." />
        <div className="mx-auto max-w-4xl px-4 py-12">
          <EmptyState title="This past paper is unavailable" hint="Return to the archive and choose another paper." />
          <div className="mt-4 text-center">
            <Link to="/past-papers" className="text-sm font-bold text-emerald-800 underline underline-offset-2">
              Return to Past Papers
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={paperPageTitle(paper)} description={paperPageDescription(paper)}>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="gray">{paper.examination}</Badge>
          <Badge tone="gray">{paper.year}</Badge>
          <Badge tone="gray">{paper.subject}</Badge>
          <Badge tone="gray">{paper.paper}</Badge>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-4">
          <FileText className="h-5 w-5 text-emerald-800" />
          <div className="mr-auto">
            <p className="text-sm font-bold text-pine">{pdfAvailable ? 'Original PDF' : 'Verified paper record'}</p>
            <p className="text-xs text-muted-foreground">
              {pdfAvailable === null
                ? 'Checking the supplied source file…'
                : pdfAvailable
                  ? 'The supplied document is available in its original format.'
                  : 'Question wording below is preserved from the supplied topic-wise analysis; unavailable source files are never replaced with invented content.'}
            </p>
          </div>
          {pdfAvailable && paper.fileUrl && <>
            <a href={paper.fileUrl} target="_blank" rel="noopener noreferrer" data-google-vignette="false" className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-bold text-pine hover:bg-secondary">
              <ExternalLink className="h-4 w-4" /> Open full window
            </a>
            <a href={paper.fileUrl} download data-google-vignette="false" className="inline-flex h-10 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900">
              <Download className="h-4 w-4" /> Download
            </a>
          </>}
        </div>

        <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_PAST_PAPER_TOP} format="horizontal" className="min-h-24" label="Past paper advertisement 1 of 2" />

        {pdfAvailable && paper.fileUrl ? (
          <section aria-label={`${paper.title} PDF viewer`} className="overflow-hidden rounded-xl border bg-white">
            <iframe src={paper.fileUrl} title={paper.title} className="h-[72vh] min-h-[520px] w-full" />
          </section>
        ) : (
          <section aria-labelledby="paper-transcript-title" className="rounded-2xl border bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-700">Supplied question transcription</p>
                <h2 id="paper-transcript-title" className="mt-1 font-display text-2xl font-bold text-pine">Questions recovered for {paper.year}</h2>
              </div>
              {analysisSubjectSlug && <Link to={`/css-past-paper-analysis?subject=${encodeURIComponent(analysisSubjectSlug)}&year=${paper.year}`} className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-bold text-pine hover:bg-secondary"><FileSearch className="h-4 w-4" /> Topic-wise analysis</Link>}
            </div>

            {!transcriptReady ? (
              <div className="grid min-h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-700" aria-label="Loading supplied questions" /></div>
            ) : transcript.length ? (
              <ol className="mt-5 space-y-3">
                {transcript.map((question) => (
                  <li key={question.id} className="rounded-xl border bg-secondary/20 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700"><span>{question.number}</span><span aria-hidden="true">·</span><span>{question.paper}</span><span aria-hidden="true">·</span><span>{question.topic}</span></div>
                    <p className="mt-2 text-sm leading-7 text-foreground">{question.text}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-5"><EmptyState title="No reliable question transcription was recovered" hint="This source record is kept for archive completeness without guessing or inventing missing question text." /></div>
            )}
          </section>
        )}

        <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_PAST_PAPER_BOTTOM} format="horizontal" className="min-h-24" label="Past paper advertisement 2 of 2" />
      </div>
    </div>
  )
}
