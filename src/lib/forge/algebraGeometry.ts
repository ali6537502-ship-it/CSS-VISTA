import { num, ordinal, wrongOptions, type ForgeGenerator } from './item'

// Algebra, mensuration and coordinate-geometry generators. The MPT General
// Abilities syllabus names "basic algebra and geometry" explicitly, and PPSC's
// Basic Mathematics part lists algebra and geometry alongside arithmetic.
//
// As in the arithmetic forge, values are chosen so the key is exact: circle
// items use radii that are multiples of 7 with π = 22/7, quadratics are built
// from their integer roots, and right triangles come from Pythagorean triples.

const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [7, 24, 25], [12, 16, 20], [10, 24, 26], [20, 21, 29], [9, 40, 41]] as const

const linearEquation: ForgeGenerator = (rng) => {
  const x = rng.int(2, 30)
  const a = rng.int(2, 12)
  const b = rng.int(1, 40)
  const c = a * x + b
  return {
    q: `Solve for x: ${a}x + ${b} = ${num(c)}`,
    answer: num(x),
    distractors: wrongOptions(num(x), [
      num((c + b) / a), num(c / a), num(c - b), num(x + a),
    ], rng),
    explanation: `${a}x = ${num(c)} − ${b} = ${num(c - b)}, so x = ${num(c - b)} ÷ ${a} = ${num(x)}.`,
    topic: 'Algebra',
    difficulty: 'Basic',
  }
}

const simultaneousEquations: ForgeGenerator = (rng) => {
  const x = rng.int(1, 15)
  const y = rng.int(1, 15)
  const a1 = rng.int(1, 6)
  const b1 = rng.int(1, 6)
  const a2 = rng.int(1, 6)
  const b2 = rng.int(1, 6)
  if (a1 * b2 === a2 * b1) return simultaneousEquations(rng)
  const c1 = a1 * x + b1 * y
  const c2 = a2 * x + b2 * y
  const askY = rng.chance(0.5)
  const answer = askY ? y : x
  return {
    q: `If ${a1}x + ${b1}y = ${num(c1)} and ${a2}x + ${b2}y = ${num(c2)}, then the value of ${askY ? 'y' : 'x'} is:`,
    answer: num(answer),
    distractors: wrongOptions(num(answer), [
      num(askY ? x : y), num(answer + 1), num(x + y), num(Math.abs(x - y)),
    ], rng),
    explanation: `Solving the pair gives x = ${num(x)} and y = ${num(y)}; both equations are satisfied (${a1}×${x} + ${b1}×${y} = ${num(c1)}).`,
    topic: 'Simultaneous equations',
    difficulty: 'Intermediate',
  }
}

const quadraticRoots: ForgeGenerator = (rng) => {
  const first = rng.int(-12, 12)
  const second = rng.int(-12, 12)
  if (first === second || first === 0 || second === 0) return quadraticRoots(rng)
  const b = -(first + second)
  const c = first * second
  const sign = (value: number) => (value < 0 ? `− ${Math.abs(value)}` : `+ ${value}`)
  const roots = [first, second].sort((left, right) => left - right)
  const answer = `${roots[0]} and ${roots[1]}`
  return {
    q: `The roots of the equation x² ${sign(b)}x ${sign(c)} = 0 are:`,
    answer,
    distractors: wrongOptions(answer, [
      `${-roots[0]} and ${-roots[1]}`,
      `${roots[0]} and ${-roots[1]}`,
      `${roots[0] + 1} and ${roots[1] + 1}`,
      `${roots[0] * 2} and ${roots[1] * 2}`,
    ], rng),
    explanation: `The sum of the roots is ${num(-b)} and their product is ${num(c)}; the two numbers satisfying both are ${roots[0]} and ${roots[1]}.`,
    topic: 'Algebra',
    difficulty: 'Advanced',
  }
}

const indices: ForgeGenerator = (rng) => {
  const base = rng.pick([2, 3, 5, 7, 10])
  const first = rng.int(2, 7)
  const multiply = rng.chance(0.6)
  // Division keeps the exponent positive so the key is a whole number: an
  // option like "0.01" for 2³ ÷ 2⁵ tests decimal rendering, not index laws.
  const second = multiply ? rng.int(1, 5) : rng.int(1, first - 1)
  const exponent = multiply ? first + second : first - second
  const answer = base ** exponent
  return {
    q: `Simplify: ${base}^${first} ${multiply ? '×' : '÷'} ${base}^${second}`,
    answer: num(answer),
    distractors: wrongOptions(num(answer), [
      num(base ** (multiply ? first * second : first / second)),
      num(base ** (multiply ? first - second : first + second)),
      num(base ** first * (multiply ? second : 1 / second)),
      num(answer * base),
    ], rng),
    explanation: `When powers of the same base are ${multiply ? 'multiplied the exponents add' : 'divided the exponents subtract'}: ${base}^(${first}${multiply ? '+' : '−'}${second}) = ${base}^${exponent} = ${num(answer)}.`,
    topic: 'Algebra',
    difficulty: 'Intermediate',
  }
}

