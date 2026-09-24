import type { BankQuestion } from './mcq.ts'

// A fresh, computed bank for the replacement mock series. Every item requires
// at least two operations or a constraint inference. Answers and distractors
// are derived from the same inputs, which makes the bank auditable and avoids
// hand-key transcription errors. Eight surface forms per family keep papers
// from reading like parameter-swapped copies of one template.
const questions: BankQuestion[] = []

const contexts = [
  'a district office', 'a scholarship fund', 'a warehouse', 'a survey unit',
  'a training centre', 'a transport depot', 'a health programme', 'a relief camp',
]

const scenarioLabels = [
  'District-office worksheet', 'Scholarship-fund audit', 'Warehouse planning case', 'Survey-unit review',
  'Training-centre exercise', 'Transport-depot calculation', 'Health-programme report', 'Relief-camp planning case',
]

const digitPairs = Array.from({ length: 9 }, (_, tens) => (
  Array.from({ length: 10 }, (_, units) => [tens + 1, units] as const)
)).flat().filter(([tens, units]) => tens !== units)

const candidateNames = [
  'Aamir', 'Abeeha', 'Adil', 'Afra', 'Ahmad', 'Aleena', 'Ali', 'Alina', 'Amir', 'Amna',
  'Anas', 'Anum', 'Areeba', 'Arham', 'Asad', 'Ayesha', 'Basit', 'Bilal', 'Dania', 'Danish',
  'Eman', 'Fahad', 'Farah', 'Fatima', 'Fiza', 'Hania', 'Haris', 'Hassan', 'Hina', 'Huma',
  'Ibrahim', 'Iqra', 'Irfan', 'Javeria', 'Kamran', 'Khadija', 'Laiba', 'Mahad', 'Mahnoor', 'Maryam',
  'Mehak', 'Muneeb', 'Nadia', 'Noman', 'Omar', 'Rabia', 'Raza', 'Rida', 'Saad', 'Saba',
  'Sadia', 'Sajid', 'Salman', 'Sana', 'Sara', 'Shahid', 'Sobia', 'Talha', 'Tania', 'Umar',
  'Usman', 'Waleed', 'Yasir', 'Zain', 'Zara', 'Zoya', 'Aqsa', 'Hamza', 'Kiran', 'Sameer',
]

