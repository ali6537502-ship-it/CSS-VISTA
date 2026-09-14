import {
  gcd, lcm, num, ordinal, reduceRatio, rupees, wrongOptions,
  type ForgedItem, type ForgeGenerator,
} from './item'

// Quantitative-ability generators for the MPT "General Abilities" section and
// the PMS "Basic Mathematics" part.
//
// Every item is built forwards from the answer: the numbers are chosen so the
// result is exact, then the question is written around them. Nothing here
// rounds a key into existence, so a forged paper cannot ship a wrong answer the
// way a scraped bank can. Distractors are the standard candidate errors -
// inverted operation, missing unit conversion, off-by-one - not noise.

const ITEMS = ['rice', 'wheat', 'sugar', 'cotton', 'cement', 'steel', 'tea', 'fertiliser', 'diesel', 'wool']
const PEOPLE = ['Ahmed', 'Bilal', 'Danish', 'Farhan', 'Hassan', 'Imran', 'Kamran', 'Nadia', 'Rabia', 'Saima', 'Usman', 'Zainab']
const CITIES = ['Lahore', 'Karachi', 'Multan', 'Quetta', 'Peshawar', 'Sukkur', 'Sialkot', 'Hyderabad', 'Faisalabad', 'Gujranwala']

const percentOf: ForgeGenerator = (rng) => {
  const percent = rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 60, 75, 80])
  const base = rng.int(6, 200) * 20
  const answer = (base * percent) / 100
  return {
    q: `What is ${percent}% of ${num(base)}?`,
    answer: num(answer),
    distractors: wrongOptions(num(answer), [
      num(base * percent / 1000), num(base * percent / 10), num(base - answer), num(answer * 2),
    ], rng),
    explanation: `${percent}% of ${num(base)} = ${num(base)} × ${percent}/100 = ${num(answer)}.`,
    topic: 'Percentages',
    difficulty: 'Basic',
  }
}

const percentChange: ForgeGenerator = (rng) => {
  const start = rng.int(2, 60) * 100
  const percent = rng.pick([5, 10, 12, 15, 20, 25, 30, 40])
  const rising = rng.chance(0.55)
  const delta = (start * percent) / 100
  const end = rising ? start + delta : start - delta
  return {
    q: `The price of ${rng.pick(ITEMS)} ${rising ? 'rose' : 'fell'} from ${rupees(start)} to ${rupees(end)}. The percentage ${rising ? 'increase' : 'decrease'} is:`,
    answer: `${num(percent)}%`,
    distractors: wrongOptions(`${num(percent)}%`, [
      `${num((delta / end) * 100)}%`, `${num(100 - percent)}%`, `${num(percent * 2)}%`, `${num(delta)}%`,
    ], rng),
    explanation: `Change = ${rupees(delta)}. Percentage change is taken on the original value: ${rupees(delta)} ÷ ${rupees(start)} × 100 = ${num(percent)}%.`,
    topic: 'Percentage change',
    difficulty: 'Basic',
  }
}

const successivePercentChange: ForgeGenerator = (rng) => {
  const up = rng.pick([10, 20, 25, 50])
  const down = rng.pick([10, 20, 25, 40])
  const factor = (1 + up / 100) * (1 - down / 100)
  const net = (factor - 1) * 100
  const answer = `${net >= 0 ? 'Increase' : 'Decrease'} of ${num(Math.abs(net))}%`
  return {
    q: `The salary of a clerk is first increased by ${up}% and then the new salary is decreased by ${down}%. The net change is:`,
    answer,
    distractors: wrongOptions(answer, [
      `${up - down >= 0 ? 'Increase' : 'Decrease'} of ${num(Math.abs(up - down))}%`,
      `${net >= 0 ? 'Decrease' : 'Increase'} of ${num(Math.abs(net))}%`,
      'No change',
      `Decrease of ${num(Math.abs(net) + 1)}%`,
    ], rng),
    explanation: `Take the original salary as 100. After a ${up}% rise it is ${num(100 + up)}; a ${down}% cut on that gives ${num(100 * factor)}. Net change = ${num(net)}%.`,
    topic: 'Percentage change',
    difficulty: 'Intermediate',
  }
}

