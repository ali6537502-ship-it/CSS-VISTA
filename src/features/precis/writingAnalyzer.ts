import { wordCount } from './api.ts'

export type WritingFinding = {
  id: string
  group: 'grammar' | 'punctuation' | 'expression' | 'structure' | 'source' | 'length' | 'title'
  certainty: 'detected' | 'review'
  label: string
  excerpt: string
  explanation: string
  advice: string
  start?: number
  end?: number
  handbook: string
}
export type WritingAnalysis = {
  sourceWords: number
  draftWords: number
  ratio: number
  findings: WritingFinding[]
  checkedAt: string
  scope: string
}

type AnalyzeInput = {
  original: string
  draft: string
  title: string
  limit: number | null
}
type PatternRule = {
  id: string
  regex: RegExp
  group: WritingFinding['group']
  label: string
  explanation: string
  advice: string
  handbook: string
  certainty?: WritingFinding['certainty']
}
const languageRules: PatternRule[] = [
  {
    id: 'repeated-word', regex: /\b([a-z]{2,})\s+\1\b/giu,
    group: 'grammar', label: 'Repeated word',
    explanation: 'The same word appears twice in succession.',
    advice: 'Remove the unintended repetition, then read the sentence again.',
    handbook: 'Chapter 11 — Grammar; Chapter 16 — Common failure patterns',
  },
  {
    id: 'people-is', regex: /\bpeople\s+(?:is|was)\b/giu,
    group: 'grammar', label: 'Subject–verb agreement',
    explanation: '“People” takes a plural verb here.',
    advice: 'Use “people are” or “people were”, as the meaning requires.',
    handbook: 'Chapter 11 — Grammar',
  },
  {
    id: 'they-is', regex: /\b(?:they|we)\s+(?:is|was)\b/giu,
    group: 'grammar', label: 'Subject–verb agreement',
    explanation: 'The pronoun and verb do not agree.',
    advice: 'Use the matching plural form, such as “they are”, “they were”, “we are” or “we were”.',
    handbook: 'Chapter 11 — Grammar',
  },
  {
    id: 'common-plural-verb', regex: /\b(?:institutions|services|citizens|policies|countries|cities|communities|rules|systems|students|workers|resources|technologies|benefits)\s+(?:is|was|has)\b/giu,
    group: 'grammar', label: 'Plural subject and singular verb',
    explanation: 'This plural noun is followed by a singular verb.',
    advice: 'Check whether “are”, “were” or “have” fits the tense and meaning.',
    handbook: 'Chapter 11 — Grammar',
  },
  {
    id: 'it-plural', regex: /\bit\s+(?:are|have)\b/giu,
    group: 'grammar', label: 'Singular pronoun and plural verb',
    explanation: 'The singular pronoun “it” normally takes a singular verb.',
    advice: 'Use “it is”, “it was” or “it has”, as appropriate to the sentence.',
    handbook: 'Chapter 11 — Grammar',
  },
  {
    id: 'he-have', regex: /\b(?:he|she|it)\s+have\b/giu,
    group: 'grammar', label: 'Subject–verb agreement',
    explanation: 'A singular third-person subject normally takes “has” in the present tense.',
    advice: 'Change “have” to “has” where it is the main present-tense verb.',
    handbook: 'Chapter 11 — Grammar',
  },
  {
    id: 'doesnt-base', regex: /\b(?:does|doesn't|doesn’t)\s+(?:not\s+)?(?:goes|makes|creates|improves|depends|requires|helps)\b/giu,
    group: 'grammar', label: 'Verb form after “does”',
    explanation: 'After “does”, the main verb takes its base form.',
    advice: 'Use “does not go”, “does not improve”, “does not depend”, etc.',
    handbook: 'Chapter 11 — Grammar',
  },
  {
    id: 'modal-verb', regex: /\b(?:can|could|may|might|must|should|will|would)\s+(?:goes|makes|creates|improves|depends|requires|helps)\b/giu,
    group: 'grammar', label: 'Verb form after a modal',
    explanation: 'A modal verb is followed by the base form of the next verb.',
    advice: 'Use “may improve”, “can create”, “must depend”, etc.',
    handbook: 'Chapter 11 — Grammar',
  },
  {
    id: 'a-vowel', regex: /\ba\s+(?:important|interesting|effective|economic|ethical|unusual|urgent|honest|hour)\b/giu,
    group: 'grammar', label: 'Article choice',
    explanation: 'The following word begins with a vowel sound.',
    advice: 'Review whether “an” is the appropriate article here.',
    handbook: 'Chapter 11 — Grammar', certainty: 'review',
  },
  {
    id: 'an-consonant', regex: /\ban\s+(?:university|useful|unique|European|one|united|user)\b/giu,
    group: 'grammar', label: 'Article choice',
    explanation: 'The following word begins with a consonant sound.',
    advice: 'Use “a” before this word.',
    handbook: 'Chapter 11 — Grammar',
  },
  {
    id: 'discuss-about', regex: /\bdiscuss(?:ed|es|ing)?\s+about\b/giu,
    group: 'grammar', label: 'Unnecessary preposition',
    explanation: '“Discuss” normally takes its object without “about”.',
    advice: 'Use “discuss the issue” instead of “discuss about the issue”.',
    handbook: 'Chapter 11 — Grammar',
  },
  {
    id: 'despite-of', regex: /\bdespite\s+of\b/giu,
    group: 'grammar', label: 'Incorrect construction',
    explanation: '“Despite” does not ordinarily take “of”.',
    advice: 'Write “despite the problem” or “in spite of the problem”.',
    handbook: 'Chapter 11 — Grammar',
  },
  {
    id: 'more-better', regex: /\b(?:more\s+better|most\s+best|more\s+worse|more\s+easier)\b/giu,
    group: 'grammar', label: 'Double comparison',
    explanation: 'The adjective already contains a comparative or superlative form.',
    advice: 'Use “better”, “best”, “worse” or “easier” alone.',
    handbook: 'Chapter 11 — Grammar',
  },
  {
    id: 'can-able', regex: /\bcan\s+(?:be\s+)?able\s+to\b/giu,
    group: 'expression', label: 'Unnecessary wording',
    explanation: '“Can” and “be able to” commonly duplicate the same meaning.',
    advice: 'Use either “can” or “is able to”, depending on the sentence.',
    handbook: 'Chapter 7 — Conceptual compression; Chapter 13 — Length control',
    certainty: 'review',
  },
  {
    id: 'in-order-to', regex: /\bin\s+order\s+to\b/giu,
    group: 'expression', label: 'Possible compression',
    explanation: 'The phrase is often longer than necessary.',
    advice: 'Consider replacing it with “to” if the meaning remains unchanged.',
    handbook: 'Chapter 7 — Conceptual compression',
    certainty: 'review',
  },
  {
    id: 'due-to-the-fact', regex: /\bdue\s+to\s+the\s+fact\s+that\b/giu,
    group: 'expression', label: 'Wordy expression',
    explanation: 'This expression may be shortened without losing the causal link.',
    advice: 'Consider “because”, and verify that the cause remains accurate.',
    handbook: 'Chapter 7 — Conceptual compression; Chapter 9 — Preserving logic',
    certainty: 'review',
  },
  {
    id: 'although-but', regex: /\balthough\b[^.!?]{0,150}\bbut\b/giu,
    group: 'grammar', label: 'Check double contrast',
    explanation: '“Although ... but ...” often duplicates the contrast construction.',
    advice: 'Try “Although X, Y” or “X, but Y”. Retain the contrast.',
    handbook: 'Chapter 9 — Preserving logic; Chapter 11 — Grammar',
    certainty: 'review',
  },
  {
    id: 'really-very', regex: /\b(?:very\s+very|really\s+really)\b/giu,
    group: 'expression', label: 'Repeated intensifier',
    explanation: 'Repetition adds length without adding much meaning.',
    advice: 'Replace it with a precise description or remove the redundant word.',
    handbook: 'Chapter 7 — Conceptual compression',
    certainty: 'review',
  },
]
const commonlyMisspelled: Record<string, string> = {
  recieve:'receive', recieved:'received', seperate:'separate', definately:'definitely',
  goverment:'government', enviroment:'environment', becuase:'because',
  accomodate:'accommodate', occurance:'occurrence', occurence:'occurrence',
  independant:'independent', responsability:'responsibility', arguement:'argument',
  beleive:'believe', wich:'which', teh:'the', thier:'their',
  neccessary:'necessary', sucessful:'successful', commitee:'committee',
  comparision:'comparison', maintanance:'maintenance', priviledge:'privilege',
  consistant:'consistent', influance:'influence', oppertunity:'opportunity',
}
const wordPattern = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu
const stopWords = new Set(['the','and','for','but','with','that','from','this','those','their','there','when','which','only','into','they','have','does','often','about','also','than','then','them','while','where','will','more','were','such','upon','through','because'])
function tokens(text: string): string[] {
  return (text.toLowerCase().match(wordPattern) || []).map((w) => w.replace(/[’]/g, "'"))
}
function excerptNear(text: string, match: RegExpMatchArray, padding = 40): string {
  const at = match.index || 0
  return text.slice(Math.max(0, at - padding), Math.min(text.length, at + match[0].length + padding)).trim()
}
function firstSentence(text: string, expression: RegExp): string {
  const match = expression.exec(text)
  if (!match) return ''
  const at = match.index
  const before = Math.max(0, text.lastIndexOf('.', at - 1) + 1)
  const next = text.slice(at).search(/[.!?](?:\s|$)/u)
  return text.slice(before, next === -1 ? Math.min(text.length, at + 180) : at + next + 1).trim().slice(0, 220)
}

export function analyzePrecisWriting({ original, draft, title, limit }: AnalyzeInput): WritingAnalysis {
  const sourceWords = wordCount(original)
  const draftWords = wordCount(draft)
  const findings: WritingFinding[] = []
  const add = (entry: WritingFinding) => {
    if (!findings.some((f) => f.id === entry.id && f.start === entry.start))
      findings.push(entry)
  }

  if (!draft.trim()) {
    add({
      id: 'empty-draft', group: 'structure', certainty: 'detected',
      label: 'Précis text is missing', excerpt: '',
      explanation: 'There is no written text to check.',
      advice: 'Write your précis first, then run the analysis.',
      handbook: 'Chapter 14 — Complete writing method',
    })
    return {
      sourceWords, draftWords, ratio: 0, findings, checkedAt: 'on request',
      scope: 'Local, rule-based checks; no external service or semantic marking.',
    }
  }

  for (const rule of languageRules) {
    let count = 0
    for (const match of draft.matchAll(rule.regex)) {
      // Base-form subjunctives are valid after mandative clauses; this selective
      // checker must not turn them into confident agreement corrections.
      if (rule.id === 'he-have' || rule.id === 'it-plural' && /have$/iu.test(match[0])) {
        const prefix = draft.slice(0, match.index).split(/[.!?]/u).at(-1) || ''
        if (/\b(?:that|lest|if)\s*$/iu.test(prefix) || /\b(?:essential|necessary|important|vital|imperative|crucial|recommend\w*|suggest\w*|demand\w*|insist\w*|request\w*|require\w*)\b/iu.test(prefix)) continue
      }
      if (++count > 3) break
      add({
        id: rule.id, group: rule.group,
        certainty: rule.certainty || 'detected', label: rule.label,
        excerpt: match[0],
        explanation: rule.explanation, advice: rule.advice,
        start: match.index ?? 0, end: (match.index ?? 0) + match[0].length, handbook: rule.handbook,
      })
    }
  }

  // Selective spelling suggestions, not a complete dictionary or a proofreader.
  let spellingHits = 0
  for (const match of draft.matchAll(wordPattern)) {
    const suggested = commonlyMisspelled[match[0].toLowerCase()]
    if (!suggested) continue
    add({
      id:'spelling-' + match[0].toLowerCase(), group:'grammar', certainty:'review',
      label:'Possible spelling mistake', excerpt:match[0],
      explanation:'This looks like a common misspelling.',
      advice:'Check whether “' + suggested + '” is the word you intend.',
      start:match.index ?? 0, end:(match.index ?? 0) + match[0].length,
      handbook:'Chapter 11 — Grammar and spelling',
    })
    if (++spellingHits >= 8) break
  }

  const punctuationRules: PatternRule[] = [
    {
      id:'space-before-punctuation', regex:/[ \t]+[,;:.!?]/gu, group:'punctuation',
      label:'Space before punctuation', explanation:'Punctuation normally follows the preceding word directly.',
      advice:'Remove the space before the punctuation mark.', handbook:'Chapter 11 — Grammar',
    },
    {
      id:'double-space', regex:/[^\s][ \t]{2,}[^\s]/gu, group:'punctuation',
      label:'Extra spacing', explanation:'There are repeated spaces within this sentence.',
      advice:'Use a single space between words.', handbook:'Chapter 11 — Grammar',
    },
    {
      id:'missing-space', regex:/[,;:](?=[\p{L}])/gu, group:'punctuation',
      label:'Missing space after punctuation', explanation:'There should normally be a space after this mark.',
      advice:'Insert one space.', handbook:'Chapter 11 — Grammar',
    },
    {
      id:'missing-space-period', regex:/[.!?](?=[A-Z][a-z])/gu, group:'punctuation',
      label:'Missing space between sentences', explanation:'Two sentences appear to run together.',
      advice:'Insert a space after the sentence-ending mark.', handbook:'Chapter 11 — Grammar',
      certainty:'review',
    },
  ]
  for (const rule of punctuationRules) {
    for (const match of [...draft.matchAll(rule.regex)].slice(0,3)) {
      add({
        id:rule.id, group:rule.group, certainty:rule.certainty || 'detected',
        label:rule.label, excerpt:excerptNear(draft,match,12), explanation:rule.explanation,
        advice:rule.advice, start:match.index ?? 0, end:(match.index ?? 0) + match[0].length,
        handbook:rule.handbook,
      })
    }
  }
  const trimmed = draft.trim()
  if (trimmed && !/[.!?]["'’”)]*$/u.test(trimmed)) {
    add({
      id:'end-punctuation', group:'punctuation', certainty:'review',
      label:'Sentence-ending punctuation', excerpt:trimmed.slice(-75),
      explanation:'The final sentence appears to lack closing punctuation.',
      advice:'Check whether the last sentence needs a full stop.',
      handbook:'Chapter 11 — Grammar',
    })
  }
  if (/^[a-z]/u.test(trimmed)) {
    add({
      id:'opening-capital', group:'punctuation', certainty:'review',
      label:'Opening capitalization', excerpt:trimmed.slice(0,75),
      explanation:'The draft begins with a lowercase letter.',
      advice:'Check whether the first word should begin with a capital letter.',
      handbook:'Chapter 11 — Grammar',
    })
  }
  if ((draft.match(/\(/gu) || []).length !== (draft.match(/\)/gu) || []).length) {
    add({
      id:'brackets', group:'punctuation', certainty:'detected',
      label:'Unmatched parentheses', excerpt:trimmed.slice(0,100),
      explanation:'Opening and closing parentheses do not match in number.',
      advice:'Find the unmatched parenthesis and correct it.',
      handbook:'Chapter 11 — Grammar',
    })
  }

  const sentences = draft
    .split(/(?<=[.!?])\s+(?=[\p{Lu}"“])/u)
    .map((x) => x.trim()).filter(Boolean)
  for (const [index, sentence] of sentences.entries()) {
    if (wordCount(sentence) > 42) add({
      id:'long-sentence-' + index, group:'structure', certainty:'review',
      label:'Long sentence', excerpt:sentence.slice(0,190),
      explanation:'A sentence of ' + wordCount(sentence) + ' words may hide several ideas or relationships.',
      advice:'Check whether it can be simplified without breaking cause, contrast or qualification.',
      handbook:'Chapter 10 — Coherence; Chapter 13 — Length control',
    })
  }
  if (/\n\s*\n/u.test(draft)) {
    add({
      id:'multiple-paragraphs', group:'structure', certainty:'review',
      label:'Précis paragraph structure', excerpt:'Multiple paragraphs',
      explanation:'A standard précis is usually written as a connected paragraph.',
      advice:'Check the question instructions, then consider combining these paragraphs into one coherent account.',
      handbook:'Chapter 10 — Building coherence',
    })
  }
  if (limit !== null && Number.isFinite(limit) && draftWords > limit) {
    add({
      id:'explicit-length', group:'length', certainty:'detected',
      label:'Over the stated word limit', excerpt:draftWords + ' words',
      explanation:'The question allows ' + limit + ' words, but the draft contains ' + draftWords + '.',
      advice:'Remove ' + (draftWords - limit) + ' words, preserving the argument and necessary qualifications.',
      handbook:'Chapter 13 — Word count and compression',
    })
  } else if (limit === null && sourceWords >= 35 && draftWords > Math.ceil(sourceWords * 0.8)) {
    add({
      id:'length-review', group:'length', certainty:'review',
      label:'Compression needs another look', excerpt:draftWords + ' of ' + sourceWords + ' source words',
      explanation:'The draft keeps more than four-fifths of the original. One-third is a learning convention, not an automatic official limit.',
      advice:'Look for repeated examples and clauses to combine without losing essential meaning.',
      handbook:'Chapter 7 — Compression; Chapter 13 — Word count',
    })
  }

  const sourceTokens = tokens(original)
  const draftTokens = tokens(draft)
  if (sourceTokens.length >= 8 && draftTokens.length >= 8) {
    const grams = new Set<string>()
    for (let i = 0; i <= sourceTokens.length - 8; i++)
      grams.add(sourceTokens.slice(i,i+8).join(' '))
    for (let i=0; i <= draftTokens.length-8; i++) {
      const chunk = draftTokens.slice(i,i+8).join(' ')
      if (grams.has(chunk)) {
        add({
          id:'source-copy', group:'source', certainty:'review',
          label:'Long wording repeated from the passage', excerpt:chunk,
          explanation:'Eight consecutive words also appear in the original passage. Technical wording may sometimes need to remain unchanged.',
          advice:'Rebuild this part in your own words while keeping the same meaning and relationships.',
          handbook:'Chapter 8 — Paraphrasing without distortion',
        })
        break
      }
    }
  }

  const sourceLower = original.toLowerCase()
  const draftLower = draft.toLowerCase()
  const contrastSource = sourceLower.replace(/\bnot only\b[^.!?]{0,150}\bbut also\b/giu, ' ')
  const sourceContrast = /\b(?:but|however|yet|although|whereas|nevertheless)\b/iu.test(contrastSource)
  const hasContrast = /\b(?:but|however|yet|although|whereas|nevertheless|despite|while|rather than|instead of|without)\b/iu.test(draftLower)
  if (sourceContrast && !hasContrast) {
    add({
      id:'contrast-review', group:'source', certainty:'review',
      label:'Check the writer’s contrast',
      excerpt:firstSentence(original, /\b(?:but|however|yet|although|whereas)\b/iu),
      explanation:'The source contains an explicit contrast, but no common contrasting expression was found in the draft. A contrast can also be preserved without a linking word.',
      advice:'Compare the two sides of the argument and ensure neither has been lost.',
      handbook:'Chapter 9 — Preserving logic',
    })
  }
  const sourceConditions = /\b(?:only when|only if|provided that|depends on|conditional on|as long as)\b/iu.test(sourceLower)
  const draftConditions = /\b(?:only when|only if|provided that|depends on|dependent on|requires?|as long as|unless|conditional|necessary for|when)\b/iu.test(draftLower)
  if (sourceConditions && !draftConditions) add({
    id:'condition-review', group:'source', certainty:'review',
    label:'Check the original condition',
    excerpt:firstSentence(original, /\b(?:only when|only if|provided that|depends on|as long as)\b/iu),
    explanation:'The source contains a limiting condition. No common expression of that condition was detected in your draft.',
    advice:'Check that your précis does not turn a conditional claim into an unconditional one.',
    handbook:'Chapter 9 — Preserving logic and qualifications',
  })
  const sourceUncertainty = /\b(?:can|could|may|might|often|sometimes|possible|potential)\b/iu.test(sourceLower)
  const sourceAbsolutes = new Set(tokens(original).filter((t)=>['always','never','every','all','guarantees','inevitably','certainly'].includes(t)))
  const draftAbsolutes = new Set(tokens(draft).filter((t)=>['always','never','every','all','guarantees','inevitably','certainly'].includes(t)))
  const unshared = [...draftAbsolutes].filter((w)=>!sourceAbsolutes.has(w))
  if (sourceUncertainty && unshared.length) add({
    id:'overstatement-review', group:'source', certainty:'review',
    label:'Possible overstatement', excerpt:unshared.join(', '),
    explanation:'The original contains qualified language, while this draft uses a stronger term not present in the source.',
    advice:'Compare “may/can/often” with your stronger wording and keep the author’s intended level of certainty.',
    handbook:'Chapter 9 — Preserving qualifications',
  })
  const sourceCausal = /\b(?:because|therefore|as a result|leads to|causes?|consequently|hence|thus)\b/iu.test(sourceLower)
  const draftCausal = /\b(?:because|therefore|as a result|leads to|causes?|consequently|hence|thus|produces?|results? in|through|by|depends? on|requires?|reduces?|erodes?|fosters?|undermines?|weakens?)\b/iu.test(draftLower)
  if (sourceCausal && !draftCausal) add({
    id:'causal-review', group:'source', certainty:'review',
    label:'Check the cause-and-effect link',
    excerpt:firstSentence(original, /\b(?:because|therefore|as a result|leads to|causes?|consequently|hence|thus)\b/iu),
    explanation:'The source signals a causal or concluding relationship, but no common causal expression was detected in your draft.',
    advice:'Check whether the explanation still shows what leads to what.',
    handbook:'Chapter 9 — Cause, contrast and conclusion',
  })
  const sourceNumbers = new Set(original.match(/\b\d+(?:\.\d+)?%?\b/gu) || [])
  const otherNumbers = [...new Set(draft.match(/\b\d+(?:\.\d+)?%?\b/gu) || [])].filter((n) => !sourceNumbers.has(n))
  if (otherNumbers.length) add({
    id:'new-numbers', group:'source', certainty:'review',
    label:'Check figures introduced in the draft', excerpt:otherNumbers.join(', '),
    explanation:'These figures were not found in the original passage. They may be rewritten forms, or may be outside additions.',
    advice:'Verify the figures against the original and remove unsupported detail.',
    handbook:'Chapter 3 — Preserve meaning; Chapter 8 — Fidelity',
  })
  const normalizedTitle = title.trim()
  if (!normalizedTitle) add({
    id:'no-title', group:'title', certainty:'detected', label:'Title is missing', excerpt:'',
    explanation:'A précis normally needs a relevant title when the question asks for one.',
    advice:'Add a specific title covering the controlling argument, not merely the topic.',
    handbook:'Chapter 12 — Writing the title',
  })
  else if (wordCount(normalizedTitle) > 12) add({
    id:'long-title', group:'title', certainty:'review', label:'Title may be too long',
    excerpt:normalizedTitle,
    explanation:'The title is ' + wordCount(normalizedTitle) + ' words long.',
    advice:'See if you can express the controlling idea more concisely.',
    handbook:'Chapter 12 — Writing the title',
  })
  else {
    const meaningful = tokens(normalizedTitle).filter((w)=>w.length>3&&!stopWords.has(w))
    const common = new Set(tokens(original))
    if (meaningful.length && meaningful.every((w)=>!common.has(w))) add({
      id:'title-relevance', group:'title', certainty:'review',
      label:'Check that the title fits', excerpt:normalizedTitle,
      explanation:'The title uses different wording from the source. This may be good paraphrasing; lexical difference alone is not an error.',
      advice:'Ask whether it expresses the controlling idea rather than just sounding interesting.',
      handbook:'Chapter 12 — Writing the title',
    })
  }
  return {
    sourceWords, draftWords,
    ratio: sourceWords ? Math.round(draftWords / sourceWords * 100) : 0,
    findings:findings.slice(0,35),
    checkedAt:'on request',
    scope:'Rule-based English writing checks. Grammar rules are selective, not a complete grammar proofreader. Source-related flags are review prompts, not verified semantic judgments or exam marks.',
  }
}
