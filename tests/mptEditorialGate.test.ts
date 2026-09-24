import test from 'node:test'
import assert from 'node:assert/strict'
import type { BankQuestion } from '../src/data/mcq.ts'
import {
  eligibleMptCurrent, eligibleMptScience, eligibleMptUrdu, eligibleMptUrduPastPaper,
} from '../src/data/mptQuality.ts'
import { appliedMptUrduQuestions } from '../src/data/mptUrduApplied.ts'
import { extendedMptUrduQuestions } from '../src/data/mptUrduExtended.ts'
import { verifiedMptCurrentQuestions } from '../src/data/mptCurrentVerified.ts'
import { mptGrammarCourseEnglishQuestions } from '../src/data/mptGrammarCourseEnglish.ts'
import { advancedMptAbilityQuestions } from '../src/data/mptAdvancedAbility.ts'
import { expandedVerifiedMptCurrentQuestions } from '../src/data/mptCurrentVerifiedExpanded.ts'
import { advancedMptUrduTranslationQuestions } from '../src/data/mptUrduTranslationAdvanced.ts'
import { repositoryMptUrduGrammarQuestions } from '../src/data/mptRepoUrduGrammar.ts'
import { repositoryMptEnglishQuestions } from '../src/data/mptRepoEnglishAdvanced.ts'
import {
  mptComprehensionPassageCount, mptComprehensionQuestions,
} from '../src/data/mptEnglishComprehension.ts'

const row: BankQuestion = { id: 'review-item', q: 'Which factor most directly changes the reading of a thermometer?', o: ['Temperature', 'Pressure', 'Distance', 'Colour'], a: 0, s: 'Everyday Science' }

test('MPT science excludes college-level calculations even when labelled science', () => {
  assert.equal(eligibleMptScience(row), true)
  assert.equal(eligibleMptScience({ ...row, q: 'In 1230 individuals under Hardy–Weinberg equilibrium, q=0.57. Expected aa individuals are approximately' }), false)
  assert.equal(eligibleMptScience({ ...row, q: 'The radiative flux of a 5250 K blackbody is approximately' }), false)
})

test('Urdu keeps applied language and excludes literature and ambiguous none-of-these items', () => {
  assert.equal(eligibleMptUrdu({ ...row, q: 'درست فعل منتخب کریں', s: 'قواعد و زبان' }), true)
  assert.equal(eligibleMptUrdu({ ...row, q: 'مشہور شاعر کی تصنیف کون سی ہے؟', s: 'ادبا، شعرا اور کتب' }), false)
  assert.equal(eligibleMptUrduPastPaper({ ...row, q: 'درست واحد کیا ہے؟', o: ['الف', 'ب', 'ج', 'ان میں سے کوئی نہیں'] }), false)
})

test('current affairs excludes source-free entries and publication-date trivia', () => {
  assert.equal(eligibleMptCurrent({ ...row, q: 'What was the key outcome of the meeting?', s: 'Current Affairs' }), false)
  assert.equal(eligibleMptCurrent({ ...row, q: 'On which date did Reuters publish the meeting report?', s: 'Current Affairs', sourceUrl: 'https://www.reuters.com/' }), false)
  assert.equal(verifiedMptCurrentQuestions.every((question) => question.sourceUrl?.startsWith('https://')), true)
})

test('new Urdu items have distinct stems and four distinct, explained answers', () => {
  const questions = [...appliedMptUrduQuestions, ...extendedMptUrduQuestions]
  assert.equal(new Set(questions.map((question) => question.q)).size, questions.length)
  for (const question of questions) {
    assert.equal(question.o.length, 4, question.id)
    assert.equal(new Set(question.o).size, 4, question.id)
    assert.equal(question.o[question.a].length > 0 && (question.e?.length ?? 0) > 0, true, question.id)
  }
})

test('MPT English imports only the examination-level, auto-marked grammar-course drills', () => {
  assert.equal(mptGrammarCourseEnglishQuestions.length, 231)
  assert.equal(new Set(mptGrammarCourseEnglishQuestions.map((question) => question.q)).size, 231)
  for (const question of mptGrammarCourseEnglishQuestions) {
    assert.equal(question.o.length, 4, question.id)
    assert.equal(new Set(question.o).size, 4, question.id)
    assert.equal(Number.isInteger(question.a) && question.a >= 0 && question.a < 4, true, question.id)
    assert.equal((question.e?.length ?? 0) > 10, true, question.id)
    assert.equal(question.d, 'Advanced', question.id)
  }
})

