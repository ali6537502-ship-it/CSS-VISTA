import WorkspaceVariant from '@/features/workspace-preview/WorkspaceVariant'
import { useWorkspacePreview } from '@/features/workspace-preview/context'
import { Suspense } from 'react'
import { Navigate, Routes, Route, useLocation } from 'react-router'
import { ProfileGate } from './components/ProfileGate'
import Layout from './components/Layout'
import ProGate, { SelectedStudyGate } from './features/membership/ProGate'
import ErrorBoundary from './components/ErrorBoundary'
import { AdSenseProvider } from './components/Ads'
import TrustFooter from './components/TrustFooter'
import Home from './pages/Home'
import { MPT_HIBERNATED } from './lib/featureHibernation'
import { lazyWithRecovery as lazy } from './lib/chunkRecovery'

const StartCSS = lazy(() => import('./pages/StartCSS'))
const GSATutor = lazy(() => import('./pages/GSATutor'))
const CompulsoryList = lazy(() => import('./pages/CompulsoryList'))
const SubjectDetail = lazy(() => import('./pages/SubjectDetail'))
const OptionalSubjects = lazy(() => import('./pages/OptionalSubjects'))
const SubjectSelector = lazy(() => import('./pages/SubjectSelector'))
const NotesLibrary = lazy(() => import('./pages/NotesLibrary'))
const NoteViewer = lazy(() => import('./pages/NoteViewer'))
const PastPapers = lazy(() => import('./pages/PastPapers'))
const CssSubjectMcqs = lazy(() => import('./pages/CssSubjectMcqs'))
const EssayModule = lazy(() => import('./pages/EssayModule'))
const EssayThemes = lazy(() => import('./pages/EssayThemes'))
const EssayThemeDetail = lazy(() => import('./pages/EssayThemeDetail'))
const IslamicReferences = lazy(() => import('./pages/IslamicReferences'))
const IslamicReferenceChapter = lazy(() => import('./pages/IslamicReferenceChapter'))
const IslamicReferenceTopic = lazy(() => import('./pages/IslamicReferenceTopic'))
const StudyMaterial = lazy(() => import('./pages/StudyMaterial'))
const ResearchResources = lazy(() => import('./pages/ResearchResources'))
const OptionalNotes = lazy(() => import('./pages/OptionalNotes'))
const OptionalSubjectNotes = lazy(() => import('./pages/OptionalSubjectNotes'))
const OptionalTopicNotes = lazy(() => import('./pages/OptionalTopicNotes'))
const MPTPrep = lazy(() => import('./pages/MPTPrep'))
const MPTQuestionBank = lazy(() => import('./pages/MPTQuestionBank'))
const CurrentAffairs = lazy(() => import('./pages/CurrentAffairs'))
const DailyPdfLibrary = lazy(() => import('./features/daily-pdf/Library'))
const DailyPdfReader = lazy(() => import('./features/daily-pdf/Reader'))
const Vistagram = lazy(() => import('./pages/Vistagram'))
const VistagramArticle = lazy(() => import('./pages/VistagramArticle'))
const AnswerWriting = lazy(() => import('./pages/AnswerWriting'))
const TestSeries = lazy(() => import('./pages/TestSeries'))
const StudyTools = lazy(() => import('./pages/StudyTools'))
const LuckyDraw = lazy(() => import('./pages/LuckyDraw'))
const CssEligibilityCalculator = lazy(() => import('./pages/CssEligibilityCalculator'))
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
const JournalArchiveArticle = lazy(() => import('./pages/JournalArchiveArticle'))
const VistaJournal = lazy(() => import('./pages/VistaJournal'))
const AccountWorkspace = lazy(() => import('./features/current-affairs/Workspace'))
const DailyBriefingIntro = lazy(() => import('./features/current-affairs/Introduction'))
const Account = lazy(() => import('./pages/Account'))
const OneLinerGK = lazy(() => import('./pages/OneLinerGK'))
const LanguageGrammar = lazy(() => import('./pages/LanguageGrammar'))
const GrammarCourse = lazy(() => import('./features/grammar-v5/Course'))
const BookSummaries = lazy(() => import('./pages/BookSummaries'))
const Lectures = lazy(() => import('./pages/Lectures'))
const HandwrittenNotes = lazy(() => import('./pages/HandwrittenNotes'))
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'))
const AccountSubjects = lazy(() => import('./pages/account/Subjects'))
const AccountPractice = lazy(() => import('./pages/account/WorkspaceSections').then(m => ({ default:m.Practice })))
const AccountDirectory = lazy(() => import('./pages/account/WorkspaceSections').then(m => ({ default:m.Directory })))
const AccountMore = lazy(() => import('./pages/account/WorkspaceSections').then(m => ({ default:m.More })))
const ClassicAccount = lazy(() => import('./features/workspace-classic/pages/Account'))
const ClassicAccountHome = lazy(() => import('./features/workspace-classic/pages/AccountHome'))
const ClassicStudyPlanner = lazy(() => import('./features/workspace-classic/pages/StudyPlanner'))
const ClassicFpscSyllabus = lazy(() => import('./features/workspace-classic/pages/FpscSyllabus'))
const ClassicAccountTasks = lazy(() => import('./features/workspace-classic/pages/account/Tasks'))
const ClassicAccountProgress = lazy(() => import('./features/workspace-classic/pages/account/Progress'))
const ClassicAccountLibrary = lazy(() => import('./features/workspace-classic/pages/account/Library'))
const AccountHome = lazy(() => import('./pages/AccountHome'))
const AccountTasks = lazy(() => import('./pages/account/Tasks'))
const AccountProgress = lazy(() => import('./pages/account/Progress'))
const AccountEnglish = lazy(() => import('./pages/account/English'))
const AccountResources = lazy(() => import('./pages/account/Resources'))
const AccountExpression = lazy(() => import('./pages/account/Expression'))
const AccountPrecis = lazy(() => import('./pages/account/Precis'))
const AccountHandwriting = lazy(() => import('./pages/account/Handwriting'))
const AccountTutor = lazy(() => import('./pages/account/Tutor'))
const AccountSkills = lazy(() => import('./pages/account/Skills'))
const AccountGeneralAbility = lazy(() => import('./features/ability/Course'))
const AccountAnswerPerformance = lazy(() => import('./pages/account/AnswerPerformance'))
const AccountLearning = lazy(() => import('./pages/account/Learning'))
const AccountAiUsage = lazy(() => import('./pages/account/AiUsage'))
const AccountMembership = lazy(() => import('./pages/account/Membership'))
const AccountLibrary = lazy(() => import('./pages/account/Library'))
const AccountVistagram = lazy(() => import('./pages/account/Vistagram'))
const MptArea = lazy(() => import('./pages/mpt/MptArea'))
const MptApply = lazy(() => import('./pages/mpt/MptApply'))
const MptApplication = lazy(() => import('./pages/mpt/MptApplication'))
const MptEntrance = lazy(() => import('./pages/mpt/MptEntrance'))
const MptExam = lazy(() => import('./pages/mpt/MptExam'))
const MptResult = lazy(() => import('./pages/mpt/MptResult'))
const MptHistory = lazy(() => import('./pages/mpt/MptHistory'))
const MptPerformance = lazy(() => import('./pages/mpt/MptPerformance'))
const MptMistakes = lazy(() => import('./pages/mpt/MptMistakes'))
const MptQuestionBank = lazy(() => import('./pages/mpt/MptQuestionBank'))
const MptQuestionBankPaper = lazy(() => import('./pages/mpt/MptQuestionBankPaper'))
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
  const { enabled: preview } = useWorkspacePreview()
  const { pathname } = useLocation()
  if (preview && pathname.startsWith('/account/')) return <div className="ws-loading-layout" role="status" aria-label="Loading your workspace" data-cssv-ad-state="loading"><span className="sr-only">Loading your workspace…</span><div className="ws-loading-feature"><i/><i/><i/></div><div className="ws-loading-companion"><b/><i/><i/></div><div className="ws-loading-agenda"><i/><i/><i/></div></div>
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10" aria-label="Loading page" data-cssv-ad-state="loading">
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
        <Route path="/gsa-tutor" element={<S><GSATutor /></S>} />
        <Route path="/subjects/compulsory" element={<S><CompulsoryList /></S>} />
        <Route path="/subjects/compulsory/:slug" element={<SelectedStudyGate><S><SubjectDetail /></S></SelectedStudyGate>} />
        <Route path="/subjects/optional" element={<S><OptionalSubjects /></S>} />
        <Route path="/subjects/selector" element={<S><SubjectSelector /></S>} />
        <Route path="/notes" element={<S><NotesLibrary /></S>} />
        <Route path="/notes/view/:productId/:documentId" element={<S><NoteViewer /></S>} />
        <Route path="/past-papers" element={<S><PastPapers /></S>} />
        <Route path="/past-papers/:exam/:year" element={<S><PastPapers /></S>} />
        <Route path="/css-mcqs" element={<S><CssSubjectMcqs /></S>} />
        <Route path="/essay" element={<S><EssayModule /></S>} />
        <Route path="/study-material" element={<S><StudyMaterial /></S>} />
        <Route path="/resources" element={<S><ResearchResources /></S>} />
        <Route path="/study-material/essay-themes" element={<ProfileGate><ProGate feature="Essay Themes"><S><EssayThemes /></S></ProGate></ProfileGate>} />
        <Route path="/study-material/essay-themes/:slug" element={<ProfileGate><ProGate feature="Essay Themes"><S><EssayThemeDetail /></S></ProGate></ProfileGate>} />
        <Route path="/study-material/islamic-studies" element={<S><IslamicReferences /></S>} />
        <Route path="/study-material/islamic-studies/:chapter" element={<S><IslamicReferenceChapter /></S>} />
        <Route path="/study-material/islamic-studies/:chapter/:topic" element={<S><IslamicReferenceTopic /></S>} />
        <Route path="/study-material/optional" element={<S><OptionalNotes /></S>} />
        <Route path="/study-material/optional/:subject" element={<S><OptionalSubjectNotes /></S>} />
        <Route path="/study-material/optional/:subject/:topic" element={<S><OptionalTopicNotes /></S>} />
        <Route path="/mpt" element={MPT_HIBERNATED ? <Navigate to="/" replace /> : <S><MPTPrep /></S>} />
        <Route path="/mpt/bank/:bankId" element={MPT_HIBERNATED ? <Navigate to="/" replace /> : <SelectedStudyGate><S><MPTQuestionBank /></S></SelectedStudyGate>} />
        <Route path="/current-affairs" element={<ProfileGate><ProGate feature="Current Affairs"><S><CurrentAffairs /></S></ProGate></ProfileGate>} />
        <Route path="/current-affairs-daily" element={<S><DailyPdfLibrary /></S>} />
        <Route path="/current-affairs-daily/:date" element={<S><DailyPdfReader /></S>} />
        <Route path="/vistagram" element={<S><Vistagram /></S>} />
        <Route path="/vistagram/:slug" element={<S><VistagramArticle /></S>} />
        <Route path="/answer-writing" element={<S><AnswerWriting /></S>} />
        <Route path="/test-series" element={<S><TestSeries /></S>} />
        <Route path="/study-tools" element={<S><StudyTools /></S>} />
        <Route path="/lucky-draw" element={<S><LuckyDraw /></S>} />
        <Route path="/css-eligibility-calculator" element={<S><CssEligibilityCalculator /></S>} />
        <Route path="/photo-compressor" element={<S><PhotoCompressor /></S>} />
        <Route path="/games" element={<S><Games /></S>} />
        <Route path="/psych-viva" element={<S><PsychViva /></S>} />
        <Route path="/fpsc-updates" element={<S><FpscUpdates /></S>} />
        <Route path="/mentors" element={<S><Mentors /></S>} />
        <Route path="/services" element={<S><Services /></S>} />
        <Route path="/analysis" element={<S><Analysis /></S>} />
        <Route path="/grammar-vocabulary" element={<S><GrammarVocab /></S>} />
        <Route path="/dashboard" element={<ProfileGate><S><Dashboard /></S></ProfileGate>} />
        <Route path="/daily-challenge" element={<S><GrammarVocab /></S>} />
        <Route path="/gk" element={<S><GKWorld /></S>} />
        <Route path="/one-liner-gk" element={<SelectedStudyGate><S><OneLinerGK /></S></SelectedStudyGate>} />
        <Route path="/language-grammar" element={<S><LanguageGrammar /></S>} />
        <Route path="/grammar-course" element={<S><GrammarCourse /></S>} />
        <Route path="/book-summaries" element={<S><BookSummaries /></S>} />
        {/* The summary page reads :slug itself, so the canonical URL renders the
            summary directly instead of bouncing to a query-string variant. */}
        <Route path="/book-summaries/:slug" element={<S><BookSummaries /></S>} />
        <Route path="/lectures" element={<S><Lectures /></S>} />
        <Route path="/handwritten-notes" element={<S><HandwrittenNotes /></S>} />
        <Route path="/study-planner" element={<S><WorkspaceVariant classic={<ClassicStudyPlanner />}><StudyPlanner /></WorkspaceVariant></S>} />
        <Route path="/answer-evaluation" element={<S><AnswerEvaluation /></S>} />
        <Route path="/past-papers/view/:id" element={<S><PastPaperOpen /></S>} />
        <Route path="/live-theme-demos" element={<S><LiveThemeDemos /></S>} />
        <Route path="/fpsc-syllabus" element={<S><WorkspaceVariant classic={<ClassicFpscSyllabus />}><FpscSyllabus /></WorkspaceVariant></S>} />
        <Route path="/css-past-paper-analysis" element={<S><CssPastPaperAnalysis /></S>} />
        <Route path="/gk/cat/:slug" element={<SelectedStudyGate><S><GKCategory /></S></SelectedStudyGate>} />
        <Route path="/gk/quiz" element={<SelectedStudyGate><S><GKQuiz /></S></SelectedStudyGate>} />
        <Route path="/five-minute" element={<S><GKQuiz forceMode="five-minute" /></S>} />
        <Route path="/mistakes" element={<S><Mistakes /></S>} />
        <Route path="/answer-timer" element={<S><AnswerTimer /></S>} />
        <Route path="/checklists" element={<S><Checklists /></S>} />
        <Route path="/books" element={<S><BooksPage /></S>} />
        <Route path="/journal" element={<S><VistaJournal /></S>} />
        <Route path="/journal/opinion-ali-hassan" element={<S><JournalArchiveArticle articleSlug="opinion-ali-hassan" /></S>} />
        <Route path="/journal/opinion-eid-eve-chaman-phatak" element={<S><JournalArchiveArticle articleSlug="opinion-eid-eve-chaman-phatak" /></S>} />
        <Route path="/journal/opinion-machines-at-war" element={<S><JournalArchiveArticle articleSlug="opinion-machines-at-war" /></S>} />
        <Route path="/journal/opinion-power-without-peace" element={<S><JournalArchiveArticle articleSlug="opinion-power-without-peace" /></S>} />
        <Route path="/journal/opinion-the-next-48-hours" element={<S><JournalArchiveArticle articleSlug="opinion-the-next-48-hours" /></S>} />
        <Route path="/journal/opinion-harassers-calculus" element={<S><JournalArchiveArticle articleSlug="opinion-harassers-calculus" /></S>} />
        <Route path="/opinions" element={<Navigate to="/journal" replace />} />
        <Route path="/account" element={<S><WorkspaceVariant classic={<ClassicAccount />}><Account /></WorkspaceVariant></S>} />
        {/* The account home is the chooser; each declared account route renders
            its own focused page, so a bookmark or a refresh lands where the
            student expects. */}
        <Route path="/account/dashboard" element={<ProfileGate><S><WorkspaceVariant classic={<ClassicAccountHome />}><AccountHome /></WorkspaceVariant></S></ProfileGate>} />
        <Route path="/account/subjects" element={<ProfileGate><S><WorkspaceVariant classic={<Navigate to="/account/dashboard" replace />}><AccountSubjects /></WorkspaceVariant></S></ProfileGate>} />
        <Route path="/account/practice" element={<ProfileGate><S><WorkspaceVariant classic={<Navigate to="/account/dashboard" replace />}><AccountPractice /></WorkspaceVariant></S></ProfileGate>} />
        <Route path="/account/directory" element={<ProfileGate><S><WorkspaceVariant classic={<Navigate to="/account/dashboard" replace />}><AccountDirectory /></WorkspaceVariant></S></ProfileGate>} />
        <Route path="/account/more" element={<ProfileGate><S><WorkspaceVariant classic={<Navigate to="/account/dashboard" replace />}><AccountMore /></WorkspaceVariant></S></ProfileGate>} />
        <Route path="/account/plan" element={<ProfileGate><S><WorkspaceVariant classic={<ClassicStudyPlanner />}><StudyPlanner /></WorkspaceVariant></S></ProfileGate>} />
        <Route path="/account/tasks" element={<ProfileGate><S><WorkspaceVariant classic={<ClassicAccountTasks />}><AccountTasks /></WorkspaceVariant></S></ProfileGate>} />
        <Route path="/account/progress" element={<ProfileGate><S><WorkspaceVariant classic={<ClassicAccountProgress />}><AccountProgress /></WorkspaceVariant></S></ProfileGate>} />
        <Route path="/account/gsa-tutor" element={<ProfileGate><S><GSATutor /></S></ProfileGate>} />
        <Route path="/account/english" element={<ProfileGate><S><AccountEnglish /></S></ProfileGate>} />
        <Route path="/account/resources" element={<ProfileGate><S><AccountResources /></S></ProfileGate>} />
        <Route path="/account/expression" element={<ProfileGate><S><AccountExpression /></S></ProfileGate>} />
        <Route path="/account/precis" element={<ProfileGate><ProGate feature="Précis Mastery Lab" allowWhilePaused><S><AccountPrecis /></S></ProGate></ProfileGate>} />
        <Route path="/account/argumentation" element={<ProfileGate><S><AccountSkills feature="argument" /></S></ProfileGate>} />
        <Route path="/account/analytical-skills" element={<ProfileGate><S><AccountSkills feature="analysis" /></S></ProfileGate>} />
        <Route path="/account/essay-builder" element={<ProfileGate><S><AccountSkills feature="essay" /></S></ProfileGate>} />
        <Route path="/account/general-ability" element={<ProfileGate><ProGate feature="General Ability"><S><AccountGeneralAbility /></S></ProGate></ProfileGate>} />
        <Route path="/account/handwriting" element={<ProfileGate><S><AccountHandwriting /></S></ProfileGate>} />
        <Route path="/account/ask-vista" element={<ProfileGate><S><AccountTutor /></S></ProfileGate>} />
        <Route path="/account/answer-performance" element={<ProfileGate><ProGate feature="My Answer Performance"><S><AccountAnswerPerformance /></S></ProGate></ProfileGate>} />
        <Route path="/account/preparation" element={<ProfileGate><S><AccountLearning /></S></ProfileGate>} />
        <Route path="/account/ai-usage" element={<ProfileGate><S><AccountAiUsage /></S></ProfileGate>} />
        <Route path="/account/membership" element={<ProfileGate><S><AccountMembership /></S></ProfileGate>} />
        <Route path="/account/library" element={<ProfileGate><S><WorkspaceVariant classic={<ClassicAccountLibrary />}><AccountLibrary /></WorkspaceVariant></S></ProfileGate>} />
        <Route path="/account/vistagram" element={<ProfileGate><S><AccountVistagram /></S></ProfileGate>} />
        {/* MPT examination portal (docs/mpt). The server enforces every rule;
            these routes only render it, and stay inert while the flag is off. */}
        <Route path="/account/mpt" element={MPT_HIBERNATED ? <Navigate to="/account/dashboard" replace /> : <ProfileGate><S><MptArea /></S></ProfileGate>} />
        <Route path="/account/mpt/history" element={MPT_HIBERNATED ? <Navigate to="/account/dashboard" replace /> : <ProfileGate><S><MptHistory /></S></ProfileGate>} />
        <Route path="/account/mpt/performance" element={MPT_HIBERNATED ? <Navigate to="/account/dashboard" replace /> : <ProfileGate><S><MptPerformance /></S></ProfileGate>} />
        <Route path="/account/mpt/mistakes" element={MPT_HIBERNATED ? <Navigate to="/account/dashboard" replace /> : <ProfileGate><S><MptMistakes /></S></ProfileGate>} />
        <Route path="/account/mpt/question-bank" element={MPT_HIBERNATED ? <Navigate to="/account/dashboard" replace /> : <ProfileGate><S><MptQuestionBank /></S></ProfileGate>} />
        <Route path="/account/mpt/question-bank/:mock" element={MPT_HIBERNATED ? <Navigate to="/account/dashboard" replace /> : <ProfileGate><S><MptQuestionBankPaper /></S></ProfileGate>} />
        <Route path="/account/mpt/apply/:mock" element={MPT_HIBERNATED ? <Navigate to="/account/dashboard" replace /> : <ProfileGate><S><MptApply /></S></ProfileGate>} />
        <Route path="/account/mpt/applications/:code" element={MPT_HIBERNATED ? <Navigate to="/account/dashboard" replace /> : <ProfileGate><S><MptApplication /></S></ProfileGate>} />
        <Route path="/account/mpt/entrance/:mock" element={MPT_HIBERNATED ? <Navigate to="/account/dashboard" replace /> : <ProfileGate><S><MptEntrance /></S></ProfileGate>} />
        <Route path="/account/mpt/exam/:mock" element={MPT_HIBERNATED ? <Navigate to="/account/dashboard" replace /> : <ProfileGate><S><MptExam /></S></ProfileGate>} />
        <Route path="/account/mpt/results/:code" element={MPT_HIBERNATED ? <Navigate to="/account/dashboard" replace /> : <ProfileGate><S><MptResult /></S></ProfileGate>} />
        <Route path="/account/*" element={<ProfileGate><S><AccountWorkspace /></S></ProfileGate>} />
        <Route path="/daily-briefing" element={<S><DailyBriefingIntro /></S>} />
        <Route path="/daily-briefing/:storyId" element={<S><DailyBriefingIntro /></S>} />
        <Route path="/factbook" element={<ProfileGate><S><Factbook /></S></ProfileGate>} />
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
        <Route path="/sadiaali" element={<S><Admin /></S>} />
        <Route path="/sadiaali/login" element={<S><AdminLogin /></S>} />
        <Route path="*" element={<S><NotFound /></S>} />
      </Route>
    </Routes>
  )
}
