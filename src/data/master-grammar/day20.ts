import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day20: GrammarDay = {
  day: 20,
  ...stageOf(20),
  title: 'Comparatives and Superlatives',
  whatYouWillLearn:
    'You will learn how to form and use comparatives (for comparing two things) and superlatives (for comparing three or more), including the irregular forms and the mistakes to avoid.',
  simpleExplanation: [
    'When you compare two things, you use a comparative — for example, “Sara is taller than Ali.” When you compare three or more things and want to pick out the top or bottom of the group, you use a superlative — for example, “Sara is the tallest student in the class.”',
    'Short adjectives usually add an ending (-er for comparative, -est for superlative), while longer adjectives usually add a separate word in front (more or most) instead of changing their own ending. A few very common adjectives are irregular and simply have to be learned as they are, such as good/better/best.',
    'Once the basic forms feel automatic, the next skill is avoiding a small set of very common errors — combining both methods at once (“more taller”), doubling up a superlative that is already complete (“most best”), and grading words that already describe an extreme, such as “unique” or “perfect”.',
  ],
  rules: [
    {
      rule: 'A comparative compares exactly two things; a superlative compares three or more, or picks out the extreme within a group.',
      explanation: 'Ask yourself how many things are being compared before choosing the form.',
      correct: 'This road is wider than that one. (two things — comparative) / This is the widest road in the city. (three or more — superlative)',
    },
    {
      rule: 'Short adjectives (one syllable, and most two-syllable adjectives ending in -y) add -er/-est.',
      explanation: 'Watch for two small spelling changes: a final -y changes to -i before adding the ending, and a short vowel plus a single final consonant is often doubled.',
      correct: 'tall → taller → tallest / happy → happier → happiest / big → bigger → biggest',
    },
    {
      rule: 'Longer adjectives (most adjectives of two or more syllables, apart from those ending in -y) use more/most instead of an ending.',
      explanation: 'Do not try to add -er or -est to a long adjective; use “more” and “most” in front of it instead.',
      correct: 'This course is more difficult than the last one. / She is the most confident speaker in the group.',
    },
    {
      rule: 'Some very common adjectives have irregular comparative and superlative forms.',
      explanation: 'These do not follow the -er/-est or more/most pattern and simply need to be learned: good/better/best, bad/worse/worst, far/farther or further/farthest or furthest. “Farther” is often used for physical distance and “further” for extent or additional information, though the two overlap in everyday use.',
      correct: 'This tea is better than the last cup. / The situation got worse over the following weeks. / We need to discuss this matter further.',
    },
    {
      rule: 'Use “as + adjective + as” to show that two things are equal, and “not as + adjective + as” to show they are not equal.',
      explanation: 'This structure compares two things without using a comparative form at all.',
      correct: 'Ali is as tall as his father. / This bag is not as heavy as it looks.',
      wrong: 'Ali is as tall than his father.',
      correction: 'Equal comparisons use “as…as” on both sides, not a mix of “as” and “than”.',
    },
    {
      rule: 'Never combine -er/-est with more/most — choose one method only.',
      explanation: 'A “double comparative” or “double superlative” uses both the ending and the extra word at the same time, which is incorrect.',
      correct: 'This bag is bigger than that one. / He is the tallest boy in the class.',
      wrong: 'This bag is more bigger than that one.',
      correction: 'Pick one form only: either “bigger” or “more big”-style would be needed for a long adjective, but for a short adjective like “big”, only the -er ending is used.',
    },
    {
      rule: 'In careful, formal writing, words that already describe an extreme or absolute quality — such as unique, perfect, and complete — are usually left ungraded rather than turned into a comparative or superlative.',
      explanation: 'Something is either unique (one of a kind) or it is not, so in strict formal usage it is not described as “more unique” or “the most unique”; a gradable word is chosen instead when a comparison is genuinely needed.',
      correct: 'This proposal is unique among the entries we received. / This design is more original than the last one.',
      wrong: 'This proposal is more unique than the last one.',
      correction: 'In careful formal writing, prefer “unique” on its own, or replace it with a gradable word such as “original” when a comparison is intended.',
    },
    {
      rule: '“The + comparative…, the + comparative…” is used to show that two things change together.',
      explanation: 'This parallel structure links two comparatives to show one thing increasing or decreasing along with another.',
      correct: 'The harder you practise, the more you improve.',
    },
  ],
  comparison: {
    title: 'Short adjectives vs Long adjectives',
    columnA: 'Short: add -er / -est',
    columnB: 'Long: use more / most',
    rows: [
      ['tall → taller → tallest', 'careful → more careful → most careful'],
      ['happy → happier → happiest', 'difficult → more difficult → most difficult'],
      ['big → bigger → biggest', 'expensive → more expensive → most expensive'],
    ],
  },
  easyExamples: [
    'Ali is taller than his brother.',
    'This is the tallest building in the town.',
    'The soup is hotter than before.',
    'She is the happiest person I know.',
  ],
  practicalExamples: [
    'This laptop is more expensive than that one.',
    'Of all the applicants, she was the most confident in the interview.',
    'His new house is bigger than his old one.',
  ],
  examExamples: [
    'The revised policy is more effective than the previous one, though it is still far from perfect.',
    'Among all the candidates interviewed, he was clearly the most qualified for the post.',
  ],
  commonMistakes: [
    {
      wrong: 'This bag is more bigger than that one.',
      right: 'This bag is bigger than that one.',
      why: '“Big” is a short adjective and only needs the -er ending; adding “more” as well creates a double comparative.',
    },
    {
      wrong: 'He is the most tallest boy in the class.',
      right: 'He is the tallest boy in the class.',
      why: '“Tallest” already carries the superlative meaning; adding “most” doubles it unnecessarily.',
    },
    {
      wrong: 'This is the most best solution to the problem.',
      right: 'This is the best solution to the problem.',
      why: '“Best” is already the irregular superlative of “good”, so adding “most” is a double superlative.',
    },
    {
      wrong: 'She is more happy than her sister.',
      right: 'She is happier than her sister.',
      why: '“Happy” is a short, two-syllable adjective ending in -y, so it takes -er, not “more”.',
    },
    {
      wrong: 'This is the most unique idea I have ever heard.',
      right: 'This is a unique idea.',
      why: '“Unique” means one of a kind; in careful writing, it is not usually graded with “most”.',
    },
    {
      wrong: 'He is as tall than his father.',
      right: 'He is as tall as his father.',
      why: 'An equal comparison uses “as…as” consistently, not a mix of “as” and “than”.',
    },
  ],
  memoryTip:
    'Short word, short change: add -er/-est. Long word, extra word: add more/most. Never do both to the same adjective at once — pick one route, not two.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'In “Sara is more careful than Ali,” is this a comparative or a superlative?',
      answer: 'Comparative',
      reason: 'It compares exactly two people, Sara and Ali.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “This is the cheapest shop in town,” is this a comparative or a superlative?',
      answer: 'Superlative',
      reason: 'It picks out one shop as the extreme among all the shops in town.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'This exercise is ____ (easy) than the last one.',
      answer: 'easier',
      reason: '“Easy” is short and ends in -y, so the y changes to i before adding -er.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'That was the ____ (bad) storm this region has seen in years.',
      answer: 'worst',
      reason: '“Bad” has the irregular superlative form “worst”.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'This restaurant is ____ (expensive) than the one near our house.',
      answer: 'more expensive',
      reason: '“Expensive” is a long adjective, so it takes “more”, not an -er ending.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'He runs (faster / more faster) than his teammates.',
      answer: 'faster',
      reason: '“Fast” is short and only needs -er; adding “more” would create a double comparative.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'Of the three routes to the airport, this one is the (shorter / shortest).',
      answer: 'shortest',
      reason: 'Three or more items are being compared, so the superlative form is needed.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'She is (as tall as / as tall than) her mother.',
      answer: 'as tall as',
      reason: 'Equal comparisons use “as” on both sides of the adjective.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'This is the most easiest question on the test.',
      answer: 'This is the easiest question on the test.',
      reason: '“Easiest” is already a complete superlative; adding “most” doubles it.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'My phone is more newer than yours.',
      answer: 'My phone is newer than yours.',
      reason: '“New” is short and only needs -er; “more” is not needed as well.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'This road is more worse than the last one.',
      answer: 'This road is worse than the last one.',
      reason: '“Worse” is already the irregular comparative of “bad”; adding “more” doubles it.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The results this term were the most best of the entire session.',
      answer: 'The results this term were the best of the entire session.',
      reason: '“Best” already carries the superlative meaning, so “most” is unnecessary and incorrect here.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The longer you practise, more you improve.',
      answer: 'The longer you practise, the more you improve.',
      reason: 'The parallel structure needs “the” before both comparatives: “the longer…, the more…”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'This proposal is more unique than the last one.',
      answer: 'This proposal is more original than the last one.',
      reason: '“Unique” describes something as one of a kind and is not usually graded; a gradable word such as “original” fits the comparative structure instead.',
    },
  ],
  quiz: [
    {
      question: 'Which sentence uses the comparative form correctly?',
      options: ['This bag is more bigger.', 'This bag is bigger.', 'This bag is more big.', 'This bag is biggly.'],
      correct: 1,
      explanation: '“Big” is short, so it takes -er only, not “more”.',
    },
    {
      question: 'Which sentence uses the superlative correctly?',
      options: ['He is the most tallest player.', 'He is the tallest player.', 'He is more tallest player.', 'He is tallest of player.'],
      correct: 1,
      explanation: '“Tallest” alone is the correct superlative of the short adjective “tall”.',
    },
    {
      question: 'What is the correct comparative form of “happy”?',
      options: ['happier', 'more happy', 'happyer', 'most happy'],
      correct: 0,
      explanation: '“Happy” changes y to i and adds -er: “happier”.',
    },
    {
      question: 'What is the correct superlative form of “good”?',
      options: ['goodest', 'most good', 'best', 'more good'],
      correct: 2,
      explanation: '“Good” has the irregular superlative “best”.',
    },
    {
      question: 'Which is the correct comparative of “far” for physical distance?',
      options: ['farer', 'farther', 'more far', 'furthest'],
      correct: 1,
      explanation: '“Farther” is commonly used for physical distance.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['She is as clever as her brother.', 'She is as clever than her brother.', 'She is so clever as her brother.', 'She is clever as her brother.'],
      correct: 0,
      explanation: 'Equal comparisons use “as…as” consistently.',
    },
    {
      question: 'Which sentence best fits careful, formal usage?',
      options: ['This is the most unique painting in the gallery.', 'This is a unique painting.', 'This is the uniquest painting.', 'This is more unique painting.'],
      correct: 1,
      explanation: '“Unique” is usually left ungraded in careful formal writing.',
    },
    {
      question: 'Which sentence correctly compares two long adjectives?',
      options: ['This film is more interesting than the last one.', 'This film is interestinger than the last one.', 'This film is more interestinger than the last one.', 'This film is most interesting than the last one.'],
      correct: 0,
      explanation: '“Interesting” is a long adjective, so it takes “more”, with no -er ending.',
    },
    {
      question: 'Which sentence correctly uses the parallel comparative structure?',
      options: ['The harder you work, the more you earn.', 'The harder you work, more you earn.', 'Harder you work, the more you earn.', 'The more harder you work, the more you earn.'],
      correct: 0,
      explanation: 'Both halves of this structure need “the” before the comparative.',
    },
    {
      question: 'Which sentence contains a double comparative error?',
      options: ['He is taller than me.', 'He is more taller than me.', 'He is much taller than me.', 'He is far taller than me.'],
      correct: 1,
      explanation: '“More taller” combines both comparative methods at once, which is incorrect.',
    },
    {
      question: 'Which sentence contains a double superlative error?',
      options: ['This is the best film of the year.', 'This is the most best film of the year.', 'This is by far the best film.', 'This is one of the best films.'],
      correct: 1,
      explanation: '“Most best” doubles the superlative meaning already present in “best”.',
    },
    {
      question: 'Which type of adjective uses “more/most” instead of -er/-est?',
      options: ['One-syllable adjectives', 'Most two-syllable adjectives ending in -y', 'Adjectives of three or more syllables', 'Irregular adjectives such as good and bad'],
      correct: 2,
      explanation: 'Longer adjectives, generally three or more syllables (and most two-syllable ones not ending in -y), use “more” and “most”.',
    },
  ],
  quickRevision: [
    'Comparative compares two things; superlative compares three or more, or picks out the extreme of a group.',
    'Short adjectives (and most two-syllable adjectives ending in -y) add -er/-est, with spelling changes such as y→i and consonant doubling.',
    'Longer adjectives use more/most instead of an ending.',
    'Irregular forms must be learned individually: good/better/best, bad/worse/worst, far/farther-further/farthest-furthest.',
    'Equal comparisons use “as + adjective + as”.',
    'Never combine -er/-est with more/most in the same comparison — that creates a double comparative or double superlative.',
    'In careful formal writing, absolute words like unique, perfect, and complete are usually left ungraded rather than compared.',
  ],
}
