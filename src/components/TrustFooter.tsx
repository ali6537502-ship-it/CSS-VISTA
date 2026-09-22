import { Link, useLocation, useNavigate } from 'react-router'
import { site } from '@/data/site'

type GoogleFcApi = {
  showRevocationMessage?: () => void
}

type GoogleFcWindow = Window & { googlefc?: GoogleFcApi }

export default function TrustFooter() {
  const navigate = useNavigate()
  const location = useLocation()
  const reopenPrivacyChoices = () => {
    const googlefc = (window as GoogleFcWindow).googlefc
    if (typeof googlefc?.showRevocationMessage === 'function') {
      googlefc.showRevocationMessage()
      return
    }
    navigate('/cookie-policy#managing-cookies')
  }

  const isAdmin = location.pathname === '/sadiaali' || location.pathname.startsWith('/sadiaali/')
  const isFocusedStudy = location.pathname === '/gk/quiz'
    || location.pathname === '/five-minute'
    || location.pathname.startsWith('/mpt/bank/')
    || location.pathname.startsWith('/notes/view/')

  if (isAdmin) return <style>{`.cssv-site-footer{display:none!important}`}</style>

  if (isFocusedStudy) {
    return (
      <>
        <style>{`.cssv-site-footer{display:none!important}`}</style>
        <footer className="border-t bg-white pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0" aria-label="CSS Vista legal links">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-4 text-xs text-muted-foreground" aria-label="Legal navigation">
            <Link className="hover:text-pine" to="/privacy-policy">Privacy</Link>
            <Link className="hover:text-pine" to="/terms-and-conditions">Terms</Link>
            <Link className="hover:text-pine" to="/contact">Contact</Link>
            <button type="button" onClick={reopenPrivacyChoices} className="hover:text-pine">Privacy & Cookie Settings</button>
          </nav>
        </footer>
      </>
    )
  }

  return (
    <>
      <style>{`.cssv-site-footer{display:none!important}`}</style>
      <footer className="border-t bg-white pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0" aria-label="CSS Vista footer">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <section>
            <Link to="/" className="inline-flex items-center" aria-label="CSS Vista home">
              <img src="/images/logo.webp?v=20260909" alt="CSS Vista" width="480" height="157" loading="lazy" decoding="async" className="h-12 w-auto object-contain" />
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{site.tagline}. Independent educational preparation; official examination rules and notices should be verified with the relevant examining authority.</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-foreground">Resources</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-pine" to="/past-papers">CSS Past Papers</Link></li>
              <li><Link className="hover:text-pine" to="/css-mcqs">CSS MCQs</Link></li>
              <li><Link className="hover:text-pine" to="/mpt">CSS MPT & Quiz</Link></li>
              <li><Link className="hover:text-pine" to="/fpsc-syllabus">CSS Syllabus</Link></li>
              <li><Link className="hover:text-pine" to="/current-affairs">Current Affairs</Link></li>
              <li><Link className="hover:text-pine" to="/notes">Notes & Study Resources</Link></li>
              <li><Link className="hover:text-pine" to="/study-tools">Study Tools</Link></li>
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-bold text-foreground">About</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-pine" to="/about">About CSS Vista</Link></li>
              <li><Link className="hover:text-pine" to="/contact">Contact</Link></li>
              <li><Link className="hover:text-pine" to="/mentors">Mentors</Link></li>
              <li><Link className="hover:text-pine" to="/editorial-policy">Editorial & Corrections Policy</Link></li>
              <li><a className="hover:text-pine" href="https://www.fpsc.gov.pk/" target="_blank" rel="noopener noreferrer">FPSC Official Website</a></li>
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-bold text-foreground">Legal</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-pine" to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link className="hover:text-pine" to="/cookie-policy">Cookie Policy</Link></li>
              <li><Link className="hover:text-pine" to="/terms-and-conditions">Terms & Conditions</Link></li>
              <li><Link className="hover:text-pine" to="/disclaimer">Disclaimer</Link></li>
              <li><Link className="hover:text-pine" to="/copyright">Copyright</Link></li>
              <li><Link className="hover:text-pine" to="/legal">Legal & Trust Centre</Link></li>
              <li><button type="button" onClick={reopenPrivacyChoices} className="text-left underline-offset-2 hover:text-pine hover:underline">Privacy & Cookie Settings</button></li>
            </ul>
          </section>
        </div>
        <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} <Link className="font-semibold text-pine hover:underline" to="/copyright">CSS Vista</Link>. All rights reserved. This notice applies to CSS Vista's protectable original material and does not claim ownership of official or third-party works.
        </div>
      </footer>
    </>
  )
}
