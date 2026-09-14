import { Link } from 'react-router'
import { PageHeader } from '@/components/shared'
import {
  LEGAL_CENTRE_PAGES,
  LEGAL_PAGES,
  LEGAL_UPDATED,
  RELATED_POLICY_LINKS,
} from '@/data/legalContent.mjs'

/**
 * Policy documents are defined once in `@/data/legalContent.mjs` and rendered
 * both here and into the prerendered HTML, so the page a visitor reads and the
 * page a reviewer or crawler fetches are always the same text.
 *
 * Paragraph values are trusted, author-written markup from that module — never
 * user input — which is why they are injected as HTML.
 */

interface LegalSection {
  heading: string
  id?: string
  paragraphs: string[]
}

interface LegalPage {
  title: string
  description: string
  showRelatedLinks: boolean
  sections: LegalSection[]
}

const pages = LEGAL_PAGES as Record<string, LegalPage>

function RelatedLinks() {
  return (
    <p className="rounded-xl border bg-secondary/35 p-4 text-sm">
      Related policies:{' '}
      {RELATED_POLICY_LINKS.map(([to, label]: readonly [string, string], index: number) => (
        <span key={to}>
          {index > 0 && ' · '}
          <Link className="font-semibold text-pine underline" to={to}>{label}</Link>
        </span>
      ))}
    </p>
  )
}

function LegalDocument({ path }: { path: string }) {
  const page = pages[path]
  if (!page) return null

  return (
    <div>
      <PageHeader title={page.title} description={page.description} />
      <article className="mx-auto max-w-4xl space-y-8 px-4 py-8 text-[15px] leading-7 text-foreground/85 sm:py-10">
        {page.showRelatedLinks && <RelatedLinks />}
        {page.sections.map((section) => (
          <section key={section.heading} id={section.id}>
            <h2 className="font-display text-2xl font-bold text-pine">{section.heading}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className={index === 0 ? 'mt-2' : 'mt-3'}
                dangerouslySetInnerHTML={{ __html: paragraph }}
              />
            ))}
          </section>
        ))}
        <p className="border-t pt-5 text-xs text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>
      </article>
    </div>
  )
}

export function PrivacyPolicy() {
  return <LegalDocument path="/privacy-policy" />
}

export function CookiePolicy() {
  return <LegalDocument path="/cookie-policy" />
}

export function TermsConditions() {
  return <LegalDocument path="/terms-and-conditions" />
}

export function Disclaimer() {
  return <LegalDocument path="/disclaimer" />
}

export function CopyrightPolicy() {
  return <LegalDocument path="/copyright" />
}

export function AboutCssVista() {
  return <LegalDocument path="/about" />
}

export function ContactCssVista() {
  return <LegalDocument path="/contact" />
}

export function EditorialPolicy() {
  return <LegalDocument path="/editorial-policy" />
}

export function LegalCentre() {
  return (
    <div>
      <PageHeader
        title="Legal & Trust Centre"
        description="CSS Vista's privacy, cookie, terms, copyright, editorial, identity and contact information."
      />
      <article className="mx-auto max-w-4xl space-y-8 px-4 py-8 text-[15px] leading-7 text-foreground/85 sm:py-10">
        <div className="grid gap-3 sm:grid-cols-2">
          {LEGAL_CENTRE_PAGES.map(([to, label]: readonly [string, string]) => (
            <Link key={to} to={to} className="rounded-xl border bg-white p-4 font-semibold text-pine shadow-sm hover:bg-secondary">
              {label}
            </Link>
          ))}
        </div>
        <p className="border-t pt-5 text-xs text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>
      </article>
    </div>
  )
}
