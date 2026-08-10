import { questions } from './quiz'
import { vocabulary } from './vocab'

export interface DailyChallenge {
  day: string // YYYY-MM-DD
  mcqId: number
  vocabIndex: number
  analyticalQuestion: string
  analyticalSubject: string
}

export const analyticalQuestions: { question: string; subject: string }[] = [
  { question: 'Is Pakistan’s water crisis primarily one of scarcity or of management? Argue with evidence.', subject: 'Current Affairs' },
  { question: 'Evaluate the impact of the 18th Amendment on federalism in Pakistan.', subject: 'Pakistan Affairs' },
  { question: 'Can artificial intelligence improve governance in developing countries? Discuss with examples.', subject: 'Current Affairs' },
  { question: 'Why do descriptive answers score poorly in CSS? Illustrate how to make answers analytical.', subject: 'Essay' },
  { question: 'Discuss the role of remittances in Pakistan’s external account.', subject: 'Current Affairs' },
  { question: 'Examine the causes of the failure of the first Constituent Assembly to frame a constitution early.', subject: 'Pakistan Affairs' },
  { question: 'How does climate change threaten Pakistan’s food security?', subject: 'General Science & Ability' },
  { question: 'Discuss the importance of the Treaty of Hudaybiyyah as a model of diplomacy.', subject: 'Islamic Studies' },
  { question: 'Should Pakistan prioritise exports over import substitution? Argue your case.', subject: 'Current Affairs' },
  { question: 'Analyse the role of local governments in democratic consolidation.', subject: 'Pakistan Affairs' },
  { question: 'What makes a strong thesis statement? Demonstrate with one example on “Democracy and youth”.', subject: 'Essay' },
  { question: 'Discuss the significance of the Objectives Resolution in Pakistan’s constitutional history.', subject: 'Pakistan Affairs' },
  { question: 'How can early-warning systems reduce disaster losses in Pakistan?', subject: 'General Science & Ability' },
  { question: 'Examine Pakistan’s balancing between major powers in its foreign policy.', subject: 'Current Affairs' },
  { question: 'Discuss the concept of Ijtihad and its relevance to contemporary challenges.', subject: 'Islamic Studies' },
]

// Deterministic daily challenge from date - changes automatically, archived by date
export function getDailyChallenge(date: Date): DailyChallenge {
  const day = date.toISOString().slice(0, 10)
  const seed = Math.floor(date.getTime() / 86400000)
  return {
    day,
    mcqId: questions[seed % questions.length].id,
    vocabIndex: seed % vocabulary.length,
    analyticalQuestion: analyticalQuestions[seed % analyticalQuestions.length].question,
    analyticalSubject: analyticalQuestions[seed % analyticalQuestions.length].subject,
  }
}

export function getChallengeForDate(dayStr: string): DailyChallenge {
  return getDailyChallenge(new Date(dayStr + 'T00:00:00Z'))
}
