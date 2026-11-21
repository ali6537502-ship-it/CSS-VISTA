import syllabus from './bundled/css-vista-syllabus.json'

export interface CssOptionalSection { title: string; items: string[] }
export interface CssOptionalPaper {
  slug: string
  name: string
  designation: 'optional'
  group: number
  marks: number
  sections: CssOptionalSection[]
  pages?: number[]
  scanPages?: string[]
}

const catalogue = syllabus as {
  source: { title: string; publisher: string; updated: string; url: string }
  subjects: CssOptionalPaper[]
}

export const cssVistaSource = catalogue.source
export const cssVistaOptionals = catalogue.subjects

export function findCssVistaOptional(slug: string | undefined): CssOptionalPaper | undefined {
  return cssVistaOptionals.find(paper => paper.slug === slug)
}

export function cssVistaSearchMatches(paper: CssOptionalPaper, search: string): boolean {
  const term = search.trim().toLocaleLowerCase()
  return !term || paper.name.toLocaleLowerCase().includes(term)
    || paper.sections.some(section => section.title.toLocaleLowerCase().includes(term)
      || section.items.some(item => item.toLocaleLowerCase().includes(term)))
}

export function cssVistaSourceEntryCount(paper: CssOptionalPaper): number {
  return paper.sections.reduce((total, section) => total + section.items.filter(Boolean).length, 0)
}
