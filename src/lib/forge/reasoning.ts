import { num, ordinal, wrongOptions, type ForgeGenerator } from './item'

// Analytical- and mental-ability generators.
//
// FPSC's General Abilities portion and PPSC's logical-reasoning topics are both
// pattern work rather than recall, which is exactly what can be generated
// safely: the rule is chosen first and the sequence is produced from it, so the
// key follows from construction rather than from an authored guess.

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const NAMES = ['Asad', 'Bushra', 'Danish', 'Erum', 'Faisal', 'Ghazala', 'Hamza', 'Iqra', 'Junaid', 'Kiran', 'Laiba', 'Moeen']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const letterAt = (index: number) => LETTERS[((index % 26) + 26) % 26]
const positionOf = (letter: string) => LETTERS.indexOf(letter) + 1

const numberSeries: ForgeGenerator = (rng) => {
  const rule = rng.pick(['arithmetic', 'geometric', 'squares', 'cubes', 'fibonacci', 'increasingDifference', 'alternating'] as const)
  let terms: number[] = []
  let explanation = ''

  if (rule === 'arithmetic') {
    const start = rng.int(2, 40)
    const step = rng.int(3, 17) * (rng.chance(0.25) ? -1 : 1)
    terms = Array.from({ length: 6 }, (_, index) => start + index * step)
    explanation = `Each term ${step > 0 ? 'increases' : 'decreases'} by ${Math.abs(step)}.`
  } else if (rule === 'geometric') {
    const start = rng.int(2, 9)
    const ratio = rng.pick([2, 3, 4])
    terms = Array.from({ length: 6 }, (_, index) => start * ratio ** index)
    explanation = `Each term is the previous term multiplied by ${ratio}.`
  } else if (rule === 'squares') {
    const start = rng.int(2, 10)
    terms = Array.from({ length: 6 }, (_, index) => (start + index) ** 2)
    explanation = `The terms are the perfect squares ${start}², ${start + 1}², ${start + 2}², …`
  } else if (rule === 'cubes') {
    const start = rng.int(1, 7)
    terms = Array.from({ length: 5 }, (_, index) => (start + index) ** 3)
    explanation = `The terms are the perfect cubes ${start}³, ${start + 1}³, ${start + 2}³, …`
  } else if (rule === 'fibonacci') {
    const first = rng.int(1, 9)
    const second = rng.int(2, 12)
    terms = [first, second]
    while (terms.length < 7) terms.push(terms[terms.length - 1] + terms[terms.length - 2])
    explanation = 'Each term is the sum of the two terms before it.'
  } else if (rule === 'increasingDifference') {
    const start = rng.int(2, 20)
    const firstGap = rng.int(2, 8)
    const growth = rng.int(1, 5)
    terms = [start]
    let gap = firstGap
    for (let index = 0; index < 5; index += 1) {
      terms.push(terms[terms.length - 1] + gap)
      gap += growth
    }
    explanation = `The differences are ${firstGap}, ${firstGap + growth}, ${firstGap + 2 * growth}, … increasing by ${growth} each time.`
  } else {
    const startA = rng.int(3, 30)
    const stepA = rng.int(3, 12)
    const startB = rng.int(40, 90)
    const stepB = rng.int(3, 12)
    terms = []
    for (let index = 0; index < 3; index += 1) {
      terms.push(startA + index * stepA)
      terms.push(startB - index * stepB)
    }
    explanation = `Two alternating series are interleaved: the 1st, 3rd and 5th terms rise by ${stepA} while the 2nd, 4th and 6th fall by ${stepB}.`
  }

  const missing = terms[terms.length - 1]
  const shown = terms.slice(0, -1)
  return {
    q: `Find the missing term: ${shown.join(', ')}, ?`,
    answer: num(missing),
    distractors: wrongOptions(num(missing), [
      // "Carry on the last visible gap" and "repeat the previous gap" are the
      // two mistakes this item actually catches. Both are taken as magnitudes:
      // in an interleaved series the raw gap is negative, and an option below
      // zero in a series of positive terms is dismissed on sight.
      num(missing + Math.abs(missing - shown[shown.length - 1])),
      num(shown[shown.length - 1] + Math.abs(shown[shown.length - 1] - shown[shown.length - 2])),
      num(missing - 1),
      num(missing + 2),
    ], rng),
    explanation: `${explanation} The next term is therefore ${num(missing)}.`,
    topic: 'Number Series and Differences',
    difficulty: 'Intermediate',
  }
}

