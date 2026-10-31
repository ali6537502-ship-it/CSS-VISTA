export type Lesson = {
  id: string; title: string; aim: string; minutes: number
  teaching: string[]; before: string; after: string; explanation: string
  question: string; options: string[]; answer: number; feedback: string
  task: string; sample: string; checklist: string[]
}
/** Original teaching material. Fixed checks test a distinction, never grade original prose. */
export const lessons: Lesson[] = [
  {
    id: 'complete-thought', title: 'Build a complete sentence', minutes: 12,
    aim: 'Give each main sentence a subject, a finite verb and a complete thought.',
    teaching: [
      'Start with the person, thing or idea you are writing about. Then state what it does or what is true of it. In “Public libraries support independent study”, “Public libraries” is the subject and “support” is the finite verb. The sentence makes a complete claim.',
      'A finite verb carries tense or works with a subject: “supports”, “supported” and “can support” can form predicates. An -ing form by itself usually cannot: “Libraries supporting students” names an activity but does not complete this statement. Write “Libraries support students” or “Libraries are supporting students”.',
      'A dependent clause has a subject and a verb but cannot always stand alone. “Although the library has extended its hours” leaves the reader waiting for the main claim. Add “many commuters still cannot visit”. An imperative such as “Check the timetable” is complete even though its subject, “you”, is understood.',
      'Underline the main verb in a draft. Ask who or what performs it. Then read the sentence without surrounding sentences: does it finish its own thought? A heading can be a phrase; an explanatory paragraph normally needs complete sentences.',
    ],
    before: 'Because the evening bus service ends early.',
    after: 'Because the evening bus service ends early, many students leave the library before closing time.',
    explanation: '“Because” introduces a reason clause. The added main clause states the consequence and completes the thought.',
    question: 'Which option is a complete sentence in ordinary explanatory prose?',
    options: ['Although the classrooms were crowded.', 'The students waiting outside the classroom.', 'The school added an afternoon session.'], answer: 2,
    feedback: '“The school” is the subject and “added” is the finite verb. The other options leave a dependent clause or a phrase unfinished.',
    task: 'Write two sentences about a study problem. In the second sentence, join a reason beginning with “because” to a complete main clause.',
    sample: 'Some students cannot attend evening classes. Because the last bus leaves at six, they need an earlier session.',
    checklist: ['Each sentence has a main clause.', 'Every reason clause is attached to a complete claim.'],
  },
  {
    id: 'sentence-boundaries', title: 'Join ideas without run-ons', minutes: 12,
    aim: 'Choose punctuation that shows the relationship between complete clauses.',
    teaching: [
      'Two independent clauses need a deliberate boundary. “The road flooded, traffic stopped” is a comma splice in standard formal prose. A comma alone does not normally join two complete statements.',
      'Use a full stop when each claim deserves its own sentence. Use a comma and a coordinating conjunction when the relationship matters: “The road flooded, so traffic stopped.” “But” marks contrast; “and” adds a related point. Choose for meaning, not sentence length.',
      'A semicolon can connect closely related independent clauses: “The road flooded; traffic stopped.” A linking adverb does not act like a coordinating conjunction. Write “The road flooded; therefore, traffic stopped” or use a full stop before “Therefore”.',
      'Subordination creates a different emphasis: “Because the road flooded, traffic stopped.” Check that the cause is supported by your evidence. Grammar can express a causal claim clearly; it cannot establish that the cause is true.',
    ],
    before: 'The survey was small, however, its findings attracted attention.',
    after: 'The survey was small; however, its findings attracted attention.',
    explanation: 'Both sides can stand as sentences. The semicolon supplies the boundary; “however” signals the contrast.',
    question: 'Which revision correctly joins two independent clauses?',
    options: ['The clinic opened, demand increased.', 'The clinic opened, and demand increased.', 'The clinic opened demand increased.'], answer: 1,
    feedback: 'A comma plus “and” joins the independent clauses. This wording records sequence or addition without claiming that opening the clinic caused the increase.',
    task: 'Write two related claims about public transport. Join them once with a full stop and once with a suitable conjunction. Explain to yourself what relationship your conjunction expresses.',
    sample: 'The service is affordable. Its evening coverage is limited. / The service is affordable, but its evening coverage is limited.',
    checklist: ['No comma alone joins my complete clauses.', 'The conjunction expresses the relationship I intend.'],
  },
  {
    id: 'agreement-time', title: 'Keep agreement and time consistent', minutes: 14,
    aim: 'Match verbs to their subjects and make changes in time deliberate.',
    teaching: [
      'Find the head of the subject before choosing the verb. In “The quality of the reports has improved”, “quality” is singular; the nearby plural “reports” does not control “has”. In “The reports have improved”, the subject itself is plural.',
      'Do not match a verb to whichever noun is closest. Remove interrupting phrases temporarily: “The list of proposed changes is ready” becomes “The list is ready”. Then restore the detail. Two subjects joined by “and” normally take a plural verb, though established expressions can behave as a unit.',
      'Choose tense according to meaning. Use the past for a completed event, the present for a current condition, and the present perfect for a past development connected to the present. “The council opened the centre in 2024” and “The centre now serves three neighbourhoods” can correctly use different tenses.',
      'A consistent paragraph need not use one tense everywhere. It needs clear time relationships. Add dates or markers such as “since then” where necessary. After revising a paragraph, check each verb against both its subject and its intended time.',
    ],
    before: 'The results of the study shows that attendance improved last year.',
    after: 'The results of the study show that attendance improved last year.',
    explanation: 'The plural subject “results” takes “show”. “Improved” remains past because it refers to last year.',
    question: 'Choose the sentence with correct subject–verb agreement.',
    options: ['The cost of the new buses is high.', 'The cost of the new buses are high.', 'The new buses is expensive.'], answer: 0,
    feedback: '“Cost” is singular and takes “is”. The noun inside “of the new buses” does not control the main verb.',
    task: 'Write one sentence about a completed study session and another about your present routine. Include a subject with an “of” phrase and check its head noun.',
    sample: 'The purpose of yesterday’s exercises was to practise agreement. My review of difficult examples now takes ten minutes each morning.',
    checklist: ['Each verb agrees with the head of its subject.', 'Changes in tense have an identifiable time reason.'],
  },
  {
    id: 'clear-reference', title: 'Make reference and modifiers clear', minutes: 12,
    aim: 'Let the reader identify who acts and what each description refers to.',
    teaching: [
      'A pronoun should point to a clear noun. “When the teacher spoke to the student, she seemed worried” allows two readings. If the identity matters, name the person again. Repetition is preferable to a misleading shortcut.',
      'Words such as “this”, “that” and “it” can also be vague. After a paragraph containing several claims, “This is a problem” may not identify the problem. “This reduction in opening hours is a problem” gives the reader an explicit reference.',
      'Place descriptive phrases near what they describe. “The committee discussed the report in the meeting that was incomplete” attaches “incomplete” awkwardly. Write “At the meeting, the committee discussed the incomplete report”.',
      'An introductory participial phrase usually describes the subject of the main clause. In “After reviewing the figures, the estimate was revised”, the estimate appears to do the reviewing. Name the reviewer: “After reviewing the figures, the team revised the estimate”. Do not force active voice everywhere; choose it when it makes responsibility clearer.',
    ],
    before: 'After reading the instructions, the exercise seemed easier.',
    after: 'After reading the instructions, I found the exercise easier.',
    explanation: 'The main-clause subject “I” is now the person who read the instructions.',
    question: 'Which sentence clearly identifies the person doing the introductory action?',
    options: ['Walking to the library, the rain began.', 'Walking to the library, my notes became wet.', 'Walking to the library, I noticed dark clouds.'], answer: 2,
    feedback: '“I” performs both actions: walking and noticing. In the other choices, the main subject cannot naturally perform the introductory action.',
    task: 'Write a sentence beginning “After reviewing my draft, …”. Then write a sentence using “this” followed by a specific noun, such as “this omission” or “this example”.',
    sample: 'After reviewing my draft, I clarified the central claim. This revision made the paragraph easier to follow.',
    checklist: ['Every pronoun has a clear reference.', 'Introductory descriptions attach to the intended subject.'],
  },
  {
    id: 'precise-words', title: 'Choose precise, natural words', minutes: 15,
    aim: 'Replace vague or inflated language without making claims stronger than the evidence.',
    teaching: [
      'Precision means naming the action, object or relationship you intend. “The programme improved things” does not say what changed. “The programme reduced registration waiting times” identifies a measurable outcome. Add a number only when you have a reliable source for it.',
      'Long words do not automatically create formal writing. “Use” often communicates the same action as “utilise”. “To” can replace “in order to” when no emphasis is lost. Keep a longer phrase if it expresses a distinction your reader actually needs.',
      'Words combine in conventional ways: we normally “make a decision”, “conduct research” and “raise a concern”. Learn expressions in short contexts rather than memorising isolated synonyms. A word that works in one phrase may sound unnatural in another.',
      'Calibrate certainty. “May reduce” is different from “will eliminate”; “some participants” is different from “all citizens”. An edit that removes a qualification can distort the original claim. Prefer accurate scope to dramatic wording, particularly in analytical and examination writing.',
    ],
    before: 'The scheme will eradicate every educational problem by facilitating better things.',
    after: 'The scheme may improve access to school materials, although staffing shortages would remain.',
    explanation: 'The revision names a specific possible benefit and retains a limitation. It illustrates careful wording, not a factual claim about a real scheme.',
    question: 'A small pilot suggests a possible improvement. Which wording best preserves that uncertainty?',
    options: ['The pilot proves that the policy always works.', 'The pilot suggests that the policy may help.', 'The pilot guarantees complete success.'], answer: 1,
    feedback: '“Suggests” and “may” fit limited evidence. “Proves”, “always” and “guarantees” claim more than this hypothetical pilot establishes.',
    task: 'Revise “This method makes everything much better” into a specific, qualified claim about your study routine. Do not invent a statistic.',
    sample: 'Reviewing errors after each quiz may help me notice recurring agreement problems.',
    checklist: ['My nouns and verbs name the intended change.', 'My certainty and scope do not exceed the evidence.'],
  },
  {
    id: 'sentence-flow', title: 'Control emphasis and sentence flow', minutes: 14,
    aim: 'Vary sentence structure while keeping the main point easy to find.',
    teaching: [
      'Sentence variety should serve meaning. A short sentence can state a central claim. A longer sentence can explain a qualification or relationship. Avoid combining ideas merely to make a sentence look sophisticated.',
      'Place familiar information near the start when it helps the reader connect with the previous sentence. Then introduce the new point. “The centre offers evening classes. These classes serve workers who cannot attend during the day” provides a clear bridge.',
      'Use parallel structure for comparable items. “The course teaches reading carefully, how to summarise and revision” mixes forms. “The course teaches careful reading, concise summary and systematic revision” makes the three activities comparable.',
      'A subordinate clause can keep a qualification visible without burying the main claim: “Although the approach requires practice, it offers a repeatable revision method.” Read aloud and check whether the main point arrives before the reader loses the subject. There is no single ideal sentence length.',
    ],
    before: 'Students should read carefully, making notes and to revise regularly.',
    after: 'Students should read carefully, make notes and revise regularly.',
    explanation: 'The three verbs share “should” and follow the same grammatical pattern.',
    question: 'Which list uses parallel grammatical forms?',
    options: ['To identify a claim, to test its evidence and to revise its wording.', 'To identify a claim, testing evidence and its wording.', 'A claim, testing its evidence and to revise.'], answer: 0,
    feedback: 'Each item uses “to” plus a base verb, so the reader can compare the actions directly.',
    task: 'Write a short claim about a study habit. Follow it with a sentence that adds a qualification, then a sentence listing three parallel actions.',
    sample: 'Regular review gives my practice a direction. Although I cannot revise every topic daily, I can revisit recurring errors. I identify the problem, check an example and rewrite my sentence.',
    checklist: ['My main point is easy to locate.', 'Comparable items use matching grammatical forms.'],
  },
  {
    id: 'paragraph-unity', title: 'Develop one coherent paragraph', minutes: 18,
    aim: 'Connect a controlling claim, an explanation, an example and a qualification.',
    teaching: [
      'A paragraph needs a controlling idea: the specific point its sentences develop together. “Libraries are important” offers a broad topic. “Longer library hours can help students whose homes lack quiet study space” provides a more focused claim to explain.',
      'Explain how or why the claim works. Then use an example, relevant evidence or a comparison to make the explanation concrete. A hypothetical example is useful for teaching or reasoning if you label it as hypothetical; it must not be presented as a documented finding.',
      'Coherence comes from logical progression and clear reference, not a connector at the start of every sentence. “Moreover” adds a related point; “however” introduces contrast. If two sentences do not have a meaningful relationship, adding a linking word will not repair the argument.',
      'End by drawing out the implication or stating a useful limitation. Avoid repeating the opening sentence with different adjectives. During revision, write the job of each sentence in the margin. Remove a sentence that belongs to a different argument or move it into another paragraph.',
    ],
    before: 'Libraries help students. Books are expensive. Some buildings are old. Education is important.',
    after: 'Extended library hours may help students who lack a quiet place to study. A later closing time gives these students an additional opportunity to work after classes. For example, a student sharing a crowded home could use that space before returning home. The benefit would depend on safe transport and adequate staffing.',
    explanation: 'Every sentence develops access to study space. The example is hypothetical, and the final sentence states conditions rather than promising a universal benefit.',
    question: 'Which sentence best develops a paragraph about access to quiet study space?',
    options: ['Library architecture has changed over many centuries.', 'A supervised reading room gives students a place to concentrate after lessons.', 'Some novels have unusually long titles.'], answer: 1,
    feedback: 'The reading-room sentence explains the controlling idea directly. The other statements might belong in different paragraphs.',
    task: 'Write 80–120 words on one practical change that could improve your study routine. Include a focused claim, an explanation, a clearly hypothetical example and a limitation.',
    sample: 'A short review session after each practice task may make my revision more focused. Instead of rereading an entire chapter, I can record one recurring difficulty and rewrite an example. For instance, if I repeatedly lose agreement in long subjects, I could underline the head noun before choosing the verb. This method would not replace wider reading, but it would give each session a specific purpose.',
    checklist: ['Every sentence develops my controlling idea.', 'My example is clearly labelled and my limitation is relevant.'],
  },
  {
    id: 'revision', title: 'Revise in deliberate passes', minutes: 18,
    aim: 'Improve meaning, structure and language without losing your own voice.',
    teaching: [
      'Do not try to repair every problem at once. First read for meaning: what claim are you making, what supports it and what qualifications must remain? Correct a misleading assertion before polishing its punctuation.',
      'Next read for organisation. Check whether each paragraph has a clear purpose and whether sentences build in a sensible order. Move or cut material that interrupts the explanation. Keep a copy of your first draft so that you can compare changes honestly.',
      'Then edit sentences. Check boundaries, agreement, tense, pronoun reference, parallel structure and word choice. Read once more for punctuation and spelling. A spelling check cannot tell you whether you have made an unsupported inference.',
      'Compare before and after using a specific reason for each important change. “I replaced a vague noun”, “I restored the limitation” and “I separated two claims” are useful observations. “It sounds advanced” is not enough. A completed self-review records practice, not an independently assessed level of proficiency.',
    ],
    before: 'Everyone have study problems, this method will solve all of them because it is very good.',
    after: 'Many students experience study difficulties. A brief error log may help them identify recurring problems, although it cannot address every cause.',
    explanation: 'The revision repairs the sentence boundary and agreement, names the method’s purpose and replaces an absolute promise with a qualified claim.',
    question: 'What should you normally check before polishing individual words?',
    options: ['Whether every word is long and formal.', 'Whether the claim is accurate and supported.', 'Whether every sentence has the same length.'], answer: 1,
    feedback: 'Meaning comes first. Polished wording cannot rescue an inaccurate claim or missing support.',
    task: 'Return to a paragraph you wrote earlier. Revise it in three passes: meaning, organisation, then sentences. Below the revision, explain two changes and why they help.',
    sample: 'Revision note: I changed “all students” to “students with limited evening transport” because the problem affects a specific group. I split the final sentence so that the recommendation and its limitation are easier to distinguish.',
    checklist: ['My revision preserves the intended meaning and qualifications.', 'I can explain at least two changes with specific reasons.'],
  },
]
export function findLesson(id: string | null): Lesson {
  return lessons.find(lesson => lesson.id === id) || lessons[0]
}
export type LessonWork = { draft: string; revision: string; checks: boolean[]; reviewed: boolean }
export type GuideWork = Record<string, LessonWork>
export const emptyWork = (): LessonWork => ({ draft: '', revision: '', checks: [false, false], reviewed: false })
export function readGuideWork(raw: string | null): GuideWork {
  if (!raw) return {}
  let parsed: unknown
  try { parsed = JSON.parse(raw) }
  catch { throw Error('Saved guide work is unreadable. Download your current writing before reloading.') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('Invalid guide record')
  const result: GuideWork = {}
  for (const lesson of lessons) {
    const value = (parsed as Record<string, unknown>)[lesson.id]
    if (!value || typeof value !== 'object') continue
    const work = value as Partial<LessonWork>
    result[lesson.id] = {
      draft: typeof work.draft === 'string' ? work.draft.slice(0, 12000) : '',
      revision: typeof work.revision === 'string' ? work.revision.slice(0, 12000) : '',
      checks: [work.checks?.[0] === true, work.checks?.[1] === true], reviewed: work.reviewed === true,
    }
  }
  return result
}
export function canReview(work: LessonWork) {
  return !!work.draft.trim() && !!work.revision.trim() && work.checks.length === 2 && work.checks.every(Boolean)
}