function tidy(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function rotate<T>(values: T[], amount: number) {
  const offset = ((amount % values.length) + values.length) % values.length
  return values.slice(offset).concat(values.slice(0, offset))
}

function distinctDistractors(answer: number, candidates: number[]) {
  const values: number[] = []
  for (const candidate of candidates) {
    if (tidy(candidate) !== tidy(answer) && !values.some((value) => tidy(value) === tidy(candidate))) values.push(candidate)
  }
  while (values.length < 3) values.push(answer + 3.17 * (values.length + 1))
  return values.slice(0, 3)
}

function addNumeric(
  family: string,
  index: number,
  q: string,
  answer: number,
  distractors: number[],
  topic: string,
  e: string,
  unit = '',
  suffix = '',
) {
  const values = [answer, ...distractors]
  const options = values.map((value) => `${unit}${tidy(value)}${suffix}`)
  if (values.some((value) => !Number.isFinite(value)) || new Set(options).size !== 4) {
    throw new Error(`Invalid advanced ability item ${family}-${index}`)
  }
  const arranged = rotate(options, index % 4)
  questions.push({
    id: `mpt-advanced-ability-${family}-${String(index).padStart(2, '0')}`,
    q: `${scenarioLabels[(index - 1) % scenarioLabels.length]} — ${q}`,
    o: arranged,
    a: arranged.indexOf(options[0]),
    s: topic,
    e,
    d: 'Advanced',
  })
}

function addText(
  family: string,
  index: number,
  q: string,
  answer: string,
  distractors: string[],
  topic: string,
  e: string,
) {
  const options = [answer, ...distractors]
  if (new Set(options).size !== 4) throw new Error(`Invalid advanced ability item ${family}-${index}`)
  const arranged = rotate(options, index % 4)
  questions.push({
    id: `mpt-advanced-ability-${family}-${String(index).padStart(2, '0')}`,
    q,
    o: arranged,
    a: arranged.indexOf(answer),
    s: topic,
    e,
    d: 'Advanced',
  })
}

for (let index = 1; index <= 64; index += 1) {
  const context = contexts[(index - 1) % contexts.length]
  const k = 2 + index

  {
    const base = 500 * k
    const up = [10, 20, 30, 40][index % 4]
    const down = [20, 10, 20, 25][index % 4]
    const final = base * (100 + up) * (100 - down) / 10_000
    const net = final - base
    addNumeric('successive-change', index,
      `A budget of Rs ${base} at ${context} is increased by ${up}% and then reduced by ${down}% of the increased amount. What is the final change from the original budget?`,
      net, [base * (up - down) / 100, -net, net + base * down / 100],
      'Successive Percentages',
      `Successive changes act on different bases: ${base} × ${100 + up}/100 × ${100 - down}/100 = ${tidy(final)}; the change is ${tidy(net)}.`,
      'Rs ')
  }

  {
    const listed = 1000 * k
    const discount = [10, 20, 25, 30][index % 4]
    const tax = [5, 10, 12.5, 20][index % 4]
    const paid = listed * (100 - discount) * (100 + tax) / 10_000
    addNumeric('reverse-bill', index,
      `After a ${discount}% discount and then ${tax}% sales tax, an equipment bill for ${context} is Rs ${tidy(paid)}. What was the listed price?`,
      listed, [paid, listed * (100 - discount) / 100, listed * (100 + tax) / 100],
      'Reverse Percentages',
      `If L is the list price, L × ${100 - discount}/100 × ${100 + tax}/100 = ${tidy(paid)}, giving L = ${listed}.`,
      'Rs ')
  }

  {
    const cost = 800 * k
    const profit = [20, 25, 30, 40][index % 4]
    const discount = [20, 25, 20, 30][index % 4]
    const marked = cost * (100 + profit) / (100 - discount)
    addNumeric('marked-price', index,
      `A supplier wants a ${profit}% profit on an item costing Rs ${cost}, even after allowing a ${discount}% discount on its marked price. What marked price is required?`,
      marked, [cost * (100 + profit) / 100, cost * 100 / (100 - discount), marked - cost * discount / 100],
      'Profit, Loss and Discount',
      `Required selling price is ${cost} × ${100 + profit}/100. Since that is ${100 - discount}% of the marked price, divide it by ${(100 - discount) / 100}.`,
      'Rs ')
  }

  {
    const left = 3 + index % 4
    const right = left + 2
    const unit = 12 + index
    const added = unit * left
    const newLeft = unit * left + added
    const newRight = unit * right
    addNumeric('ratio-adjustment', index,
      `${context} divides ${unit * (left + right)} files between teams A and B in the ratio ${left}:${right}. How many additional files must A receive for the new ratio A:B to become ${newLeft / unit}:${newRight / unit}?`,
      added, [unit, unit * right, added + unit],
      'Ratio and Proportion',
      `The original shares are ${unit * left} and ${unit * right}. To make A's share ${newLeft}, it needs ${newLeft} − ${unit * left} = ${added} more files.`)
  }

  {
    const total = 50 + 10 * k
    const removed = total / 5
    const originalRate = [25, 30, 35, 40][index % 4]
    const finalRate = originalRate * (total - removed) / total
    addNumeric('mixture-replacement', index,
      `A tank contains ${total} litres of a ${originalRate}% solution. ${removed} litres of the mixture are removed and replaced by water. What is the new concentration?`,
      finalRate, [originalRate - removed / total, originalRate * removed / total, originalRate + removed * 100 / total],
      'Mixtures and Concentration',
      `Removing one-fifth of a uniform mixture removes one-fifth of its solute. The remaining concentration is ${originalRate}% × 4/5 = ${tidy(finalRate)}%.`,
      '', '%')
  }

  {
    const n1 = 20 + index
    const n2 = 10 + index % 9
    const a1 = 50 + index % 11
    const a2 = 70 + index % 13
    const combined = (n1 * a1 + n2 * a2) / (n1 + n2)
    addNumeric('weighted-mean', index,
      `Two batches assessed by ${context} contain ${n1} and ${n2} candidates with mean scores ${a1} and ${a2}. What is the combined mean?`,
      combined, [(a1 + a2) / 2, combined + 2, combined - 2],
      'Weighted Averages',
      `Use the weighted mean: (${n1} × ${a1} + ${n2} × ${a2}) ÷ ${n1 + n2} = ${tidy(combined)}.`)
  }

  {
    const count = 12 + index % 9
    const oldMean = 30 + index
    const removed = 20 + index
    const added = removed + 2 * count
    const newMean = oldMean + 2
    addNumeric('replacement-mean', index,
      `The mean of ${count} observations in a report is ${oldMean}. One entry, ${removed}, is corrected to ${added}. What is the corrected mean?`,
      newMean, [oldMean + 1, oldMean + 3, newMean + 5],
      'Averages and Corrections',
      `The total rises by ${added - removed}; divided across ${count} observations, the mean rises by 2 to ${newMean}.`)
  }

  {
    const rate = [10, 12, 15, 20][index % 4]
    const principal = 10_000 * k
    const difference = principal * rate * rate / 10_000
    addNumeric('interest-difference', index,
      `For two years at ${rate}% per annum, by how much does compound interest exceed simple interest on Rs ${principal}?`,
      difference, [principal * rate / 100, difference * 2, difference + principal * rate / 100],
      'Simple and Compound Interest',
      `For two years, CI − SI = P(r/100)² = ${principal} × (${rate}/100)² = ${difference}.`,
      'Rs ')
  }

  {
    const rate = [10, 20, 25, 50][index % 4]
    const principal = 400 * k
    const amount = principal * (1 + rate / 100) ** 2
    addNumeric('compound-principal', index,
      `An investment grows to Rs ${tidy(amount)} in two years at ${rate}% compound interest per year. What was the principal?`,
      principal, [amount - principal, amount / (1 + rate / 100), amount],
      'Compound Interest',
      `Principal = ${tidy(amount)} ÷ (1 + ${rate}/100)² = ${principal}.`,
      'Rs ')
  }

  {
    const firstCapital = 1000 * (4 + index)
    const secondCapital = 1000 * (5 + index % 7)
    const firstMonths = 6 + index % 5
    const secondMonths = 4 + index % 7
    const firstWeight = firstCapital * firstMonths
    const secondWeight = secondCapital * secondMonths
    const totalProfit = (firstWeight + secondWeight) / 100
    const firstShare = firstWeight / 100
    addNumeric('partnership', index,
      `A invests Rs ${firstCapital} for ${firstMonths} months and B invests Rs ${secondCapital} for ${secondMonths} months. If their profit is Rs ${totalProfit}, what is A's share?`,
      firstShare, [firstShare * 1.1, firstShare * 0.9, firstShare + totalProfit / 4],
      'Partnership Ratios',
      `Profit follows capital-months. The weights are ${firstWeight}:${secondWeight}; A therefore receives Rs ${firstShare}.`,
      'Rs ')
  }

  {
    const scale = 1 + index
    const aDays = 12 * scale
    const bDays = 18 * scale
    const together = 6 * scale
    const totalDays = 8 * scale
    addNumeric('work-departure', index,
      `A can complete a project in ${aDays} days and B in ${bDays} days. They work together for ${together} days; B then leaves. How many days from the start will A take to finish the project?`,
      totalDays, [together + 2, 9 * scale, 10 * scale],
      'Time and Work',
      `Together they complete ${together} × (1/${aDays} + 1/${bDays}) = 5/6. A needs another ${2 * scale} days for the remaining 1/6, totalling ${totalDays}.`)
  }

  {
    const baseDays = 15 + index
    const efficiency = [20, 25, 50, 100][index % 4]
    const fasterDays = baseDays * 100 / (100 + efficiency)
    addNumeric('work-efficiency', index,
      `Worker B takes ${baseDays} days for a task. Worker A is ${efficiency}% more efficient than B. How many days would A need for the same task?`,
      fasterDays, [baseDays * (100 - efficiency) / 100, baseDays + fasterDays, baseDays * (100 + efficiency) / 100],
      'Work and Efficiency',
      `Time varies inversely with efficiency, so A's time is ${baseDays} × 100/${100 + efficiency} = ${tidy(fasterDays)} days.`,
      '', ' days')
  }

  {
    const scale = 1 + index
    const first = 12 * scale
    const second = 18 * scale
    const leak = 36 * scale
    const fill = 9 * scale
    addNumeric('pipes-leak', index,
      `Two pipes can fill a tank in ${first} and ${second} minutes, while a leak can empty it in ${leak} minutes. If all three remain open, when will the tank fill?`,
      fill, [6 * scale, 10 * scale, 12 * scale],
      'Pipes and Cisterns',
      `Net rate = 1/${first} + 1/${second} − 1/${leak} = 1/${fill}, so the tank fills in ${fill} minutes.`,
      '', ' minutes')
  }

  {
    const length = 120 + 10 * index
    const platform = 80 + 10 * (index % 9)
    const seconds = 10 + index % 11
    const speed = (length + platform) / seconds * 3.6
    addNumeric('train-platform', index,
      `A train ${length} m long clears a ${platform} m platform in ${seconds} seconds. What is its speed in km/h?`,
      speed, [(length + platform) / seconds, length / seconds * 3.6, platform / seconds * 3.6],
      'Speed, Distance and Time',
      `The train covers ${length + platform} m. Its speed is (${length + platform})/${seconds} m/s × 3.6 = ${tidy(speed)} km/h.`,
      '', ' km/h')
  }

  {
    const leadHours = 1 + index % 4
    const slow = 30 + index
    const fast = slow + 10 + index % 6
    const catchHours = slow * leadHours / (fast - slow)
    addNumeric('catch-up', index,
      `A bus leaves ${context} at ${slow} km/h. ${leadHours} hours later, a car follows on the same route at ${fast} km/h. How long after the car starts will it catch the bus?`,
      catchHours, [leadHours, slow * leadHours / fast, catchHours + leadHours],
      'Relative Speed',
      `The bus has a ${slow * leadHours} km lead. Relative speed is ${fast - slow} km/h, so catch-up time is ${tidy(catchHours)} hours.`,
      '', ' hours')
  }

  {
    const still = 10 + index
    const stream = 2 + index % 5
    const distance = (still * still - stream * stream) * (1 + index % 3)
    const upTime = distance / (still - stream)
    const downTime = distance / (still + stream)
    const totalTime = upTime + downTime
    addNumeric('boat-round-trip', index,
      `A boat's still-water speed is ${still} km/h and the stream flows at ${stream} km/h. How long does a ${distance} km upstream and ${distance} km downstream round trip take?`,
      totalTime, [2 * distance / still, upTime, downTime],
      'Boats and Streams',
      `Time = ${distance}/(${still} − ${stream}) + ${distance}/(${still} + ${stream}) = ${tidy(totalTime)} hours.`,
      '', ' hours')
  }

  {
    const u = 20 + 2 * index
    const v = u + 10 + 2 * (index % 4)
    const average = 2 * u * v / (u + v)
    addNumeric('equal-distance-speed', index,
      `A vehicle covers two equal-distance legs at ${u} km/h and ${v} km/h. What is its average speed for the complete journey?`,
      average, [(u + v) / 2, v - u, u * v / (u + v)],
      'Average Speed',
      `For equal distances the harmonic mean applies: 2uv/(u + v) = ${tidy(average)} km/h.`,
      '', ' km/h')
  }

  {
    const track = 300 + 20 * index
    const firstSpeed = track / (4 + index % 5)
    const secondSpeed = track / (6 + index % 5)
    const oppositeMeeting = track / (firstSpeed + secondSpeed)
    addNumeric('circular-track', index,
      `Two runners start together in opposite directions on a ${track} m circular track at ${tidy(firstSpeed)} m/s and ${tidy(secondSpeed)} m/s. After how many seconds do they first meet?`,
      oppositeMeeting, [track / Math.abs(firstSpeed - secondSpeed), track / firstSpeed, track / secondSpeed],
      'Circular Motion',
      `In opposite directions their relative speed is ${tidy(firstSpeed + secondSpeed)} m/s, so time is ${track} ÷ ${tidy(firstSpeed + secondSpeed)} = ${tidy(oppositeMeeting)} seconds.`,
      '', ' seconds')
  }

  {
    const [tens, units] = digitPairs[index - 1]
    const number = 10 * tens + units
    const reversed = 10 * units + tens
    const direction = reversed > number ? 'increases' : 'reduces'
    addNumeric('digit-reversal', index,
      `A two-digit number has digit sum ${tens + units}; reversing its digits ${direction} it by ${Math.abs(number - reversed)}. What is the original number?`,
      number, [reversed, number + 10, number - 10],
      'Number Problems',
      `Let the tens and units digits be x and y. Then x + y = ${tens + units} and 9(x − y) = ${number - reversed}; hence x = ${tens}, y = ${units}.`)
  }

  {
    const adults = 20 + index
    const children = 10 + index % 11
    const adultFare = 50 + 5 * (index % 7)
    const childFare = adultFare - 20
    const revenue = adults * adultFare + children * childFare
    const passengers = adults + children
    addNumeric('simultaneous-fares', index,
      `${passengers} passengers paid Rs ${revenue}. An adult ticket cost Rs ${adultFare} and a child ticket Rs ${childFare}. How many adults travelled?`,
      adults, [children, passengers - adults + 2, revenue / adultFare],
      'Simultaneous Equations',
      `If a is the adult count, ${adultFare}a + ${childFare}(${passengers} − a) = ${revenue}, which gives a = ${adults}.`)
  }

  {
    const lower = 3 + index
    const upper = lower + 2 + index % 5
    const sum = lower + upper
    const product = lower * upper
    addNumeric('quadratic-roots', index,
      `The roots of x² − ${sum}x + ${product} = 0 differ by ${upper - lower}. What is the larger root?`,
      upper, [lower, sum, product],
      'Basic Algebra',
      `The quadratic factors as (x − ${lower})(x − ${upper}); the larger root is ${upper}.`)
  }

  {
    const a = index + 2
    const b = index + 3
    const product = a * b
    const remainder = 1 + index % Math.min(a, b)
    const least = product + remainder
    addNumeric('common-remainder', index,
      `What is the least number greater than ${product} that leaves remainder ${remainder} when divided by both ${a} and ${b}, given that ${a} and ${b} are coprime?`,
      least, [product, product - remainder, product + a + remainder],
      'LCM and Remainders',
      `A common remainder means N − ${remainder} is a multiple of lcm(${a}, ${b}) = ${product}. The least eligible N is ${product} + ${remainder} = ${least}.`)
  }

  {
    const first = 5 + index
    const difference = 2 + index % 7
    const terms = 10 + index % 8
    const sum = terms * (2 * first + (terms - 1) * difference) / 2
    addNumeric('arithmetic-progression', index,
      `An arithmetic sequence begins ${first}, ${first + difference}, ${first + 2 * difference}, … . What is the sum of its first ${terms} terms?`,
      sum, [first + (terms - 1) * difference, terms * (first + difference), sum - difference * terms],
      'Sequences and Series',
      `Sₙ = n[2a + (n − 1)d]/2 = ${terms}[${2 * first} + ${terms - 1}×${difference}]/2 = ${sum}.`)
  }

  {
    const first = 2 + index
    const ratio = 2 + index % 3
    const termNumber = 5 + index % 4
    const term = first * ratio ** (termNumber - 1)
    addNumeric('geometric-progression', index,
      `A geometric sequence has first term ${first} and common ratio ${ratio}. What is its ${termNumber}th term?`,
      term, [first * ratio ** termNumber, first + (termNumber - 1) * ratio, term / ratio + first],
      'Geometric Sequences',
      `aₙ = arⁿ⁻¹ = ${first} × ${ratio}^${termNumber - 1} = ${term}.`)
  }

  {
    const onlyA = 20 + index
    const onlyB = 15 + index % 13
    const onlyC = 10 + index % 9
    const ab = 4 + index % 5
    const ac = 3 + index % 4
    const bc = 2 + index % 3
    const all = 1 + index % 2
    const union = onlyA + onlyB + onlyC + ab + ac + bc + all
    addNumeric('three-sets', index,
      `In a survey, ${onlyA} chose only A, ${onlyB} only B, ${onlyC} only C, ${ab} chose A and B only, ${ac} A and C only, ${bc} B and C only, and ${all} chose all three. How many chose at least one?`,
      union, [union - all, onlyA + onlyB + onlyC, union + ab + ac + bc],
      'Sets and Inclusion–Exclusion',
      `The seven disjoint regions are added once: ${onlyA}+${onlyB}+${onlyC}+${ab}+${ac}+${bc}+${all} = ${union}.`)
  }

  {
    const red = 3 + index
    const blue = 4 + index % 7
    const numerator = red * (red - 1)
    const denominator = (red + blue) * (red + blue - 1)
    const probability = numerator / denominator * 100
    const probabilityDistractors = distinctDistractors(probability, [
      red * red / (red + blue) ** 2 * 100,
      2 * red * blue / denominator * 100,
      red / (red + blue) * 100,
      blue / (red + blue) * 100,
    ])
    addNumeric('without-replacement', index,
      `A bag holds ${red} red and ${blue} blue counters. Two are drawn without replacement. What is the probability that both are red?`,
      probability,
      probabilityDistractors,
      'Probability',
      `Multiply the changing probabilities: ${red}/${red + blue} × ${red - 1}/${red + blue - 1} = ${tidy(probability)}%.`,
      '', '%')
  }

  {
    const total = 7 + Math.floor((index - 1) / 4)
    const chosen = 2 + (index - 1) % 4
    const choose = (n: number, r: number) => {
      let value = 1
      for (let step = 1; step <= r; step += 1) value = value * (n - r + step) / step
      return value
    }
    const combinations = choose(total, chosen)
    addNumeric('committee-selection', index,
      `${context} must select ${chosen} representatives from ${total} eligible people. If order does not matter, how many different committees are possible?`,
      combinations, [total * chosen, combinations * chosen, combinations + total],
      'Combinations',
      `The number is C(${total}, ${chosen}) = ${total}!/[${chosen}!(${total - chosen})!] = ${combinations}.`)
  }

  {
    const length = 20 + index
    const width = 12 + index % 11
    const border = 2 + index % 4
    const borderArea = length * width - (length - 2 * border) * (width - 2 * border)
    addNumeric('inner-border', index,
      `A ${length} m by ${width} m rectangular courtyard has a uniform path ${border} m wide inside its boundary. What area does the path cover?`,
      borderArea, [2 * border * (length + width), (length - 2 * border) * (width - 2 * border), length * width],
      'Geometry and Area',
      `Path area = outer area − inner area = ${length * width} − ${length - 2 * border}×${width - 2 * border} = ${borderArea} m².`,
      '', ' m²')
  }

  {
    const smallBase = 3 + index % 8
    const smallSide = 4 + index % 9
    const scale = 2 + index % 5
    const largeBase = smallBase * scale
    const largeSide = smallSide * scale
    addNumeric('similar-triangles', index,
      `Two triangles are similar. A side of ${smallBase} cm in the smaller corresponds to ${largeBase} cm in the larger. If another smaller side is ${smallSide} cm, what is its corresponding larger side?`,
      largeSide, [largeSide - smallBase, largeSide + smallBase, largeSide + smallBase + scale],
      'Similar Triangles',
      `The scale factor is ${largeBase}/${smallBase} = ${scale}; therefore ${smallSide} × ${scale} = ${largeSide} cm.`,
      '', ' cm')
  }

  {
    const triple = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]][index % 4]
    const scale = 1 + index
    const dx = triple[0] * scale
    const dy = triple[1] * scale
    const distance = triple[2] * scale
    addNumeric('coordinate-distance', index,
      `On a coordinate grid, point Q lies ${dx} units east and ${dy} units north of point P. What is the straight-line distance PQ?`,
      distance, [dx + dy, Math.abs(dx - dy), distance + scale],
      'Coordinate Geometry',
      `PQ = √(${dx}² + ${dy}²) = ${distance} units.`,
      '', ' units')
  }

  {
    const first = 120 + 10 * index
    const second = 80 + 5 * index
    const third = 100 + 5 * (index % 9)
    const total = first + second + third
    const share = first * 100 / total
    addNumeric('data-share', index,
      `A quarterly table for ${context} records ${first}, ${second}, and ${third} completed cases in three months. What percentage of the three-month total was completed in the first month?`,
      share, [first * 100 / (second + third), second * 100 / total, 100 - share],
      'Data Interpretation',
      `The total is ${total}; the first-month share is ${first}/${total} × 100 = ${tidy(share)}%.`,
      '', '%')
  }

  {
    const names = candidateNames.slice(index - 1, index + 4)
    const valid = `${names[0]} – ${names[1]} – ${names[2]} – ${names[3]} – ${names[4]}`
    addText('ordering-constraints', index,
      `Five candidates—${names.join(', ')}—are interviewed once each. ${names[0]} is before ${names[1]}; ${names[1]} is immediately before ${names[2]}; ${names[4]} is after ${names[3]}; and ${names[3]} is after ${names[2]}. Which order is possible?`,
      valid,
      [
        `${names[1]} – ${names[0]} – ${names[2]} – ${names[3]} – ${names[4]}`,
        `${names[0]} – ${names[1]} – ${names[3]} – ${names[2]} – ${names[4]}`,
        `${names[0]} – ${names[1]} – ${names[2]} – ${names[4]} – ${names[3]}`,
      ],
      'Analytical Reasoning',
      `The fixed block is ${names[1]}–${names[2]}; ${names[0]} must precede it, and ${names[2]} must be followed in order by ${names[3]} and ${names[4]}.`)
  }
}

export const advancedMptAbilityQuestions = questions
