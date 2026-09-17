/**
 * Route -> real page component map used by the production prerender step.
 *
 * Every entry renders the component the visitor actually gets, so the
 * crawler-facing HTML and the hydrated page describe the same resource. A
 * route that is absent here simply has no prerendered primary content, which
 * the route registry then treats as not ready for indexing.
 */
import Home from '@/pages/Home'
import StartCSS from '@/pages/StartCSS'
import CompulsoryList from '@/pages/CompulsoryList'
import SubjectDetail from '@/pages/SubjectDetail'
import OptionalSubjects from '@/pages/OptionalSubjects'
import NotesLibrary from '@/pages/NotesLibrary'
import PastPapers from '@/pages/PastPapers'
import CssSubjectMcqs from '@/pages/CssSubjectMcqs'
import EssayModule from '@/pages/EssayModule'
import MPTPrep from '@/pages/MPTPrep'
import CurrentAffairs from '@/pages/CurrentAffairs'
import PsychViva from '@/pages/PsychViva'
import FpscUpdates from '@/pages/FpscUpdates'
import Mentors from '@/pages/Mentors'
import Services from '@/pages/Services'
import Analysis from '@/pages/Analysis'
import GrammarVocab from '@/pages/GrammarVocab'
import GKWorld from '@/pages/gk/GKWorld'
import OneLinerGK from '@/pages/OneLinerGK'
import LanguageGrammar from '@/pages/LanguageGrammar'
import BookSummaries from '@/pages/BookSummaries'
import HandwrittenNotes from '@/pages/HandwrittenNotes'
import FpscSyllabus from '@/pages/FpscSyllabus'
import CssPastPaperAnalysis from '@/pages/CssPastPaperAnalysis'
import Consultation from '@/pages/Consultation'
import Css2026Result from '@/pages/Css2026Result'
import { BooksPage, OpinionsPage } from '@/pages/Books'
import {
  LegalCentre, PrivacyPolicy, CookiePolicy, TermsConditions, Disclaimer,
  CopyrightPolicy, AboutCssVista, ContactCssVista, EditorialPolicy,
} from '@/pages/LegalTrust'

export interface PrerenderRoute {
  /** The URL that is prerendered. */
  path: string
  /** The router pattern the component is mounted under, so useParams() resolves. */
  pattern: string
  render: () => React.ReactElement
}

const page = (path: string, render: () => React.ReactElement, pattern = path): PrerenderRoute =>
  ({ path, pattern, render })

export const PRERENDER_ROUTES: PrerenderRoute[] = [
  page('/', () => <Home />),
  page('/start-css', () => <StartCSS />),
  page('/subjects/compulsory', () => <CompulsoryList />),
  page('/subjects/compulsory/essay', () => <SubjectDetail />, '/subjects/compulsory/:slug'),
  page('/subjects/compulsory/precis-composition', () => <SubjectDetail />, '/subjects/compulsory/:slug'),
  page('/subjects/compulsory/general-science-ability', () => <SubjectDetail />, '/subjects/compulsory/:slug'),
  page('/subjects/compulsory/current-affairs', () => <SubjectDetail />, '/subjects/compulsory/:slug'),
  page('/subjects/compulsory/pakistan-affairs', () => <SubjectDetail />, '/subjects/compulsory/:slug'),
  page('/subjects/compulsory/islamic-studies', () => <SubjectDetail />, '/subjects/compulsory/:slug'),
  page('/subjects/optional', () => <OptionalSubjects />),
  page('/notes', () => <NotesLibrary />),
  page('/past-papers', () => <PastPapers />),
  page('/css-mcqs', () => <CssSubjectMcqs />),
  page('/essay', () => <EssayModule />),
  page('/mpt', () => <MPTPrep />),
  page('/current-affairs', () => <CurrentAffairs />),
  page('/psych-viva', () => <PsychViva />),
  page('/fpsc-updates', () => <FpscUpdates />),
  page('/mentors', () => <Mentors />),
  page('/services', () => <Services />),
  page('/analysis', () => <Analysis />),
  page('/grammar-vocabulary', () => <GrammarVocab />),
  page('/gk', () => <GKWorld />),
  page('/one-liner-gk', () => <OneLinerGK />),
  page('/language-grammar', () => <LanguageGrammar />),
  page('/book-summaries', () => <BookSummaries />),
  page('/handwritten-notes', () => <HandwrittenNotes />),
  page('/fpsc-syllabus', () => <FpscSyllabus />),
  page('/css-past-paper-analysis', () => <CssPastPaperAnalysis />),
  page('/books', () => <BooksPage />),
  page('/opinions', () => <OpinionsPage />),
  page('/consultation', () => <Consultation />),
  page('/css-2026-written-result', () => <Css2026Result />),
  page('/legal', () => <LegalCentre />),
  page('/privacy-policy', () => <PrivacyPolicy />),
  page('/cookie-policy', () => <CookiePolicy />),
  page('/terms-and-conditions', () => <TermsConditions />),
  page('/disclaimer', () => <Disclaimer />),
  page('/copyright', () => <CopyrightPolicy />),
  page('/editorial-policy', () => <EditorialPolicy />),
  page('/about', () => <AboutCssVista />),
  page('/contact', () => <ContactCssVista />),
]

export const PRERENDER_ROUTE_PATHS = PRERENDER_ROUTES.map((route) => route.path)