const geometricProgression: ForgeGenerator = (rng) => {
  const first = rng.int(1, 8)
  const ratio = rng.pick([2, 3, 4, 5])
  const position = rng.int(4, 8)
  const answer = first * ratio ** (position - 1)
  return {
    q: `What is the ${ordinal(position)} term of the geometric progression ${first}, ${first * ratio}, ${first * ratio ** 2}, …?`,
    answer: num(answer),
    distractors: wrongOptions(num(answer), [
      num(first * ratio ** position), num(first + (position - 1) * ratio), num(answer / ratio), num(answer * ratio),
    ], rng),
    explanation: `aₙ = a·r^(n−1) = ${first} × ${ratio}^${position - 1} = ${num(answer)}.`,
    topic: 'Geometric progression',
    difficulty: 'Advanced',
  }
}

const triangleAngles: ForgeGenerator = (rng) => {
  const first = rng.int(25, 80)
  const second = rng.int(25, 175 - first)
  const answer = 180 - first - second
  return {
    q: `Two angles of a triangle measure ${first}° and ${second}°. The third angle is:`,
    answer: `${answer}°`,
    distractors: wrongOptions(`${answer}°`, [
      `${360 - first - second}°`, `${180 - first}°`, `${first + second}°`, `${answer + 10}°`,
    ], rng),
    explanation: `The angles of a triangle add up to 180°, so the third angle is 180° − ${first}° − ${second}° = ${answer}°.`,
    topic: 'Geometry',
    difficulty: 'Basic',
  }
}

const pythagoras: ForgeGenerator = (rng) => {
  const [a, b, c] = rng.pick(TRIPLES)
  const scale = rng.pick([1, 1, 1, 2, 3])
  const askHypotenuse = rng.chance(0.6)
  const answer = (askHypotenuse ? c : b) * scale
  return {
    q: askHypotenuse
      ? `In a right-angled triangle the two legs measure ${a * scale} cm and ${b * scale} cm. The length of the hypotenuse is:`
      : `The hypotenuse of a right-angled triangle is ${c * scale} cm and one leg is ${a * scale} cm. The other leg measures:`,
    answer: `${num(answer)} cm`,
    distractors: wrongOptions(`${num(answer)} cm`, [
      `${num((a + b) * scale)} cm`, `${num(answer + scale)} cm`, `${num(Math.abs(c - a) * scale)} cm`, `${num(answer * 2)} cm`,
    ], rng),
    explanation: askHypotenuse
      ? `c² = a² + b² = ${(a * scale) ** 2} + ${(b * scale) ** 2} = ${(c * scale) ** 2}, so c = ${num(answer)} cm.`
      : `b² = c² − a² = ${(c * scale) ** 2} − ${(a * scale) ** 2} = ${(b * scale) ** 2}, so b = ${num(answer)} cm.`,
    topic: 'Geometry',
    difficulty: 'Intermediate',
  }
}

const rectangleMensuration: ForgeGenerator = (rng) => {
  const length = rng.int(6, 45)
  const width = rng.int(3, length - 1)
  const askArea = rng.chance(0.55)
  const area = length * width
  const perimeter = 2 * (length + width)
  const answer = askArea ? `${num(area)} cm²` : `${num(perimeter)} cm`
  return {
    q: `A rectangle is ${length} cm long and ${width} cm wide. Its ${askArea ? 'area' : 'perimeter'} is:`,
    answer,
    distractors: wrongOptions(answer, [
      askArea ? `${num(perimeter)} cm²` : `${num(area)} cm`,
      askArea ? `${num(length + width)} cm²` : `${num(length + width)} cm`,
      askArea ? `${num(area * 2)} cm²` : `${num(perimeter / 2)} cm`,
      askArea ? `${num(area / 2)} cm²` : `${num(perimeter * 2)} cm`,
    ], rng),
    explanation: askArea
      ? `Area = length × width = ${length} × ${width} = ${num(area)} cm².`
      : `Perimeter = 2(length + width) = 2(${length} + ${width}) = ${num(perimeter)} cm.`,
    topic: 'Mensuration',
    difficulty: 'Basic',
  }
}

