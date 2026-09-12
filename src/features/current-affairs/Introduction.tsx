import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import './current-affairs.css'

export default function Introduction() {
  const { user } = useAccount()
  return <div className="ca-intro">
    <header className="ca-intro-hero"><p className="ca-eyebrow">CSS VISTA · DAILY CURRENT AFFAIRS</p><h1>Understand the day.<br />Remember what matters.</h1>
      <p className="ca-intro-lead">A focused reading desk for current affairs: clear explanations, revision facts, important statistics and the original sources, together in your free CSS Vista account.</p>
      <div className="ca-intro-cta"><Link className="ca-button" to={user ? '/account/dashboard' : '/account?mode=create&returnTo=/account/dashboard'}>{user ? 'Open my dashboard' : 'Create Free Account'} <ArrowRight size={17} /></Link>{!user && <Link className="ca-button ca-button-light" to="/account?returnTo=/account/dashboard">Log in</Link>}</div>
    </header>
    <div className="ca-intro-grid">{[
      ['01', 'Start with the essentials', 'Scan the headlines and summaries. Open Quick Read for the event, key takeaways, facts and figures.'],
      ['02', 'Read the full picture', 'Explore the background, explanations, implications and possible analytical question angles when you need more depth.'],
      ['03', 'Revise with confidence', 'Keep a daily factbook close by. Statistics retain their source and date, and every development links to its original material.'],
      ['04', 'Make it your reading desk', 'Save important developments, track unfinished reading and choose the reading mode you prefer.'],
      ['05', 'Follow an issue over time', 'Search the archive by topic, institution or country. Browse editions by date and category.'],
      ['06', 'Keep a clear view', 'Published briefings bring verified-source material into one calm, organised place, with sources visible throughout.'],
    ].map(([number, title, body]) => <div key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p></div>)}</div>
    <p className="ca-intro-note">Your account is free. When an edition is still being prepared, your dashboard shows its publication status and gives you access to the archive and your saved reading.</p>
  </div>
}
