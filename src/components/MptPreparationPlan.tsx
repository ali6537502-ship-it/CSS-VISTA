import { useState } from 'react'
import { Link } from 'react-router'

type Day = { phase: string; focus: string; tasks: string[] }

const foundation = (math: string, language: string) => [
  `General Ability (about 2½ hours): ${math}. For each topic, study the concept for 20 minutes, solve 40–60 MCQs and record errors.`,
  'English (1½–2 hours): revise old words; study 20 synonyms, 20 antonyms, 10 idioms and 10 confusing pairs; practise grammar, correction and comprehension.',
  `Islamiat + Urdu (about 1½ hours): ${language}`,
  'General Knowledge (about 2 hours): practise questions on today’s focus and add unfamiliar facts to your error book.',
]

const days: Day[] = [
  { phase: 'Foundation', focus: 'Pakistan and physical geography', tasks: ['Rivers, dams, mountains, passes, deserts, lakes, provinces and borders.', ...foundation('percentages, averages, ratio and proportion', 'Seerah chronology and basic beliefs; Urdu مذکر مؤنث and واحد جمع.') ] },
  { phase: 'Foundation', focus: 'Pakistan history', tasks: ['1857 onward, Sir Syed, Muslim League, constitutional developments, Pakistan Movement, 1940–47 and later milestones.', ...foundation('fractions, decimals, profit and loss, simple interest', 'Urdu مترادف, متضاد and محاورات; revise Islamic history.') ] },
  { phase: 'Foundation', focus: 'Pakistan constitutional basics', tasks: ['Constitutions, key dates, parliament, executive, judiciary, federal structure and institutions: objective facts only.', ...foundation('compound interest, time and work, time–speed–distance', 'Ghazwat, Khulafa-e-Rashideen and important personalities; Urdu spelling.') ] },
  { phase: 'Foundation', focus: 'Everyday Science', tasks: ['Human body, diseases, vitamins, physics, chemistry, biology, environment, energy, solar system and measurements.', ...foundation('ages, basic algebra, number series and sequences', 'Urdu sentence correction, spelling and translation; revise Quranic terminology.') ] },
  { phase: 'Foundation', focus: 'World GK through current affairs', tasks: ['Countries and locations, international organisations, UN system, headquarters and treaties relevant to current affairs.', ...foundation('basic geometry, logical and analytical reasoning', 'Surahs, Islamic institutions and important events; Urdu محاورات.') ] },
  { phase: 'Foundation', focus: 'Current affairs', tasks: ['Pakistan and world events: dates, places, members, themes and outcomes; verify changing facts.', ...foundation('mental ability and mixed arithmetic revision', 'Urdu grammar and basic translation; revise Islamiat weak areas.') ] },
  { phase: 'Consolidation', focus: 'Arithmetic intensive', tasks: ['70–100 General Ability MCQs: percentage, average, ratio, fractions, number systems and series.', '60–80 English MCQs; 80–100 GK MCQs; 30–50 each in Islamiat and Urdu.', 'Classify wrong answers: K knowledge, C concept, S careless error, G guess.', 'Correct mistakes and update the error book.'] },
  { phase: 'Consolidation', focus: 'Applied mathematics and Pakistan Affairs', tasks: ['70–100 General Ability MCQs: time and work, speed, profit and loss, interest and algebra.', '60–80 English MCQs; 80–100 GK with extra Pakistan Affairs; 30–50 each in Islamiat and Urdu.', 'Classify wrong answers K/C/S/G and correct them in the error book.'] },
  { phase: 'Consolidation', focus: 'Reasoning and science', tasks: ['70–100 General Ability MCQs: logic, analysis, sequences, mental ability and geometry.', '60–80 English MCQs; 80–100 GK with extra Everyday Science; 30–50 each in Islamiat and Urdu.', 'Classify wrong answers K/C/S/G and correct them in the error book.'] },
  { phase: 'Consolidation', focus: 'English intensive', tasks: ['60–80 English MCQs: vocabulary, prepositions, correction, idioms and comprehension.', '70–100 General Ability MCQs; 100 mixed GK questions; 30–50 each in Islamiat and Urdu.', 'Classify wrong answers K/C/S/G and correct them in the error book.'] },
  { phase: 'Consolidation', focus: 'Mixed revision and first full mock', tasks: ['Practise weak areas, current affairs, Islamiat and Urdu.', 'Attempt one 200 question mock in 200 minutes under exam conditions.', 'Analyse score and time by section; classify K/C/S/G mistakes and update the error book.'] },
  { phase: 'Examination mode', focus: 'Full mock and weak areas', tasks: ['Attempt a fresh 200 question mock in 200 minutes.', 'Review every error and identify the lowest scoring large section.', 'Revise the concepts behind errors, then retry those topics.'] },
  { phase: 'Examination mode', focus: 'Second full mock', tasks: ['Attempt a fresh 200 question mock in 200 minutes.', 'Compare subject accuracy and time with the previous paper.', 'Focus revision on the weakest large section and your error book.'] },
  { phase: 'Examination mode', focus: 'Last serious mock', tasks: ['Attempt a fresh 200 question mock in 200 minutes.', 'Review errors, formulas, vocabulary, Pakistan and science facts, current affairs, Islamiat and Urdu.', 'Practise three rounds: sure questions, thinking questions, then remaining questions.'] },
  { phase: 'Final revision', focus: 'Revise and rest', tasks: ['Morning: formulas and previously missed mathematics.', 'Afternoon: Pakistan Affairs, science and verified current affairs facts.', 'Evening: English vocabulary, Urdu and Islamiat.', 'Read the error book once, stop, and sleep properly.'] },
]