const circleMensuration: ForgeGenerator = (rng) => {
  // Radius is a multiple of 7 so π = 22/7 gives an exact answer.
  const radius = 7 * rng.int(1, 9)
  const askArea = rng.chance(0.5)
  const area = (22 / 7) * radius * radius
  const circumference = 2 * (22 / 7) * radius
  const answer = askArea ? `${num(area)} cm²` : `${num(circumference)} cm`
  return {
    q: `Taking π = 22/7, the ${askArea ? 'area' : 'circumference'} of a circle of radius ${radius} cm is:`,
    answer,
    distractors: wrongOptions(answer, [
      askArea ? `${num(circumference)} cm²` : `${num(area)} cm`,
      askArea ? `${num(area / 2)} cm²` : `${num(circumference / 2)} cm`,
      askArea ? `${num((22 / 7) * radius)} cm²` : `${num((22 / 7) * radius * radius)} cm`,
      askArea ? `${num(area * 2)} cm²` : `${num(circumference * 2)} cm`,
    ], rng),
    explanation: askArea
      ? `Area = πr² = 22/7 × ${radius}² = ${num(area)} cm².`
      : `Circumference = 2πr = 2 × 22/7 × ${radius} = ${num(circumference)} cm.`,
    topic: 'Mensuration',
    difficulty: 'Intermediate',
  }
}

const solidMensuration: ForgeGenerator = (rng) => {
  const shape = rng.pick(['cube', 'cuboid', 'cylinder'] as const)
  if (shape === 'cube') {
    const side = rng.int(3, 18)
    const askVolume = rng.chance(0.55)
    const volume = side ** 3
    const surface = 6 * side ** 2
    const answer = askVolume ? `${num(volume)} cm³` : `${num(surface)} cm²`
    return {
      q: `The edge of a cube is ${side} cm. Its ${askVolume ? 'volume' : 'total surface area'} is:`,
      answer,
      distractors: wrongOptions(answer, [
        askVolume ? `${num(surface)} cm³` : `${num(volume)} cm²`,
        askVolume ? `${num(side * side)} cm³` : `${num(side * side)} cm²`,
        askVolume ? `${num(volume * 2)} cm³` : `${num(surface / 2)} cm²`,
        askVolume ? `${num(side * 3)} cm³` : `${num(surface * 2)} cm²`,
      ], rng),
      explanation: askVolume
        ? `Volume of a cube = a³ = ${side}³ = ${num(volume)} cm³.`
        : `Total surface area of a cube = 6a² = 6 × ${side}² = ${num(surface)} cm².`,
      topic: 'Mensuration',
      difficulty: 'Intermediate',
    }
  }
  if (shape === 'cuboid') {
    const length = rng.int(5, 25)
    const width = rng.int(3, 20)
    const height = rng.int(2, 15)
    const volume = length * width * height
    return {
      q: `A tank measures ${length} cm × ${width} cm × ${height} cm. Its volume is:`,
      answer: `${num(volume)} cm³`,
      distractors: wrongOptions(`${num(volume)} cm³`, [
        `${num(2 * (length * width + width * height + height * length))} cm³`,
        `${num(length + width + height)} cm³`,
        `${num(length * width)} cm³`,
        `${num(volume / 2)} cm³`,
      ], rng),
      explanation: `Volume of a cuboid = l × w × h = ${length} × ${width} × ${height} = ${num(volume)} cm³.`,
      topic: 'Mensuration',
      difficulty: 'Basic',
    }
  }
  const radius = 7 * rng.int(1, 5)
  const height = rng.int(4, 30)
  const volume = (22 / 7) * radius * radius * height
  return {
    q: `Taking π = 22/7, the volume of a cylinder of radius ${radius} cm and height ${height} cm is:`,
    answer: `${num(volume)} cm³`,
    distractors: wrongOptions(`${num(volume)} cm³`, [
      `${num(2 * (22 / 7) * radius * height)} cm³`,
      `${num((22 / 7) * radius * height)} cm³`,
      `${num(volume / 3)} cm³`,
      `${num(volume * 2)} cm³`,
    ], rng),
    explanation: `Volume of a cylinder = πr²h = 22/7 × ${radius}² × ${height} = ${num(volume)} cm³.`,
    topic: 'Mensuration',
    difficulty: 'Advanced',
  }
}

