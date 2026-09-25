// Client-side typo check for the Roll Number (six digits, growing to seven or more
// only for very large mocks). The server repeats every check; this only lets the
// entrance gate say "a digit looks wrong" instantly.
const DAMM = [
  [0, 3, 1, 7, 5, 9, 8, 6, 4, 2],
  [7, 0, 9, 2, 1, 5, 4, 8, 6, 3],
  [4, 2, 0, 6, 8, 7, 1, 3, 5, 9],
  [1, 7, 5, 0, 9, 8, 3, 4, 2, 6],
  [6, 1, 2, 3, 0, 4, 5, 9, 7, 8],
  [3, 6, 7, 4, 2, 0, 9, 5, 8, 1],
  [5, 8, 6, 9, 7, 2, 0, 1, 3, 4],
  [8, 9, 4, 5, 3, 6, 2, 0, 1, 7],
  [9, 4, 3, 8, 6, 1, 7, 2, 0, 5],
  [2, 5, 8, 1, 4, 3, 6, 7, 9, 0],
]

export function normaliseRollNumber(value: string) {
  return value.replace(/\s+/g, '')
}

export function isWellFormedRollNumber(value: string) {
  const digits = normaliseRollNumber(value)
  if (!/^[1-9]\d{5,11}$/.test(digits)) return false
  let interim = 0
  for (const digit of digits) interim = DAMM[interim][Number(digit)]
  return interim === 0
}

/** Left-to-right groups of three: 482 917, 482 917 3. */
export function formatRollNumber(roll: string) {
  return normaliseRollNumber(roll).replace(/(\d{3})(?=\d)/g, '$1 ')
}