const profitPercent: ForgeGenerator = (rng) => {
  const cost = rng.int(1, 12) * 200
  const percent = rng.pick([10, 12.5, 15, 20, 25, 30, 40, 50])
  const loss = rng.chance(0.3)
  const selling = loss ? cost * (1 - percent / 100) : cost * (1 + percent / 100)
  const answer = `${num(percent)}% ${loss ? 'loss' : 'profit'}`
  return {
    q: `A shopkeeper buys an article for ${rupees(cost)} and sells it for ${rupees(selling)}. His ${loss ? 'loss' : 'profit'} percentage is:`,
    answer,
    distractors: wrongOptions(answer, [
      `${num(percent)}% ${loss ? 'profit' : 'loss'}`,
      `${num((Math.abs(selling - cost) / selling) * 100)}% ${loss ? 'loss' : 'profit'}`,
      `${num(percent * 2)}% ${loss ? 'loss' : 'profit'}`,
      `${num(Math.abs(selling - cost))}% ${loss ? 'loss' : 'profit'}`,
    ], rng),
    explanation: `${loss ? 'Loss' : 'Profit'} = ${rupees(Math.abs(selling - cost))}. Percentage is always taken on the cost price: ${rupees(Math.abs(selling - cost))} ÷ ${rupees(cost)} × 100 = ${num(percent)}%.`,
    topic: 'Profit and loss',
    difficulty: 'Intermediate',
  }
}

const sellingPrice: ForgeGenerator = (rng) => {
  const cost = rng.int(1, 15) * 200
  const percent = rng.pick([10, 12.5, 15, 20, 25, 30, 40])
  const selling = cost * (1 + percent / 100)
  return {
    q: `${rng.pick(PEOPLE)} bought a bicycle for ${rupees(cost)}. At what price must it be sold to earn a profit of ${num(percent)}%?`,
    answer: rupees(selling),
    distractors: wrongOptions(rupees(selling), [
      rupees(cost * (1 - percent / 100)), rupees(cost + percent), rupees((cost * percent) / 100), rupees(cost * (1 + (percent * 2) / 100)),
    ], rng),
    explanation: `Selling price = cost × (1 + ${num(percent)}/100) = ${rupees(cost)} × ${num(1 + percent / 100, 3)} = ${rupees(selling)}.`,
    topic: 'Profit and loss',
    difficulty: 'Basic',
  }
}

const discount: ForgeGenerator = (rng) => {
  const marked = rng.int(2, 20) * 200
  const percent = rng.pick([5, 10, 12.5, 15, 20, 25, 30, 40])
  const paid = marked * (1 - percent / 100)
  return {
    q: `An article marked at ${rupees(marked)} is sold at a discount of ${num(percent)}%. The amount paid by the customer is:`,
    answer: rupees(paid),
    distractors: wrongOptions(rupees(paid), [
      rupees(marked - percent), rupees((marked * percent) / 100), rupees(marked * (1 + percent / 100)), rupees(paid - percent),
    ], rng),
    explanation: `Discount = ${num(percent)}% of ${rupees(marked)} = ${rupees((marked * percent) / 100)}. Amount paid = ${rupees(marked)} − ${rupees((marked * percent) / 100)} = ${rupees(paid)}.`,
    topic: 'Discount',
    difficulty: 'Basic',
  }
}

const simpleInterest: ForgeGenerator = (rng) => {
  const principal = rng.int(4, 60) * 500
  const rate = rng.pick([4, 5, 6, 8, 10, 12])
  const years = rng.int(2, 6)
  const interest = (principal * rate * years) / 100
  const askAmount = rng.chance(0.35)
  const answer = askAmount ? rupees(principal + interest) : rupees(interest)
  return {
    q: `Find the ${askAmount ? 'total amount' : 'simple interest'} on ${rupees(principal)} at ${rate}% per annum for ${years} years.`,
    answer,
    distractors: wrongOptions(answer, [
      askAmount ? rupees(interest) : rupees(principal + interest),
      rupees((principal * rate) / 100),
      rupees((principal * rate * years) / 1000),
      rupees(interest * 2),
    ], rng),
    explanation: `SI = P×R×T/100 = ${num(principal)}×${rate}×${years}/100 = ${rupees(interest)}.${askAmount ? ` Amount = principal + interest = ${rupees(principal + interest)}.` : ''}`,
    topic: 'Simple interest',
    difficulty: 'Basic',
  }
}

