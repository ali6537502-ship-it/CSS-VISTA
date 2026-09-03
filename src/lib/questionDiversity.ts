type QuestionLike = {
  q: string
  s?: string
}

function normalise(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[“”"'‘’][^“”"'‘’]*[“”"'‘’]/g, ' example ')
    .replace(/\b\d+(?:[.,]\d+)?\b/g, ' number ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function questionFamily(question: string) {
  const prefix = question.split(/[:;?]/, 1)[0] ?? question
  return normalise(prefix).split(' ').slice(0, 7).join(' ')
}

function roundRobin<T>(groups: T[][]): T[] {
  const output: T[] = []
  const positions = groups.map(() => 0)
  let remaining = groups.reduce((total, group) => total + group.length, 0)

  while (remaining > 0) {
    groups.forEach((group, index) => {
      const position = positions[index] ?? 0
      if (position >= group.length) return
      const item = group[position]
      if (item === undefined) return
      output.push(item)
      positions[index] = position + 1
      remaining -= 1
    })
  }

  return output
}

/**
 * Keeps every source question, but spaces questions from the same topic and
 * repeated wording template apart. No question text or answer is changed.
 */
export function diversifyQuestions<T extends QuestionLike>(questions: T[]): T[] {
  const topicGroups = new Map<string, T[]>()

  questions.forEach((question) => {
    const topic = normalise(question.s || 'general') || 'general'
    const group = topicGroups.get(topic) ?? []
    group.push(question)
    topicGroups.set(topic, group)
  })

  const diversifiedTopics = [...topicGroups.values()].map((topicQuestions) => {
    const familyGroups = new Map<string, T[]>()
    topicQuestions.forEach((question) => {
      const family = questionFamily(question.q) || normalise(question.q)
      const group = familyGroups.get(family) ?? []
      group.push(question)
      familyGroups.set(family, group)
    })
    return roundRobin([...familyGroups.values()])
  })

  return roundRobin(diversifiedTopics)
}
