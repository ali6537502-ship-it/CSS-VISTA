import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  BadgeCheck, CalendarDays, Calculator, Check, ChevronRight, CircleAlert,
  Clock3, FilePenLine, MessageCircle, Save, Sparkles, Trash2,
} from 'lucide-react'
import { Badge, PageHeader, Section } from '@/components/shared'
import { testSeriesAnnouncements as seed } from '@/data/testSeries'
import { mergedAnnouncements } from '@/lib/admin'
import { mentors, waLink } from '@/data/site'
import {
  buildTestSeriesSchedule, compulsoryTestSeriesSubjects, getTestSeriesPrice,
  optionalTestSeriesSubjects, type TestSeriesScheduleItem, type TestSeriesScheduleMode,
  type TestSeriesSubject,
} from '@/data/customTestSeries'
import {
  deleteCustomTestSeriesRequest, getState, markCustomTestSeriesRequestSent,
  saveCustomTestSeriesRequest,
} from '@/lib/store'
import { submitTestSeriesRequest } from '@/lib/testSeriesRequests'
import { useAccount } from '@/lib/accountContext'

const input = 'mt-1.5 h-11 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

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
    setSchedule(buildTestSeriesSchedule({ startDate, testCount, durationDays, gapDays, mode, subjects: next }))
  }

  function changeMode(next: TestSeriesScheduleMode) {
    setMode(next)
    setSchedule(buildTestSeriesSchedule({ startDate, testCount, durationDays, gapDays, mode: next, subjects: selectedSubjects }))
  }

  function changeTestCount(next: number) {
    setTestCount(next)
    setSchedule(buildTestSeriesSchedule({ startDate, testCount: next, durationDays, gapDays, mode, subjects: selectedSubjects }))
  }

  function changeStartDate(next: string) {
    setStartDate(next)
    setSchedule(buildTestSeriesSchedule({ startDate: next, testCount, durationDays, gapDays, mode, subjects: selectedSubjects }))
  }

  function changeDuration(next: number) {
    setDurationDays(next)
    setSchedule(buildTestSeriesSchedule({ startDate, testCount, durationDays: next, gapDays, mode, subjects: selectedSubjects }))
  }

  function changeGap(next: number) {
    setGapDays(next)
    setSchedule(buildTestSeriesSchedule({ startDate, testCount, durationDays, gapDays: next, mode, subjects: selectedSubjects }))
  }

  function buildSavedRequest() {
    return saveCustomTestSeriesRequest({
      studentName: studentName.trim(),
      phone: phone.trim(),
      subjects: selectedSubjects,
      testCount,
      schedulingMode: mode,
      startDate,
      durationDays,
      gapDays,
      schedule,
      unitPrice: price.unitPrice,
      totalFee: price.totalFee,
    })
  }

  function saveDraft() {
    const saved = buildSavedRequest()
    setHistory(getState().customTestSeriesRequests ?? [])
    setMessage(`Draft ${saved.id.slice(-5)} saved with ${saved.testCount} tests.`)
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
      .map((test) => `${test.number}. ${test.subject} - ${test.date}`)
      .join('\n')
    const whatsappMessage = [
      'Assalam-o-Alaikum Ma’am, I want a customized CSS test series through CSS Vista.',
      `Student: ${request.studentName}`,
      request.phone ? `Phone: ${request.phone}` : '',
      `Subjects: ${request.subjects.join(', ')}`,
      `Tests: ${request.testCount}`,
      `Schedule: ${request.schedulingMode === 'automatic' ? `${request.durationDays} days, automatically divided` : `${request.gapDays}-day gap`}`,
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
        .catch(() => setMessage('WhatsApp opened. The account copy could not sync, but your draft remains saved on this device.'))
    } else {
      setMessage('Request opened in WhatsApp and saved on this device. Sign in to keep future requests with your account.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Customized CSS Test Series"
        description="Build a personalised test plan for evaluation by Miss Sadia Zahoor, PAS. Choose the subjects, number of tests and timing, then edit the proposed schedule before requesting confirmation."
      />

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="vista-card p-4">
            <Sparkles className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 font-bold text-pine">Mentor-customized</p>
            <p className="mt-1 text-xs text-muted-foreground">Final questions, checking and feedback are confirmed by Miss Sadia.</p>
          </div>
          <div className="vista-card p-4">
            <CalendarDays className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 font-bold text-pine">Automatic or student-planned</p>
            <p className="mt-1 text-xs text-muted-foreground">Distribute tests across a duration or choose the gap and edit every date.</p>
          </div>
          <div className="vista-card p-4">
            <BadgeCheck className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 font-bold text-pine">11 supported subjects</p>
            <p className="mt-1 text-xs text-muted-foreground">All six compulsory papers and five selected optional subjects.</p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-7">
            <Section title="1. Select papers" description="Choose one or more subjects. Tests are divided evenly and can be changed individually below.">
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
                <p className="mt-5 text-xs font-bold uppercase tracking-wider text-emerald-800">Optional subjects taught by Miss Sadia</p>
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

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-pine">
                    Number of tests
                    <input type="number" min={1} max={60} value={testCount} onChange={(event) => changeTestCount(Math.max(1, Math.min(60, Number(event.target.value) || 1)))} className={input} />
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
              </div>
            </Section>

            <Section title="3. Review or edit every test" description="Change any proposed subject or date before sending the request.">
              <div className="overflow-hidden rounded-xl border bg-white">
                <div className="grid grid-cols-[3.5rem_1fr_1.25fr] gap-2 bg-secondary/70 px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <span>Test</span><span>Date</span><span>Subject</span>
                </div>
                <div className="max-h-[34rem] divide-y overflow-y-auto">
                  {schedule.map((test, index) => (
                    <div key={test.number} className="grid grid-cols-[3.5rem_1fr_1.25fr] items-center gap-2 px-3 py-2.5">
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
                        onChange={(event) => setSchedule((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, subject: event.target.value as TestSeriesSubject } : item))}
                        className="h-9 min-w-0 rounded-md border px-2 text-xs"
                      >
                        <optgroup label="Compulsory">
                          {compulsoryTestSeriesSubjects.map((subject) => <option key={subject}>{subject}</option>)}
                        </optgroup>
                        <optgroup label="Optional">
                          {optionalTestSeriesSubjects.map((subject) => <option key={subject}>{subject}</option>)}
                        </optgroup>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
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
                    <MessageCircle className="h-4 w-4" /> Request from Miss Sadia
                  </button>
                  <button type="button" onClick={saveDraft} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-bold text-pine hover:bg-secondary">
                    <Save className="h-4 w-4" /> Save schedule draft
                  </button>
                </div>
                {message && <p className="rounded-md bg-emerald-50 p-3 text-xs font-medium text-emerald-900" role="status">{message}</p>}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This is a planning and request tool. The series begins only after Miss Sadia confirms availability, dates, evaluation process and payment.
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
          <Section title="My saved test-series plans" description="Plans saved on this device or synced through your student account.">
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
                {announcement.posterUrl && <img src={announcement.posterUrl} alt={`Poster - ${announcement.title}`} className="max-h-96 w-full bg-secondary object-contain" />}
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
    </div>
  )
}