const letterSeries: ForgeGenerator = (rng) => {
  const start = rng.int(0, 12)
  const step = rng.int(2, 5)
  const indices = Array.from({ length: 5 }, (_, index) => start + index * step)
  const shown = indices.slice(0, -1).map(letterAt)
  const answer = letterAt(indices[indices.length - 1])
  return {
    q: `Complete the series: ${shown.join(', ')}, ?`,
    answer,
    distractors: wrongOptions(answer, [
      letterAt(indices[indices.length - 1] + 1),
      letterAt(indices[indices.length - 1] - 1),
      letterAt(indices[indices.length - 1] + step),
      letterAt(indices[indices.length - 2]),
    ], rng),
    explanation: `Each letter moves ${step} place${step === 1 ? '' : 's'} forward in the alphabet, so after ${shown[shown.length - 1]} comes ${answer}.`,
    topic: 'Letter series',
    difficulty: 'Intermediate',
  }
}

const codingDecoding: ForgeGenerator = (rng) => {
  const words = ['LAHORE', 'KARACHI', 'MULTAN', 'SCHOOL', 'PENCIL', 'GARDEN', 'MARKET', 'FOREST', 'SILVER', 'ORANGE', 'CANDLE', 'BRIDGE', 'PLANET', 'WINDOW']
  const sample = rng.pick(words)
  const target = rng.pick(words.filter((word) => word !== sample))
  const shift = rng.int(1, 5) * (rng.chance(0.35) ? -1 : 1)
  const encode = (word: string) => [...word].map((letter) => letterAt(LETTERS.indexOf(letter) + shift)).join('')
  const answer = encode(target)
  return {
    q: `In a certain code, ${sample} is written as ${encode(sample)}. How will ${target} be written in the same code?`,
    answer,
    distractors: wrongOptions(answer, [
      [...target].map((letter) => letterAt(LETTERS.indexOf(letter) - shift)).join(''),
      [...target].map((letter) => letterAt(LETTERS.indexOf(letter) + shift + 1)).join(''),
      [...target].reverse().join(''),
      encode([...target].reverse().join('')),
    ], rng),
    explanation: `Every letter moves ${Math.abs(shift)} place${Math.abs(shift) === 1 ? '' : 's'} ${shift > 0 ? 'forward' : 'backward'} in the alphabet. Applying the same rule to ${target} gives ${answer}.`,
    topic: 'Coding and decoding',
    difficulty: 'Intermediate',
  }
}

const letterValueSum: ForgeGenerator = (rng) => {
  const word = rng.pick(['CAT', 'DOG', 'SUN', 'BOOK', 'LAMP', 'FISH', 'TREE', 'RAIN', 'GOLD', 'STAR', 'MOON', 'SAND'])
  const answer = [...word].reduce((sum, letter) => sum + positionOf(letter), 0)
  return {
    q: `If A = 1, B = 2, C = 3 and so on, what is the sum of the letters of the word ${word}?`,
    answer: num(answer),
    distractors: wrongOptions(num(answer), [
      num(answer + word.length), num(answer - word.length), num(answer * 2), num(Math.round(answer / word.length)),
    ], rng),
    explanation: `${[...word].map((letter) => `${letter}=${positionOf(letter)}`).join(', ')}. Their sum is ${num(answer)}.`,
    topic: 'Coding and decoding',
    difficulty: 'Basic',
  }
}

