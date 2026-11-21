import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day15: GrammarDay = {
  day: 15,
  ...stageOf(15),
  title: 'Direct and Indirect Speech',
  whatYouWillLearn:
    'You will learn how to change someone’s exact words (direct speech) into reported speech (indirect speech), including changes to tense, pronouns, and time words.',
  simpleExplanation: [
    'When we repeat someone’s exact words, we usually put them inside quotation marks: Sara said, “I am tired.” This is direct speech.',
    'When we report what someone said in our own words, without quotation marks, this is indirect speech, also called reported speech: Sara said that she was tired. Notice the small changes — “I” became “she”, and “am” became “was”.',
    'These changes follow patterns, not random rules. Once you notice the patterns — in tense, pronouns, and time words — reporting speech becomes a habit rather than a puzzle.',
  ],
  rules: [
    {
      rule: 'Direct speech uses someone’s exact words inside quotation marks; indirect speech reports the meaning without quotation marks.',
      explanation: 'The wording usually changes slightly to fit the new sentence.',
      correct: 'Direct: Ali said, “I am busy.” Indirect: Ali said that he was busy.',
    },
    {
      rule: 'When the reporting verb (said, told) is in the past, the verb in the reported clause usually shifts back one tense — this is called backshift.',
      explanation: 'Present simple usually becomes past simple, present continuous becomes past continuous, present perfect becomes past perfect, and “will” becomes “would”.',
      correct: 'He said, “I work here.” → He said that he worked there.',
    },
    {
      rule: 'Backshift is not required when the reported statement is still true, general, or a fact — the present tense can often be kept.',
      explanation: 'This is a genuine, common exception, not a broken rule; do not treat backshift as an absolute law.',
      correct: 'She said that the sun rises in the east.',
    },
    {
      rule: 'Pronouns change to match the new speaker’s point of view.',
      explanation: 'The reporter is describing someone else’s words, so “I” often becomes “he” or “she”, and so on.',
      correct: 'Ali said, “I have my keys.” → Ali said that he had his keys.',
    },
    {
      rule: 'Time and place words often change because the moment of reporting is different from the moment of speaking.',
      explanation: 'Common changes: today → that day, tomorrow → the next day, yesterday → the day before, now → then, here → there, this → that.',
      correct: 'She said, “I will finish it tomorrow.” → She said that she would finish it the next day.',
    },
    {
      rule: 'To report a yes/no question, use “if” or “whether”, and switch to normal statement word order — no question mark and no auxiliary “do/does/did”.',
      explanation: 'The reported question is no longer a question grammatically; it becomes a statement introduced by “if” or “whether”.',
      correct: 'Direct: “Do you like tea?” Indirect: He asked me if I liked tea.',
      wrong: 'He asked me do I like tea.',
      correction: 'A reported question needs statement word order, introduced by “if”, not the original question form.',
    },
    {
      rule: 'To report a wh-question, keep the question word but switch to normal statement word order.',
      explanation: 'The question word (where, why, what) stays, but the rest of the clause follows normal statement order.',
      correct: 'Direct: “Where do you live?” Indirect: He asked me where I lived.',
    },
    {
      rule: 'To report a command, use “told” + object + infinitive; for a negative command, add “not” before the infinitive.',
      explanation: 'Requests and orders are reported with an infinitive, not the original imperative form.',
      correct: '“Close the door,” she said. → She told me to close the door. / “Don’t be late,” he said. → He told me not to be late.',
    },
  ],
  easyExamples: [
    'Sara said, “I am hungry.” → Sara said that she was hungry.',
    'Ali said, “I like tea.” → Ali said that he liked tea.',
    '“I am reading a book,” he said. → He said that he was reading a book.',
    '“I will call later,” she said. → She said that she would call later.',
  ],
  practicalExamples: [
    'The manager said, “I will review the proposal tomorrow.” → The manager said that he would review the proposal the next day.',
    'She asked, “Where is the nearest bank?” → She asked where the nearest bank was.',
    'He asked, “Have you finished the report?” → He asked if I had finished the report.',
    'The teacher said, “Submit your assignments by Friday.” → The teacher told us to submit our assignments by Friday.',
  ],
  examExamples: [
    'The minister said, “We will introduce new reforms next year.” → The minister said that they would introduce new reforms the following year.',
    'The officer asked the driver, “Why did you not stop at the signal?” → The officer asked the driver why he had not stopped at the signal.',
    'The spokesperson said, “The policy takes effect immediately.” → The spokesperson said that the policy took effect immediately.',
  ],
  commonMistakes: [
    {
      wrong: 'She said that she is tired.',
      right: 'She said that she was tired.',
      why: 'The past reporting verb “said” usually shifts the present tense back to the past, unless the idea is still true or general.',
    },
    {
      wrong: 'He told me that I am late.',
      right: 'He told me that I was late.',
      why: 'Both the pronoun and the tense need to match the reported perspective, and backshift applies here.',
    },
    {
      wrong: 'She asked me where did I live.',
      right: 'She asked me where I lived.',
      why: 'Reported questions use normal statement word order, without the auxiliary “did”.',
    },
    {
      wrong: 'He asked me do I like coffee.',
      right: 'He asked me if I liked coffee.',
      why: 'A reported yes/no question needs “if” or “whether” plus normal statement word order, not the original question form.',
    },
    {
      wrong: 'The teacher told to close the door.',
      right: 'The teacher told me to close the door.',
      why: '“Tell” needs a person as its object (“told me”), unlike “say”.',
    },
    {
      wrong: 'She said that she will finish it tomorrow.',
      right: 'She said that she would finish it the next day.',
      why: 'Under backshift, both the modal (“will” → “would”) and the time word (“tomorrow” → “the next day”) usually change.',
    },
  ],
  memoryTip:
    'Think of reported speech as describing a photo from a different day: words that meant “now, here, this” at the moment of speaking (today, here, this) usually become “then, there, that” (that day, there, that) because you are now describing it from a distance.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'Is “Ali said, ‘I am tired.’” direct or indirect speech?',
      answer: 'Direct speech.',
      reason: 'It uses Ali’s exact words inside quotation marks.',
    },
    {
      stage: 'Recognise it',
      prompt: 'Is “Ali said that he was tired” direct or indirect speech?',
      answer: 'Indirect (reported) speech.',
      reason: 'It reports the meaning without quotation marks, with the pronoun and tense changed.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'She said that she ____ (be) busy.',
      answer: 'was',
      reason: 'Backshift changes present “am/is” to past “was” after a past reporting verb.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'He told me that he ____ (finish) the work the day before.',
      answer: 'had finished',
      reason: 'A past simple action in direct speech usually shifts back to the past perfect in reported speech.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'They said that they ____ (come) the next day.',
      answer: 'would come',
      reason: '“Will” shifts back to “would” under backshift.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'She asked me (where I live / where did I live / where I lived).',
      answer: 'where I lived',
      reason: 'Reported questions use normal statement order and backshift, without “did”.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'He asked if I (like / liked / would like) tea.',
      answer: 'liked',
      reason: 'Backshift changes present “like” to past “liked”.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'The teacher told us (to be / be / that be) quiet.',
      answer: 'to be quiet',
      reason: 'Reported commands use “told” + object + infinitive.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'He asked me do I need help.',
      answer: 'He asked me if I needed help.',
      reason: 'A reported yes/no question needs “if” and normal statement word order, not the original question form.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'She said that she is coming tomorrow.',
      answer: 'She said that she was coming the next day.',
      reason: 'Both the tense and the time word need to shift back because the reporting verb is past.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'He told to me to wait outside.',
      answer: 'He told me to wait outside.',
      reason: '“Tell” takes a direct object without “to” (“told me”), unlike “say to me”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The minister said that they will introduce new reforms next year.',
      answer: 'The minister said that they would introduce new reforms the following year.',
      reason: 'Backshift changes “will” to “would” and shifts the time word “next year” to “the following year”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The officer asked the driver why he did not stop at the signal.',
      answer: 'The officer asked the driver why he had not stopped at the signal.',
      reason: 'A past simple action in the original question shifts back to the past perfect in reported speech.',
    },
  ],
  quiz: [
    {
      question: 'Which sentence is an example of indirect (reported) speech?',
      options: ['Ali said, “I am tired.”', 'Ali said that he was tired.', '“I am tired,” said Ali.', 'Ali is tired, he said.'],
      correct: 1,
      explanation: 'It reports the meaning without quotation marks, with the pronoun and tense changed.',
    },
    {
      question: 'Complete: She said that she ___ hungry.',
      options: ['is', 'was', 'be', 'being'],
      correct: 1,
      explanation: 'Backshift changes present “is” to past “was” after the past reporting verb “said”.',
    },
    {
      question: 'Which sentence correctly keeps the present tense because it reports a general truth?',
      options: ['She said that the sun rose in the east.', 'She said that the sun rises in the east.', 'She said the sun was rising in the east.', 'She said that sun rise in east.'],
      correct: 1,
      explanation: 'General truths and facts can keep the present tense in reported speech, since backshift is not a rigid rule here.',
    },
    {
      question: 'Choose the correct reported question.',
      options: ['He asked me where do I live.', 'He asked me where I live.', 'He asked me where I lived.', 'He asked me where lived I.'],
      correct: 2,
      explanation: 'Reported questions use normal statement word order and backshift, with no auxiliary “do”.',
    },
    {
      question: 'Choose the correct reported yes/no question.',
      options: ['She asked if I like coffee.', 'She asked if I liked coffee.', 'She asked do I like coffee.', 'She asked I liked coffee.'],
      correct: 1,
      explanation: 'Yes/no questions are reported with “if” and backshift, in normal statement order.',
    },
    {
      question: 'Which sentence correctly reports a command?',
      options: ['She told to me to sit down.', 'She told me sit down.', 'She told me to sit down.', 'She told that I sit down.'],
      correct: 2,
      explanation: 'Commands are reported with “told” + object + infinitive (“to” + base verb).',
    },
    {
      question: 'Which time word correctly replaces “tomorrow” in reported speech?',
      options: ['the next day', 'next day', 'tomorrow', 'the day before'],
      correct: 0,
      explanation: '“Tomorrow” typically becomes “the next day” (or “the following day”) in reported speech.',
    },
    {
      question: 'Which pronoun change is correct when Ali says “I am ready” and someone reports it?',
      options: ['Ali said that I was ready.', 'Ali said that he was ready.', 'Ali said that you were ready.', 'Ali said that it was ready.'],
      correct: 1,
      explanation: 'The first-person pronoun “I” changes to match the person actually being talked about, “he”.',
    },
    {
      question: 'Which modal correctly replaces “will” under backshift?',
      options: ['would', 'will', 'shall', 'can'],
      correct: 0,
      explanation: '“Will” shifts back to “would” when the reporting verb is in the past.',
    },
    {
      question: 'Choose the correct reported negative command.',
      options: ['He told me to not be late.', 'He told me not to be late.', 'He told me don’t be late.', 'He told me to be not late.'],
      correct: 1,
      explanation: 'Negative reported commands use “not to” plus the base verb.',
    },
    {
      question: 'Which sentence correctly shifts a past simple verb into reported speech?',
      options: ['She said that she finished the work.', 'She said that she had finished the work.', 'She said that she has finished the work.', 'She said that she finishes the work.'],
      correct: 1,
      explanation: 'A past simple action in direct speech usually shifts back to the past perfect in reported speech.',
    },
    {
      question: 'Why might backshift not apply in “She said that water boils at 100 degrees Celsius”?',
      options: ['Because backshift never applies after “said”', 'Because the statement is a general scientific fact that is still true', 'Because “water” is a plural noun', 'Because reported speech never uses “that”'],
      correct: 1,
      explanation: 'General truths and facts can keep the present tense, since strict backshift is not required for something still true.',
    },
  ],
  quickRevision: [
    'Direct speech = exact words in quotation marks; indirect (reported) speech = the meaning, with no quotation marks.',
    'Backshift: after a past reporting verb, present usually becomes past, past usually becomes past perfect, and “will” becomes “would”.',
    'Backshift is not a rigid law — general truths and facts can keep their original tense.',
    'Pronouns change to match who is actually being talked about (“I” → “he/she”).',
    'Time and place words shift too: tomorrow → the next day, yesterday → the day before, here → there, this → that.',
    'Reported questions use normal statement word order; yes/no questions add “if”/“whether”; wh-questions keep the question word.',
    'Reported commands use “told” + object + infinitive; negative commands use “not to” + base verb.',
  ],
}