const compoundInterest: ForgeGenerator = (rng) => {
  // Rate and term are restricted to the combinations that stay exact on a
  // principal in hundreds, so the key is never a rounded figure.
  const [rate, years] = rng.pick([[10, 2], [20, 2], [10, 3], [25, 2]] as const)
  const principal = rng.int(2, 40) * 1000
  const amount = principal * (1 + rate / 100) ** years
  const interest = amount - principal
  const askAmount = rng.chance(0.4)
  const answer = askAmount ? rupees(amount) : rupees(interest)
  const simple = (principal * rate * years) / 100
  return {
    q: `Find the ${askAmount ? 'amount' : 'compound interest'} on ${rupees(principal)} at ${rate}% per annum compounded annually for ${years} years.`,
    answer,
    distractors: wrongOptions(answer, [
      askAmount ? rupees(principal + simple) : rupees(simple),
      askAmount ? rupees(interest) : rupees(amount),
      rupees(principal + interest * 2),
      rupees(interest / years),
    ], rng),
    explanation: `Amount = P(1+R/100)^T = ${num(principal)} × ${num((1 + rate / 100) ** years, 4)} = ${rupees(amount)}. Compound interest = ${rupees(amount)} − ${rupees(principal)} = ${rupees(interest)} (simple interest would be only ${rupees(simple)}).`,
    topic: 'Compound interest',
    difficulty: 'Advanced',
  }
}

const ratioDivision: ForgeGenerator = (rng) => {
  const parts = [rng.int(2, 7), rng.int(2, 7), rng.int(1, 6)]
  const total = parts.reduce((sum, part) => sum + part, 0)
  const amount = total * rng.int(20, 400)
  const index = rng.int(0, 2)
  const names = rng.sample(PEOPLE, 3)
  const share = (amount * parts[index]) / total
  return {
    q: `${rupees(amount)} is divided among ${names[0]}, ${names[1]} and ${names[2]} in the ratio ${parts.join(' : ')}. ${names[index]}'s share is:`,
    answer: rupees(share),
    distractors: wrongOptions(rupees(share), [
      rupees((amount * parts[(index + 1) % 3]) / total),
      rupees((amount * parts[(index + 2) % 3]) / total),
      rupees(amount / 3),
      rupees(amount / total),
    ], rng),
    explanation: `Total parts = ${parts.join(' + ')} = ${total}. One part = ${rupees(amount / total)}, so ${names[index]} gets ${parts[index]} × ${rupees(amount / total)} = ${rupees(share)}.`,
    topic: 'Ratio and proportion',
    difficulty: 'Intermediate',
  }
}

const proportion: ForgeGenerator = (rng) => {
  const [a, b] = reduceRatio(rng.int(2, 9), rng.int(2, 9))
  const multiplier = rng.int(3, 25)
  const known = b * multiplier
  const answer = a * multiplier
  return {
    q: `If x : ${num(known)} = ${a} : ${b}, then x is equal to:`,
    answer: num(answer),
    distractors: wrongOptions(num(answer), [
      num((known * b) / a), num(Math.abs(known - answer)), num(answer + b), num(known / a),
    ], rng),
    explanation: `x/${known} = ${a}/${b}, so x = ${known} × ${a}/${b} = ${num(answer)}.`,
    topic: 'Ratio and proportion',
    difficulty: 'Basic',
  }
}

const averageOfNumbers: ForgeGenerator = (rng) => {
  const count = rng.int(4, 7)
  const mean = rng.int(12, 90)
  const values: number[] = []
  let running = 0
  for (let index = 0; index < count - 1; index += 1) {
    const value = mean + rng.int(-9, 9)
    values.push(value)
    running += value
  }
  values.push(count * mean - running)
  return {
    q: `Find the average of the following numbers: ${rng.shuffle(values).join(', ')}.`,
    answer: num(mean),
    distractors: wrongOptions(num(mean), [
      num(count * mean), num(mean + count), num(Math.round((count * mean) / (count - 1))), num(mean - count),
    ], rng),
    explanation: `Sum = ${num(count * mean)} and there are ${count} numbers, so the average is ${num(count * mean)} ÷ ${count} = ${num(mean)}.`,
    topic: 'Averages',
    difficulty: 'Basic',
  }
}

const averageMissing: ForgeGenerator = (rng) => {
  const count = rng.int(4, 6)
  const mean = rng.int(20, 80)
  const known: number[] = []
  let running = 0
  for (let index = 0; index < count - 1; index += 1) {
    const value = mean + rng.int(-12, 12)
    known.push(value)
    running += value
  }
  const missing = count * mean - running
  return {
    q: `The average of ${count} numbers is ${mean}. If ${count - 1} of them are ${known.join(', ')}, the remaining number is:`,
    answer: num(missing),
    distractors: wrongOptions(num(missing), [
      num(mean), num(running), num(count * mean), num(missing + mean),
    ], rng),
    explanation: `Total of all ${count} numbers = ${count} × ${mean} = ${num(count * mean)}. The given numbers add up to ${num(running)}, so the missing number is ${num(count * mean)} − ${num(running)} = ${num(missing)}.`,
    topic: 'Averages',
    difficulty: 'Intermediate',
  }
}

