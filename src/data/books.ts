// Books by Sir Ali Hassan Sargana - free downloads provided by the owner.
export interface Book {
  id: string
  title: string
  subtitle: string
  description: string
  cover: string
  file: string
  pages: number
}

export const books: Book[] = [
  {
    id: 'constitutional-history',
    title: 'Constitutional History of Pakistan',
    subtitle: 'By Ali Hassan Sargana',
    description:
      'A complete, exam-oriented account of Pakistan’s constitutional development - from pre-partition acts to the 1973 Constitution and later amendments - written for CSS and PMS aspirants.',
    cover: '/books/book-constitutional-history.jpg',
    file: '/books/constitutional-history-of-pakistan-ali-hassan-sargana.pdf',
    pages: 102,
  },
  {
    id: 'master-grammar',
    title: 'Master Grammar - 30-Day Course',
    subtitle: 'By Ali Hassan Sargana',
    description:
      'A day-by-day English grammar course built for competitive examinations: parts of speech, tenses, sentence structure, common errors and daily practice exercises.',
    cover: '/books/book-master-grammar.jpg',
    file: '/books/master-grammar-30-day-course.pdf',
    pages: 112,
  },
]

// Opinions by the author - displayed as readable page images (not PDF downloads).
export interface Opinion {
  slug: string
  title: string
  outlet: string
  date: string
  pages: string[]
}

export const opinions: Opinion[] = [
  {
    slug: 'opinion-ali-hassan',
    title: 'When the Pacific Breathes Fire, Pakistan Burns',
    outlet: 'Opinion',
    date: 'April 2026',
    pages: ['/opinions/opinion-ali-hassan-p1.jpg', '/opinions/opinion-ali-hassan-p2.jpg', '/opinions/opinion-ali-hassan-p3.jpg'],
  },
  {
    slug: 'opinion-eid-eve-chaman-phatak',
    title: 'When Eid Turns to Ash - the Chaman Phatak Bombing',
    outlet: 'Opinion',
    date: '2026',
    pages: ['/opinions/opinion-eid-eve-chaman-phatak-p1.jpg', '/opinions/opinion-eid-eve-chaman-phatak-p2.jpg'],
  },
  {
    slug: 'opinion-machines-at-war',
    title: 'Machines at War: The AI Question Nobody in Islamabad Is Asking',
    outlet: 'Dawn - Opinion',
    date: '2026',
    pages: ['/opinions/opinion-machines-at-war-p1.jpg', '/opinions/opinion-machines-at-war-p2.jpg', '/opinions/opinion-machines-at-war-p3.jpg'],
  },
  {
    slug: 'opinion-power-without-peace',
    title: 'Power Without Peace',
    outlet: 'Opinion',
    date: '20 April 2026',
    pages: ['/opinions/opinion-power-without-peace-p1.jpg'],
  },
  {
    slug: 'opinion-the-next-48-hours',
    title: 'The Next 48 Hours - Between Blockade and Bargain',
    outlet: 'Opinion',
    date: '21 April 2026',
    pages: ['/opinions/opinion-the-next-48-hours-p1.jpg'],
  },
  {
    slug: 'opinion-harassers-calculus',
    title: 'Why Harassers Dare - the Harasser’s Calculus',
    outlet: 'Opinion',
    date: '2026',
    pages: ['/opinions/opinion-harassers-calculus-p1.jpg'],
  },
]
