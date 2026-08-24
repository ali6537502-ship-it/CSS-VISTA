import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  BadgeCheck, CalendarDays, Calculator, Check, ChevronRight, CircleAlert,
  Clock3, Eye, FilePenLine, LockKeyhole, MessageCircle, Printer, Save, ShieldCheck,
  Shuffle, Sparkles, Trash2, X,
} from 'lucide-react'
import { Badge, PageHeader, Section } from '@/components/shared'
import { testSeriesAnnouncements as seed } from '@/data/testSeries'
import { mergedAnnouncements } from '@/lib/admin'
import { mentors, waLink } from '@/data/site'
import {
  buildTestSeriesSchedule, compulsoryTestSeriesSubjects, getTestSeriesPrice,
  optionalTestSeriesSubjects, rebalanceTestSeriesSyllabus, type TestSeriesScheduleItem, type TestSeriesScheduleMode,
  type TestSeriesSubject,
} from '@/data/customTestSeries'
import {
  deleteCustomTestSeriesRequest, getState, markCustomTestSeriesRequestSent,
  saveCustomTestSeriesRequest,
} from '@/lib/store'
import { usePageBack } from '@/lib/backNavigation'
import { submitTestSeriesRequest } from '@/lib/testSeriesRequests'
import { useAccount } from '@/lib/accountContext'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'
import { printPage } from '@/components/PrintMenu'

const input = 'mt-1.5 h-11 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

interface CheckedMockSample { id: string; test: string; subject: string; pages: number }

const checkedMockSamples: CheckedMockSample[] = [
  { id: 'test-1', test: 'Checked Test 1', subject: 'Criminology', pages: 27 },
  { id: 'test-2', test: 'Checked Test 2', subject: 'European History', pages: 37 },
  { id: 'test-3', test: 'Checked Test 3', subject: 'Current Affairs', pages: 59 },
]

function CheckedMockViewer({ sample, onClose }: { sample: CheckedMockSample; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', close)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = '' }
  }, [onClose])

  return <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 text-white print:hidden" role="dialog" aria-modal="true" aria-label={`${sample.test}: ${sample.subject} checked-paper sample`}><header className="flex items-center justify-between gap-4 border-b border-white/15 px-4 py-3"><div className="min-w-0"><p className="truncate font-semibold">{sample.test} · {sample.subject}</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/65"><ShieldCheck className="h-3.5 w-3.5" /> Genuine checked-paper sample · complete evaluation remains private</p></div><button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/25 hover:bg-white/10" aria-label="Close checked-paper preview"><X className="h-5 w-5" /></button></header><div className="flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6" onContextMenu={(event) => event.preventDefault()}><div className="mx-auto max-w-4xl space-y-5 select-none">{Array.from({ length: sample.pages }, (_, index) => { const page = String(index + 1).padStart(2, '0'); return <div key={page} className="relative overflow-hidden rounded-md bg-white shadow-2xl"><img src={`/checked-mocks/${sample.id}/page-${page}.jpg`} alt={`${sample.test}, ${sample.subject}, checked page ${index + 1}`} draggable={false} loading={index ? 'lazy' : 'eager'} className="w-full" /><div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-3 text-right text-[10px] font-bold uppercase tracking-widest text-white/90">CSS Vista · Checked by Miss Sadia Zahoor</div></div> })}</div></div></div>
}

function todayInput() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function money(value: number) {
  return `Rs. ${new Intl.NumberFormat('en-PK').format(value)}`
}

