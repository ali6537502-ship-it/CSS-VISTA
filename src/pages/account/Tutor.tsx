import { Link, useSearchParams } from 'react-router'
import { AccountPage } from './shared'
import { useLearning } from '@/features/learning/api'
import { pakistanTime } from '@/lib/pakistanTime'
import type { TutorOverview, Exchange } from '@/features/tutor/api'
import { panelStyle, secondaryStyle } from '@/features/handwriting/styles'
export default function TutorPage() {
  const [params, setParams] = useSearchParams()
  const id = params.get('id'), offset = Math.max(0, Number(params.get('offset')) || 0)
  const history = useLearning<TutorOverview>(`tutor.php?offset=${offset}`)
  const detail = useLearning<Exchange>(id ? `tutor.php?id=${encodeURIComponent(id)}` : undefined)
  const exchange = detail.data, result = exchange?.operation.result
  return <AccountPage title="Earlier tutoring responses" intro="Read your retained questions, source context and earlier responses.">
    <section className={`${panelStyle} mb-6`}><p className="leading-7">Continue with free authored lessons and practice. New external tutoring requests have been retired.</p><div className="mt-4 flex flex-wrap gap-3"><Link className={secondaryStyle} to="/account/gsa-tutor">Open GSA Tutor lessons</Link><Link className={secondaryStyle} to="/account/expression">Open English Expression</Link><Link className={secondaryStyle} to="/account/precis">Open the Précis handbook</Link></div></section>
    {(history.error || detail.error) && <p role="alert">{history.error || detail.error}</p>}
    {!history.data && !history.error && <p role="status">Opening earlier responses…</p>}
    {id && <button className={`${secondaryStyle} mb-4`} onClick={() => setParams({})}>All earlier questions</button>}
    {exchange ? <article className={`${panelStyle} space-y-5`}><h2 className="text-xl font-semibold">{exchange.question}</h2><details><summary className="min-h-11 cursor-pointer font-semibold">Original learning context</summary><h3 className="mt-3 font-semibold">{exchange.context.title}</h3><p className="mt-3 whitespace-pre-wrap break-words leading-8">{exchange.context.text}</p></details>{result ? <><p className="whitespace-pre-wrap leading-8">{result.explanation}</p><ol className="list-decimal space-y-3 pl-5">{result.steps.map((step, index) => <li key={index} className="leading-7">{step}</li>)}</ol><p className="leading-7">{result.check_question}</p>{result.citations.map((citation,index) => <blockquote key={index} className="border-l-2 pl-4 text-sm leading-7">{citation.quote}</blockquote>)}<p className="text-sm leading-7">{result.limitation}</p></> : <p>This earlier request has no saved response.</p>}</article> : !id && history.data && <section className={`${panelStyle} space-y-4`}><h2 className="text-xl font-semibold">Your earlier questions</h2>{history.data.history.length ? history.data.history.map(item => <button className="block w-full rounded-xl border p-4 text-left" key={item.operation_id} onClick={() => setParams({id:item.operation_id})}><strong>{item.question}</strong><span className="mt-2 block text-sm">{pakistanTime(item.created_at)}</span></button>) : <p>No earlier tutoring responses are saved in this account.</p>}<div className="flex gap-3"><button className={secondaryStyle} disabled={!offset} onClick={() => setParams({offset:String(Math.max(0,offset-50))})}>Previous page</button><button className={secondaryStyle} disabled={!history.data.has_more} onClick={() => setParams({offset:String(offset+50)})}>Next page</button></div></section>}
  </AccountPage>
}