const WORK_PAIRS = [[12, 6], [20, 30], [15, 10], [18, 9], [24, 8], [30, 20], [16, 48], [10, 40], [12, 24], [9, 18], [21, 42], [14, 35], [15, 30], [36, 18], [45, 30], [40, 60], [50, 75], [20, 5]] as const

const combinedWork: ForgeGenerator = (rng) => {
  const [first, second] = rng.pick(WORK_PAIRS)
  const together = (first * second) / (first + second)
  const names = rng.sample(PEOPLE, 2)
  return {
    q: `${names[0]} can complete a piece of work in ${first} days and ${names[1]} can complete the same work in ${second} days. Working together, they will finish it in:`,
    answer: `${num(together)} days`,
    distractors: wrongOptions(`${num(together)} days`, [
      `${num((first + second) / 2)} days`, `${num(first + second)} days`, `${num(Math.abs(first - second))} days`, `${num(together + 1)} days`,
    ], rng),
    explanation: `In one day they do 1/${first} + 1/${second} = ${num((first + second) / (first * second), 4)} of the work, so the whole work takes ${first}×${second}/(${first}+${second}) = ${num(together)} days.`,
    topic: 'Combined work',
    difficulty: 'Intermediate',
  }
}

const pipesAndCisterns: ForgeGenerator = (rng) => {
  const [fill, empty] = rng.pick([[6, 12], [8, 24], [10, 15], [12, 36], [9, 18], [15, 30], [20, 60], [14, 21]] as const)
  const net = (fill * empty) / (empty - fill)
  return {
    q: `A pipe can fill a tank in ${fill} hours while an outlet pipe can empty the full tank in ${empty} hours. If both are opened together, the tank will be filled in:`,
    answer: `${num(net)} hours`,
    distractors: wrongOptions(`${num(net)} hours`, [
      `${num((fill * empty) / (empty + fill))} hours`, `${num(empty - fill)} hours`, `${num(fill + empty)} hours`, 'The tank will never fill',
    ], rng),
    explanation: `Net filling in one hour = 1/${fill} − 1/${empty} = ${num((empty - fill) / (fill * empty), 4)} of the tank, so the tank fills in ${fill}×${empty}/(${empty}−${fill}) = ${num(net)} hours.`,
    topic: 'Pipes and cisterns',
    difficulty: 'Advanced',
  }
}

const workersAndDays: ForgeGenerator = (rng) => {
  const workers = rng.pick([4, 5, 6, 8, 10, 12, 15, 20])
  const days = rng.pick([6, 8, 9, 10, 12, 15, 18, 20, 24, 30])
  const product = workers * days
  const newWorkers = [...new Set([2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 25, 30, 36, 40])]
    .filter((candidate) => candidate !== workers && product % candidate === 0)
  if (!newWorkers.length) return workersAndDays(rng)
  const chosen = rng.pick(newWorkers)
  const answer = product / chosen
  return {
    q: `If ${workers} workers can build a wall in ${days} days, how many days will ${chosen} workers take to build the same wall, working at the same rate?`,
    answer: `${num(answer)} days`,
    distractors: wrongOptions(`${num(answer)} days`, [
      // The classic error is treating the relationship as direct rather than
      // inverse; the rest are near misses that stay above zero.
      `${num((days * chosen) / workers)} days`, `${num(days)} days`, `${num(answer + Math.abs(chosen - workers))} days`, `${num(answer * 2)} days`,
    ], rng),
    explanation: `Workers and days are inversely proportional, so workers × days is constant: ${workers} × ${days} = ${num(product)}. With ${chosen} workers the time is ${num(product)} ÷ ${chosen} = ${num(answer)} days.`,
    topic: 'Workers and days',
    difficulty: 'Intermediate',
  }
}