export default function TestSeries() {
  const announcements = useMemo(() => mergedAnnouncements(seed), [])
  const sadia = mentors.find((mentor) => mentor.id === 'sadia')!
  const { user, configured } = useAccount()
  const [studentName, setStudentName] = useState(() => String(user?.user_metadata?.full_name ?? ''))
  const [phone, setPhone] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<TestSeriesSubject[]>(['English Essay'])
  const [testCount, setTestCount] = useState(12)
  const [mode, setMode] = useState<TestSeriesScheduleMode>('automatic')
  const [alternatePapers, setAlternatePapers] = useState(true)
  const [startDate, setStartDate] = useState(todayInput)
  const [durationDays, setDurationDays] = useState(60)
  const [gapDays, setGapDays] = useState(5)
  const [schedule, setSchedule] = useState<TestSeriesScheduleItem[]>(() => buildTestSeriesSchedule({
    startDate: todayInput(),
    testCount: 12,
    durationDays: 60,
    gapDays: 5,
    mode: 'automatic',
    subjects: ['English Essay'],
  }))
  const [message, setMessage] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [checkedMockPreview, setCheckedMockPreview] = useState<CheckedMockSample | null>(null)
  usePageBack(Boolean(checkedMockPreview), () => setCheckedMockPreview(null))
  const [history, setHistory] = useState(() => getState().customTestSeriesRequests ?? [])
  const price = useMemo(() => getTestSeriesPrice(testCount), [testCount])

  const lastDate = schedule.at(-1)?.date
  const subjectCounts = useMemo(() => {
    const counts = new Map<string, number>()
    schedule.forEach((test) => counts.set(test.subject, (counts.get(test.subject) ?? 0) + 1))
    return [...counts.entries()]
  }, [schedule])

  function toggleSubject(subject: TestSeriesSubject) {
    const next = selectedSubjects.includes(subject)
      ? (selectedSubjects.length === 1 ? selectedSubjects : selectedSubjects.filter((item) => item !== subject))
      : [...selectedSubjects, subject]
    setSelectedSubjects(next)
    setSchedule(buildTestSeriesSchedule({ startDate, testCount, durationDays, gapDays, mode, subjects: next, alternatePapers }))
  }

  function changeMode(next: TestSeriesScheduleMode) {
    setMode(next)
    setSchedule(buildTestSeriesSchedule({ startDate, testCount, durationDays, gapDays, mode: next, subjects: selectedSubjects, alternatePapers }))
  }

  function changeTestCount(next: number) {
    setTestCount(next)
    setSchedule(buildTestSeriesSchedule({ startDate, testCount: next, durationDays, gapDays, mode, subjects: selectedSubjects, alternatePapers }))
  }

  function changeStartDate(next: string) {
    setStartDate(next)
    setSchedule(buildTestSeriesSchedule({ startDate: next, testCount, durationDays, gapDays, mode, subjects: selectedSubjects, alternatePapers }))
  }

  function changeDuration(next: number) {
    setDurationDays(next)
    setSchedule(buildTestSeriesSchedule({ startDate, testCount, durationDays: next, gapDays, mode, subjects: selectedSubjects, alternatePapers }))
  }

  function changeGap(next: number) {
    setGapDays(next)
    setSchedule(buildTestSeriesSchedule({ startDate, testCount, durationDays, gapDays: next, mode, subjects: selectedSubjects, alternatePapers }))
  }

  function changeAlternatePapers(next: boolean) {
    setAlternatePapers(next)
    setSchedule(buildTestSeriesSchedule({ startDate, testCount, durationDays, gapDays, mode, subjects: selectedSubjects, alternatePapers: next }))
  }

  function buildSavedRequest() {
    return saveCustomTestSeriesRequest({
      studentName: studentName.trim(),
      phone: phone.trim(),
      subjects: selectedSubjects,
      testCount,
      schedulingMode: mode,
      alternatePapers,
      startDate,
      durationDays,
      gapDays,
      schedule,
      unitPrice: price.unitPrice,
      totalFee: price.totalFee,
    })
  }

  function printSchedule() {
    printPage(true, '.test-series-print-area')
  }

  function saveDraft() {
    const saved = buildSavedRequest()
    setHistory(getState().customTestSeriesRequests ?? [])
    setMessage(`Draft ${saved.id.slice(-5)} saved with ${saved.testCount} tests.`)
    setShowCelebration(true)
  }

  function sendRequest() {
    if (!studentName.trim()) {
      setMessage('Please enter the student name before requesting the series.')
      return
    }
    const request = buildSavedRequest()
    markCustomTestSeriesRequestSent(request.id)
    setHistory(getState().customTestSeriesRequests ?? [])

    const feeLine = request.totalFee !== null
      ? `${money(request.unitPrice!)} per test; calculated total ${money(request.totalFee)}`
      : 'Fee confirmation required for this number of tests'
    const testList = request.schedule
      .map((test) => `${test.number}. ${test.subject} - ${test.date}\n   Syllabus: ${test.syllabus || 'To be finalized'}`)
      .join('\n')
    const whatsappMessage = [
      'Assalam-o-Alaikum Ma’am, I want a customized CSS test series through CSS Vista.',
      `Student: ${request.studentName}`,
      request.phone ? `Phone: ${request.phone}` : '',
      `Subjects: ${request.subjects.join(', ')}`,
      `Tests: ${request.testCount}`,
      `Schedule: ${request.schedulingMode === 'automatic' ? `${request.durationDays} days, automatically divided` : `${request.gapDays}-day gap`}`,
      `Paper order: ${request.alternatePapers === false ? 'Grouped by subject' : 'Alternate papers active'}`,
      `Starting date: ${request.startDate}`,
      `Fee: ${feeLine}`,
      '',
      'Proposed test plan:',
      testList,
      '',
      'Please confirm availability, final schedule, questions, evaluation process and payment details.',
    ].filter(Boolean).join('\n')

    window.open(waLink(sadia.whatsapp, whatsappMessage), '_blank', 'noopener,noreferrer')

    if (user) {
      void submitTestSeriesRequest(user, { ...request, status: 'request-sent' })
        .then(() => setMessage('Request saved to your account and opened in WhatsApp.'))
        .catch(() => setMessage('WhatsApp opened. Account sync is pending, and your draft remains available here.'))
    } else {
      setMessage('Request opened in WhatsApp. Sign in to keep future requests with your account.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Customized Written Test Series"
        description="Build a personalised written-test and mock schedule by Ms. Sadia Zahoor. Alternate papers, divide the selected syllabus across your tests, edit every date and print the final plan. This builder does not include MPT mocks."
      />

      <section className="test-series-print-area" aria-label="Printable customized test-series schedule">
        <div className="mb-5 border-b-2 border-emerald-900 pb-3">
          <h1 className="text-2xl font-bold text-emerald-950">Customized Written Test Series</h1>
          <p className="mt-1 text-sm font-semibold">By Ms. Sadia Zahoor · CSS VISTA</p>
          <p className="mt-1 text-xs">Student: {studentName.trim() || '________________'} · Generated: {new Date().toLocaleDateString('en-PK')}</p>
        </div>
        <table className="w-full border-collapse text-left text-[10px]">
          <thead>
            <tr><th>Test</th><th>Date</th><th>Paper</th><th>Divided syllabus</th></tr>
          </thead>
          <tbody>
            {schedule.map((test) => (
              <tr key={`print-${test.number}`}>
                <td>{test.number}</td><td>{test.date}</td><td>{test.subject}</td><td>{test.syllabus}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-[9px] text-slate-600">Proposed student schedule. Final paper dates, questions, evaluation and availability remain subject to confirmation by Ms. Sadia Zahoor.</p>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        <section className="test-series-hero overflow-hidden rounded-2xl bg-pine text-white shadow-[0_18px_55px_rgba(6,63,49,0.18)]">
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <img src={sadia.photo} alt="Ms. Sadia Zahoor" className="h-12 w-12 rounded-xl border border-white/25 object-cover shadow-md" />
                <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-300"><Sparkles className="h-4 w-4" /> By Ms. Sadia Zahoor</p>
              </div>
              <h2 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">Build your written test series around your preparation</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/78">Choose the papers, rotate them on alternate dates, divide the complete syllabus and edit every test before printing or requesting evaluation.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-emerald-50">
                <span className="rounded-full bg-white/10 px-3 py-1.5"><Shuffle className="mr-1.5 inline h-3.5 w-3.5 text-amber-300" />Alternate papers</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5"><BadgeCheck className="mr-1.5 inline h-3.5 w-3.5 text-amber-300" />Divided syllabus</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5"><Printer className="mr-1.5 inline h-3.5 w-3.5 text-amber-300" />Branded print plan</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/8 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200">Live plan preview</p><p className="mt-0.5 text-xs text-white/65">Updates as you customize</p></div>
                <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[9px] font-extrabold text-emerald-950">{testCount} tests</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {schedule.slice(0, 4).map((test) => (
                  <div key={`${test.number}-${test.subject}-${test.date}-${alternatePapers}`} className="test-series-preview-card rounded-lg border border-white/10 bg-emerald-950/35 p-2.5">
                    <div className="flex items-center justify-between gap-2"><span className="text-[9px] font-extrabold text-amber-300">TEST {test.number}</span><span className="text-[8px] text-emerald-100/60">{test.date}</span></div>
                    <p className="mt-1 line-clamp-1 text-[11px] font-bold">{test.subject}</p>
                    <p className="mt-0.5 line-clamp-1 text-[8px] text-emerald-100/60">{test.syllabus}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:p-6">
          <div><p className="text-xs font-bold uppercase tracking-[.15em] text-amber-800">Test Series & Evaluation</p><h2 className="mt-2 font-display text-xl font-bold text-pine">See how written papers are checked</h2><p className="mt-2 text-sm leading-relaxed text-amber-950">Explore genuine sample evaluations from the written test series by Miss Sadia Zahoor. Students may also inquire about live paper evaluation on Google Meet.</p></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">{checkedMockSamples.map((sample) => <article key={sample.id} className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-amber-800">{sample.test}</p><h3 className="mt-1 font-bold text-pine">{sample.subject}</h3></div><LockKeyhole className="h-4 w-4 text-amber-700" /></div><p className="mt-2 text-xs text-muted-foreground">{sample.pages} checked pages</p><button type="button" onClick={() => setCheckedMockPreview(sample)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-bold text-pine hover:bg-amber-100"><Eye className="h-4 w-4" /> View checked sample</button></article>)}</div>
          <a href={waLink(sadia.whatsapp, 'Assalam-o-Alaikum, I want information about the CSS Vista written test series, paper checking and live evaluation by Miss Sadia Zahoor.')} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900"><MessageCircle className="h-4 w-4" /> Inquire about evaluation</a>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="min-w-0 space-y-7">
            <Section title="1. Select written papers" description="Choose one or more papers. They are placed in an alternating sequence and can be changed individually below.">
              <div className="rounded-xl border bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Compulsory subjects</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {compulsoryTestSeriesSubjects.map((subject) => (
                    <button
                      type="button"
                      key={subject}
                      onClick={() => toggleSubject(subject)}
                      className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${selectedSubjects.includes(subject) ? 'border-emerald-700 bg-emerald-50 text-pine' : 'hover:bg-secondary'}`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selectedSubjects.includes(subject) ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-input'}`}>
                        {selectedSubjects.includes(subject) && <Check className="h-3.5 w-3.5" />}
                      </span>
                      {subject}
                    </button>
                  ))}
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-wider text-emerald-800">Optional subjects taught by Ms. Sadia Zahoor</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {optionalTestSeriesSubjects.map((subject) => (
                    <button
                      type="button"
                      key={subject}
                      onClick={() => toggleSubject(subject)}
                      className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${selectedSubjects.includes(subject) ? 'border-amber-500 bg-amber-50 text-pine' : 'hover:bg-secondary'}`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selectedSubjects.includes(subject) ? 'border-amber-500 bg-amber-500 text-white' : 'border-input'}`}>
                        {selectedSubjects.includes(subject) && <Check className="h-3.5 w-3.5" />}
                      </span>
                      {subject}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="2. Set the timing" description="Automatic mode divides the tests across your selected number of days. Fixed-gap mode follows the gap you choose.">
              <div className="rounded-xl border bg-white p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => changeMode('automatic')} className={`rounded-xl border p-4 text-left ${mode === 'automatic' ? 'border-emerald-700 bg-emerald-50' : 'hover:bg-secondary'}`}>
                    <Calculator className="h-5 w-5 text-emerald-800" />
                    <p className="mt-2 font-bold text-pine">Divide automatically</p>
                    <p className="mt-1 text-xs text-muted-foreground">Choose total days; the system spaces the tests.</p>
                  </button>
                  <button type="button" onClick={() => changeMode('fixed-gap')} className={`rounded-xl border p-4 text-left ${mode === 'fixed-gap' ? 'border-emerald-700 bg-emerald-50' : 'hover:bg-secondary'}`}>
                    <FilePenLine className="h-5 w-5 text-emerald-800" />
                    <p className="mt-2 font-bold text-pine">Choose the gap</p>
                    <p className="mt-1 text-xs text-muted-foreground">Set days between tests, then edit any row.</p>
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-emerald-800 shadow-sm"><Shuffle className="h-4 w-4" /></span>
                    <span><span className="block text-sm font-bold text-pine">Alternate papers</span><span className="mt-0.5 block text-xs text-muted-foreground">Rotate selected subjects instead of completing one subject at a time.</span></span>
                  </span>
                  <button type="button" role="switch" aria-checked={alternatePapers} onClick={() => changeAlternatePapers(!alternatePapers)} className={`cssv-tap relative h-7 w-12 shrink-0 rounded-full transition-colors ${alternatePapers ? 'bg-emerald-700' : 'bg-slate-300'}`} aria-label="Use alternate-paper scheduling">
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${alternatePapers ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-pine">
                    Number of tests
                    <input type="number" min={1} max={60} value={testCount} onChange={(event) => changeTestCount(Math.max(1, Math.min(60, Number(event.target.value) || 1)))} className={input} />
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {[6, 12, 24, 48].map((count) => <button key={count} type="button" onClick={() => changeTestCount(count)} className={`cssv-tap rounded-md border px-2.5 py-1 text-[10px] font-bold ${testCount === count ? 'border-emerald-700 bg-emerald-700 text-white' : 'bg-white text-slate-500 hover:border-emerald-300'}`}>{count}</button>)}
                    </span>
                  </label>
                  <label className="text-sm font-semibold text-pine">
                    Starting date
                    <input type="date" value={startDate} onChange={(event) => changeStartDate(event.target.value)} className={input} />
                  </label>
                  {mode === 'automatic' ? (
                    <label className="text-sm font-semibold text-pine sm:col-span-2">
                      Complete the series within how many days?
                      <input type="number" min={1} max={730} value={durationDays} onChange={(event) => changeDuration(Math.max(1, Math.min(730, Number(event.target.value) || 1)))} className={input} />
                    </label>
                  ) : (
                    <label className="text-sm font-semibold text-pine sm:col-span-2">
                      Gap between each test (days)
                      <input type="number" min={1} max={90} value={gapDays} onChange={(event) => changeGap(Math.max(1, Math.min(90, Number(event.target.value) || 1)))} className={input} />
                    </label>
                  )}
                </div>
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs leading-relaxed text-emerald-950">
                  <strong>{alternatePapers ? 'Alternate-paper rotation is active.' : 'Subjects are grouped.'}</strong>{' '}
                  {alternatePapers
                    ? 'Your selected papers repeat in order across the schedule—for example, English Essay, Islamic Studies, Pakistan Affairs, then English Essay again.'
                    : 'The schedule completes the allocated tests for one selected subject before moving to the next.'}
                </div>
              </div>
            </Section>

            <Section title="3. Review the divided syllabus" description="CSS Vista divides the syllabus according to the number of tests. Change any date, paper or syllabus unit before sending the request.">
              <div className="overflow-x-auto rounded-xl border bg-white">
                <div className="grid min-w-[760px] grid-cols-[3.5rem_8rem_13rem_minmax(19rem,1fr)] gap-2 bg-secondary/70 px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <span>Test</span><span>Date</span><span>Paper</span><span>Divided syllabus</span>
                </div>
                <div className="max-h-[38rem] min-w-[760px] divide-y overflow-y-auto">
                  {schedule.map((test, index) => (
                    <div key={test.number} className="grid grid-cols-[3.5rem_8rem_13rem_minmax(19rem,1fr)] items-center gap-2 px-3 py-2.5">
                      <span className="font-bold text-pine">{test.number}</span>
                      <input
                        type="date"
                        aria-label={`Test ${test.number} date`}
                        value={test.date}
                        onChange={(event) => setSchedule((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, date: event.target.value } : item))}
                        className="h-9 min-w-0 rounded-md border px-2 text-xs"
                      />
                      <select
                        aria-label={`Test ${test.number} subject`}
                        value={test.subject}
                        onChange={(event) => setSchedule((current) => rebalanceTestSeriesSyllabus(current.map((item, itemIndex) => itemIndex === index ? { ...item, subject: event.target.value as TestSeriesSubject } : item)))}
                        className="h-9 min-w-0 rounded-md border px-2 text-xs"
                      >
                        <optgroup label="Compulsory">
                          {compulsoryTestSeriesSubjects.map((subject) => <option key={subject}>{subject}</option>)}
                        </optgroup>
                        <optgroup label="Optional">
                          {optionalTestSeriesSubjects.map((subject) => <option key={subject}>{subject}</option>)}
                        </optgroup>
                      </select>
                      <textarea
                        aria-label={`Test ${test.number} divided syllabus`}
                        value={test.syllabus}
                        onChange={(event) => setSchedule((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, syllabus: event.target.value } : item))}
                        rows={2}
                        className="min-h-[3.25rem] min-w-0 resize-y rounded-md border px-2 py-1.5 text-xs leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          </div>

          <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="bg-pine p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Your proposed series</p>
                <p className="mt-2 text-3xl font-bold">{testCount} tests</p>
                <p className="mt-1 text-sm text-emerald-100">{selectedSubjects.length} subject{selectedSubjects.length === 1 ? '' : 's'} · {startDate} to {lastDate}</p>
              </div>
              <div className="space-y-5 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Calculated fee</p>
                  {price.totalFee !== null ? (
                    <>
                      <p className="mt-1 text-3xl font-bold text-pine">{money(price.totalFee)}</p>
                      <p className="text-sm text-muted-foreground">{price.label}</p>
                    </>
                  ) : (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="flex items-center gap-2 font-bold text-amber-900"><CircleAlert className="h-4 w-4" /> Fee confirmation required</p>
                      <p className="mt-1 text-xs text-amber-800">No price was specified for {testCount} tests, so the website will not estimate one.</p>
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-secondary/60 p-3 text-sm">
                  <p className="font-bold text-pine">Subject distribution</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {subjectCounts.map(([subject, count]) => <li key={subject} className="flex justify-between gap-3"><span>{subject}</span><strong className="text-pine">{count}</strong></li>)}
                  </ul>
                </div>

                <label className="block text-sm font-semibold text-pine">
                  Student name
                  <input value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Your full name" className={input} />
                </label>
                <label className="block text-sm font-semibold text-pine">
                  WhatsApp number <span className="font-normal text-muted-foreground">(optional)</span>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="03XX-XXXXXXX" className={input} />
                </label>

                <div className="grid gap-2">
                  <button type="button" onClick={sendRequest} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900">
                    <MessageCircle className="h-4 w-4" /> Request from Ms. Sadia Zahoor
                  </button>
                  <button type="button" onClick={saveDraft} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-bold text-pine hover:bg-secondary">
                    <Save className="h-4 w-4" /> Save schedule draft
                  </button>
                  <button type="button" onClick={printSchedule} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-pine hover:bg-emerald-100">
                    <Printer className="h-4 w-4" /> Print or save as PDF
                  </button>
                </div>
                {message && <p className="rounded-md bg-emerald-50 p-3 text-xs font-medium text-emerald-900" role="status">{message}</p>}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This builder covers the written test series and grand mocks conducted by Ms. Sadia Zahoor. It does not create or include MPT mocks. The series begins only after availability, dates, evaluation and payment are confirmed.
                </p>
                {!user && configured && <Link to="/account" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline">Sign in to sync requests <ChevronRight className="h-3.5 w-3.5" /></Link>}
              </div>
            </div>

            <div className="rounded-xl border bg-secondary/45 p-4">
              <h3 className="flex items-center gap-2 font-bold text-pine"><Clock3 className="h-4 w-4" /> Published fee rules</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex justify-between gap-3"><span>1–12 tests</span><strong className="text-pine">Rs. 1,200 each</strong></li>
                <li className="flex justify-between gap-3"><span>Exactly 24 tests</span><strong className="text-pine">Rs. 1,000 each</strong></li>
                <li className="flex justify-between gap-3"><span>More than 36 tests</span><strong className="text-pine">Rs. 800 each</strong></li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Other quantities require direct fee confirmation.</p>
            </div>
          </aside>
        </div>

        {history.length > 0 && (
          <Section title="My saved test-series plans" description="Your customized plans and synced student-account history.">
            <div className="grid gap-3 md:grid-cols-2">
              {history.map((request) => (
                <article key={request.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone={request.status === 'request-sent' ? 'green' : 'gray'}>{request.status === 'request-sent' ? 'Request opened' : 'Draft'}</Badge>
                      <h3 className="mt-2 font-bold text-pine">{request.testCount} tests · {request.subjects.length} subjects</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Starts {request.startDate} · {request.totalFee === null ? 'Fee to be confirmed' : money(request.totalFee)}</p>
                    </div>
                    <button type="button" onClick={() => { deleteCustomTestSeriesRequest(request.id); setHistory(getState().customTestSeriesRequests ?? []) }} aria-label="Delete saved test-series plan" className="rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </article>
              ))}
            </div>
          </Section>
        )}

        <Section title="Test-series announcements" description="Official schedules, posters and registration updates appear here.">
          <div className="space-y-5">
            {announcements.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No announcements yet.</p>}
            {announcements.map((announcement) => (
              <article key={announcement.id} className="overflow-hidden rounded-xl border bg-white">
                {announcement.posterUrl && <img src={announcement.posterUrl} alt={`Poster - ${announcement.title}`} loading="lazy" decoding="async" className="max-h-96 w-full bg-secondary object-contain" />}
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2"><Badge>Announcement</Badge><span className="text-xs text-muted-foreground">{announcement.date}</span>{announcement.startDate && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800"><CalendarDays className="h-3.5 w-3.5" /> Starts: {announcement.startDate}</span>}</div>
                  <h2 className="mt-2 font-display text-xl font-bold text-pine">{announcement.title}</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{announcement.body}</p>
                  {announcement.registrationInfo && <p className="mt-3 rounded-md bg-secondary/70 px-3.5 py-2.5 text-sm font-medium">{announcement.registrationInfo}</p>}
                </div>
              </article>
            ))}
          </div>
        </Section>
      </div>
      <MilestoneCelebration
        open={showCelebration}
        title="Your written-test plan is ready"
        description={`${testCount} tests have been saved with dates, paper order and divided syllabus.`}
        onClose={() => setShowCelebration(false)}
      />
      {checkedMockPreview && <CheckedMockViewer sample={checkedMockPreview} onClose={() => setCheckedMockPreview(null)} />}
    </div>
  )
}