test('advanced ability bank is large, unique, computed and never basic', () => {
  assert.equal(advancedMptAbilityQuestions.length, 2048)
  assert.equal(new Set(advancedMptAbilityQuestions.map((question) => question.id)).size, 2048)
  assert.equal(new Set(advancedMptAbilityQuestions.map((question) => question.q)).size, 2048)
  assert.equal(new Set(advancedMptAbilityQuestions.map((question) => question.s)).size >= 24, true)
  for (const question of advancedMptAbilityQuestions) {
    assert.equal(question.o.length, 4, question.id)
    assert.equal(new Set(question.o).size, 4, question.id)
    assert.equal(Number.isInteger(question.a) && question.a >= 0 && question.a < 4, true, question.id)
    assert.equal((question.e?.length ?? 0) > 25, true, question.id)
    assert.equal(question.d, 'Advanced', question.id)
  }
})

test('expanded current-affairs bank has unique, source-backed completed facts', () => {
  assert.equal(expandedVerifiedMptCurrentQuestions.length, 60)
  assert.equal(new Set(expandedVerifiedMptCurrentQuestions.map((question) => question.q)).size, 60)
  for (const question of expandedVerifiedMptCurrentQuestions) {
    assert.equal(question.o.length, 4, question.id)
    assert.equal(new Set(question.o).size, 4, question.id)
    assert.equal(Number.isInteger(question.a) && question.a >= 0 && question.a < 4, true, question.id)
    assert.equal(question.sourceUrl?.startsWith('https://'), true, question.id)
    assert.equal(/scheduled|expected|planned|would take place/i.test(question.q), false, question.id)
  }
})

test('advanced Urdu translation bank has unique bilingual stems and close distractors', () => {
  assert.equal(advancedMptUrduTranslationQuestions.length, 126)
  assert.equal(new Set(advancedMptUrduTranslationQuestions.map((question) => question.q)).size, 126)
  for (const question of advancedMptUrduTranslationQuestions) {
    assert.equal(question.o.length, 4, question.id)
    assert.equal(new Set(question.o).size, 4, question.id)
    assert.equal(Number.isInteger(question.a) && question.a >= 0 && question.a < 4, true, question.id)
    assert.equal(question.d, 'Advanced', question.id)
  }
})

test('repository Urdu grammar conversion stays inside language topics and preserves source explanations', () => {
  assert.equal(repositoryMptUrduGrammarQuestions.length, 592)
  assert.equal(new Set(repositoryMptUrduGrammarQuestions.map((question) => question.q)).size, 592)
  for (const question of repositoryMptUrduGrammarQuestions) {
    assert.equal(question.s, 'قواعد و زبان', question.id)
    assert.equal(question.o.length, 4, question.id)
    assert.equal(new Set(question.o).size, 4, question.id)
    assert.equal(Number.isInteger(question.a) && question.a >= 0 && question.a < 4, true, question.id)
    assert.match(question.e ?? '', /ماخذ صفحہ/, question.id)
  }
})

test('repository English conversion is large, unique and answer-keyed', () => {
  assert.equal(repositoryMptEnglishQuestions.length, 1567)
  assert.equal(new Set(repositoryMptEnglishQuestions.map((question) => question.q)).size, 1567)
  assert.equal(repositoryMptEnglishQuestions.filter((question) => question.id.includes('correction')).length >= 500, true)
  assert.equal(repositoryMptEnglishQuestions.filter((question) => question.id.includes('reference')).length >= 1000, true)
  for (const question of repositoryMptEnglishQuestions) {
    assert.equal(question.o.length, 4, question.id)
    assert.equal(new Set(question.o.map((option) => option.toLocaleLowerCase('en'))).size, 4, question.id)
    assert.equal(Number.isInteger(question.a) && question.a >= 0 && question.a < 4, true, question.id)
    assert.equal(question.d, 'Advanced', question.id)
  }
})

test('the forty-paper release has a different advanced comprehension pair for every sitting', () => {
  assert.equal(mptComprehensionPassageCount, 40)
  assert.equal(mptComprehensionQuestions.length, 40)
  assert.equal(mptComprehensionQuestions.every((set) => set.length === 2), true)
  const questions = mptComprehensionQuestions.flat()
  assert.equal(questions.length, 80)
  assert.equal(new Set(questions.map((question) => question.id)).size, 80)
  assert.equal(new Set(questions.map((question) => question.q)).size, 80)
  assert.equal(questions.every((question) => question.d === 'Advanced'), true)
})
