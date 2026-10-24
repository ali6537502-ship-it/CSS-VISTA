import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { currentHostingerAccountUser, HostingerApiError } from '@/lib/hostingerApi'
import { buttonStyle, inputStyle, learningRequest, secondaryStyle, useLearning, type Overview, type SaveResult } from '@/features/learning/api'
import { importIdentity, importJournals, importSources, pendingWritingSave, retainImport, type ImportJournal, type ImportSource } from './imports'

type Receipt = { request_id: string; confirmed_at: string; result: SaveResult }
function receiptLink(receipt: Receipt) {
  const result = receipt.result
  return result.writing_id && result.version_id ? `/account/preparation?writing=${encodeURIComponent(result.writing_id)}&version=${encodeURIComponent(result.version_id)}` : undefined
}
function ImportPanel({ user, email, premium }: { user: string; email: string; premium: boolean }) {
  const [attemptOffset,setAttemptOffset] = useState(0)
  const overview = useLearning<Overview>(`learning.php?offset=${attemptOffset}`)
  const [pendingWriting] = useState(()=>{try{return pendingWritingSave(sessionStorage,user)}catch{return undefined}})
  const [sources, setSources] = useState<ImportSource[]>([]), [skipped, setSkipped] = useState(0)
  const [device, setDevice] = useState(false), [selected, setSelected] = useState<ImportSource>()
  const [attempt, setAttempt] = useState(''), [confirmed, setConfirmed] = useState(false), [offset, setOffset] = useState(0)
  const [receiptOffset,setReceiptOffset] = useState(0)
  const [journals, setJournals] = useState<ImportJournal[]>([]), [receipts, setReceipts] = useState<Record<string, Receipt>>({})
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const running = useRef(false), alive = useRef(true)
  function discover(includeDevice: boolean) {
    const found = importSources(localStorage, user, includeDevice)
    setSources(found.sources); setSkipped(found.skipped); setJournals(importJournals(localStorage, user)); setOffset(0)
  }
  useEffect(() => {
    alive.current = true
    try {
      const found = importSources(localStorage, user)
      setSources(found.sources); setSkipped(found.skipped); setJournals(importJournals(localStorage, user))
    } catch { setError('Browser storage could not be read. No original has been changed. Use the original tool or export before leaving.') }
    return () => { alive.current = false }
  }, [user])
  function download() {
    try {
      const data = { format: 'cssvista-original-browser-writing-v1', user, exportedAt: new Date().toISOString(), accountDraft: localStorage.getItem(`cssvista:draft:learning:v1:${user}:new`), ...(device ? { unscopedBrowserRecord: localStorage.getItem('cssvista:v1') } : {}) }
      const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
      const link = document.createElement('a'); link.href=url; link.download='css-vista-original-browser-writing.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
    } catch { setError('This browser could not export its original records. Keep the original tool open and copy your work safely.') }
  }
  async function check(journal: Pick<ImportJournal,'request'>) {
    if (running.current) return
    running.current=true;setBusy(true);setError('');setMessage('')
    try {
      const receipt = await learningRequest<Receipt>(user,`learning.php?request_id=${journal.request}`)
      if(alive.current){setReceipts(previous=>({...previous,[journal.request]:receipt}));setMessage('The account confirmed this save. Open its exact saved version below.')}
    } catch(cause) {
      if(alive.current)setError(cause instanceof HostingerApiError && cause.status===404 ? 'No confirmed receipt was found. Nothing was resent. If the original is unchanged, preview it with the same destination and confirm again to retry safely.' : cause instanceof Error ? cause.message : 'The receipt could not be checked. Your original remains in this browser.')
    } finally{running.current=false;if(alive.current)setBusy(false)}
  }
  async function save() {
    if (!selected || selected.accountScoped || !confirmed || !attempt || running.current) return
    running.current=true;setBusy(true);setError('');setMessage('')
    try {
      const journal = await importIdentity(user,selected,attempt)
      const latest = importSources(localStorage,user,device).sources.find(source=>source.key===selected.key)
      if(!latest || (await importIdentity(user,latest,attempt)).request!==journal.request)throw Error('The browser original changed after this preview. Inspect it again before importing; no save was sent.')
      if(!alive.current || currentHostingerAccountUser()!==user)throw Error('Your account changed. Reopen the import preview.')
      retainImport(localStorage,user,journal)
      setJournals(importJournals(localStorage,user))
      const result = await learningRequest<SaveResult>(user,'learning.php',{action:'writing_save',request_id:journal.request,expected_version:0,attempt_id:attempt,kind:selected.kind,title:selected.title,text:selected.text})
      if(alive.current){setReceipts(previous=>({...previous,[journal.request]:{request_id:journal.request,confirmed_at:new Date().toISOString(),result}}));setConfirmed(false);setMessage('Account save confirmed. Your browser original is retained. Opening or repeating the same import does not create another writing record.')}
    } catch(cause){if(alive.current)setError(cause instanceof Error ? cause.message : 'Save could not be confirmed. Keep the original and check its receipt before retrying.')}
    finally{running.current=false;if(alive.current)setBusy(false)}
  }
  return <div className="mt-4 space-y-5">
    <p className="text-sm leading-7 text-[#47564D]">Preview one copy before saving it to <strong className="break-all">{email}</strong>. Existing writing and browser originals are retained. Importing does not transfer scores, completions, study time or mastery. The account copy gets a new save date; any earlier date is unverified context in its text.</p>
    <div className="flex flex-wrap gap-3"><button className={secondaryStyle} disabled={busy} onClick={()=>{try{discover(device);setSelected(undefined);setConfirmed(false);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'Browser records could not be read.')}}}>Refresh browser preview</button><button className={secondaryStyle} onClick={download}>Export original browser writing</button></div>
    {pendingWriting&&<section className="space-y-3 rounded-xl border border-amber-300 p-4" aria-label="Earlier writing save"><h3 className="font-semibold">An earlier writing save awaits confirmation</h3><p className="text-sm leading-7">Check the account receipt before continuing your existing draft. Checking does not resend or erase it.</p><button disabled={busy} className={secondaryStyle} onClick={()=>void check(pendingWriting)}>Check earlier writing receipt</button>{receipts[pendingWriting.request]&&receiptLink(receipts[pendingWriting.request])&&<Link className="ml-3 inline-flex min-h-11 items-center text-[#14543D] underline" to={receiptLink(receipts[pendingWriting.request])!}>Open earlier confirmed writing</Link>}</section>}
    {!device ? <div className="rounded-xl border p-4"><p className="text-sm leading-7">Browser-cached saved answers have no per-answer owner attached. The existing account progress backup may also restore this cache. On a shared browser they may belong to someone else. Inspect them only if this is your work.</p><button className={`${secondaryStyle} mt-3`} onClick={()=>{try{discover(true);setDevice(true);setSelected(undefined);setConfirmed(false)}catch(cause){setError(cause instanceof Error?cause.message:'Could not inspect this browser record.')}}}>Inspect this browser’s saved answers</button></div> : <p className="text-sm leading-7">Browser-cached answers are shown for inspection. You must confirm ownership of each selected copy before saving.</p>}
    {skipped>0 && <p role="status" className="text-sm leading-7">{skipped} browser copies could not be previewed safely or exceeded this view’s limits. Their originals are retained; use the export or original tool. No partial text was imported.</p>}
    <ul className="divide-y rounded-xl border">{sources.slice(offset,offset+20).map(source=><li key={source.key} className="min-w-0 p-4"><p className="text-xs text-[#47564D]">{source.accountScoped?'Account-scoped draft':'Browser-cached answer · ownership unverified'}</p><button disabled={busy} className="min-h-11 break-words text-left font-semibold text-[#14543D] underline" onClick={()=>{setSelected(source);setConfirmed(false);setError('');setMessage('')}}>Preview: {source.label}</button></li>)}</ul>
    {!sources.length && <p>No readable writing copies in the inspected browser scopes.</p>}
    <div className="flex gap-3">{offset>0 && <button className={secondaryStyle} onClick={()=>setOffset(Math.max(0,offset-20))}>Previous browser copies</button>}{offset+20<sources.length && <button className={secondaryStyle} onClick={()=>setOffset(offset+20)}>More browser copies</button>}</div>
    {selected && <section className="space-y-4 rounded-xl border p-4" aria-label="Import preview"><h3 className="text-lg font-semibold">Preview account copy</h3><p className="break-words font-semibold">{selected.title}</p>{selected.kind==='precis'&&!premium ? <p>Précis account imports require currently available active Pro. The original remains available for export.</p> : <>
      <p className="text-sm leading-7">The following plain text is the account copy. The saved copy uses standard line breaks and trims blank space at the beginning and end. The export retains the original browser record and all its fields.</p><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#F6F8F7] p-4 font-sans text-sm leading-7" tabIndex={0}>{selected.text}</pre>
      {selected.accountScoped ? <p className="text-sm leading-7">This draft already belongs to the existing writing form. Resume it there to keep its original destination and check any unconfirmed save. <Link className="inline-flex min-h-11 items-center text-[#14543D] underline" to="/account/preparation?new=writing">Resume original writing draft</Link></p> : <>
      {!overview.data ? <p role={overview.error?'alert':'status'}>{overview.error||'Loading your destination attempts…'}{overview.error&&<button className={secondaryStyle} onClick={overview.refresh}>Retry attempts</button>}</p> : <label className="grid gap-2 text-sm font-semibold">Destination preparation attempt<select aria-label="Destination preparation attempt" className={inputStyle} value={attempt} disabled={busy} onChange={event=>{setAttempt(event.target.value);setConfirmed(false)}}><option value="">Choose your attempt</option>{overview.data.attempts.map(a=><option key={a.id} value={a.id}>CSS {a.target_year} · {a.id.slice(0,8)}</option>)}</select></label>}
      <div className="flex flex-wrap gap-3">{attemptOffset>0&&<button className={secondaryStyle} disabled={busy} onClick={()=>{setAttemptOffset(Math.max(0,attemptOffset-50));setAttempt('');setConfirmed(false)}}>More recent destination attempts</button>}{overview.data?.has_more_attempts&&<button className={secondaryStyle} disabled={busy} onClick={()=>{setAttemptOffset(attemptOffset+50);setAttempt('');setConfirmed(false)}}>Older destination attempts</button>}</div>
      <label className="flex min-h-11 items-start gap-3 text-sm leading-7"><input className="mt-2 size-5 shrink-0" type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/><span>I recognise this as my own writing and have reviewed this exact copy and destination. Save it to my signed-in account.</span></label><button className={buttonStyle} disabled={busy||!confirmed||!attempt} onClick={()=>void save()}>{busy?'Checking account save…':'Confirm import as new writing'}</button></>}
    </>}</section>}
    {error&&<p role="alert" className="text-sm leading-7 text-red-800">{error}</p>}{message&&<p role="status" className="text-sm leading-7">{message}</p>}
    {journals.length>0&&<section className="space-y-3" aria-label="Import save receipts"><h3 className="text-lg font-semibold">Check import saves</h3><p className="text-sm leading-7">These save references belong to this account and contain no writing text. Check a receipt after a lost response or on reopening. A missing receipt does not resend anything.</p><ul className="divide-y rounded-xl border">{journals.slice(receiptOffset,receiptOffset+20).map(journal=><li key={journal.request} className="min-w-0 space-y-2 p-4"><p className="break-words font-semibold">{journal.title}</p><p className="break-all text-xs text-[#47564D]">Save reference: {journal.request}</p><button disabled={busy} className={secondaryStyle} onClick={()=>void check(journal)}>Check save receipt</button>{receipts[journal.request]&&receiptLink(receipts[journal.request])&&<Link className="ml-3 inline-flex min-h-11 items-center text-[#14543D] underline" to={receiptLink(receipts[journal.request])!}>Open confirmed writing version {receipts[journal.request].result.version}</Link>}</li>)}</ul><div className="flex gap-3">{receiptOffset>0&&<button className={secondaryStyle} onClick={()=>setReceiptOffset(Math.max(0,receiptOffset-20))}>Previous save references</button>}{receiptOffset+20<journals.length&&<button className={secondaryStyle} onClick={()=>setReceiptOffset(receiptOffset+20)}>More save references</button>}</div></section>}
  </div>
}
export default function BrowserImport({ premium }: { premium: boolean }) {
  const { user } = useAccount(), [open,setOpen] = useState(false)
  return <section className="mb-8 rounded-xl border p-5" aria-labelledby="browser-import-title"><h2 id="browser-import-title" className="text-lg font-semibold">Browser writing recovery</h2><button className={`${secondaryStyle} mt-3`} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?'Close browser import':'Preview browser writing imports'}</button>{open&&user&&<ImportPanel key={user.id} user={user.id} email={user.email} premium={premium}/>}</section>
}