const speedDistanceTime: ForgeGenerator = (rng) => {
  const speed = rng.pick([30, 40, 45, 50, 60, 72, 75, 80, 90, 100, 120])
  const hours = rng.pick([1.5, 2, 2.5, 3, 4, 5, 6])
  const distance = speed * hours
  const ask = rng.pick(['distance', 'speed', 'time'] as const)
  const from = rng.pick(CITIES)
  const to = rng.pick(CITIES.filter((city) => city !== from))
  if (ask === 'distance') {
    return {
      q: `A bus travels from ${from} to ${to} at an average speed of ${speed} km/h for ${num(hours)} hours. The distance covered is:`,
      answer: `${num(distance)} km`,
      distractors: wrongOptions(`${num(distance)} km`, [
        `${num(speed / hours)} km`, `${num(speed + hours)} km`, `${num(distance / 2)} km`, `${num(distance * 2)} km`,
      ], rng),
      explanation: `Distance = speed × time = ${speed} × ${num(hours)} = ${num(distance)} km.`,
      topic: 'Basic speed-distance-time',
      difficulty: 'Basic',
    }
  }
  if (ask === 'speed') {
    return {
      q: `A train covers ${num(distance)} km between ${from} and ${to} in ${num(hours)} hours. Its average speed is:`,
      answer: `${num(speed)} km/h`,
      distractors: wrongOptions(`${num(speed)} km/h`, [
        `${num(distance * hours)} km/h`, `${num(distance / (hours * 2))} km/h`, `${num(speed + 10)} km/h`, `${num(distance - hours)} km/h`,
      ], rng),
      explanation: `Speed = distance ÷ time = ${num(distance)} ÷ ${num(hours)} = ${num(speed)} km/h.`,
      topic: 'Basic speed-distance-time',
      difficulty: 'Basic',
    }
  }
  return {
    q: `A car covers ${num(distance)} km at a uniform speed of ${speed} km/h. The time taken is:`,
    answer: `${num(hours)} hours`,
    distractors: wrongOptions(`${num(hours)} hours`, [
      `${num(distance * speed)} hours`, `${num(hours * 2)} hours`, `${num(hours + 1)} hours`, `${num(distance / (speed * 2))} hours`,
    ], rng),
    explanation: `Time = distance ÷ speed = ${num(distance)} ÷ ${speed} = ${num(hours)} hours.`,
    topic: 'Basic speed-distance-time',
    difficulty: 'Basic',
  }
}

const averageSpeed: ForgeGenerator = (rng) => {
  const [first, second] = rng.pick([[30, 60], [40, 60], [20, 30], [50, 75], [10, 15], [24, 40], [45, 30], [80, 20], [12, 36], [90, 60]] as const)
  const answer = (2 * first * second) / (first + second)
  return {
    q: `A man travels from ${rng.pick(CITIES)} to a village at ${first} km/h and returns along the same road at ${second} km/h. His average speed for the whole journey is:`,
    answer: `${num(answer)} km/h`,
    distractors: wrongOptions(`${num(answer)} km/h`, [
      `${num((first + second) / 2)} km/h`, `${num(first + second)} km/h`, `${num(Math.abs(first - second))} km/h`, `${num(answer + 5)} km/h`,
    ], rng),
    explanation: `For equal distances the average speed is the harmonic mean, not the arithmetic mean: 2×${first}×${second}/(${first}+${second}) = ${num(answer)} km/h.`,
    topic: 'Average speed',
    difficulty: 'Advanced',
  }
}

const trainCrossing: ForgeGenerator = (rng) => {
  const metresPerSecond = rng.pick([10, 15, 20, 25, 30])
  const speed = (metresPerSecond * 18) / 5
  const trainLength = metresPerSecond * rng.int(5, 20)
  const withPlatform = rng.chance(0.5)
  const platform = metresPerSecond * rng.int(4, 18)
  const total = withPlatform ? trainLength + platform : trainLength
  const seconds = total / metresPerSecond
  return {
    q: withPlatform
      ? `A train ${num(trainLength)} m long, running at ${num(speed)} km/h, crosses a platform ${num(platform)} m long. The time taken is:`
      : `A train ${num(trainLength)} m long is running at ${num(speed)} km/h. The time it takes to pass a signal pole is:`,
    answer: `${num(seconds)} seconds`,
    distractors: wrongOptions(`${num(seconds)} seconds`, [
      `${num(total / speed)} seconds`,
      withPlatform ? `${num(trainLength / metresPerSecond)} seconds` : `${num(seconds * 2)} seconds`,
      `${num(seconds + 5)} seconds`,
      `${num(total / (metresPerSecond * 2))} seconds`,
    ], rng),
    explanation: `${num(speed)} km/h = ${num(speed)} × 5/18 = ${metresPerSecond} m/s. The train must cover ${withPlatform ? `its own length plus the platform = ${num(trainLength)} + ${num(platform)} = ${num(total)} m` : `its own length = ${num(total)} m`}, so the time is ${num(total)} ÷ ${metresPerSecond} = ${num(seconds)} seconds.`,
    topic: 'Trains',
    difficulty: 'Advanced',
  }
}

