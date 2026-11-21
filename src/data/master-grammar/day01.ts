import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day01: GrammarDay = {
  day: 1,
  ...stageOf(1),
  title: 'Parts of Speech — Basics',
  whatYouWillLearn:
    'You will learn the basic jobs that words do in a sentence — noun, pronoun, verb, adjective, adverb, preposition, conjunction, and interjection — and how to recognise each one.',
  simpleExplanation: [
    'Every word in a sentence has a job to do. Some words name things. Some words show action. Some words describe. Once you know each word’s job, sentences stop feeling confusing.',
    'Grammar gives these jobs names, such as noun, verb, and adjective. You do not need to memorise a list today. You only need to recognise each job when you see it in a sentence.',
    'A useful habit from day one: when a sentence confuses you, first find the verb (the action or state), then find who or what is doing it. Everything else in the sentence is extra information hanging off those two words.',
  ],
  rules: [
    {
      rule: 'A noun names a person, place, thing, or idea.',
      explanation: 'A noun is simply the name of something you can point to, or an idea you can talk about.',
      correct: 'Sara bought a new book about freedom.',
    },
    {
      rule: 'A pronoun replaces a noun so we do not repeat it.',
      explanation: 'Instead of saying the same name twice, we use a short word such as he, she, it, they, this, or who.',
      correct: 'Sara said she would come early.',
      wrong: 'Sara said Sara would come early.',
      correction: 'Repeating the name sounds unnatural. Replace the second “Sara” with the pronoun “she”.',
    },
    {
      rule: 'A verb shows an action or a state.',
      explanation: 'A verb tells us what someone does (run, write, play) or what someone or something is (is, seems, feels).',
      correct: 'The children play outside every evening.',
    },
    {
      rule: 'An adjective describes a noun.',
      explanation: 'An adjective adds detail about a noun — its colour, size, quality, or type.',
      correct: 'She bought a red umbrella.',
    },
    {
      rule: 'An adverb describes a verb, an adjective, or another adverb.',
      explanation: 'Many adverbs answer the question “how?” and end in -ly, but not all of them do.',
      correct: 'He answered the question correctly.',
      wrong: 'He answered the question correct.',
      correction: '“Correct” is an adjective and describes a noun. Here we are describing the verb “answered”, so we need the adverb “correctly”.',
    },
    {
      rule: 'A preposition shows how a noun relates to another word, often about place or time.',
      explanation: 'Prepositions are small words such as on, in, at, before, and after that connect ideas.',
      correct: 'The book is on the table, and we arrived before noon.',
    },
    {
      rule: 'A conjunction joins words, phrases, or clauses.',
      explanation: 'Words such as and, but, or, and because connect ideas so we are not left with a string of short, disconnected sentences.',
      correct: 'She was tired, but she finished her homework.',
    },
    {
      rule: 'An interjection is a short word that shows sudden feeling and stands on its own.',
      explanation: 'Interjections such as Wow, Oh, and Ouch express emotion and are usually followed by an exclamation mark.',
      correct: 'Wow! That was a great goal.',
    },
    {
      rule: 'The same word can belong to a different word class depending on its job in the sentence.',
      explanation: 'Do not judge a word’s class only by its spelling. Check what job it is doing in that particular sentence.',
      correct: 'The record shows steady progress. (noun) / Officials record the proceedings every day. (verb)',
    },
  ],
  easyExamples: [
    'Ali is happy. (Ali — noun, is — verb, happy — adjective)',
    'She sings well. (she — pronoun, sings — verb, well — adverb)',
    'The cat sat on the mat. (on — preposition)',
    'He is tired, but he keeps working. (but — conjunction)',
  ],
  practicalExamples: [
    'Our teacher explained the lesson clearly.',
    'The company launched its new product successfully.',
    'Traffic in the city increases sharply during the evening.',
  ],
  examExamples: [
    'Despite repeated warnings, the authorities responded slowly and inadequately.',
    'The report, though detailed, failed to address the underlying structural problems.',
  ],
  commonMistakes: [
    {
      wrong: 'He speaks very good.',
      right: 'He speaks very well.',
      why: '“Good” is an adjective and describes a noun. Here we are describing the verb “speaks”, so we need the adverb “well”.',
    },
    {
      wrong: 'The decision was very effect.',
      right: 'The decision was very effective.',
      why: '“Effect” is a noun. After the linking verb “was”, we need an adjective to describe “decision”, which is “effective”.',
    },
    {
      wrong: 'He is success in his career.',
      right: 'He is successful in his career.',
      why: '“Success” is a noun. After “is”, we need the adjective “successful” to describe “he”.',
    },
    {
      wrong: 'The player kicked the ball hardly.',
      right: 'The player kicked the ball hard.',
      why: '“Hard” as an adverb means “with force”. “Hardly” means “almost not”, which changes the meaning completely.',
    },
    {
      wrong: 'The manager said the manager would call back.',
      right: 'The manager said he would call back.',
      why: 'Repeating the noun sounds unnatural. A pronoun can refer back to a noun that was just mentioned.',
    },
  ],
  memoryTip:
    'To tell a noun from a verb quickly, try this test: can you put “the” in front of it? If yes (“the record”), it is acting as a noun. Can you put “to” in front of it? If yes (“to record”), it is acting as a verb.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'In “She quickly closed the door,” what part of speech is “quickly”?',
      answer: 'Adverb',
      reason: 'It describes the verb “closed” by telling us how she closed the door.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “The old bridge collapsed,” what part of speech is “old”?',
      answer: 'Adjective',
      reason: 'It describes the noun “bridge”.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “They arrived before sunrise,” what part of speech is “before”?',
      answer: 'Preposition',
      reason: 'It shows the time relationship between “arrived” and “sunrise”.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'He speaks English very ____ (good / well).',
      answer: 'well',
      reason: 'An adverb is needed to describe the verb “speaks”.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'This is a very ____ (interesting / interest) story.',
      answer: 'interesting',
      reason: 'An adjective is needed to describe the noun “story”.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'She was tired, ____ she kept walking.',
      answer: 'but',
      reason: 'A conjunction is needed to join the two ideas.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'She is very (success / successful) in her business.',
      answer: 'successful',
      reason: '“Success” is a noun; the sentence needs the adjective “successful” after the linking verb “is”.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'He finished the race (quick / quickly).',
      answer: 'quickly',
      reason: 'An adverb is needed to describe how he finished the race.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'Sara said (she / her) would help us.',
      answer: 'she',
      reason: '“She” is the subject pronoun needed before the verb “would help”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'He runs very quick.',
      answer: 'He runs very quickly.',
      reason: 'An adverb is needed to modify the verb “runs”, not the adjective “quick”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The child was crying loud in the room.',
      answer: 'The child was crying loudly in the room.',
      reason: 'An adverb is needed to describe how the child was crying.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'Ali said Ali will finish the report tomorrow.',
      answer: 'Ali said he would finish the report tomorrow.',
      reason: 'A pronoun should replace the repeated name, and the tense shifts back inside reported speech.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The new policy proved success within a year.',
      answer: 'The new policy proved successful within a year.',
      reason: 'After the linking verb “proved”, an adjective is needed, not the noun “success”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The committee reviewed the proposal careful before submitting its report.',
      answer: 'The committee reviewed the proposal carefully before submitting its report.',
      reason: 'An adverb is needed to describe how the committee reviewed the proposal.',
    },
  ],
  quiz: [
    {
      question: 'In “Ali runs fast,” what part of speech is “fast”?',
      options: ['Noun', 'Verb', 'Adverb', 'Adjective'],
      correct: 2,
      explanation: '“Fast” describes the verb “runs” by telling us how he runs, so it is an adverb here.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['She sings beautiful.', 'She sings beautifully.', 'She sings beauty.', 'She sings beautification.'],
      correct: 1,
      explanation: 'An adverb is needed to describe the verb “sings”.',
    },
    {
      question: 'In “Wow, that was an amazing goal!” what part of speech is “Wow”?',
      options: ['Noun', 'Adjective', 'Interjection', 'Conjunction'],
      correct: 2,
      explanation: '“Wow” is a short word expressing sudden feeling, so it is an interjection.',
    },
    {
      question: 'Which sentence uses a pronoun correctly?',
      options: ['Sara said Sara was tired.', 'Sara said she was tired.', 'Sara said her was tired.', 'Sara said hers was tired.'],
      correct: 1,
      explanation: '“She” is the correct subject pronoun to replace the repeated name “Sara”.',
    },
    {
      question: 'Which word is a preposition in “The keys are on the table”?',
      options: ['keys', 'are', 'on', 'table'],
      correct: 2,
      explanation: '“On” shows the relationship between the keys and the table.',
    },
    {
      question: 'Choose the correct word: He is very ___ in his new job.',
      options: ['success', 'successful', 'succeed', 'successfully'],
      correct: 1,
      explanation: 'An adjective is needed after the linking verb “is” to describe “he”.',
    },
    {
      question: 'Which sentence is grammatically correct?',
      options: ['The decision was very effect.', 'The decision was very effective.', 'The decision was very effecting.', 'The decision was very effectively.'],
      correct: 1,
      explanation: 'After the linking verb “was”, an adjective is needed, so “effective” is correct.',
    },
    {
      question: 'In “She kicked the ball hard,” what does “hard” describe?',
      options: ['the ball', 'kicked', 'she', 'the sentence'],
      correct: 1,
      explanation: '“Hard” is an adverb here, describing how she kicked the ball.',
    },
    {
      question: 'Which sentence correctly joins two ideas with a conjunction?',
      options: ['She was tired she finished her work.', 'She was tired, she finished her work.', 'She was tired, but she finished her work.', 'She was tired but, she finished her work.'],
      correct: 2,
      explanation: 'A comma followed by the conjunction “but” correctly joins the two independent ideas.',
    },
    {
      question: 'What part of speech is “freedom” in “They fought for freedom”?',
      options: ['Verb', 'Adjective', 'Noun', 'Adverb'],
      correct: 2,
      explanation: '“Freedom” names an idea, so it is a noun.',
    },
    {
      question: 'Which word class describes a noun by giving more information about it, such as colour, size, or quality?',
      options: ['Adverb', 'Adjective', 'Preposition', 'Conjunction'],
      correct: 1,
      explanation: 'Adjectives describe nouns.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['He runs very quick.', 'He runs very quickly.', 'He run very quickly.', 'He runly quick.'],
      correct: 1,
      explanation: 'An adverb is needed to describe the verb “runs”, and the verb form “runs” matches the subject “he”.',
    },
  ],
  quickRevision: [
    'Every word in a sentence has a job: naming, acting, describing, joining, connecting, or reacting.',
    'Nouns name people, places, things, and ideas; pronouns replace nouns so we do not repeat them.',
    'Verbs show action or state; adjectives describe nouns; adverbs describe verbs, adjectives, or other adverbs.',
    'Adverbs of manner often end in -ly and answer the question “how?”, but a few common ones, like “hard” and “fast”, do not.',
    'The same word can belong to different word classes depending on the job it does in that sentence — always check its function, not just its spelling.',
  ],
}