const alphabetPosition: ForgeGenerator = (rng) => {
  const fromLeft = rng.int(5, 18)
  const shift = rng.int(2, 7)
  const toRight = rng.chance(0.6)
  const index = toRight ? fromLeft + shift - 1 : fromLeft - shift - 1
  if (index < 0 || index > 25) return alphabetPosition(rng)
  const answer = LETTERS[index]
  return {
    q: `Which letter is ${ordinal(shift)} to the ${toRight ? 'right' : 'left'} of the ${ordinal(fromLeft)} letter from the left of the English alphabet?`,
    answer,
    distractors: wrongOptions(answer, [
      LETTERS[index + 1], LETTERS[index - 1] ?? 'A', LETTERS[toRight ? fromLeft - shift - 1 : fromLeft + shift - 1] ?? 'Z', LETTERS[fromLeft - 1],
    ], rng),
    explanation: `The ${ordinal(fromLeft)} letter from the left is ${LETTERS[fromLeft - 1]}. Counting ${shift} place${shift === 1 ? '' : 's'} to the ${toRight ? 'right' : 'left'} gives ${answer}.`,
    topic: 'Letter series',
    difficulty: 'Intermediate',
  }
}

const rowPosition: ForgeGenerator = (rng) => {
  const total = rng.int(20, 45)
  const fromLeft = rng.int(5, total - 4)
  const fromRight = total - fromLeft + 1
  const askRight = rng.chance(0.6)
  const answer = askRight ? fromRight : fromLeft
  return {
    q: `In a row of ${total} students, ${rng.pick(NAMES)} stands ${ordinal(askRight ? fromLeft : fromRight)} from the ${askRight ? 'left' : 'right'} end. What is the same student's position from the ${askRight ? 'right' : 'left'} end?`,
    answer: ordinal(answer),
    distractors: wrongOptions(ordinal(answer), [
      ordinal(answer + 1), ordinal(answer - 1), ordinal(total - answer), ordinal(askRight ? fromLeft : fromRight),
    ], rng),
    explanation: `Position from one end + position from the other end = total + 1. So the required position is ${total} + 1 − ${askRight ? fromLeft : fromRight} = ${answer}.`,
    topic: 'Logical deduction',
    difficulty: 'Basic',
  }
}

const directionSense: ForgeGenerator = (rng) => {
  // A closed L-shaped walk built on a Pythagorean triple, so the final
  // displacement is a whole number rather than a rounded surd.
  const [east, north, hypotenuse] = rng.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]] as const)
  const askDistance = rng.chance(0.55)
  const walker = rng.pick(NAMES)
  const answer = askDistance ? `${hypotenuse} km` : 'North-east'
  return {
    q: askDistance
      ? `${walker} walks ${east} km towards the east, then turns left and walks ${north} km towards the north. How far is ${walker} now from the starting point?`
      : `${walker} walks ${east} km towards the east, then turns left and walks ${north} km towards the north. In which direction is the final position from the starting point?`,
    answer,
    distractors: askDistance
      ? wrongOptions(answer, [`${east + north} km`, `${Math.abs(north - east)} km`, `${hypotenuse + 1} km`, `${hypotenuse * 2} km`], rng)
      : wrongOptions(answer, ['North-west', 'South-east', 'South-west', 'Due north'], rng),
    explanation: askDistance
      ? `The two legs are at right angles, so the distance is √(${east}² + ${north}²) = √${east ** 2 + north ** 2} = ${hypotenuse} km.`
      : `Moving east and then north places the final point to the north and to the east of the start, i.e. in the north-east direction.`,
    topic: 'Direction sense',
    difficulty: 'Intermediate',
  }
}

