import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day21: GrammarDay = {
  day: 21,
  ...stageOf(21),
  title: 'Punctuation',
  whatYouWillLearn:
    'You will learn the everyday rules for commas, semicolons, colons, dashes, apostrophes, quotation marks, and capitalisation, so your writing is easier for a reader to follow.',
  simpleExplanation: [
    'Punctuation marks are signals for the reader. They tell the reader when to pause briefly, when a sentence is finished, when a list is about to start, and when a word shows ownership. Without them, a reader has to guess where one idea ends and the next begins.',
    'You already know some of these marks by instinct — a full stop at the end of a sentence, a question mark after a question. This lesson focuses on the marks that cause the most genuine confusion: the comma, the semicolon, the colon, the dash, and the apostrophe, along with quotation marks and capital letters.',
    'None of these marks are difficult once you know the one or two jobs each one does. The goal today is not to memorise abstract definitions, but to recognise, in a real sentence, which mark is doing which job.',
  ],
  rules: [
    {
      rule: 'Use a comma after an introductory word, phrase, or clause.',
      explanation: 'When something comes before the main part of the sentence — a time phrase, a linking word, or a short clause — a comma usually separates it from the main clause that follows.',
      correct: 'After finishing her homework, Sara went out to play.',
      wrong: 'After finishing her homework Sara went out to play.',
      correction: 'The introductory phrase “After finishing her homework” needs a comma before the main clause begins.',
    },
    {
      rule: 'Use commas to separate items in a list of three or more.',
      explanation: 'Each item in the list is separated by a comma, and a conjunction such as “and” or “or” usually appears before the final item.',
      correct: 'The shop sells rice, flour, sugar, and oil.',
    },
    {
      rule: 'Use a comma before a coordinating conjunction (such as and, but, so, or) that joins two independent clauses.',
      explanation: 'When each side of the conjunction could stand alone as a complete sentence, a comma is placed before the conjunction that joins them.',
      correct: 'Ali wanted to rest, but he still had homework to finish.',
      wrong: 'Ali wanted to rest but he still had homework to finish.',
      correction: 'Because both sides are independent clauses, a comma belongs before “but”.',
    },
    {
      rule: 'Use a pair of commas around information that could be removed without changing the main meaning of the sentence.',
      explanation: 'If a phrase or clause simply adds extra detail — rather than telling the reader exactly which person or thing is meant — put a comma before and after it.',
      correct: 'My teacher, who has taught here for twenty years, is retiring this month.',
      wrong: 'My teacher who has taught here for twenty years is retiring this month.',
      correction: 'Since there is only one teacher being referred to, the clause is extra information and needs commas around it.',
    },
    {
      rule: 'Use a semicolon to join two closely related independent clauses without a conjunction, or to separate list items that already contain commas.',
      explanation: 'A semicolon shows the two ideas are closely connected, more so than a full stop would suggest, but each side must still be a complete clause on its own.',
      correct: 'Sara finished her project early; she then helped her brother with his homework.',
    },
    {
      rule: 'Use a colon to introduce a list, an explanation, or a quotation, after a clause that could stand alone as a complete sentence.',
      explanation: 'What comes before the colon must be a complete idea; what follows explains or lists what was just announced.',
      correct: 'The recipe needs four ingredients: flour, sugar, butter, and eggs.',
    },
    {
      rule: 'Use a dash to set off an emphatic aside, or to introduce a list, with a more informal, conversational feel than a comma or colon.',
      explanation: 'A dash (or a pair of dashes) draws extra attention to the information it surrounds, similar to how a speaker might pause for effect.',
      correct: 'The whole family — Sara, Ali, and their parents — travelled together for the wedding.',
    },
    {
      rule: 'Use an apostrophe to show possession, and use it correctly in contractions.',
      explanation: 'For a singular owner, add ’s (the student’s book). For a plural noun that already ends in -s, add only an apostrophe (the students’ books). In contractions, the apostrophe marks a missing letter: it’s means “it is”, while its (no apostrophe) shows possession.',
      correct: 'The student’s book was left on the desk, but the students’ bags were still in the hall. / It’s raining, so the cat is hiding in its basket.',
      wrong: 'The students books were left in the hall.',
      correction: 'A plural possessive still needs an apostrophe: “students’ books”, not “students books”.',
    },
    {
      rule: 'Use quotation marks for a person’s exact words, and capitalise proper nouns and specific official titles, but not general common nouns.',
      explanation: 'Quotation marks show exactly what someone said or wrote. Capital letters mark specific named people, places, and titles used with a name; ordinary words like government, president, or university are not capitalised unless they form part of an official name.',
      correct: 'Sara said, “I will finish the report by Friday.” / The Prime Minister visited Multan last week, though the government has not yet commented.',
    },
  ],
  easyExamples: [
    'Ali bought bread, milk, and eggs.',
    'After the class, the students went home.',
    'It’s a lovely day, isn’t it?',
    'My sister’s phone is new.',
  ],
  practicalExamples: [
    'The manager reviewed the file; she then forwarded it to the director.',
    'The form requires three documents: an ID card, a photograph, and a recent utility bill.',
    'The shop owner, who has run the business for a decade, plans to retire soon.',
  ],
  examExamples: [
    'The report identified three concerns: rising costs, delayed shipments, and poor communication.',
    'The proposal — though still incomplete in places — was submitted before the deadline.',
  ],
  commonMistakes: [
    {
      wrong: 'My brother, who lives in Karachi is a doctor.',
      right: 'My brother, who lives in Karachi, is a doctor.',
      why: 'Non-essential information needs a comma on both sides, not just before it.',
    },
    {
      wrong: 'Its a good idea to double-check your work.',
      right: 'It’s a good idea to double-check your work.',
      why: '“It’s” is the contraction of “it is”; “its” without an apostrophe shows possession instead.',
    },
    {
      wrong: 'The teachers office is upstairs.',
      right: 'The teacher’s office is upstairs.',
      why: 'A singular owner needs an apostrophe before the s to show possession.',
    },
    {
      wrong: 'I bought pens pencils and erasers.',
      right: 'I bought pens, pencils, and erasers.',
      why: 'Items in a list need a comma between them so the reader can tell them apart.',
    },
    {
      wrong: 'She was tired she still finished the race.',
      right: 'She was tired, but she still finished the race.',
      why: 'Two independent clauses need a proper connector — a comma with a conjunction, a semicolon, or a full stop — not just a space between them.',
    },
    {
      wrong: 'the prime minister visited the city last week.',
      right: 'The Prime Minister visited the city last week.',
      why: 'The first word of a sentence is always capitalised, and an official title used in place of a name is capitalised too.',
    },
  ],
  memoryTip:
    'Think of each mark as a different kind of pause: a comma is a short breath, a semicolon is a pause that still feels connected to what came before, a colon says “here it comes”, and a dash is like a spoken aside. If you are unsure about a semicolon, check that both sides could stand alone as complete sentences.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'In “After the meeting, we went home,” what job is the comma doing?',
      answer: 'Separating an introductory phrase from the main clause',
      reason: '“After the meeting” comes before the main clause and is followed by a comma.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “The shop sells rice, flour, and sugar,” what job are the commas doing?',
      answer: 'Separating items in a list',
      reason: 'Each item in the list is separated by a comma.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “The recipe needs three things: flour, sugar, and butter,” what job is the colon doing?',
      answer: 'Introducing a list',
      reason: 'The colon follows a complete clause and introduces the list that explains it.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'Sara finished her work early____ she then helped her friend with hers. (use a semicolon)',
      answer: 'Sara finished her work early; she then helped her friend with hers.',
      reason: 'A semicolon can join two closely related independent clauses without a conjunction.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'The ____ (student’s / students) bag was found near the gate. (one student)',
      answer: 'student’s',
      reason: 'A singular owner takes an apostrophe before the s.',
    },
    {
      stage: 'Choose the correct form',
      prompt: '(Its / It’s) raining outside, so bring an umbrella.',
      answer: 'It’s',
      reason: '“It’s” is the contraction of “it is”.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'The dog is guarding (it’s / its) food bowl.',
      answer: 'its',
      reason: 'This shows possession, so no apostrophe is used.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'My uncle, (who lives abroad / who lives abroad,) sent us a letter.',
      answer: 'who lives abroad,',
      reason: 'The extra information needs a comma after it, matching the comma already placed before it.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'I bought pens pencils and a notebook.',
      answer: 'I bought pens, pencils, and a notebook.',
      reason: 'Commas are needed between the items in the list.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The manager, who arrived late missed the first announcement.',
      answer: 'The manager, who arrived late, missed the first announcement.',
      reason: 'Non-essential information needs a comma on both sides.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The students books were left on the bus.',
      answer: 'The students’ books were left on the bus.',
      reason: 'A plural noun ending in -s takes only an apostrophe to show possession.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The committee reviewed three proposals cost, timeline, and feasibility.',
      answer: 'The committee reviewed three proposals: cost, timeline, and feasibility.',
      reason: 'A colon is needed after the complete clause to introduce the list that follows.',
    },
    {
      stage: 'Exam-style',
      prompt: 'the report was submitted before the deadline, despite several delays.',
      answer: 'The report was submitted before the deadline, despite several delays.',
      reason: 'The first word of a sentence must always begin with a capital letter.',
    },
  ],
  quiz: [
    {
      question: 'Which sentence correctly punctuates an introductory phrase?',
      options: ['After the storm the town was flooded.', 'After the storm, the town was flooded.', 'After, the storm the town was flooded.', 'After the storm; the town was flooded.'],
      correct: 1,
      explanation: 'A comma separates the introductory phrase from the main clause.',
    },
    {
      question: 'Which sentence correctly separates items in a list?',
      options: ['She bought apples bananas and bread.', 'She bought apples, bananas and, bread.', 'She bought apples, bananas, and bread.', 'She bought apples; bananas; and bread.'],
      correct: 2,
      explanation: 'Commas separate each item in the list.',
    },
    {
      question: 'Which sentence correctly uses a comma before a coordinating conjunction?',
      options: ['She was tired but she kept working.', 'She was tired, but she kept working.', 'She was tired, but, she kept working.', 'She was tired but, she kept working.'],
      correct: 1,
      explanation: 'A comma is placed before “but” because it joins two independent clauses.',
    },
    {
      question: 'Which sentence correctly punctuates non-essential information?',
      options: ['My father who is a teacher works at that school.', 'My father, who is a teacher, works at that school.', 'My father, who is a teacher works at that school.', 'My father who is a teacher, works at that school.'],
      correct: 1,
      explanation: 'The extra information needs a comma both before and after it.',
    },
    {
      question: 'Which sentence correctly uses a semicolon?',
      options: ['She was late; because the bus broke down.', 'She was late, she still arrived before the meeting started; and gave her report.', 'She missed the bus; she still arrived on time.', 'She missed the bus, she still arrived on time;'],
      correct: 2,
      explanation: 'A semicolon correctly joins two independent clauses without a conjunction.',
    },
    {
      question: 'Which sentence correctly uses a colon?',
      options: ['The bag contained: a book, a pen, and a wallet.', 'The bag contained a book, a pen, and a wallet.', 'The bag contained the following items: a book, a pen, and a wallet.', 'The bag contained; a book, a pen, and a wallet.'],
      correct: 2,
      explanation: 'A colon follows a complete clause and introduces the list that explains it.',
    },
    {
      question: 'Which sentence correctly uses a possessive apostrophe for one owner?',
      options: ['The teachers desk was cluttered.', 'The teacher’s desk was cluttered.', 'The teachers’ desk was cluttered.', 'The teacher desk’s was cluttered.'],
      correct: 1,
      explanation: 'A singular owner takes an apostrophe before the s.',
    },
    {
      question: 'Which sentence correctly uses “it’s”?',
      options: ['The dog wagged it’s tail.', 'It’s a beautiful morning.', 'The cat licked it’s paw.', 'The company changed it’s policy.'],
      correct: 1,
      explanation: '“It’s” is the contraction of “it is”, correctly used here.',
    },
    {
      question: 'Which sentence uses a dash correctly to set off extra emphasis?',
      options: ['The whole team, Sara, Ali, and Bilal, arrived early.', 'The whole team — Sara, Ali, and Bilal — arrived early.', 'The whole team: Sara, Ali, and Bilal — arrived early.', 'The whole team; Sara, Ali, and Bilal; arrived early.'],
      correct: 1,
      explanation: 'A pair of dashes sets off the extra list with more emphasis than commas.',
    },
    {
      question: 'Which sentence uses capitalisation correctly?',
      options: ['the Prime Minister visited the city.', 'The prime Minister visited the city.', 'The Prime Minister visited the city.', 'The Prime minister visited the City.'],
      correct: 2,
      explanation: 'The first word of the sentence and the official title used with the office are both capitalised.',
    },
    {
      question: 'Which sentence does NOT need capitalisation on the underlined word (“government”)?',
      options: [
        'The government announced new regulations yesterday.',
        'The Government of Pakistan announced new regulations yesterday.',
        'Government Officials announced new regulations yesterday.',
        'The government of the city announced new Regulations.',
      ],
      correct: 0,
      explanation: '“Government” used as a general common noun is not capitalised, unlike an official name such as “Government of Pakistan”.',
    },
    {
      question: 'Which sentence correctly punctuates a quotation?',
      options: ['Sara said I will be there by five.', 'Sara said, “I will be there by five.”', 'Sara said: I will be there by five.', 'Sara said “I will be there by five”.'],
      correct: 1,
      explanation: 'A comma introduces the direct quotation, which is placed inside quotation marks.',
    },
  ],
  quickRevision: [
    'A comma marks a short pause: after an introductory element, between list items, before a conjunction joining two independent clauses, and around non-essential information.',
    'A semicolon joins two closely related independent clauses without a conjunction, or separates list items that already contain commas.',
    'A colon introduces a list, an explanation, or a quotation, after a clause that could stand alone.',
    'A dash sets off an emphatic aside or a list with a more conversational tone than a comma or colon.',
    'An apostrophe shows possession (student’s, students’) and marks missing letters in contractions (it’s = it is).',
    'Quotation marks show a speaker’s exact words.',
    'Capitalise proper nouns and specific titles used with a name; do not capitalise general common nouns like government or university.',
  ],
}
