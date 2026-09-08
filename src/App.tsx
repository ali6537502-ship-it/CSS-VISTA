import { Suspense } from 'react'
import { Navigate, Routes, Route } from 'react-router'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { AdSenseProvider } from './components/Ads'
import TrustFooter from './components/TrustFooter'
import Home from './pages/Home'
import { lazyWithRecovery as lazy } from './lib/chunkRecovery'

const StartCSS = lazy(() => import('./pages/StartCSS'))
const CompulsoryList = lazy(() => import('./pages/CompulsoryList'))
const SubjectDetail = lazy(() => import('./pages/SubjectDetail'))
const OptionalSubjects = lazy(() => import('./pages/OptionalSubjects'))
const SubjectSelector = lazy(() => import('./pages/SubjectSelector'))
const NotesLibrary = lazy(() => import('./pages/NotesLibrary'))
const NoteViewer = lazy(() => import('./pages/NoteViewer'))
const PastPapers = lazy(() => import('./pages/PastPapers'))
const CssSubjectMcqs = lazy(() => import('./pages/CssSubjectMcqs'))
const EssayModule = lazy(() => import('./pages/EssayModule'))
const MPTPrep = lazy(() => import('./pages/MPTPrep'))
const MPTQuestionBank = lazy(() => import('./pages/MPTQuestionBank'))
const CurrentAffairs = lazy(() => import('./pages/CurrentAffairs'))
const AnswerWriting = lazy(() => import('./pages/AnswerWriting'))
const TestSeries = lazy(() => import('./pages/TestSeries'))
const StudyTools = lazy(() => import('./pages/StudyTools'))
const PhotoCompressor = lazy(() => import('./pages/PhotoCompressor'))
const Games = lazy(() => import('./pages/Games'))
const PsychViva = lazy(() => import('./pages/PsychViva'))
const FpscUpdates = lazy(() => import('./pages/FpscUpdates'))
const Mentors = lazy(() => import('./pages/Mentors'))
const Services = lazy(() => import('./pages/Services'))
const Analysis = lazy(() => import('./pages/Analysis'))
const GrammarVocab = lazy(() => import('./pages/GrammarVocab'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Admin = lazy(() => import('./pages/admin/Admin'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const NotFound = lazy(() => import('./pages/NotFound'))
const GKWorld = lazy(() => import('./pages/gk/GKWorld'))
const GKCategory = lazy(() => import('./pages/gk/GKCategory'))
const GKQuiz = lazy(() => import('./pages/gk/GKQuiz'))
const Mistakes = lazy(() => import('./pages/Mistakes'))
const AnswerTimer = lazy(() => import('./pages/AnswerTimer'))
const Checklists = lazy(() => import('./pages/Checklists'))
const BooksPage = lazy(() => import('./pages/Books').then((m) => ({ default: m.BooksPage })))
const OpinionsPage = lazy(() => import('./pages/Books').then((m) => ({ default: m.OpinionsPage })))
const Account = lazy(() => import('./pages/Account'))
const OneLinerGK = lazy(() => import('./pages/OneLinerGK'))
const LanguageGrammar = lazy(() => import('./pages/LanguageGrammar'))
const BookSummaries = lazy(() => import('./pages/BookSummaries'))
const Lectures = lazy(() => import('./pages/Lectures'))
const HandwrittenNotes = lazy(() => import('./pages/HandwrittenNotes'))
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'))
const AnswerEvaluation = lazy(() => import('./pages/AnswerEvaluation'))
const PastPaperOpen = lazy(() => import('./pages/PastPaperOpen'))
const LiveThemeDemos = lazy(() => import('./pages/LiveThemeDemos'))
const FpscSyllabus = lazy(() => import('./pages/FpscSyllabus'))
const CssPastPaperAnalysis = lazy(() => import('./pages/CssPastPaperAnalysis'))
const Factbook = lazy(() => import('./pages/Factbook'))
const Consultation = lazy(() => import('./pages/Consultation'))
const ExamIntelligence = lazy(() => import('./pages/ExamIntelligence'))
const Css2026Result = lazy(() => import('./pages/Css2026Result'))
const LegalCentre = lazy(() => import('./pages/LegalTrust').then((m) => ({ default: m.LegalCentre })))
const PrivacyPolicy = lazy(() => import('./pages/LegalTrust').then((m) => ({ default: m.PrivacyPolicy })))
const CookiePolicy = lazy(() => import('./pages/LegalTrust').then((m) => ({ default: m.CookiePolicy })))
const TermsConditions = lazy(() => import('./pages/LegalTrust').then((m) => ({ default: m.TermsConditions })))
const Disclaimer = lazy(() => import('./pages/LegalTrust').then((m) => ({ default: m.Disclaimer })))
const CopyrightPolicy = lazy(() => import('./pages/LegalTrust').then((m) => ({ default: m.CopyrightPolicy })))
const AboutCssVista = lazy(() => import('./pages/LegalTrust').then((m) => ({ default: m.AboutCssVista })))
const ContactCssVista = lazy(() => import('./pages/LegalTrust').then((m) => ({ default: m.ContactCssVista })))
const EditorialPolicy = lazy(() => import('./pages/LegalTrust').then((m) => ({ default: m.EditorialPolicy })))

function PageLoader() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10" aria-label="Loading page">
      <div className="h-8 w-1/3 animate-pulse rounded bg-secondary" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-secondary" />)}
      </div>
    </div>
  )
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route element={<AdSenseProvider><ErrorBoundary><><Layout /><TrustFooter /></></ErrorBoundary></AdSenseProvider>}>
        <Route path="/" element={<Home />} />
        <Route path="/start-css" element={<S><StartCSS /></S>} />
        <Route path="/subjects/compulsory" element={<S><CompulsoryList /></S>} />
        <Route path="/subjects/compulsory/:slug" element={<S><SubjectDetail /></S>} />
        <Route path="/subjects/optional" element={<S><OptionalSubjects /></S>} />
        <Route path="/subjects/selector" element={<S><SubjectSelector /></S>} />
        <Route path="/notes" element={<S><NotesLibrary /></S>} />
        <Route path="/notes/view/:productId/:documentId" element={<S><NoteViewer /></S>} />
        <Route path="/past-papers" element={<S><PastPapers /></S>} />
        <Route path="/past-papers/:exam/:year" element={<S><PastPapers /></S>} />
        <Route path="/css-mcqs" element={<S><CssSubjectMcqs /></S>} />
        <Route path="/essay" element={<S><EssayModule /></S>} />
        <Route path="/mpt" element={<S><MPTPrep /></S>} />
        <Route path="/mpt/bank/:bankId" element={<S><MPTQuestionBank /></S>} />
        <Route path="/current-affairs" element={<S><CurrentAffairs /></S>} />
        <Route path="/answer-writing" element={<S><AnswerWriting /></S>} />
        <Route path="/test-series" element={<S><TestSeries /></S>} />
        <Route path="/study-tools" element={<S><StudyTools /></S>} />
        <Route path="/photo-compressor" element={<S><PhotoCompressor /></S>} />
        <Route path="/games" element={<S><Games /></S>} />
        <Route path="/psych-viva" element={<S><PsychViva /></S>} />
        <Route path="/fpsc-updates" element={<S><FpscUpdates /></S>} />
        <Route path="/mentors" element={<S><Mentors /></S>} />
        <Route path="/services" element={<S><Services /></S>} />
        <Route path="/analysis" element={<S><Analysis /></S>} />
        <Route path="/grammar-vocabulary" element={<S><GrammarVocab /></S>} />
        <Route path="/dashboard" element={<S><Dashboard /></S>} />
        <Route path="/daily-challenge" element={<S><GrammarVocab /></S>} />
        <Route path="/gk" element={<S><GKWorld /></S>} />
        <Route path="/one-liner-gk" element={<S><OneLinerGK /></S>} />
        <Route path="/language-grammar" element={<S><LanguageGrammar /></S>} />
        <Route path="/book-summaries" element={<S><BookSummaries /></S>} />
        <Route path="/lectures" element={<S><Lectures /></S>} />
        <Route path="/handwritten-notes" element={<S><HandwrittenNotes /></S>} />
        <Route path="/study-planner" element={<S><StudyPlanner /></S>} />
        <Route path="/answer-evaluation" element={<S><AnswerEvaluation /></S>} />
        <Route path="/past-papers/view/:id" element={<S><PastPaperOpen /></S>} />
        <Route path="/live-theme-demos" element={<S><LiveThemeDemos /></S>} />
        <Route path="/fpsc-syllabus" element={<S><FpscSyllabus /></S>} />
        <Route path="/css-past-paper-analysis" element={<S><CssPastPaperAnalysis /></S>} />
        <Route path="/gk/cat/:slug" element={<S><GKCategory /></S>} />
        <Route path="/gk/quiz" element={<S><GKQuiz /></S>} />
        <Route path="/five-minute" element={<S><GKQuiz forceMode="five-minute" /></S>} />
        <Route path="/mistakes" element={<S><Mistakes /></S>} />
        <Route path="/answer-timer" element={<S><AnswerTimer /></S>} />
        <Route path="/checklists" element={<S><Checklists /></S>} />
        <Route path="/books" element={<S><BooksPage /></S>} />
        <Route path="/opinions" element={<S><OpinionsPage /></S>} />
        <Route path="/account" element={<S><Account /></S>} />
        <Route path="/factbook" element={<S><Factbook /></S>} />
        <Route path="/consultation" element={<S><Consultation /></S>} />
        <Route path="/exam-intelligence" element={<S><ExamIntelligence /></S>} />
        <Route path="/css-2026-written-result" element={<S><Css2026Result /></S>} />
        <Route path="/legal" element={<S><LegalCentre /></S>} />
        <Route path="/privacy-policy" element={<S><PrivacyPolicy /></S>} />
        <Route path="/cookie-policy" element={<S><CookiePolicy /></S>} />
        <Route path="/terms-and-conditions" element={<S><TermsConditions /></S>} />
        <Route path="/disclaimer" element={<S><Disclaimer /></S>} />
        <Route path="/copyright" element={<S><CopyrightPolicy /></S>} />
        <Route path="/about" element={<S><AboutCssVista /></S>} />
        <Route path="/contact" element={<S><ContactCssVista /></S>} />
        <Route path="/editorial-policy" element={<S><EditorialPolicy /></S>} />
        <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
        <Route path="/admin" element={<S><Admin /></S>} />
        <Route path="/admin/login" element={<S><AdminLogin /></S>} />
        <Route path="*" element={<S><NotFound /></S>} />
      </Route>
    </Routes>
  )
}