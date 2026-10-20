import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day19: GrammarDay = {
  day: 19,
  ...stageOf(19),
  title: 'Modal Verbs',
  whatYouWillLearn:
    'You will learn what modal verbs (can, could, may, might, must, should, will, would, shall, ought to) actually do, how to use them correctly with a main verb, and how to use them to talk about the past.',
  simpleExplanation: [
    'Sometimes you don’t just want to say what happens — you want to say how sure you are about it, whether it is allowed, or whether it is a good idea. English has a small group of helper words for exactly this job: can, could, may, might, must, should, will, would, shall, and ought to. These are called modal verbs.',
    'A modal verb sits in front of a main verb and changes its meaning — adding a sense of ability, permission, possibility, obligation, or advice. The important thing is that a modal verb never changes its own form: it never takes an -s, an -ing, or (with one exception) the word “to” before the verb that follows it.',
    'Once you are comfortable with the basic meanings, the next skill is using modals to talk about the past — for example, saying that you are fairly sure something happened (“he must have left already”) or that something was a good idea that never happened (“she should have told us”).',
  ],
  rules: [
    {
      rule: 'A modal verb never changes form, and the main verb after it stays in its base form.',
      explanation: 'Do not add -s for he/she/it, and do not add “to” before the main verb (the one exception is “ought to”).',
      correct: 'She can drive, he must leave now, and they should apologise.',
      wrong: 'She cans to drive.',
      correction: 'Modals never take -s, and no “to” is needed before the main verb after “can”.',
    },
    {
      rule: 'Can and could express ability or permission; could is more polite or less certain than can.',
      explanation: '“Can” is direct and confident; “could” softens a request or shows that something is only a possibility, not a certainty.',
      correct: 'Ali can lift that box easily. / Could you pass me the salt, please?',
    },
    {
      rule: 'May and might express permission or possibility; might shows less certainty than may.',
      explanation: '“May” is a little more formal for permission and suggests a fairly likely possibility; “might” suggests the speaker is less sure.',
      correct: 'You may leave once you finish the test. / It might snow tonight, but I’m not sure.',
    },
    {
      rule: 'Must and have to both express obligation, but they often come from different sources.',
      explanation: '“Must” often expresses the speaker’s own judgement or a strong personal feeling of necessity, while “have to” often points to a rule or requirement that comes from outside the speaker — though in everyday speech the two overlap a great deal, so this is a useful guide rather than a strict law. Also remember that “must” has no past tense form; for past obligation, use “had to”.',
      correct: 'I must call my mother tonight; I promised her. / Students have to wear uniforms, according to school policy.',
      wrong: 'Yesterday, I must go to the bank.',
      correction: '“Must” has no past form. Past obligation is expressed with “had to”: “Yesterday, I had to go to the bank.”',
    },
    {
      rule: 'Should and ought to give advice or a recommendation.',
      explanation: 'Both mean “this is a good idea”, and they are close to interchangeable in everyday use, though “should” is far more common in speech.',
      correct: 'You should see a doctor about that cough. / You ought to apologise to her.',
    },
    {
      rule: 'Modal + have + past participle is used to talk about the past: must have (a confident conclusion), might/could have (a past possibility), should have (an advisable action that did not happen).',
      explanation: 'This structure lets you look back and judge, guess, or regret something from the present.',
      correct: 'The lights are off, so they must have left already. / He might have missed his train. / You should have told me earlier.',
      wrong: 'He must have leave already.',
      correction: 'After “must have”, use the past participle (“left”), not the base form (“leave”).',
    },
    {
      rule: '“Shall” is now mostly limited to formal offers, suggestions with I/we, and legal or formal writing; “will” is the everyday choice for the future with any subject.',
      explanation: '“Shall” was once the standard future form with I/we in British English, but modern everyday English has largely replaced it with “will”. “Shall” survives mainly in polite offers (“Shall I open the window?”) and in formal or legal documents (“The tenant shall pay rent monthly.”).',
      correct: 'Shall I book the tickets for us? / We will meet you at the station at six.',
    },
  ],
  easyExamples: [
    'Ali can swim very well.',
    'You may leave the room now.',
    'It might rain later this evening.',
    'We must finish this before five o’clock.',
    'She should call her mother back.',
  ],
  practicalExamples: [
    'Could you send me the report by tomorrow morning?',
    'Employees have to submit their leave requests a week in advance.',
    'You should revise your notes every night before the exam, not just before the test.',
  ],
  examExamples: [
    'The witness must have seen something, since she left the room in such a hurry.',
    'Given the scale of the damage, the authorities should have responded more quickly.',
  ],
  commonMistakes: [
    {
      wrong: 'She can to swim very well.',
      right: 'She can swim very well.',
      why: 'Modal verbs (except “ought to”) are followed directly by the base verb, with no “to” in between.',
    },
    {
      wrong: 'He musts finish the work today.',
      right: 'He must finish the work today.',
      why: 'Modal verbs never take an -s, even with he, she, or it.',
    },
    {
      wrong: 'You should to call him before it gets late.',
      right: 'You should call him before it gets late.',
      why: '“Should” is a modal verb and is never followed by “to”.',
    },
    {
      wrong: 'He must have finish the report by now.',
      right: 'He must have finished the report by now.',
      why: 'After “must have”, the verb needs the past participle form, not the base form.',
    },
    {
      wrong: 'Yesterday, I must attend a training session.',
      right: 'Yesterday, I had to attend a training session.',
      why: '“Must” has no past tense; past obligation is expressed with “had to”.',
    },
    {
      wrong: 'She can swims faster than him.',
      right: 'She can swim faster than him.',
      why: 'The main verb after a modal stays in its base form and never adds -s.',
    },
  ],
  memoryTip:
    'Think of a modal verb as a “meaning helmet” placed on top of a main verb: it always stays the same shape itself, and the verb underneath it always stays in its plainest, base form (no -s, no -ing, no “to”, except after “ought to”).',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'In “You must wear a seatbelt in this car,” what does “must” express?',
      answer: 'Obligation',
      reason: 'It shows something that is necessary or required.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “She might come to the party,” what does “might” express?',
      answer: 'Possibility',
      reason: 'It shows the speaker is not certain whether she will come.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “Could you help me carry this bag?” what job is “could” doing?',
      answer: 'Making a polite request',
      reason: '“Could” softens the request and sounds more polite than “can”.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'You ____ (can / must) be at least eighteen years old to apply for this post.',
      answer: 'must',
      reason: 'This describes a fixed requirement, not a simple ability, so “must” fits.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'The lights are off, so the family ____ (must / can) have gone out.',
      answer: 'must',
      reason: '“Must have” shows a confident conclusion based on the evidence (the lights being off).',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'You look exhausted. You ____ (should / must) get some rest tonight.',
      answer: 'should',
      reason: 'This is friendly advice, not a strict rule, so “should” fits best.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'He (can / cans) speak three languages fluently.',
      answer: 'can',
      reason: 'Modal verbs never take an -s.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'They (should have / should has) informed us earlier about the change.',
      answer: 'should have',
      reason: '“Should have” is followed by a past participle to talk about a missed opportunity.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'When the guest arrives, (shall I / will I) offer her some tea?',
      answer: 'shall I',
      reason: '“Shall I…?” is the natural, polite way to make an offer in English.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'She can to drive a car very confidently.',
      answer: 'She can drive a car very confidently.',
      reason: 'No “to” is needed after the modal verb “can”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'He musts finish his homework before dinner.',
      answer: 'He must finish his homework before dinner.',
      reason: 'Modal verbs never take an -s, so “must” is correct, not “musts”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'You should to apologise to her for being late.',
      answer: 'You should apologise to her for being late.',
      reason: '“Should” is a modal verb and is never followed by “to”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The manager must have leave the office before the alarm sounded.',
      answer: 'The manager must have left the office before the alarm sounded.',
      reason: 'After “must have”, the verb needs the past participle “left”, not the base form “leave”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'Last year, I must attend a training session every single week.',
      answer: 'Last year, I had to attend a training session every single week.',
      reason: '“Must” has no past tense form, so past obligation needs “had to”.',
    },
  ],
  quiz: [
    {
      question: 'Which modal verb typically expresses ability?',
      options: ['must', 'can', 'should', 'might'],
      correct: 1,
      explanation: '“Can” is the standard modal for expressing ability.',
    },
    {
      question: 'Which sentence correctly uses a modal verb?',
      options: ['She can to sing.', 'She can sings.', 'She can sing.', 'She cans sing.'],
      correct: 2,
      explanation: 'A modal verb is followed directly by the base form of the main verb, with no “to” and no -s.',
    },
    {
      question: 'Which sentence is a more polite, tentative request?',
      options: ['Can you close the door?', 'Could you close the door?', 'Must you close the door?', 'Should you close the door?'],
      correct: 1,
      explanation: '“Could” softens a request and sounds more polite than “can”.',
    },
    {
      question: 'Which modal best fits: “You ____ see a doctor if the pain continues”?',
      options: ['must', 'should', 'can', 'might'],
      correct: 1,
      explanation: 'This is friendly advice, so “should” is the natural choice.',
    },
    {
      question: 'Which sentence shows a confident conclusion about the past?',
      options: ['He might have missed the bus.', 'He must have missed the bus.', 'He could have missed the bus.', 'He should have missed the bus.'],
      correct: 1,
      explanation: '“Must have” expresses a confident conclusion drawn from evidence.',
    },
    {
      question: 'Which sentence describes a past action that was advisable but did not happen?',
      options: ['He must have called her.', 'He should have called her.', 'He might have called her.', 'He can have called her.'],
      correct: 1,
      explanation: '“Should have” points to a missed, advisable action in the past.',
    },
    {
      question: 'Which sentence shows an obligation coming mainly from the speaker’s own feeling, rather than an external rule?',
      options: [
        'I have to pay the toll on this road.',
        'I must finish this today; I promised myself I would.',
        'Passengers have to fasten their seatbelts under airline rules.',
        'Employees have to complete the safety training required by law.',
      ],
      correct: 1,
      explanation: '“Must” here reflects the speaker’s own sense of necessity, not an outside rule.',
    },
    {
      question: 'Which sentence uses “shall” in its typical modern usage?',
      options: ['Shall I book the tickets for us?', 'Shall he arrive tomorrow?', 'Shall you finish it?', 'Shall they be there?'],
      correct: 0,
      explanation: '“Shall” is now mainly used with I/we to make polite offers or suggestions.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['He must has finished it.', 'He must have finished it.', 'He must finished it.', 'He must had finished it.'],
      correct: 1,
      explanation: '“Must have” is followed by a past participle: “finished”.',
    },
    {
      question: 'Which modal correctly expresses past ability in: “I ____ swim when I was five years old”?',
      options: ['can', 'could', 'must', 'should'],
      correct: 1,
      explanation: '“Could” is used for a general ability in the past.',
    },
    {
      question: 'Which sentence expresses a possibility with less certainty than “may”?',
      options: ['She may be at home.', 'She might be at home.', 'She must be at home.', 'She should be at home.'],
      correct: 1,
      explanation: '“Might” suggests less certainty than “may”.',
    },
    {
      question: 'What is the error in “Ali should to check his email more often”?',
      options: ['Wrong modal verb', 'Unnecessary “to” after the modal', 'Wrong tense', 'Subject-verb agreement'],
      correct: 1,
      explanation: '“Should” is never followed by “to”; the main verb should follow directly.',
    },
  ],
  quickRevision: [
    'Modal verbs (can, could, may, might, must, should, will, would, shall, ought to) add meaning to a main verb and never change form themselves.',
    'After a modal, use the plain base verb — no -s, no -ing, and no “to” (except after “ought to”).',
    'Can/could show ability or permission; could is more polite or tentative than can.',
    'May/might show permission or possibility; might is less certain than may.',
    'Must often reflects the speaker’s own judgement, have to often reflects an outside rule, and must has no past form — use “had to” for past obligation.',
    'Modal + have + past participle talks about the past: must have (confident conclusion), might/could have (past possibility), should have (advisable but unfulfilled).',
    '“Shall” now mainly appears in formal offers with I/we and in legal writing; “will” is the everyday choice for the future.',
  ],
}
