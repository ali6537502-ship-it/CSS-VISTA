export interface LegalSection {
  heading: string
  id?: string
  paragraphs: string[]
}
export interface LegalPage {
  title: string
  description: string
  showRelatedLinks: boolean
  sections: LegalSection[]
}
export const LEGAL_UPDATED: string
export const RELATED_POLICY_LINKS: readonly (readonly [string, string])[]
export const LEGAL_PAGES: Record<string, LegalPage>
export const LEGAL_CENTRE_PAGES: readonly (readonly [string, string])[]
export function renderLegalPageHtml(path: string): string