const boatsAndStreams: ForgeGenerator = (rng) => {
  const still = rng.pick([10, 12, 15, 18, 20, 24, 25, 30])
  const stream = rng.pick([2, 3, 4, 5, 6]).valueOf()
  if (stream >= still) return boatsAndStreams(rng)
  const downstream = still + stream
  const upstream = still - stream
  const askDown = rng.chance(0.5)
  const hours = rng.int(2, 5)
  const distance = (askDown ? downstream : upstream) * hours
  return {
    q: `The speed of a boat in still water is ${still} km/h and the speed of the stream is ${stream} km/h. How far can the boat travel ${askDown ? 'downstream' : 'upstream'} in ${hours} hours?`,
    answer: `${num(distance)} km`,
    distractors: wrongOptions(`${num(distance)} km`, [
      `${num((askDown ? upstream : downstream) * hours)} km`, `${num(still * hours)} km`, `${num(stream * hours)} km`, `${num(distance + stream)} km`,
    ], rng),
    explanation: `${askDown ? 'Downstream' : 'Upstream'} speed = ${still} ${askDown ? '+' : '−'} ${stream} = ${askDown ? downstream : upstream} km/h. Distance = speed × time = ${askDown ? downstream : upstream} × ${hours} = ${num(distance)} km.`,
    topic: 'Relative speed',
    difficulty: 'Advanced',
  }
}

const agesRatio: ForgeGenerator = (rng) => {
  const [first, second] = rng.pick([[2, 3], [3, 5], [4, 7], [3, 4], [5, 7], [2, 5]] as const)
  const unit = rng.int(3, 12)
  const years = rng.pick([4, 5, 6, 8, 10, 12])
  const names = rng.sample(PEOPLE, 2)
  const futureFirst = first * unit + years
  const futureSecond = second * unit + years
  const [ratioA, ratioB] = reduceRatio(futureFirst, futureSecond)
  const askSecond = rng.chance(0.5)
  const answer = `${askSecond ? second * unit : first * unit} years`
  return {
    q: `The present ages of ${names[0]} and ${names[1]} are in the ratio ${first} : ${second}. After ${years} years the ratio of their ages will be ${ratioA} : ${ratioB}. The present age of ${askSecond ? names[1] : names[0]} is:`,
    answer,
    distractors: wrongOptions(answer, [
      `${askSecond ? first * unit : second * unit} years`,
      `${askSecond ? futureSecond : futureFirst} years`,
      `${(askSecond ? second : first) * unit + years * 2} years`,
      `${Math.abs((askSecond ? second : first) * unit - years)} years`,
    ], rng),
    explanation: `Let the present ages be ${first}x and ${second}x. After ${years} years they are ${first}x+${years} and ${second}x+${years}, and the given ratio gives x = ${unit}. So the present ages are ${first * unit} and ${second * unit} years.`,
    topic: 'Ages',
    difficulty: 'Advanced',
  }
}

const hcfLcm: ForgeGenerator = (rng) => {
  const first = rng.int(6, 60)
  const second = rng.int(6, 60)
  if (first === second) return hcfLcm(rng)
  const askLcm = rng.chance(0.55)
  const answer = askLcm ? lcm(first, second) : gcd(first, second)
  return {
    q: `The ${askLcm ? 'L.C.M.' : 'H.C.F.'} of ${first} and ${second} is:`,
    answer: num(answer),
    distractors: wrongOptions(num(answer), [
      num(askLcm ? gcd(first, second) : lcm(first, second)),
      num(first * second),
      num(Math.abs(first - second)),
      num(first + second),
    ], rng),
    explanation: askLcm
      ? `H.C.F.(${first}, ${second}) = ${gcd(first, second)}, and L.C.M. × H.C.F. = product of the numbers, so L.C.M. = ${first}×${second}/${gcd(first, second)} = ${num(answer)}.`
      : `The largest number dividing both ${first} and ${second} is ${num(answer)}.`,
    topic: 'HCF and LCM',
    difficulty: 'Basic',
  }
}

const remainderProblem: ForgeGenerator = (rng) => {
  const divisor = rng.int(3, 19)
  const quotient = rng.int(20, 900)
  const remainder = rng.int(1, divisor - 1)
  const dividend = divisor * quotient + remainder
  return {
    q: `What is the remainder when ${num(dividend)} is divided by ${divisor}?`,
    answer: num(remainder),
    distractors: wrongOptions(num(remainder), [
      num(divisor - remainder), num(quotient % divisor), num(remainder + 1), num(divisor),
    ], rng),
    explanation: `${num(dividend)} = ${divisor} × ${num(quotient)} + ${remainder}, so the remainder is ${remainder}.`,
    topic: 'Remainders and divisibility',
    difficulty: 'Intermediate',
  }
}

