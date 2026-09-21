import { Link } from 'react-router'
import { ArrowRight, BookMarked, LibraryBig, ListTree } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { optionalSubjectTotal, optionalTopicTotal, optionalWordTotal } from '@/data/optionalNotes'
import { islamicChapters, islamicReferenceTotal, islamicTopicTotal } from '@/data/islamicReferences'
import { essayThemeIndex, totalCheckpoints } from '@/data/essayThemes'

/**
 * The entry point to CSS Vista's study material.
 *
 * Every figure here is read from the published data rather than written into
 * the page, so the hub cannot drift out of step with what is actually online.
 */
export default function StudyMaterial() {
  const sections = [
    {
      to: '/study-material/optional',
      icon: LibraryBig,
      title: 'Optional Subject Notes',
      stat: `${optionalSubjectTotal()} subjects · ${optionalTopicTotal()} topics`,
      body: `Topic-wise notes for the CSS optional papers across all seven FPSC groups — around ${Math.round(optionalWordTotal() / 1000)},000 words. Pick your group, then your subject, then today's topic.`,
      cta: 'Browse by group and subject',
    },
    {
      to: '/study-material/islamic-studies',
      icon: BookMarked,
      title: 'Islamic Studies Reference Bank',
      stat: `${islamicChapters().length} chapters · ${islamicReferenceTotal().toLocaleString()} references`,
      body: `Source-checked references for all seven Islamic Studies chapters, organised into ${islamicTopicTotal()} topics. Each entry carries its Arabic source passage with English and Urdu side by side.`,
      cta: 'Open the reference bank',
    },
    {
      to: '/study-material/essay-themes',
      icon: ListTree,
      title: 'Essay Themes 2027 Roadmap',
      stat: `${essayThemeIndex().length} themes · ${totalCheckpoints().toLocaleString()} research directions`,
      body: 'A research companion for the essay paper: each theme broken into thirteen stages, from concepts and origins to Pakistan evidence, counterarguments and title banks. Tick each direction as you finish it.',
      cta: 'Start a theme (sign-in required)',
    },
  ]

  return (
    <div>
      <PageHeader
        title="CSS Study Material"
        description="Everything CSS Vista publishes for studying a paper in depth: topic-wise optional subject notes, the bilingual Islamic Studies reference bank, and the essay theme research roadmap."
      />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-3.5 lg:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.to}
              to={section.to}
              className="group flex flex-col rounded-xl border bg-white p-5 transition-colors hover:border-emerald-700/50 hover:bg-emerald-50/30"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
                <section.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-lg font-bold leading-snug text-pine group-hover:underline underline-offset-2">
                {section.title}
              </h2>
              <p className="mt-1 text-[12px] font-semibold tabular-nums text-muted-foreground">{section.stat}</p>
              <p className="mt-2.5 flex-1 text-[13.5px] leading-relaxed text-foreground/85">{section.body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-800">
                {section.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-7 rounded-xl border bg-white p-4">
          <h2 className="font-display text-base font-bold text-pine">How this material is prepared</h2>
          <ul className="mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
            <li>· The notes follow the FPSC optional-subject syllabus and are organised by the same groups the <Link to="/subjects/selector" className="font-medium text-emerald-800 hover:underline underline-offset-2">Subject Selection Tool</Link> uses.</li>
            <li>· Islamic Studies entries state their source, translation and verification status. A passage quoted inside a commentary is not automatically a sound Hadith, and scholarly summaries are labelled as such.</li>
            <li>· The essay roadmap gives research directions, not ready-made answers. Verify every statistic, law and quotation against a primary source before using it.</li>
            <li>· Confirm the current syllabus and paper pattern on the official FPSC notice before finalising your subject combination.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
