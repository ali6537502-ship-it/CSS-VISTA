import { ArrowUpRight, BookOpen, GraduationCap } from 'lucide-react'
import { Link } from 'react-router'
import { AccountPage } from './shared'
import FeatureFinder from '@/features/workspace/FeatureFinder'
import AccountGSATutorCard from '@/features/gsa-tutor/AccountGSATutorCard'
import { sections } from '@/features/workspace/registry'

export function Practice() {
  return <AccountPage title="Practice" intro="Your General Science course, lessons and revision in one place.">
    <section className="ws-practice-course-intro" aria-labelledby="general-science-course-title">
      <div className="ws-practice-course-copy">
        <p className="ws-practice-course-eyebrow"><GraduationCap size={16} aria-hidden="true"/> STRUCTURED COURSE</p>
        <h2 id="general-science-course-title">General Science Course</h2>
        <p>Follow the existing General Science lessons at your own pace. Practise each concept, revisit difficult areas and keep track of the lessons you have studied.</p>
        <Link className="ws-practice-course-open" to="/account/gsa-tutor">Open General Science Course <ArrowUpRight size={18} aria-hidden="true"/></Link>
      </div>
      <div className="ws-practice-course-graphic" aria-hidden="true"><BookOpen size={54} strokeWidth={1.4}/></div>
    </section>
    <AccountGSATutorCard />
  </AccountPage>
}
export function Directory() { return <AccountPage title="Feature finder" intro="Search preparation tools and resources. Pin useful destinations for your overview."><FeatureFinder /></AccountPage> }
export function More() { return <AccountPage title="All account features" intro="Open every workspace section and your personal tools from here."><div className="ws-card-grid">{sections.map(s => <Link className="ws-panel font-semibold min-h-20" to={s.to} key={s.id}>{s.title}</Link>)}<Link className="ws-panel font-semibold min-h-20" to="/account/fitness-coach">My Fitness Coach</Link><Link className="ws-panel font-semibold min-h-20" to="/account/gsa-tutor">GSA Tutor</Link><Link className="ws-panel font-semibold min-h-20" to="/account/resources">My Vista Resources</Link><Link className="ws-panel font-semibold min-h-20" to="/account/directory">Search all features</Link><Link className="ws-panel font-semibold min-h-20" to="/account?settings=1">Profile & sync details</Link></div></AccountPage> }