const fractionOf: ForgeGenerator = (rng) => {
  const denominator = rng.pick([4, 5, 6, 8, 10, 12, 16])
  const numerator = rng.int(1, denominator - 1)
  const base = denominator * rng.int(6, 90)
  const answer = (base * numerator) / denominator
  return {
    q: `What is ${numerator}/${denominator} of ${num(base)}?`,
    answer: num(answer),
    distractors: wrongOptions(num(answer), [
      num(base / numerator), num(base - answer), num((base * denominator) / numerator), num(answer / 2),
    ], rng),
    explanation: `${numerator}/${denominator} of ${num(base)} = ${num(base)} ÷ ${denominator} × ${numerator} = ${num(base / denominator)} × ${numerator} = ${num(answer)}.`,
    topic: 'Fractions',
    difficulty: 'Basic',
  }
}

const orderOfOperations: ForgeGenerator = (rng) => {
  const a = rng.int(4, 40)
  const b = rng.int(2, 30)
  const c = rng.int(3, 12)
  // Keeping the subtrahend below the multiplier holds every distractor above
  // zero; a negative option in an arithmetic item gives the key away.
  const d = rng.int(2, c - 1)
  const answer = (a + b) * c - d
  return {
    q: `Evaluate: (${a} + ${b}) × ${c} − ${d}`,
    answer: num(answer),
    distractors: wrongOptions(num(answer), [
      num(a + b * c - d), num((a + b) * (c - d)), num(a + b * (c - d)), num((a + b) * c + d),
    ], rng),
    explanation: `Brackets first: ${a}+${b} = ${a + b}. Then ${a + b}×${c} = ${num((a + b) * c)}, and finally −${d} gives ${num(answer)}.`,
    topic: 'Order of operations',
    difficulty: 'Basic',
  }
}

const mixtureProblem: ForgeGenerator = (rng) => {
  const [milk, water] = rng.pick([[7, 5], [5, 3], [3, 2], [4, 1], [9, 7], [5, 1]] as const)
  const unitSize = rng.int(2, 12)
  const volume = (milk + water) * unitSize
  const milkVolume = milk * unitSize
  const waterVolume = water * unitSize
  const added = milkVolume - waterVolume
  return {
    q: `A mixture of ${num(volume)} litres contains milk and water in the ratio ${milk} : ${water}. How much water must be added so that the two are in the ratio 1 : 1?`,
    answer: `${num(added)} litres`,
    distractors: wrongOptions(`${num(added)} litres`, [
      `${num(waterVolume)} litres`, `${num(milkVolume)} litres`, `${num(volume / 2)} litres`, `${num(added * 2)} litres`,
    ], rng),
    explanation: `Milk = ${milk}/${milk + water} × ${num(volume)} = ${num(milkVolume)} L and water = ${num(waterVolume)} L. For a 1 : 1 mixture the water must also be ${num(milkVolume)} L, so ${num(milkVolume)} − ${num(waterVolume)} = ${num(added)} L must be added.`,
    topic: 'Arithmetic word problems',
    difficulty: 'Advanced',
  }
}

const partnership: ForgeGenerator = (rng) => {
  const [first, second] = [rng.int(2, 9), rng.int(2, 9)]
  const unit = rng.int(2, 20) * 1000
  const totalParts = first + second
  const profit = totalParts * rng.int(2, 30) * 100
  const names = rng.sample(PEOPLE, 2)
  const share = (profit * first) / totalParts
  return {
    q: `${names[0]} and ${names[1]} start a business investing ${rupees(first * unit)} and ${rupees(second * unit)} respectively for the same period. If the annual profit is ${rupees(profit)}, ${names[0]}'s share is:`,
    answer: rupees(share),
    distractors: wrongOptions(rupees(share), [
      rupees((profit * second) / totalParts), rupees(profit / 2), rupees(profit / totalParts), rupees(share + 1000),
    ], rng),
    explanation: `For the same period the profit is divided in the ratio of the investments, ${first} : ${second}. ${names[0]}'s share = ${first}/${totalParts} × ${rupees(profit)} = ${rupees(share)}.`,
    topic: 'Arithmetic word problems',
    difficulty: 'Advanced',
  }
}

