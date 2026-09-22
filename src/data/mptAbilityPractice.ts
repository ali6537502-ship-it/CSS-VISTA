import type { BankQuestion } from './mcq'

// Arithmetic exercises are calculated from the question inputs. Each answer
// and explanation is derived by the same formula; no current-affairs facts are
// generated here. Varying inputs allows two fresh full papers each day.
const questions: BankQuestion[] = []

function number(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function add(family: string, index: number, question: string, answer: number, topic: string, explanation: string, unit = '', step = 1) {
  const values = [answer, answer + step, answer - step, answer + step * 2]
  const options = values.map((value) => `${unit}${number(value)}`)
  if (new Set(options).size !== 4 || values.some((value) => value < 0)) throw new Error(`Invalid arithmetic exercise ${family}-${index}`)
  const offset = (index + family.length) % 4
  const rotated = options.slice(offset).concat(options.slice(0, offset))
  questions.push({ id: `mpt-arithmetic-${family}-${index}`, q: question, o: rotated, a: rotated.indexOf(options[0]), s: topic, e: explanation, d: 'Intermediate' })
}

for (let index = 1; index <= 60; index += 1) {
  const original = 1000 + 20 * index
  const rate = 10 + 5 * (index % 4)
  const increased = original * (100 + rate) / 100
  add('increase', index, `A price of Rs ${original} rises by ${rate}%. What is the new price?`, increased, 'Percentages', `${original} × ${100 + rate}/100 = ${number(increased)}.`, 'Rs ', 20)

  const discount = original * (100 - rate) / 100
  add('discount', index, `An item marked Rs ${original} is sold at a ${rate}% discount. What is the selling price?`, discount, 'Percentages', `${original} × ${100 - rate}/100 = ${number(discount)}.`, 'Rs ', 20)

  const unit = 10 + index
  const small = 2 + index % 4
  const large = small + 2
  const total = unit * (small + large)
  add('ratio', index, `Rs ${total} is divided in the ratio ${small}:${large}. What is the larger share?`, unit * large, 'Ratio and Proportion', `One part is ${total} ÷ ${small + large} = ${unit}; the larger share is ${unit} × ${large}.`, 'Rs ', unit)

  const count = 5 + index % 5
  const average = 20 + index
  const missing = 11 + index
  add('missing-average', index, `${count} values average ${average}. If the sum of ${count - 1} of them is ${count * average - missing}, what is the missing value?`, missing, 'Averages', `Total is ${count} × ${average} = ${count * average}; subtract the given sum.`, '', 2)

  const newAverage = average + 2
  const extra = average + 2 * (count + 1)
  add('new-average', index, `${count} scores have mean ${average}. One more score of ${extra} is added. What is the new mean?`, newAverage, 'Averages', `(${count} × ${average} + ${extra}) ÷ ${count + 1} = ${newAverage}.`, '', 1)

  const cost = 500 + 100 * index
  const profitRate = 5 + 5 * (index % 5)
  const sale = cost * (100 + profitRate) / 100
  add('profit', index, `A shopkeeper buys an item for Rs ${cost} and sells it for Rs ${sale}. What is the profit percentage?`, profitRate, 'Profit and Loss', `Profit ÷ cost × 100 = (${number(sale - cost)} ÷ ${cost}) × 100 = ${profitRate}%.`, '', 2)

  const principal = 1000 + 200 * index
  const interestRate = 4 + index % 9
  const years = 2 + index % 4
  const interest = principal * interestRate * years / 100
  add('simple-interest', index, `Find the simple interest on Rs ${principal} at ${interestRate}% per year for ${years} years.`, interest, 'Simple Interest', `P × r × t ÷ 100 = ${principal} × ${interestRate} × ${years} ÷ 100 = ${number(interest)}.`, 'Rs ', 10)

  const compoundPrincipal = 1000 + 100 * index
  const compoundInterest = compoundPrincipal * 21 / 100
  add('compound-interest', index, `Rs ${compoundPrincipal} is invested at 10% compound interest annually. How much interest accrues after two years?`, compoundInterest, 'Compound Interest', `Two-year growth is 1.1² − 1 = 0.21, so interest is 21% of ${compoundPrincipal}.`, 'Rs ', 10)

  const workUnit = index + 2
  add('work', index, `A can finish a task in ${3 * workUnit} days and B in ${6 * workUnit} days. How many days do they need together?`, 2 * workUnit, 'Time and Work', `Their combined daily rate is 1/${3 * workUnit} + 1/${6 * workUnit} = 1/${2 * workUnit}.`, '', 1)

  const speed = 30 + index
  const hours = 2 + index % 5
  add('travel', index, `A vehicle travels at ${speed} km/h for ${hours} hours. How far does it travel?`, speed * hours, 'Time Speed and Distance', `Distance = speed × time = ${speed} × ${hours} km.`, '', 3)

  const speedFactor = 5 * (index + 1)
  const firstSpeed = 2 * speedFactor
  const secondSpeed = 3 * speedFactor
  const meanSpeed = 12 * (index + 1)
  add('average-speed', index, `Two equal distances are covered at ${firstSpeed} and ${secondSpeed} km/h. What is the overall average speed?`, meanSpeed, 'Average Speed', `For equal distances use 2uv/(u+v) = ${meanSpeed} km/h.`, '', 2)

  const son = index <= 30 ? index + 4 : index - 22
  const fatherMultiplier = index <= 30 ? 3 : 2
  const laterRatio = index <= 30 ? 'twice' : 'one and a half times'
  add('ages', index, `A father is ${fatherMultiplier === 3 ? 'three' : 'two'} times his son's age. In ${son} years he will be ${laterRatio} his son's age. How old is the son now?`, son, 'Ages', `Let the son's age be x. After ${son} years the father is ${laterRatio} the son's age, so x = ${son}.`, '', 2)

  const root = index + 3
  const multiplier = 2 + index % 5
  const constant = 7 + index % 9
  add('linear', index, `Solve ${multiplier}x + ${constant} = ${multiplier * root + constant}.`, root, 'Basic Algebra', `Subtract ${constant}, then divide by ${multiplier}: x = ${root}.`, '', 2)

  const first = index + 20
  const second = first - (5 + index % 6)
  add('two-numbers', index, `Two numbers sum to ${first + second} and differ by ${first - second}. What is the larger number?`, first, 'Basic Algebra', `Larger number = (sum + difference) ÷ 2 = ${first}.`, '', 2)

  const lowerRoot = index + 1
  const upperRoot = lowerRoot + 3
  add('quadratic', index, `What is the larger root of x² − ${lowerRoot + upperRoot}x + ${lowerRoot * upperRoot} = 0?`, upperRoot, 'Basic Algebra', `Factor as (x − ${lowerRoot})(x − ${upperRoot}) = 0.`, '', 2)

  const firstTerm = 5 + index
  const difference = 2 + index % 8
  const nth = 7 + index % 5
  const term = firstTerm + (nth - 1) * difference
  add('sequence', index, `The sequence begins ${firstTerm}, ${firstTerm + difference}, ${firstTerm + 2 * difference}, … What is its ${nth}th term?`, term, 'Sequences', `aₙ = ${firstTerm} + (${nth} − 1) × ${difference} = ${term}.`, '', 2)

  const firstAngle = 30 + index % 40
  const secondAngle = 50 + index % 30
  const thirdAngle = 180 - firstAngle - secondAngle
  add('triangle', index, `Two angles in a triangle are ${firstAngle}° and ${secondAngle}°. What is the third angle?`, thirdAngle, 'Basic Geometry', `The three angles sum to 180°, leaving ${thirdAngle}°.`, '', 2)

  const length = 10 + index
  const width = 5 + index % 7
  add('rectangle', index, `A rectangle is ${length} cm long and ${width} cm wide. What is its area in cm²?`, length * width, 'Basic Geometry', `Area = length × width = ${length * width} cm².`, '', 3)

  const scale = index + 2
  add('pythagoras', index, `A right triangle has perpendicular sides of ${3 * scale} cm and ${4 * scale} cm. What is its hypotenuse?`, 5 * scale, 'Basic Geometry', `It is a ${3 * scale}:${4 * scale}:${5 * scale} scaled 3:4:5 triangle.`, '', 2)

  const groupA = 25 + index
  const groupB = 18 + index
  const overlap = 8 + index % 9
  add('sets', index, `${groupA} people read one paper, ${groupB} read another, and ${overlap} read both. How many read at least one?`, groupA + groupB - overlap, 'Sets and Reasoning', `Use inclusion–exclusion: ${groupA} + ${groupB} − ${overlap}.`, '', 2)
}

export const calculatedMptAbilityQuestions = questions
