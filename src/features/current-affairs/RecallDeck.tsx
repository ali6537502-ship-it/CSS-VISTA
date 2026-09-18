import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { briefingRoot, type Fact, type StoryCard } from './model'
import { FactCard } from './ui'
import './current-affairs.css'

export type RecallFact = { fact: Fact; story: StoryCard }

/**
 * One fact at a time: recall it, reveal it, then read it in context. Built for
 * the Current Affairs desk and now used by the account library, which is the
 * only place it is reachable from.
 */
export default function RecallDeck({ facts }: { facts: RecallFact[] }) {
  const [position, setPosition] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const index = Math.min(position, facts.length - 1)
  const { fact, story } = facts[index]
  function move(next: number) { setPosition(next); setRevealed(false) }
  return <div className="ca-recall-deck">
    <div className="ca-recall-meta"><span>{story.category}</span><span aria-live="polite">Fact {index + 1} of {facts.length}</span></div>
    <h3>{typeof fact === 'string' ? 'What key fact do you remember from this development?' : fact.label}</h3>
    <p className="ca-muted">{story.headline}</p>
    <button className="ca-button ca-button-light" aria-expanded={revealed} aria-controls="recall-answer" onClick={() => setRevealed(value => !value)}>{revealed ? 'Hide answer' : 'Reveal answer'}</button>
    <div id="recall-answer" hidden={!revealed} className="ca-recall-answer"><FactCard fact={fact} /><Link className="ca-text-link" to={briefingRoot + '/' + story.id}>Read in context <ArrowRight size={15} /></Link></div>
    <div className="ca-recall-controls"><button className="ca-button ca-button-light" disabled={index === 0} onClick={() => move(index - 1)}>Previous fact</button><button className="ca-button" disabled={index === facts.length - 1} onClick={() => move(index + 1)}>Next fact <ArrowRight size={15} /></button></div>
  </div>
}