const probabilityDraw: ForgeGenerator = (rng) => {
  const red = rng.int(2, 9)
  const blue = rng.int(2, 9)
  const green = rng.int(1, 8)
  const total = red + blue + green
  const [colour, favourable] = rng.pick([['red', red], ['blue', blue], ['green', green]] as const)
  const [p, q] = reduceRatio(favourable, total)
  const answer = `${p}/${q}`
  return {
    q: `A bag contains ${red} red, ${blue} blue and ${green} green balls. One ball is drawn at random. What is the probability that it is ${colour}?`,
    answer,
    distractors: wrongOptions(answer, [
      `${favourable}/${total - favourable}`,
      `${reduceRatio(total - favourable, total).join('/')}`,
      `${favourable}/${total + 1}`,
      `1/${total}`,
    ], rng),
    explanation: `Total balls = ${red}+${blue}+${green} = ${total}, of which ${favourable} are ${colour}. Probability = ${favourable}/${total} = ${answer}.`,
    topic: 'Arithmetic word problems',
    difficulty: 'Intermediate',
  }
}

const percentagePopulation: ForgeGenerator = (rng) => {
  const total = rng.int(4, 90) * 500
  const percent = rng.pick([20, 25, 30, 35, 40, 45, 55, 60, 65, 70])
  const count = (total * percent) / 100
  return {
    q: `In a town of ${num(total)} people, ${percent}% are registered voters. The number of people who are NOT registered voters is:`,
    answer: num(total - count),
    distractors: wrongOptions(num(total - count), [
      num(count), num(total - percent), num((total * (100 - percent)) / 1000), num(total / 2),
    ], rng),
    explanation: `Registered voters = ${percent}% of ${num(total)} = ${num(count)}. The rest are ${num(total)} − ${num(count)} = ${num(total - count)}.`,
    topic: 'Percentages',
    difficulty: 'Basic',
  }
}

const numberProblem: ForgeGenerator = (rng) => {
  const answerValue = rng.int(6, 60)
  const multiplier = rng.int(2, 9)
  const addend = rng.int(3, 40)
  const result = multiplier * answerValue + addend
  return {
    q: `When a number is multiplied by ${multiplier} and ${addend} is added to the product, the result is ${num(result)}. The number is:`,
    answer: num(answerValue),
    distractors: wrongOptions(num(answerValue), [
      num((result + addend) / multiplier), num(result / multiplier), num(result - addend), num(answerValue + multiplier),
    ], rng),
    explanation: `${multiplier}x + ${addend} = ${num(result)} ⇒ ${multiplier}x = ${num(result - addend)} ⇒ x = ${num(answerValue)}.`,
    topic: 'Arithmetic word problems',
    difficulty: 'Basic',
  }
}

const sequenceTerm: ForgeGenerator = (rng) => {
  const first = rng.int(2, 25)
  const difference = rng.int(2, 15)
  const position = rng.int(8, 40)
  const answer = first + (position - 1) * difference
  const askSum = rng.chance(0.35)
  const sum = (position / 2) * (2 * first + (position - 1) * difference)
  return {
    q: askSum
      ? `Find the sum of the first ${position} terms of the arithmetic progression ${first}, ${first + difference}, ${first + 2 * difference}, …`
      : `What is the ${ordinal(position)} term of the arithmetic progression ${first}, ${first + difference}, ${first + 2 * difference}, …?`,
    answer: num(askSum ? sum : answer),
    distractors: wrongOptions(num(askSum ? sum : answer), [
      num(askSum ? answer : sum), num(first + position * difference), num(answer - difference), num(position * difference),
    ], rng),
    explanation: askSum
      ? `Sₙ = n/2 × [2a + (n−1)d] = ${position}/2 × [2×${first} + ${position - 1}×${difference}] = ${num(sum)}.`
      : `aₙ = a + (n−1)d = ${first} + ${position - 1}×${difference} = ${num(answer)}.`,
    topic: 'Arithmetic progression',
    difficulty: 'Intermediate',
  }
}

export const quantitativeGenerators: Record<string, ForgeGenerator> = {
  percentOf,
  percentChange,
  successivePercentChange,
  profitPercent,
  sellingPrice,
  discount,
  simpleInterest,
  compoundInterest,
  ratioDivision,
  proportion,
  averageOfNumbers,
  averageMissing,
  combinedWork,
  pipesAndCisterns,
  workersAndDays,
  speedDistanceTime,
  averageSpeed,
  trainCrossing,
  boatsAndStreams,
  agesRatio,
  hcfLcm,
  remainderProblem,
  fractionOf,
  orderOfOperations,
  mixtureProblem,
  partnership,
  probabilityDraw,
  percentagePopulation,
  numberProblem,
  sequenceTerm,
}

export type { ForgedItem }