const bloodRelation: ForgeGenerator = (rng) => {
  const cases = [
    {
      q: 'Pointing to a photograph, a man said, “She is the daughter of the only son of my grandfather.” How is the woman in the photograph related to him?',
      answer: 'His sister',
      distractors: ['His daughter', 'His niece', 'His cousin', 'His aunt'],
      explanation: 'The only son of his grandfather is his own father, so the woman is his father’s daughter — his sister.',
    },
    {
      q: 'Introducing a boy, a woman said, “He is the son of the only daughter of my mother.” How is the boy related to the woman?',
      answer: 'Her son',
      distractors: ['Her nephew', 'Her brother', 'Her cousin', 'Her grandson'],
      explanation: 'The only daughter of her mother is the woman herself, so the boy is her own son.',
    },
    {
      q: 'A is the brother of B. B is the sister of C. C is the father of D. How is A related to D?',
      answer: 'Uncle',
      distractors: ['Father', 'Brother', 'Grandfather', 'Cousin'],
      explanation: 'A and C are siblings (both are siblings of B), and C is D’s father, so A is D’s uncle.',
    },
    {
      q: 'Pointing to a man, a woman said, “His mother is the only daughter of my mother.” How is the woman related to the man?',
      answer: 'Mother',
      distractors: ['Sister', 'Aunt', 'Grandmother', 'Daughter'],
      explanation: 'The only daughter of her mother is the speaker herself, so she is the man’s mother.',
    },
    {
      q: 'P is the father of Q. Q is the daughter of R. R is the mother of S. How is S related to P?',
      answer: 'Son or daughter',
      distractors: ['Brother', 'Nephew', 'Father', 'Grandson'],
      explanation: 'P and R are the parents of Q, and S is also R’s child, so S is P’s child.',
    },
    {
      q: 'X is the son of Y. Z is the mother of Y. How is Z related to X?',
      answer: 'Grandmother',
      distractors: ['Mother', 'Aunt', 'Sister', 'Daughter'],
      explanation: 'Y is X’s parent and Z is Y’s mother, so Z is X’s grandmother.',
    },
    {
      q: 'Pointing to a lady, a girl said, “She is the wife of the brother of my father.” How is the lady related to the girl?',
      answer: 'Aunt',
      distractors: ['Mother', 'Sister', 'Grandmother', 'Cousin'],
      explanation: 'Her father’s brother is her uncle, so his wife is her aunt.',
    },
    {
      q: 'M is the daughter of N. N is the son of O. O is the father of P. How is P related to M?',
      answer: 'Aunt or uncle',
      distractors: ['Sister', 'Mother', 'Grandmother', 'Cousin'],
      explanation: 'N and P are both children of O, so they are siblings, making P the aunt or uncle of N’s daughter M.',
    },
  ]
  const chosen = rng.pick(cases)
  return {
    q: chosen.q,
    answer: chosen.answer,
    distractors: wrongOptions(chosen.answer, rng.shuffle(chosen.distractors), rng),
    explanation: chosen.explanation,
    topic: 'Family relations',
    difficulty: 'Intermediate',
  }
}

const syllogism: ForgeGenerator = (rng) => {
  const groups = [
    ['poets', 'writers', 'thinkers'], ['sparrows', 'birds', 'animals'], ['doctors', 'graduates', 'literate people'],
    ['roses', 'flowers', 'plants'], ['judges', 'lawyers', 'law graduates'], ['tractors', 'vehicles', 'machines'],
    ['teachers', 'employees', 'taxpayers'], ['novels', 'books', 'printed materials'],
  ]
  const [a, b, c] = rng.pick(groups)
  const form = rng.pick(['barbara', 'celarent', 'darii'] as const)
  if (form === 'barbara') {
    return {
      q: `Statements: All ${a} are ${b}. All ${b} are ${c}. Which conclusion definitely follows?`,
      answer: `All ${a} are ${c}.`,
      distractors: wrongOptions(`All ${a} are ${c}.`, [
        `All ${c} are ${a}.`, `No ${a} is ${c}.`, `Some ${c} are not ${b}.`, `Only some ${b} are ${c}.`,
      ], rng),
      explanation: `Every ${a.replace(/s$/, '')} belongs to ${b}, and everything in ${b} belongs to ${c}; the inclusion carries through, so all ${a} are ${c}. The converse "all ${c} are ${a}" does not follow.`,
      topic: 'Syllogisms',
      difficulty: 'Intermediate',
    }
  }
  if (form === 'celarent') {
    return {
      q: `Statements: All ${a} are ${b}. No ${b} is ${c}. Which conclusion definitely follows?`,
      answer: `No ${a} is ${c}.`,
      distractors: wrongOptions(`No ${a} is ${c}.`, [
        `Some ${a} are ${c}.`, `All ${c} are ${a}.`, `Some ${b} are ${c}.`, `No ${c} is ${b} only sometimes.`,
      ], rng),
      explanation: `All ${a} lie inside ${b}, and ${b} is wholly separate from ${c}; therefore no ${a.replace(/s$/, '')} can be ${c}.`,
      topic: 'Syllogisms',
      difficulty: 'Intermediate',
    }
  }
  return {
    q: `Statements: Some ${a} are ${b}. All ${b} are ${c}. Which conclusion definitely follows?`,
    answer: `Some ${a} are ${c}.`,
    distractors: wrongOptions(`Some ${a} are ${c}.`, [
      `All ${a} are ${c}.`, `No ${a} is ${c}.`, `All ${c} are ${a}.`, `Some ${c} are not ${b}.`,
    ], rng),
    explanation: `The ${a} that are ${b} must also be ${c}, so at least some ${a} are ${c}. "All ${a} are ${c}" is too strong, because only some ${a} were said to be ${b}.`,
    topic: 'Syllogisms',
    difficulty: 'Advanced',
  }
}

