import { Link, useSearchParams } from 'react-router'
import { AccountPage } from './shared'
import { useLearning } from '@/features/learning/api'
import { pakistanTime } from '@/lib/pakistanTime'
import { stateNames, type HandwritingOverview, type HandwritingDetail } from '@/features/handwriting/api'
import { panelStyle, secondaryStyle } from '@/features/handwriting/styles'
export default function HandwritingPage() {
  const [params, setParams] = useSearchParams()
  const id = params.get('page'), offset = Math.max(0, Number(params.get('offset')) || 0)
  const overview = useLearning<HandwritingOverview>(`handwriting.php?offset=${offset}`)
  const detail = useLearning<HandwritingDetail>(id ? `handwriting.php?page_id=${encodeURIComponent(id)}` : undefined)
  const page = detail.data?.page, result = page?.operation?.result
  return <AccountPage title="Earlier handwritten work" intro="Your retained pages, transcriptions and saved feedback remain private to your account.">
    <section className={`${panelStyle} mb-6`}><p className="leading-7">Use the free expression guide and writing workspace for your next paragraph. New image processing and external evaluations have been retired.</p><Link className={`${secondaryStyle} mt-4`} to="/account/expression">Open English Expression</Link></section>
    {(overview.error || detail.error) && <p role="alert">{overview.error || detail.error}</p>}
    {!overview.data && !overview.error && <p role="status">Opening your saved pages…</p>}
    {id && <div className="mb-4"><button type="button" className={secondaryStyle} onClick={() => setParams({})}>All earlier pages</button></div>}
    {page ? <article className={`${panelStyle} space-y-5`}><h2 className="text-xl font-semibold">{page.title}</h2><p className="text-sm">Saved {pakistanTime(page.created_at)} · {stateNames[page.state] || page.state}</p>{page.image_available && <img src={`/api/student/handwriting-image.php?page_id=${encodeURIComponent(page.id)}`} alt="Your earlier handwritten page" className="max-h-[640px] max-w-full rounded-xl object-contain"/>}{page.transcription && <section><h3 className="font-semibold">Saved transcription · version {page.transcription.version}</h3><p className="mt-3 whitespace-pre-wrap break-words leading-8">{page.transcription.text}</p></section>}{result && 'reason' in result && <p className="text-sm leading-7">{result.reason}</p>}{result && 'summary' in result && <section><h3 className="font-semibold">Earlier feedback</h3><p className="mt-3 leading-7">{result.summary}</p>{result.findings.map((finding, index) => <div key={index} className="mt-4 rounded-xl border p-4"><p className="whitespace-pre-wrap">{finding.excerpt}</p><p className="mt-2 leading-7">{finding.explanation}</p><p className="mt-2 leading-7">{finding.hint}</p></div>)}</section>}</article> : !id && overview.data && <section className={`${panelStyle} space-y-4`}><h2 className="text-xl font-semibold">Saved pages</h2>{overview.data.pages.length ? overview.data.pages.map(item => <button key={item.id} type="button" className="block w-full rounded-xl border p-4 text-left" onClick={() => setParams({page:item.id})}><strong>{item.title}</strong><span className="mt-2 block text-sm">{pakistanTime(item.created_at)}</span></button>) : <p>No earlier handwritten pages are saved in this account.</p>}<div className="flex gap-3"><button className={secondaryStyle} disabled={!offset} onClick={() => setParams({offset:String(Math.max(0,offset-50))})}>Previous page</button><button className={secondaryStyle} disabled={!overview.data.has_more} onClick={() => setParams({offset:String(offset+50)})}>Next page</button></div></section>}
  </AccountPage>
}