const STORAGE_KEY = 'cssvista:mpt-15-day-plan:v1'
const ERROR_BOOK_KEY = 'cssvista:mpt-error-book:v1'
const errorTypes = [
  ['K', 'Knowledge gap', 'A fact I did not know'],
  ['C', 'Concept gap', 'A rule or method I need to understand'],
  ['S', 'Careless mistake', 'What I misread or miscalculated'],
  ['G', 'Guess', 'What I guessed and must check'],
] as const

function initialChecks(): Record<string, boolean> {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
  } catch { return {} }
}

export default function MptPreparationPlan() {
  const [checks, setChecks] = useState<Record<string, boolean>>(initialChecks)
  const [errors, setErrors] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(ERROR_BOOK_KEY) || '{}') } catch { return {} }
  })
  const [openDay, setOpenDay] = useState(() => {
    const saved = initialChecks()
    return Math.max(0, days.findIndex((day, index) => day.tasks.some((_, task) => !saved[`${index}-${task}`])))
  })
  const total = days.reduce((sum, day) => sum + day.tasks.length, 0)
  const completed = days.reduce((sum, day, index) => sum + day.tasks.filter((_, task) => checks[`${index}-${task}`]).length, 0)

  function toggle(key: string) {
    const next = { ...checks, [key]: !checks[key] }
    setChecks(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* keep current tab usable */ }
  }

  function updateError(type: string, value: string) {
    const next = { ...errors, [type]: value }
    setErrors(next)
    try { localStorage.setItem(ERROR_BOOK_KEY, JSON.stringify(next)) } catch { /* keep current tab usable */ }
  }

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6" aria-labelledby="mpt-plan-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Your preparation tracker</p>
          <h2 id="mpt-plan-title" className="mt-1 font-display text-xl font-bold text-pine sm:text-2xl">15 day MPT plan</h2>
          <p className="mt-1 text-sm text-muted-foreground">Concept → MCQs → mistakes → revision. Tick each task as you complete it.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-900">{completed}/{total} done</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100" role="progressbar" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total} aria-label="MPT plan progress">
        <div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${100 * completed / total}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Your ticks are saved on this device. Days 1–6 build the core, days 7–11 build accuracy, and days 12–15 simulate the exam and revise.</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        {[
          ['General Ability', '/mpt/bank/abilities'], ['English', '/mpt/bank/english'],
          ['Science', '/gk/cat/everyday-science'], ['Pakistan Affairs', '/mpt/bank/pakistan'],
          ['Current Affairs', '/mpt/bank/current'], ['Islamiat', '/mpt/bank/islamiat'],
          ['Urdu', '/mpt/bank/urdu'],
        ].map(([label, path]) => <Link key={path} to={path} className="rounded-full border border-emerald-200 px-3 py-1.5 text-emerald-900 hover:bg-emerald-50">{label} MCQs ↗</Link>)}
      </div>
      <div className="mt-5 space-y-2">
        {days.map((day, index) => {
          const done = day.tasks.filter((_, task) => checks[`${index}-${task}`]).length
          return (
            <div key={index} className="overflow-hidden rounded-xl border">
              <button type="button" onClick={() => setOpenDay(openDay === index ? -1 : index)} aria-expanded={openDay === index} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-emerald-50/50">
                <span><span className="text-xs font-bold uppercase tracking-wide text-emerald-800">Day {index + 1} · {day.phase}</span><span className="mt-0.5 block font-semibold text-pine">{day.focus}</span></span>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">{done}/{day.tasks.length} {openDay === index ? '−' : '+'}</span>
              </button>
              {openDay === index && <div className="space-y-3 border-t bg-secondary/20 px-4 py-4">
                {day.tasks.map((task, taskIndex) => {
                  const key = `${index}-${taskIndex}`
                  return <label key={key} className="flex cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" checked={!!checks[key]} onChange={() => toggle(key)} className="mt-1.5 h-4 w-4 shrink-0 accent-emerald-800" /><span className={checks[key] ? 'text-muted-foreground line-through' : ''}>{task}</span></label>
                })}
              </div>}
            </div>
          )
        })}
      </div>
      <details className="mt-5 rounded-xl border p-4">
        <summary className="cursor-pointer font-semibold text-pine">My MPT error book · K / C / S / G</summary>
        <p className="mt-2 text-sm text-muted-foreground">Keep only the rules and facts you missed or keep forgetting. Review these before your next mock.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {errorTypes.map(([type, title, hint]) => <label key={type} className="text-sm font-semibold text-pine">
            {type} · {title}
            <textarea value={errors[type] || ''} onChange={(event) => updateError(type, event.target.value)} placeholder={hint} rows={4} className="mt-1.5 block w-full resize-y rounded-lg border px-3 py-2 font-normal text-foreground outline-none focus:ring-2 focus:ring-emerald-700" />
          </label>)}
        </div>
      </details>
    </section>
  )
}