const polygonAngles: ForgeGenerator = (rng) => {
  const sides = rng.pick([5, 6, 8, 9, 10, 12, 15, 18, 20])
  const askInterior = rng.chance(0.6)
  const interiorSum = (sides - 2) * 180
  const eachInterior = interiorSum / sides
  const eachExterior = 360 / sides
  const answer = askInterior ? `${num(eachInterior)}°` : `${num(eachExterior)}°`
  return {
    q: `Each ${askInterior ? 'interior' : 'exterior'} angle of a regular polygon with ${sides} sides measures:`,
    answer,
    distractors: wrongOptions(answer, [
      askInterior ? `${num(eachExterior)}°` : `${num(eachInterior)}°`,
      `${num(interiorSum)}°`,
      `${num(180 / sides)}°`,
      `${num((askInterior ? eachInterior : eachExterior) + 10)}°`,
    ], rng),
    explanation: askInterior
      ? `The interior angles add up to (n−2)×180° = ${num(interiorSum)}°, so each one is ${num(interiorSum)}° ÷ ${sides} = ${num(eachInterior)}°.`
      : `The exterior angles of any polygon add up to 360°, so each one is 360° ÷ ${sides} = ${num(eachExterior)}°.`,
    topic: 'Geometry',
    difficulty: 'Intermediate',
  }
}

const coordinateGeometry: ForgeGenerator = (rng) => {
  const [legX, legY, hypotenuse] = rng.pick(TRIPLES)
  const x1 = rng.int(-8, 8)
  const y1 = rng.int(-8, 8)
  const x2 = x1 + legX
  const y2 = y1 + legY
  const ask = rng.pick(['distance', 'midpoint', 'slope'] as const)
  if (ask === 'distance') {
    return {
      q: `The distance between the points (${x1}, ${y1}) and (${x2}, ${y2}) is:`,
      answer: `${num(hypotenuse)} units`,
      distractors: wrongOptions(`${num(hypotenuse)} units`, [
        `${num(legX + legY)} units`, `${num(hypotenuse ** 2)} units`, `${num(Math.abs(legY - legX))} units`, `${num(hypotenuse + 1)} units`,
      ], rng),
      explanation: `d = √[(${x2}−${x1})² + (${y2}−${y1})²] = √(${legX ** 2} + ${legY ** 2}) = √${hypotenuse ** 2} = ${num(hypotenuse)} units.`,
      topic: 'Coordinate geometry',
      difficulty: 'Intermediate',
    }
  }
  if (ask === 'midpoint') {
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const answer = `(${num(midX)}, ${num(midY)})`
    return {
      q: `The midpoint of the line segment joining (${x1}, ${y1}) and (${x2}, ${y2}) is:`,
      answer,
      distractors: wrongOptions(answer, [
        `(${num(x1 + x2)}, ${num(y1 + y2)})`,
        `(${num(midY)}, ${num(midX)})`,
        `(${num((x2 - x1) / 2)}, ${num((y2 - y1) / 2)})`,
        `(${num(midX + 1)}, ${num(midY + 1)})`,
      ], rng),
      explanation: `Midpoint = ((x₁+x₂)/2, (y₁+y₂)/2) = (${num(midX)}, ${num(midY)}).`,
      topic: 'Coordinate geometry',
      difficulty: 'Basic',
    }
  }
  const slope = legY / legX
  return {
    q: `The slope of the line passing through (${x1}, ${y1}) and (${x2}, ${y2}) is:`,
    answer: num(slope, 4),
    distractors: wrongOptions(num(slope, 4), [
      num(legX / legY, 4), num(-slope, 4), num(slope + 1, 4), num(legY - legX),
    ], rng),
    explanation: `Slope = (y₂−y₁)/(x₂−x₁) = ${legY}/${legX} = ${num(slope, 4)}.`,
    topic: 'Coordinate geometry',
    difficulty: 'Intermediate',
  }
}

const setsProblem: ForgeGenerator = (rng) => {
  const both = rng.int(5, 30)
  const onlyFirst = rng.int(10, 60)
  const onlySecond = rng.int(10, 60)
  const neither = rng.int(0, 20)
  const total = onlyFirst + onlySecond + both + neither
  const first = onlyFirst + both
  const second = onlySecond + both
  return {
    q: `In a class of ${total} students, ${first} study Economics and ${second} study Political Science, while ${neither} study neither subject. How many students study both subjects?`,
    answer: num(both),
    distractors: wrongOptions(num(both), [
      num(Math.abs(first + second - total)), num(onlyFirst), num(both + neither), num(Math.abs(total - first - second)),
    ], rng),
    explanation: `Students taking at least one subject = ${total} − ${neither} = ${num(total - neither)}. By n(A∪B) = n(A) + n(B) − n(A∩B): ${num(total - neither)} = ${first} + ${second} − n(A∩B), so n(A∩B) = ${num(both)}.`,
    topic: 'Logical deduction',
    difficulty: 'Advanced',
  }
}

export const algebraGeometryGenerators: Record<string, ForgeGenerator> = {
  linearEquation,
  simultaneousEquations,
  quadraticRoots,
  indices,
  geometricProgression,
  triangleAngles,
  pythagoras,
  rectangleMensuration,
  circleMensuration,
  solidMensuration,
  polygonAngles,
  coordinateGeometry,
  setsProblem,
}