const oddOneOut: ForgeGenerator = (rng) => {
  const kind = rng.pick(['prime', 'square', 'cube', 'multiple'] as const)
  if (kind === 'prime') {
    const primes = rng.sample([11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73], 3)
    const composite = rng.pick([21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93])
    return {
      q: `Which of the following does not belong with the others: ${rng.shuffle([...primes, composite]).join(', ')}?`,
      answer: num(composite),
      distractors: wrongOptions(num(composite), primes.map(num), rng),
      explanation: `${primes.join(', ')} are prime numbers, while ${composite} is composite.`,
      topic: 'Classification',
      difficulty: 'Intermediate',
    }
  }
  if (kind === 'square') {
    const squares = rng.sample([16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225], 3)
    const nonSquare = rng.pick([18, 27, 30, 45, 50, 63, 75, 90, 108, 128, 150, 200])
    return {
      q: `Select the odd one out: ${rng.shuffle([...squares, nonSquare]).join(', ')}`,
      answer: num(nonSquare),
      distractors: wrongOptions(num(nonSquare), squares.map(num), rng),
      explanation: `${squares.join(', ')} are perfect squares; ${nonSquare} is not.`,
      topic: 'Classification',
      difficulty: 'Intermediate',
    }
  }
  if (kind === 'cube') {
    const cubes = rng.sample([27, 64, 125, 216, 343, 512, 729, 1000], 3)
    const nonCube = rng.pick([36, 100, 144, 200, 300, 400, 600, 800])
    return {
      q: `Select the odd one out: ${rng.shuffle([...cubes, nonCube]).join(', ')}`,
      answer: num(nonCube),
      distractors: wrongOptions(num(nonCube), cubes.map(num), rng),
      explanation: `${cubes.join(', ')} are perfect cubes; ${nonCube} is not.`,
      topic: 'Classification',
      difficulty: 'Advanced',
    }
  }
  const factor = rng.pick([6, 7, 8, 9, 11, 12, 13])
  const multiples = rng.sample(Array.from({ length: 12 }, (_, index) => factor * (index + 3)), 3)
  let stray = rng.pick(multiples) + rng.int(1, factor - 1)
  while (stray % factor === 0) stray += 1
  return {
    q: `Three of the following numbers share a property that the fourth does not. Which is the odd one: ${rng.shuffle([...multiples, stray]).join(', ')}?`,
    answer: num(stray),
    distractors: wrongOptions(num(stray), multiples.map(num), rng),
    explanation: `${multiples.join(', ')} are all multiples of ${factor}; ${stray} is not.`,
    topic: 'Classification',
    difficulty: 'Intermediate',
  }
}

const numericAnalogy: ForgeGenerator = (rng) => {
  const kind = rng.pick(['square', 'cube', 'doubleAddOne', 'squarePlus'] as const)
  const apply = (value: number) => {
    if (kind === 'square') return value * value
    if (kind === 'cube') return value ** 3
    if (kind === 'doubleAddOne') return value * 2 + 1
    return value * value + value
  }
  const label = {
    square: 'each number is squared',
    cube: 'each number is cubed',
    doubleAddOne: 'each number is doubled and 1 is added',
    squarePlus: 'each number is squared and the number itself is added',
  }[kind]
  const first = rng.int(3, kind === 'cube' ? 9 : 15)
  const second = rng.int(3, kind === 'cube' ? 11 : 18)
  if (first === second) return numericAnalogy(rng)
  const answer = apply(second)
  return {
    q: `${first} : ${apply(first)} :: ${second} : ?`,
    answer: num(answer),
    distractors: wrongOptions(num(answer), [
      num(second * second + 1), num(second * 2), num(answer + second), num(answer - 1),
    ], rng),
    explanation: `In the given pair ${label} (${first} → ${apply(first)}). Applying the same rule to ${second} gives ${num(answer)}.`,
    topic: 'Verbal analogies',
    difficulty: 'Intermediate',
  }
}

