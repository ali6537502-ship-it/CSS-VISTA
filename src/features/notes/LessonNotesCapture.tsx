import { useCallback, useEffect, useRef, useState, type ClipboardEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { ClipboardPaste, NotebookPen, CheckCircle2, ShieldAlert, X, ClipboardCheck } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { notesWrite, noteBytes, readLocalDraft, writeLocalDraft, clearLocalDraft, PAGE_BYTES } from './model'
import { NOTES_RELEASED } from './availability'

type Reply = { ok: boolean; id: string; replayed?: boolean }
type Props = { title?: string; appearance?: 'inline' | 'floating' }
const capturePrefix = 'lesson-capture'
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A lesson's private capture action; never uploads anything until the student explicitly pastes or saves. */
export default function LessonNotesCapture({ title, appearance = 'inline' }: Props) {
  const { user } = useAccount()
  const owner = user?.id || ''
  const location = useLocation()
  const source = location.pathname + location.search
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const targetRef = useRef<HTMLTextAreaElement>(null)
  const requestRef = useRef<{ id: string; text: string; title: string } | null>(null)
  const loadingRef = useRef(0)
  const label = title || (typeof document === 'undefined' ? 'Study lesson' : document.querySelector('main h1, article h1, main h2')?.textContent?.trim() || document.title.split(' | ')[0] || 'Study lesson')
  const safeTitle = label.trim().slice(0, 170) || 'Study lesson'
  const storagePage = source.slice(0, 600)

  useEffect(() => {
    if (!open) return
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) setOpen(false)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open, busy])

  const openCapture = useCallback(async () => {
    const selection = window.getSelection()?.toString()?.trim() || ''
    setSaved(null);setError('');setWarning('');setOpen(true)
    if (selection) {
      setValue(selection)
      if (NOTES_RELEASED && owner) {
        const stored = await writeLocalDraft({user:owner,note:capturePrefix,page:storagePage,html:selection,version:1,changed_at:Date.now()})
        if (!stored) setWarning('A device copy could not be retained. Keep this window open until the note is saved.')
      }
    } else if (NOTES_RELEASED && owner) {
      const serial = ++loadingRef.current
      const local = await readLocalDraft(owner,capturePrefix,storagePage)
      if (serial === loadingRef.current && local?.html) {
        setValue(local.html)
        setWarning('Recovered an unfinished lesson paste from this device.')
      }
    } else setValue('')
    window.setTimeout(()=>targetRef.current?.focus(),50)
  }, [owner,storagePage])

  const saveText = useCallback(async (pasted: string) => {
    if (!NOTES_RELEASED) { setError('Saving is not available until the independent recovery system is verified.');return }
    if (!owner) { setError('Sign in to your student account before saving.');return }
    const text = pasted.trim()
    if (!text) { setError('Select lesson text or paste something before saving.');return }
    const pageHtmlEstimate = noteBytes(text) * 6 + 1800
    if (pageHtmlEstimate > PAGE_BYTES) {
      setError('This excerpt may exceed one note page. Paste smaller sections; your notebook has no overall word limit.')
      return
    }
    setValue(pasted);setBusy(true);setSaved(null);setError('');setWarning('')
    const stored = await writeLocalDraft({user:owner,note:capturePrefix,page:storagePage,html:pasted,version:1,changed_at:Date.now()})
    if (!stored) setWarning('Local storage is unavailable on this device. Keep this dialog open until account saving succeeds.')
    const previous=requestRef.current
    const request=previous && previous.text===pasted && previous.title===safeTitle ? previous : {id:crypto.randomUUID(),text:pasted,title:safeTitle}
    requestRef.current=request
    try {
      const result=await notesWrite<Reply>({action:'lesson_capture',id:request.id,title:safeTitle,text:pasted,source_url:source})
      if (!result.ok || !ID.test(result.id)) throw Error('Could not confirm the saved note.')
      setSaved(result.id)
      requestRef.current=null
      await clearLocalDraft(owner,capturePrefix,storagePage)
    } catch (e) {
      setError(e instanceof Error?e.message:'Unable to save this lesson excerpt. Your device draft is retained where supported.')
    } finally {setBusy(false)}
  }, [owner,safeTitle,source,storagePage])

  const pasted = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!NOTES_RELEASED || !owner || busy) return
    const text = event.clipboardData.getData('text/plain')
    if (!text) return
    event.preventDefault()
    void saveText(text)
  }

  async function pasteFromClipboard() {
    if (!navigator.clipboard?.readText) {
      setError('Clipboard access is unavailable. Click inside the box and paste using your keyboard.')
      targetRef.current?.focus();return
    }
    try {
      const text=await navigator.clipboard.readText()
      if (!text.trim()) {setError('Your clipboard is empty. Select or copy lesson text first.');return}
      await saveText(text)
    } catch {
      setError('Clipboard access was denied. Click inside the box and paste using your keyboard.')
      targetRef.current?.focus()
    }
  }

  return <>
    <button type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>void openCapture()}
      className={appearance==='floating'
        ? 'no-print fixed bottom-[86px] right-3 z-30 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-900 px-3 py-2 text-xs font-bold text-white shadow-xl hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 md:bottom-7 md:right-7'
        : 'no-print inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-900/20 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'}>
      <ClipboardPaste size={17} aria-hidden="true"/> Paste to My Notes
    </button>
    {open && <div className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-3 py-6"
      onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-label="Save this lesson to My Notes"
        className="w-full max-w-xl rounded-2xl border border-emerald-900/10 bg-white p-5 text-slate-900 shadow-2xl sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div><span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-emerald-800"><NotebookPen size={16}/> My Notes</span>
          <h2 className="mt-2 font-display text-xl font-bold">Save from this lesson</h2>
          <p className="mt-1 text-xs text-slate-600">{safeTitle}</p></div>
          <button type="button" onClick={()=>setOpen(false)} disabled={busy} title="Close" aria-label="Close lesson Notes capture" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X size={20}/></button>
        </header>
        {!NOTES_RELEASED ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
          <div className="flex items-center gap-2 font-semibold"><ShieldAlert size={19}/> Personal Notes are not yet active.</div>
          <p className="mt-2">The private notes library is waiting for a verified independent backup and recovery test. No lesson text is being uploaded or saved by this button.</p>
          <Link className="mt-3 inline-flex font-bold underline" to="/account/notes" onClick={()=>setOpen(false)}>View My Notes</Link>
        </div> : !owner ? <div className="mt-5 rounded-xl border bg-slate-50 p-4 text-sm leading-7">Sign in to your personal account before saving a lesson. <Link className="font-bold text-emerald-800 underline" to="/account">Sign in</Link></div> : <>
          {!saved ? <>
            <p className="mt-5 text-xs leading-6 text-slate-600">Select text from the lesson, or paste your copied material into this box. Pasting saves it to your private Notes library automatically. You can also edit the text and press Save.</p>
            <textarea ref={targetRef} aria-label="Paste lesson text here to save automatically"
              value={value} disabled={busy} onChange={event=>{setValue(event.target.value);setError('');setSaved(null);requestRef.current=null}}
              onPaste={pasted} rows={8} placeholder="Paste your selected lesson material here…"
              className="mt-3 max-h-[45vh] w-full resize-y rounded-xl border border-slate-300 p-3 text-sm leading-6 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"/>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={()=>void pasteFromClipboard()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-800/30 px-4 text-xs font-bold text-emerald-900 disabled:opacity-50"><ClipboardPaste size={16}/> Paste clipboard & save</button>
              <button type="button" onClick={()=>void saveText(value)} disabled={busy||!value.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-900 px-4 text-xs font-bold text-white disabled:opacity-50"><ClipboardCheck size={16}/>{busy?'Saving to account…':'Save to My Notes'}</button>
            </div>
          </> : <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><CheckCircle2 size={19}/> Saved to your account</div>
            <p className="mt-2 text-xs leading-6 text-emerald-950">Your excerpt is in My Notes, with this lesson linked as its source.</p>
            <Link className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-emerald-900 px-4 text-xs font-bold text-white" to={'/account/notes?note='+encodeURIComponent(saved)} onClick={()=>setOpen(false)}>Open saved note</Link>
          </div>}
          {warning && <p role="status" className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs leading-5 text-amber-900">{warning}</p>}
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs leading-5 text-red-800">{error}</p>}
          {!saved && <p className="mt-3 text-[11px] leading-5 text-slate-500">Source: {source}. Saving to another device is confirmed only when the account displays a success message.</p>}
        </>}
      </section>
    </div>}
  </>
}