const clockAngle: ForgeGenerator = (rng) => {
  const hour = rng.int(1, 12)
  const minute = rng.pick([0, 10, 20, 30, 40, 50])
  const raw = Math.abs(30 * (hour % 12) - 5.5 * minute)
  const answer = Math.min(raw, 360 - raw)
  return {
    q: `What is the angle between the hour hand and the minute hand of a clock at ${hour}:${minute.toString().padStart(2, '0')}?`,
    answer: `${num(answer)}°`,
    distractors: wrongOptions(`${num(answer)}°`, [
      `${num(360 - answer)}°`, `${num(Math.abs(30 * (hour % 12) - 6 * minute))}°`, `${num(answer + 15)}°`, `${num(Math.abs(answer - 30))}°`,
    ], rng),
    explanation: `The hour hand moves 30° per hour plus 0.5° per minute and the minute hand 6° per minute, so the gap is |30×${hour % 12} − 5.5×${minute}| = ${num(raw)}°, giving an angle of ${num(answer)}°.`,
    topic: 'Logical deduction',
    difficulty: 'Advanced',
  }
}

const calendarDay: ForgeGenerator = (rng) => {
  const year = rng.int(1947, 2035)
  const month = rng.int(0, 11)
  const day = rng.int(1, 28)
  const answer = WEEKDAYS[new Date(Date.UTC(year, month, day)).getUTCDay()]
  return {
    q: `What day of the week was ${day} ${MONTHS[month]} ${year}?`,
    answer,
    distractors: wrongOptions(answer, rng.shuffle(WEEKDAYS.filter((weekday) => weekday !== answer)), rng),
    explanation: `Counting forward from a known reference day in the Gregorian calendar, ${day} ${MONTHS[month]} ${year} fell on a ${answer}.`,
    topic: 'Logical deduction',
    difficulty: 'Advanced',
  }
}

const seatingArrangement: ForgeGenerator = (rng) => {
  const people = rng.sample(NAMES, 5)
  const askPosition = rng.chance(0.5)
  const target = rng.int(0, 4)
  const clues = [
    `${people[0]} is at the extreme left end`,
    `${people[4]} is at the extreme right end`,
    `${people[2]} is exactly in the middle`,
    `${people[1]} sits immediately to the right of ${people[0]}`,
    `${people[3]} sits immediately to the left of ${people[4]}`,
  ]
  const answer = askPosition ? ordinal(target + 1) : people[target]
  return {
    q: `Five friends sit in a row facing north. ${rng.shuffle(clues).join(', ')}. ${askPosition ? `Counting from the left, what is ${people[target]}'s position?` : `Who occupies the ${ordinal(target + 1)} seat from the left?`}`,
    answer,
    distractors: askPosition
      ? wrongOptions(answer, [ordinal(5 - target), ordinal(((target + 1) % 5) + 1), ordinal(((target + 2) % 5) + 1), ordinal(((target + 3) % 5) + 1)], rng)
      : wrongOptions(answer, rng.shuffle(people.filter((person) => person !== answer)), rng),
    explanation: `The clues fix the order from the left as ${people.join(', ')}. Hence ${askPosition ? `${people[target]} is ${ordinal(target + 1)} from the left` : `the ${ordinal(target + 1)} seat belongs to ${people[target]}`}.`,
    topic: 'Logical deduction',
    difficulty: 'Advanced',
  }
}

export const reasoningGenerators: Record<string, ForgeGenerator> = {
  numberSeries,
  letterSeries,
  codingDecoding,
  letterValueSum,
  alphabetPosition,
  rowPosition,
  directionSense,
  bloodRelation,
  syllogism,
  oddOneOut,
  numericAnalogy,
  clockAngle,
  calendarDay,
  seatingArrangement,
}
