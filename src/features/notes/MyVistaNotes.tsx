import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type ClipboardEvent } from 'react'
import { useAccount } from '@/lib/accountContext'
import { useSearchParams } from 'react-router'
import { HostingerApiError } from '@/lib/hostingerApi'
import { Bold, Italic, Underline, Strikethrough, Highlighter, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link2, Quote, ClipboardPaste, Undo2, Redo2, Plus, FolderPlus, Folder, FolderOpen, FileText, Pin, PinOff, Trash2, RotateCcw, Search, Cloud, CloudOff, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight, History, Maximize2, Minimize2, Table2, Superscript, Subscript, AlertTriangle, Pencil, X } from 'lucide-react'
import {
  noteBytes, notesRequest, notesWrite, sanitizeNoteHtml,
  readLocalDraft, writeLocalDraft, clearLocalDraft, PAGE_BYTES,
  type NoteFolder, type NoteSummary, type NoteDocument, type NoteList, type NotePage,
  type NoteRevision
} from './model'
import './notes.css'
import './readerPresentation.css'

type NoteView = NoteDocument & { ok: boolean }
type PageView = { ok: boolean; page: NotePage }
type SaveReply = { ok: boolean; id: string; version: number }
type IdReply = { ok: boolean; id: string; page_id?: string; position?: number; version?: number }
type RevisionReply = { ok: boolean; revision: { version: number; content_html: string; created_at: string } }
type HistoryReply = { ok: boolean; revisions: NoteRevision[] }
type FolderForm = { id: string | null; name: string; parent_id: string | null }
type SaveState = 'loading' | 'saved' | 'draft' | 'saving' | 'offline' | 'conflict'
const toolStyle = 'notes-tool'
const fmtTime = (iso: string) => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t).toLocaleString() : '' }

export default function MyVistaNotes() {
  const { user } = useAccount()
  const [query] = useSearchParams()
  const linkedNoteId = query.get('note')
  const owner = user?.id || ''
  const [folders,setFolders] = useState<NoteFolder[]>([])
  const [notes,setNotes] = useState<NoteSummary[]>([])
  const [hasMore,setHasMore] = useState(false)
  const [offset,setOffset] = useState(0)
  const [search,setSearch] = useState('')
  const [trash,setTrash] = useState(false)
  const [selectedFolder,setSelectedFolder] = useState<string | null>(null)
  const [selectedNote,setSelectedNote] = useState<string | null>(null)
  const [selectedPage,setSelectedPage] = useState<string | null>(null)
  const [documentData,setDocumentData] = useState<NoteDocument | null>(null)
  const [title,setTitle] = useState('')
  const [busy,setBusy] = useState(false)
  const [loadingPage,setLoadingPage] = useState(false)
  const [saveState,setSaveState] = useState<SaveState>('loading')
  const [dirty,setDirty] = useState(false)
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')
  const [folderForm,setFolderForm] = useState<FolderForm | null>(null)
  const [history,setHistory] = useState<NoteRevision[] | null>(null)
  const [historyPreview,setHistoryPreview] = useState<{version:number;html:string} | null>(null)
  const [readingMode,setReadingMode] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const rangeRef = useRef<Range | null>(null)
  const pageRef = useRef<{id:string;note:string;version:number}|null>(null)
  const dirtyHtmlRef = useRef<string | null>(null)
  const savingRef = useRef(false)
  const conflictRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadSequence = useRef(0)
  const listSequence = useRef(0)
  const changeSequence = useRef(0)
  const draftQueue = useRef<Promise<unknown>>(Promise.resolve())
  const retryDelay = useRef(1800)
  const openedDeepLink = useRef<string | null>(null)

  useEffect(()=>{
    if(!readingMode)return
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setReadingMode(false)}
    window.addEventListener('keydown',escape)
    return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',escape)}
  },[readingMode])

  const foldersById = useMemo(()=>new Map(folders.map(folder=>[folder.id,folder])),[folders])
  const folderIsVisible = useCallback((id:string|null):boolean=>{
    const visited=new Set<string>()
    while(id) {
      if(visited.has(id))return false
      visited.add(id)
      const folder=foldersById.get(id)
      if(!folder || folder.deleted_at)return false
      id=folder.parent_id
    }
    return true
  },[foldersById])

  const loadList=useCallback(async (append=false)=>{
    if(!owner)return
    const sequence=++listSequence.current
    const start=append?offset:0
    try {
      const params=new URLSearchParams({ view:'list',offset:String(start),trash:trash?'1':'0',folder:selectedFolder||'root' })
      if(search.trim())params.set('search',search.trim())
      const data=await notesRequest<NoteList>('?'+params)
      if(sequence!==listSequence.current)return
      setFolders(data.folders)
      setNotes(previous=>append?[...previous,...data.notes.filter(note=>!previous.some(p=>p.id===note.id))]:data.notes)
      setHasMore(data.has_more)
      setOffset(data.next_offset)
      setError('')
    } catch(e) {
      if(sequence===listSequence.current)setError(e instanceof Error?e.message:'Unable to load notes.')
    }
  },[owner,offset,search,trash,selectedFolder])
  // Keep list refresh independent from pagination state.
  const loadListRef=useRef(loadList)
  loadListRef.current=loadList
  useEffect(()=>{
    const timer=setTimeout(()=>{setOffset(0);void loadListRef.current(false)},search?220:0)
    return()=>clearTimeout(timer)
  },[owner,search,trash,selectedFolder])

  const loadDocument=useCallback(async(id:string)=>{
    if(!owner)return
    const sequence=++loadSequence.current
    setBusy(true);setError('');setDocumentData(null);setTitle('');setSelectedPage(null);setSaveState('loading')
    try {
      const data=await notesRequest<NoteView>('?view=note&id='+encodeURIComponent(id))
      if(sequence!==loadSequence.current)return
      setDocumentData({note:data.note,pages:data.pages})
      setTitle(data.note.title)
      const page=data.pages.find(p=>!p.deleted_at)
      setSelectedPage(page?.id??null)
    }catch(e){if(sequence===loadSequence.current)setError(e instanceof Error?e.message:'Unable to open note.')}
    finally{if(sequence===loadSequence.current)setBusy(false)}
  },[owner])

  // Open the note that a lesson has just saved, without requiring a manual search.
  useEffect(()=>{
    if(!owner || !linkedNoteId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(linkedNoteId))return
    const identity=owner+':'+linkedNoteId
    if(openedDeepLink.current===identity)return
    openedDeepLink.current=identity
    setSelectedFolder(null);setTrash(false);setSelectedNote(linkedNoteId)
    void loadDocument(linkedNoteId)
  },[owner,linkedNoteId,loadDocument])

  // A page switch does not discard the previous page's IndexedDB draft.
  useEffect(()=>{
    if(!owner || !selectedNote || !selectedPage) {pageRef.current=null;setLoadingPage(false);return}
    const sequence=++loadSequence.current
    setLoadingPage(true);setSaveState('loading');setDirty(false);setHistory(null);setHistoryPreview(null)
    pageRef.current=null
    dirtyHtmlRef.current=null
    changeSequence.current=0
    conflictRef.current=false
    const run=async()=>{
      try{
        const [remote,local]=await Promise.all([
          notesRequest<PageView>('?view=page&id='+encodeURIComponent(selectedPage)),
          readLocalDraft(owner,selectedNote,selectedPage),
        ])
        if(sequence!==loadSequence.current)return
        const page=remote.page
        pageRef.current={id:page.id,note:page.note_id,version:page.version}
        const serverHtml=sanitizeNoteHtml(page.content_html)
        const recovered=local && local.html!==serverHtml
        const html=recovered?sanitizeNoteHtml(local.html):serverHtml
        if(editorRef.current)editorRef.current.innerHTML=html
        rangeRef.current=null
        if(recovered){
          dirtyHtmlRef.current=html;setDirty(true)
          conflictRef.current=local.version!==page.version
          setSaveState(conflictRef.current?'conflict':'draft')
          if(conflictRef.current)setMessage('A newer cloud version exists. Your device draft is safe; copy it or save it as another page.')
          else setMessage('Recovered an unsynced draft from this device.')
        }else{setDirty(false);setSaveState('saved')}
      }catch(e){if(sequence===loadSequence.current){setError(e instanceof Error?e.message:'Could not load this page.');setSaveState('offline')}}
      finally{if(sequence===loadSequence.current)setLoadingPage(false)}
    }
    void run()
    return()=>{loadSequence.current++;if(saveTimer.current)clearTimeout(saveTimer.current);if(draftTimer.current)clearTimeout(draftTimer.current)}
  },[owner,selectedNote,selectedPage])

  const captureCurrent=useCallback(()=>{
    if(owner&&pageRef.current&&editorRef.current&&dirtyHtmlRef.current!==null)dirtyHtmlRef.current=editorRef.current.innerHTML
  },[owner])

  const persistDraft=useCallback(async()=>{
    const p=pageRef.current,html=dirtyHtmlRef.current
    if(!owner||!p||html===null)return
    const draft={user:owner,note:p.note,page:p.id,html,version:p.version,changed_at:Date.now()}
    const write=draftQueue.current.catch(()=>undefined).then(()=>writeLocalDraft(draft))
    draftQueue.current=write
    if(!await write)setMessage('This browser cannot retain a local draft. Copy your work and check your connection.')
  },[owner])

  const save=useCallback(async()=>{
    if(savingRef.current||conflictRef.current||!owner)return
    captureCurrent()
    const page=pageRef.current,html=dirtyHtmlRef.current
    if(!page||html===null)return
    const clean=sanitizeNoteHtml(html)
    if(noteBytes(clean)>PAGE_BYTES){
      setError('This page has reached its transfer size. Add another page and continue writing; the note has no overall word-count limit.')
      setSaveState('draft');await persistDraft();return
    }
    savingRef.current=true;setSaveState('saving');setError('')
    const requestId=crypto.randomUUID(), changesAtSave=changeSequence.current
    let failed=false
    try{
      const result=await notesWrite<SaveReply>({action:'page_save',id:page.id,version:page.version,request_id:requestId,html:clean})
      if(pageRef.current?.id===page.id)pageRef.current.version=result.version
      setDocumentData(previous=>previous?{...previous,pages:previous.pages.map(p=>p.id===page.id?{...p,version:result.version}:p)}:previous)
      retryDelay.current=1800
      if(pageRef.current?.id===page.id&&changeSequence.current===changesAtSave&&dirtyHtmlRef.current===html){
        if(draftTimer.current)clearTimeout(draftTimer.current)
        await draftQueue.current.catch(()=>undefined)
        if(changeSequence.current===changesAtSave&&dirtyHtmlRef.current===html){
          dirtyHtmlRef.current=null
          await clearLocalDraft(owner,page.note,page.id)
          setDirty(false);setSaveState('saved');setMessage('')
        }
      }else if(pageRef.current?.id===page.id)setSaveState('draft')
    }catch(e){
      failed=true
      if(pageRef.current?.id===page.id){
        conflictRef.current=e instanceof HostingerApiError&&e.status===409
        setSaveState(conflictRef.current?'conflict':'offline')
        setError(e instanceof Error?e.message:'Cloud save unavailable. Your draft remains on this device.')
      }
      await persistDraft()
    }finally{
      savingRef.current=false
      if(pageRef.current?.id===page.id&&dirtyHtmlRef.current!==null&&!conflictRef.current){
        if(saveTimer.current)clearTimeout(saveTimer.current)
        const delay=failed?retryDelay.current:1450
        retryDelay.current=failed?Math.min(60000,retryDelay.current*2):1800
        if(navigator.onLine)saveTimer.current=setTimeout(()=>void save(),delay)
      }
    }
  },[owner,captureCurrent,persistDraft])

  const markChanged=useCallback(()=>{
    if(!owner||!pageRef.current||!editorRef.current)return
    changeSequence.current++
    // Mark dirty without serializing a potentially large rich-text DOM on every keypress.
    // Capture complete HTML only after a typing pause, before saving, or when leaving.
    dirtyHtmlRef.current=''
    setDirty(true)
    if(!conflictRef.current)setSaveState('draft')
    if(draftTimer.current)clearTimeout(draftTimer.current)
    draftTimer.current=setTimeout(()=>{captureCurrent();void persistDraft()},220)
    if(!conflictRef.current){
      if(saveTimer.current)clearTimeout(saveTimer.current)
      saveTimer.current=setTimeout(()=>void save(),1450)
    }
  },[owner,captureCurrent,persistDraft,save])

  useEffect(()=>{
    const online=()=>{if(dirtyHtmlRef.current!==null&&!conflictRef.current){if(saveTimer.current)clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>void save(),350)}}
    window.addEventListener('online',online)
    return()=>window.removeEventListener('online',online)
  },[save])

  // Lightweight remote metadata check: no full document download on every poll.
  useEffect(()=>{
    if(!owner)return
    let stopped=false
    const tick=async()=>{
      if(stopped||document.visibilityState!=='visible'||!navigator.onLine)return
      void loadListRef.current(false)
      const open=pageRef.current
      if(!open||!selectedNote||dirtyHtmlRef.current!==null||savingRef.current)return
      try{
        const meta=await notesRequest<NoteView>('?view=note&id='+encodeURIComponent(selectedNote))
        const newer=meta.pages.find(p=>p.id===open.id&&!p.deleted_at)
        if(!newer||newer.version===open.version||stopped||dirtyHtmlRef.current!==null)return
        const remote=await notesRequest<PageView>('?view=page&id='+encodeURIComponent(open.id))
        if(stopped||pageRef.current?.id!==open.id||dirtyHtmlRef.current!==null)return
        if(editorRef.current)editorRef.current.innerHTML=sanitizeNoteHtml(remote.page.content_html)
        pageRef.current.version=remote.page.version
        setDocumentData({note:meta.note,pages:meta.pages})
        setMessage('This page was updated from another signed-in device.')
        setSaveState('saved')
      }catch{/* Temporary network interruptions do not replace existing writing. */}
    }
    const timer=window.setInterval(()=>{void tick()},30000)
    const visible=()=>{if(document.visibilityState==='visible')void tick()}
    document.addEventListener('visibilitychange',visible)
    return()=>{stopped=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible)}
  },[owner,selectedNote])

  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{
      if(dirtyHtmlRef.current!==null){
        event.preventDefault()
        event.returnValue=''
      }
    }
    window.addEventListener('beforeunload',warn)
    return()=>window.removeEventListener('beforeunload',warn)
  },[])

  useEffect(()=>()=>{
    if(saveTimer.current)clearTimeout(saveTimer.current)
    if(draftTimer.current)clearTimeout(draftTimer.current)
    if(dirtyHtmlRef.current!==null)void persistDraft()
  },[persistDraft])

  function keepSelection(){
    const selection=window.getSelection()
    if(selection?.rangeCount && editorRef.current?.contains(selection.anchorNode))rangeRef.current=selection.getRangeAt(0).cloneRange()
  }
  function format(command:string,value?:string){
    const editor=editorRef.current
    if(!editor || !pageRef.current)return
    editor.focus()
    if(rangeRef.current){
      const selection=window.getSelection()
      selection?.removeAllRanges()
      try{selection?.addRange(rangeRef.current)}catch{/* selection moved */}
    }
    document.execCommand(command,false,value)
    keepSelection();markChanged()
  }
  // Both the Paste button and keyboard paste use one safe insertion path.
  // Restore the last editor caret when clicking a toolbar button moves focus.
  function editorRange(editor:HTMLDivElement):Range{
    const selection=window.getSelection()
    const live=selection?.rangeCount?selection.getRangeAt(0):null
    const saved=rangeRef.current
    const valid=(range:Range|null)=>!!range&&editor.contains(range.commonAncestorContainer)
    const range=valid(live)?live!.cloneRange():valid(saved)?saved!.cloneRange():document.createRange()
    if(!valid(live)&&!valid(saved)){range.selectNodeContents(editor);range.collapse(false)}
    selection?.removeAllRanges()
    selection?.addRange(range)
    return range
  }
  function insertClipboardContent(html:string,plain:string):boolean{
    const editor=editorRef.current
    if(!editor||!editor.isContentEditable||!pageRef.current||readingMode||loadingPage||busy||documentData?.note.deleted_at)return false
    let clean=html?sanitizeNoteHtml(html):''
    if(!clean.trim()&&plain){
      // Preserve line breaks and special characters without interpreting copied text as HTML.
      const escaped=document.createElement('div')
      escaped.textContent=plain
      clean=escaped.innerHTML.replace(/\r\n?|\n/g,'<br>')
    }
    if(!clean.trim())return false
    editor.focus()
    const range=editorRange(editor)
    const before=editor.innerHTML
    let inserted=false
    try{inserted=document.execCommand('insertHTML',false,clean)&&editor.innerHTML!==before}catch{/* Use DOM range insertion below. */}
    if(!inserted){
      // Some browsers silently ignore execCommand or return false for rich clipboard data.
      const fragment=range.createContextualFragment(clean)
      const last=fragment.lastChild
      range.deleteContents()
      range.insertNode(fragment)
      if(last){range.setStartAfter(last);range.collapse(true)}
      const selection=window.getSelection()
      selection?.removeAllRanges();selection?.addRange(range)
    }
    keepSelection()
    markChanged()
    return true
  }
  function paste(event:ClipboardEvent<HTMLDivElement>){
    if(!editorRef.current?.isContentEditable)return
    event.preventDefault()
    if(!insertClipboardContent(event.clipboardData.getData('text/html'),event.clipboardData.getData('text/plain'))){
      setError('Nothing readable was found on the clipboard. Copy some text and try again.')
    }
  }
  async function pasteFromClipboard(){
    if(!editorRef.current?.isContentEditable||!pageRef.current)return
    setError('')
    if(!navigator.clipboard){
      setError('Clipboard access is unavailable here. Click inside the note and use Ctrl+V (Windows) or Command+V (Mac).')
      editorRef.current.focus()
      return
    }
    try{
      let html='',plain=''
      if(typeof navigator.clipboard.read==='function'){
        try{
          const items=await navigator.clipboard.read()
          for(const item of items){
            if(!html&&item.types.includes('text/html'))html=await(await item.getType('text/html')).text()
            if(!plain&&item.types.includes('text/plain'))plain=await(await item.getType('text/plain')).text()
          }
        }catch(error){
          if(typeof navigator.clipboard.readText!=='function')throw error
          plain=await navigator.clipboard.readText()
        }
      }else if(typeof navigator.clipboard.readText==='function'){
        plain=await navigator.clipboard.readText()
      }
      if(!html&&!plain){
        setError('Clipboard is empty or contains no supported text. Copy the note content first.')
      }else if(insertClipboardContent(html,plain)){
        setMessage('Pasted into this page. Changes are being saved to your account.')
      }else{
        setError('Could not insert into this page. Open an editable note and try again.')
      }
    }catch{
      setError('Your browser blocked clipboard access. Allow clipboard permission, or click in the note and use Ctrl+V (Windows) / Command+V (Mac).')
      editorRef.current?.focus()
    }
  }
  async function mutation(body:Record<string,unknown>,onSuccess?:()=>void){
    setBusy(true);setError('')
    try{await notesWrite<IdReply>(body);await loadListRef.current(false);onSuccess?.()}
    catch(e){setError(e instanceof Error?e.message:'Could not save this change.')}
    finally{setBusy(false)}
  }
  async function createNote(){
    if(!owner||busy||!await canLeaveCurrent())return
    setBusy(true);setError('')
    try{
      const result=await notesWrite<IdReply>({action:'note_create',title:'Untitled note',folder_id:selectedFolder})
      await loadListRef.current(false)
      setSelectedNote(result.id);void loadDocument(result.id)
    }catch(e){setError(e instanceof Error?e.message:'Unable to create note.')}
    finally{setBusy(false)}
  }
  async function canLeaveCurrent():Promise<boolean>{
    captureCurrent()
    if(dirtyHtmlRef.current===null)return true
    await persistDraft()
    if(!conflictRef.current)await save()
    if(dirtyHtmlRef.current===null)return true
    return window.confirm('This page still has unsynced changes. A device draft has been kept where supported. Leave it without a confirmed cloud save?')
  }
  async function changeFolder(id:string|null, showTrash:boolean){
    if(!await canLeaveCurrent())return
    setReadingMode(false);setSelectedFolder(id);setTrash(showTrash);setSelectedNote(null);setDocumentData(null)
  }
  async function createPage(){
    if(!selectedNote||busy||!await canLeaveCurrent())return
    setBusy(true)
    try{
      const reply=await notesWrite<IdReply>({action:'page_create',note_id:selectedNote})
      const doc=await notesRequest<NoteView>('?view=note&id='+encodeURIComponent(selectedNote))
      setDocumentData({note:doc.note,pages:doc.pages})
      setSelectedPage(reply.id);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to create a page.')}
    finally{setBusy(false)}
  }
  async function switchPage(id:string){
    if(id===selectedPage||!await canLeaveCurrent())return
    setSelectedPage(id)
  }
  async function selectNote(id:string){
    if(id===selectedNote||!await canLeaveCurrent())return
    setReadingMode(false)
    setSelectedNote(id)
    void loadDocument(id)
  }
  async function saveTitle(){
    if(!documentData||!selectedNote||!title.trim()||title.trim()===documentData.note.title)return
    await mutation({action:'note_update',id:selectedNote,title:title.trim()},()=>setDocumentData(old=>old?{...old,note:{...old.note,title:title.trim()}}:old))
  }
  async function saveFolder(event:FormEvent){
    event.preventDefault()
    if(!folderForm)return
    const body=folderForm.id
      ? {action:'folder_update',id:folderForm.id,name:folderForm.name,parent_id:folderForm.parent_id}
      : {action:'folder_create',name:folderForm.name,parent_id:folderForm.parent_id}
    await mutation(body,()=>setFolderForm(null))
  }
  async function openHistory(){
    if(!selectedPage)return
    try {
      const data=await notesRequest<HistoryReply>('?view=history&id='+encodeURIComponent(selectedPage))
      setHistory(data.revisions);setHistoryPreview(null)
    }catch(e){setError(e instanceof Error?e.message:'Could not open note history.')}
  }
  async function previewRevision(version:number){
    if(!selectedPage)return
    try{
      const data=await notesRequest<RevisionReply>('?view=revision&id='+encodeURIComponent(selectedPage)+'&version='+version)
      setHistoryPreview({version,html:sanitizeNoteHtml(data.revision.content_html)})
    }catch(e){setError(e instanceof Error?e.message:'Could not load this version.')}
  }
  async function restoreRevision(){
    const p=pageRef.current
    if(!p||!historyPreview||dirtyHtmlRef.current!==null)return
    setBusy(true)
    try{
      const data=await notesWrite<SaveReply>({action:'page_restore_revision',id:p.id,version:p.version,revision:historyPreview.version,request_id:crypto.randomUUID()})
      pageRef.current={...p,version:data.version}
      setDocumentData(old=>old?{...old,pages:old.pages.map(page=>page.id===p.id?{...page,version:data.version}:page)}:old)
      if(editorRef.current)editorRef.current.innerHTML=historyPreview.html
      setHistory(null);setHistoryPreview(null);setError('');setSaveState('saved')
    }catch(e){setError(e instanceof Error?e.message:'Restore failed. Nothing was overwritten.')}
    finally{setBusy(false)}
  }
  async function preserveConflictAsPage(){
    const html=dirtyHtmlRef.current
    if(!selectedNote||html===null)return
    await persistDraft()
    setBusy(true)
    try{
      const result=await notesWrite<IdReply>({action:'page_create',note_id:selectedNote})
      const response=await notesWrite<SaveReply>({action:'page_save',id:result.id,version:1,request_id:crypto.randomUUID(),html})
      await clearLocalDraft(owner,selectedNote,pageRef.current?.id??'')
      const doc=await notesRequest<NoteView>('?view=note&id='+encodeURIComponent(selectedNote))
      setDocumentData({note:doc.note,pages:doc.pages})
      conflictRef.current=false;dirtyHtmlRef.current=null;setDirty(false)
      setSelectedPage(result.id)
      setMessage('Your conflicting draft was preserved as a separate page (version '+response.version+').')
    }catch(e){setError(e instanceof Error?e.message:'Could not preserve this draft. Keep the device open or copy the text.')}
    finally{setBusy(false)}
  }

  const allPages=documentData?.pages.filter(p=>!p.deleted_at)??[]
  const currentIndex=allPages.findIndex(p=>p.id===selectedPage)
  const visibleNotes=notes.filter(note=>trash||(!note.deleted_at && (search.trim()!==''||(note.folder_id===selectedFolder && folderIsVisible(note.folder_id)))))
  const folderTree=(parent:string|null,level:number):ReactNode=>folders.filter(f=>f.parent_id===parent && !f.deleted_at).map(f=><div key={f.id} className="notes-tree-node">
    <div className="notes-folder-row" style={{paddingLeft:(level-1)*12}}>
      <button type="button" className={'notes-folder-button'+(selectedFolder===f.id?' active':'')} onClick={()=>void changeFolder(f.id,false)}><Folder size={16}/><span>{f.name}</span></button>
      <button className="notes-small-icon" title={'Edit '+f.name} aria-label={'Edit '+f.name} onClick={()=>setFolderForm({id:f.id,name:f.name,parent_id:f.parent_id})}><Pencil size={14}/></button>
    </div>
    {level<5&&folderTree(f.id,level+1)}
  </div>)

  const ToolbarButton=({label,command,value,children}:{label:string;command:string;value?:string;children:ReactNode})=><button type="button" disabled={loadingPage||!selectedPage||busy} title={label} aria-label={label} className={toolStyle} onMouseDown={event=>event.preventDefault()} onClick={()=>format(command,value)}>{children}</button>

  return <main className="vista-notes" aria-label="My VISTA Notes">
    <header className="notes-main-header">
      <div><p className="notes-eyebrow">YOUR PRIVATE STUDY NOTEBOOK</p><h1>My Notes</h1><p>Organise subjects, write freely and sync across your devices.</p></div>
      <div className="notes-header-actions"><button type="button" onClick={()=>void loadList(false)} title="Refresh notes"><RefreshCw size={17}/> Refresh</button><button type="button" className="notes-primary" onClick={()=>void createNote()} disabled={busy||trash}><Plus size={17}/> New note</button></div>
    </header>
    <div className="notes-grid">
      <aside className="notes-folders" aria-label="Note folders">
        <div className="notes-pane-heading"><strong>Folders</strong><button type="button" title="New folder" disabled={trash} onClick={()=>setFolderForm({id:null,name:'',parent_id:selectedFolder})}><FolderPlus size={18}/></button></div>
        <button type="button" className={'notes-folder-button notes-root'+(!selectedFolder&&!trash?' active':'')} onClick={()=>void changeFolder(null,false)}><FolderOpen size={17}/> All notes at root</button>
        <div className="notes-folder-scroll">{folderTree(null,1)}</div>
        <button type="button" className={'notes-folder-button notes-trash'+(trash?' active':'')} onClick={()=>void changeFolder(null,!trash)}><Trash2 size={17}/> Recently deleted</button>
        <p className="notes-folder-hint">Up to five folder levels. Create as many notes and pages as you need.</p>
      </aside>
      <section className="notes-list-pane" aria-label="Your notes">
        <div className="notes-search"><Search size={16}/><input aria-label="Search note titles" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search note titles…"/></div>
        <div className="notes-pane-heading"><strong>{trash?'Deleted notes':selectedFolder?foldersById.get(selectedFolder)?.name||'Folder':'Notes'}</strong><span>{visibleNotes.length}{hasMore?'+':''}</span></div>
        {trash&&folders.filter(f=>f.deleted_at).map(f=><div key={f.id} className="notes-list-card"><span><Folder size={16}/> {f.name}</span><button onClick={()=>void mutation({action:'folder_restore',id:f.id})}><RotateCcw size={15}/> Restore folder</button></div>)}
        <div className="notes-list-scroll">{visibleNotes.map(note=><div key={note.id} className={'notes-list-card'+(selectedNote===note.id?' selected':'')}>
          <button type="button" className="notes-select-note" onClick={()=>void selectNote(note.id)}><strong>{note.pinned&&<Pin size={13}/>} {note.title}</strong><small>{fmtTime(note.updated_at)}</small></button>
          {trash?<button title="Restore note" onClick={()=>void mutation({action:'note_restore',id:note.id})}><RotateCcw size={16}/></button>
          :<button title={note.pinned?'Unpin note':'Pin note'} onClick={()=>void mutation({action:'note_update',id:note.id,pinned:!note.pinned})}>{note.pinned?<PinOff size={16}/>:<Pin size={16}/>}</button>}
        </div>)}
        {visibleNotes.length===0&&<p className="notes-empty">{trash?'No deleted notes.':'No notes in this folder yet. Create your first note.'}</p>}
        {hasMore&&<button type="button" className="notes-loadmore" onClick={()=>void loadList(true)} disabled={busy}>Load more notes</button>}
        </div>
      </section>
      <section className={"notes-editor-pane"+(readingMode?" notes-reading-mode":"")} aria-label={readingMode?"Full-screen note reader":"Note editor"}>
        {!selectedNote||!documentData?<div className="notes-editor-empty"><FileText size={39}/><h2>Room for every idea.</h2><p>Select a note or create a new one. Each page is saved to your account separately.</p><button type="button" className="notes-primary" onClick={()=>void createNote()} disabled={busy||trash}><Plus size={16}/> Create note</button></div>
        :<>
          <div className="notes-document-top">
            <input aria-label="Note title" className="notes-title" value={title} readOnly={readingMode} onChange={e=>setTitle(e.target.value)} onBlur={()=>void saveTitle()} disabled={busy||!!documentData.note.deleted_at} maxLength={255}/>
            <div className="notes-document-actions">
              <span className={'notes-status '+saveState} role="status">{saveState==='saved'?<CheckCircle2 size={15}/>:saveState==='offline'||saveState==='conflict'?<CloudOff size={15}/>:<Cloud size={15}/>}
                {saveState==='saved'?'Saved to account':saveState==='saving'?'Saving…':saveState==='conflict'?'Save conflict':saveState==='offline'?'Offline draft':saveState==='draft'?'Unsynced changes':'Loading…'}
              </span>
              <button type="button" className="notes-reading-toggle" title={readingMode?'Exit full-screen reading':'Read full screen'} aria-label={readingMode?'Exit full-screen reading':'Read full screen'} aria-pressed={readingMode} onClick={()=>setReadingMode(value=>!value)}>{readingMode?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button>
              <button type="button" title="Page history" onClick={()=>void openHistory()}><History size={17}/></button>
              <button type="button" title="Move note to trash" disabled={busy||!!documentData.note.deleted_at} onClick={()=>{void (async()=>{if(!await canLeaveCurrent())return;if(window.confirm('Move this note to Recently deleted?'))await mutation({action:'note_trash',id:selectedNote},()=>{setSelectedNote(null);setDocumentData(null)})})()}}><Trash2 size={17}/></button>
            </div>
          </div>
          <div className="notes-document-location"><label>Folder <select aria-label="Move note to folder" value={documentData.note.folder_id??''} disabled={busy||!!documentData.note.deleted_at} onChange={e=>void mutation({action:'note_update',id:selectedNote,folder_id:e.target.value||null},()=>setDocumentData(current=>current?{...current,note:{...current.note,folder_id:e.target.value||null}}:current))}><option value="">Root</option>{folders.filter(f=>!f.deleted_at&&folderIsVisible(f.id)).map(f=><option value={f.id} key={f.id}>{'— '.repeat(Math.max(0,f.depth-1))+f.name}</option>)}</select></label>
            <small>{documentData.pages.length} {documentData.pages.length===1?'page':'pages'}</small></div>
          <div className="notes-toolbar" role="toolbar" aria-label="Text formatting">
            <button type="button" className="notes-paste-button" aria-label="Paste clipboard into note" title="Paste copied text at the cursor" onMouseDown={event=>event.preventDefault()} onClick={()=>void pasteFromClipboard()} disabled={readingMode||loadingPage||busy||!selectedPage||!!documentData.note.deleted_at}><ClipboardPaste size={16}/> Paste</button>
            <ToolbarButton label="Bold" command="bold"><Bold size={17}/></ToolbarButton>
            <ToolbarButton label="Italic" command="italic"><Italic size={17}/></ToolbarButton>
            <ToolbarButton label="Underline" command="underline"><Underline size={17}/></ToolbarButton>
            <ToolbarButton label="Strikethrough" command="strikeThrough"><Strikethrough size={17}/></ToolbarButton>
            <label className="notes-select-tool">Font <select aria-label="Font family" defaultValue="Arial" onChange={e=>format('fontName',e.target.value)}><option>Arial</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Tahoma</option><option>Courier New</option><option>Trebuchet MS</option></select></label>
            <label className="notes-select-tool">Size <select aria-label="Font size" defaultValue="3" onChange={e=>format('fontSize',e.target.value)}>{[['1','10'],['2','13'],['3','16'],['4','18'],['5','24'],['6','32'],['7','48']].map(([v,label])=><option value={v} key={v}>{label}</option>)}</select></label>
            <label className="notes-select-tool">Style <select aria-label="Paragraph style" defaultValue="p" onChange={e=>format('formatBlock',e.target.value)}>{[['p','Normal'],['h1','Heading 1'],['h2','Heading 2'],['h3','Heading 3'],['h4','Heading 4'],['blockquote','Quote']].map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
            <label className="notes-color-tool" title="Text color"><span>Text</span><input aria-label="Text color" type="color" defaultValue="#172c27" onChange={e=>format('foreColor',e.target.value)}/></label>
            <label className="notes-color-tool" title="Highlight color"><Highlighter size={16}/><input aria-label="Highlight color" type="color" defaultValue="#fff2a8" onChange={e=>format('hiliteColor',e.target.value)}/></label>
            <ToolbarButton label="Bullet list" command="insertUnorderedList"><List size={17}/></ToolbarButton>
            <ToolbarButton label="Numbered list" command="insertOrderedList"><ListOrdered size={17}/></ToolbarButton>
            <ToolbarButton label="Align left" command="justifyLeft"><AlignLeft size={17}/></ToolbarButton>
            <ToolbarButton label="Center" command="justifyCenter"><AlignCenter size={17}/></ToolbarButton>
            <ToolbarButton label="Align right" command="justifyRight"><AlignRight size={17}/></ToolbarButton>
            <ToolbarButton label="Justify" command="justifyFull"><AlignJustify size={17}/></ToolbarButton>
            <ToolbarButton label="Superscript" command="superscript"><Superscript size={17}/></ToolbarButton>
            <ToolbarButton label="Subscript" command="subscript"><Subscript size={17}/></ToolbarButton>
            <ToolbarButton label="Insert divider" command="insertHorizontalRule">—</ToolbarButton>
            <ToolbarButton label="Insert table" command="insertHTML" value="<table><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr><tr><td>Cell 3</td><td>Cell 4</td></tr></tbody></table>"><Table2 size={17}/></ToolbarButton>
            <button type="button" className={toolStyle} title="Insert link" onMouseDown={e=>e.preventDefault()} onClick={()=>{const url=window.prompt('Enter a secure website link (https://)');if(url?.startsWith('https://'))format('createLink',url)}}><Link2 size={17}/></button>
            <ToolbarButton label="Block quote" command="formatBlock" value="blockquote"><Quote size={17}/></ToolbarButton>
            <ToolbarButton label="Undo" command="undo"><Undo2 size={17}/></ToolbarButton>
            <ToolbarButton label="Redo" command="redo"><Redo2 size={17}/></ToolbarButton>
          </div>
          {saveState==='conflict'&&<div className="notes-warning"><AlertTriangle size={18}/><div><strong>A different device saved this page.</strong><p>Your version is preserved in a local draft. Copy it or save it to a new page. The newer cloud copy will not be overwritten.</p><button type="button" onClick={()=>void preserveConflictAsPage()} disabled={busy}>Preserve my draft as a new page</button></div></div>}
          <div className="notes-editor-scroll cssv-note-watermark">
            <div
              ref={editorRef} className="notes-rich-editor cssv-note-watermark-content" aria-label={readingMode?"Read your note":"Write your note"} role="textbox"
              aria-multiline="true" contentEditable={!readingMode&&!loadingPage&&!busy&&!documentData.note.deleted_at}
              suppressContentEditableWarning spellCheck
              onInput={markChanged} onPaste={paste} onDrop={event=>event.preventDefault()}
              onMouseUp={keepSelection} onKeyUp={keepSelection}
              data-placeholder={loadingPage?'Loading page…':'Start writing here…'}
            />
          </div>
          <div className="notes-page-footer">
            <div className="notes-pages">
              <button type="button" aria-label="Previous page" disabled={currentIndex<=0} onClick={()=>void switchPage(allPages[currentIndex-1].id)}><ChevronLeft size={17}/></button>
              <span>Page {Math.max(1,currentIndex+1)} of {allPages.length}</span>
              <button type="button" aria-label="Next page" disabled={currentIndex<0||currentIndex>=allPages.length-1} onClick={()=>void switchPage(allPages[currentIndex+1].id)}><ChevronRight size={17}/></button>
            </div>
            <div className="notes-page-footer-actions">
              <button type="button" onClick={()=>void save()} disabled={!dirty||busy||saveState==='conflict'}>Save now</button>
              <button type="button" className="notes-primary" onClick={()=>void createPage()} disabled={busy||!!documentData.note.deleted_at}><Plus size={16}/> Add page</button>
            </div>
          </div>
          <p className="notes-storage-note">No total word limit. Notes grow through additional pages. Each page is saved separately for faster editing, subject to storage availability and a 2 MiB per-page transfer limit.</p>
        </>}
      </section>
    </div>
    {(error||message)&&<div className={'notes-message'+(error?' error':'')} role="alert"><span>{error||message}</span><button type="button" aria-label="Dismiss message" onClick={()=>{setError('');setMessage('')}}><X size={15}/></button></div>}
    {folderForm&&<div className="notes-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setFolderForm(null)}}><form className="notes-modal" onSubmit={event=>void saveFolder(event)} aria-label="Folder settings"><h2>{folderForm.id?'Edit folder':'New folder'}</h2><label>Name <input autoFocus required maxLength={180} value={folderForm.name} onChange={e=>setFolderForm({...folderForm,name:e.target.value})}/></label><label>Inside <select value={folderForm.parent_id??''} onChange={e=>setFolderForm({...folderForm,parent_id:e.target.value||null})}><option value="">Root level</option>{folders.filter(f=>!f.deleted_at&&f.id!==folderForm.id&&folderIsVisible(f.id)).map(f=><option value={f.id} key={f.id}>{'— '.repeat(Math.max(0,f.depth-1))+f.name}</option>)}</select></label><div className="notes-modal-actions">{folderForm.id&&<button type="button" onClick={()=>{if(window.confirm('Move this folder to Recently deleted? Its notes remain recoverable.'))void mutation({action:'folder_trash',id:folderForm.id},()=>{setFolderForm(null);setSelectedFolder(null)})}}><Trash2 size={16}/> Delete</button>}<button type="button" onClick={()=>setFolderForm(null)}>Cancel</button><button className="notes-primary" type="submit" disabled={busy}>Save folder</button></div></form></div>}
    {history&&<div className="notes-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setHistory(null)}}><section className="notes-modal notes-history" aria-label="Version history"><div className="notes-pane-heading"><h2>Page history</h2><button onClick={()=>setHistory(null)} aria-label="Close history"><X size={18}/></button></div>{history.length?history.map(row=><button key={row.version} className="notes-history-row" onClick={()=>void previewRevision(row.version)}>Version {row.version} — {fmtTime(row.created_at)}</button>):<p>No earlier versions yet.</p>}{historyPreview&&<><h3>Version {historyPreview.version}</h3><div className="notes-history-preview" dangerouslySetInnerHTML={{__html:sanitizeNoteHtml(historyPreview.html)}}/><button type="button" className="notes-primary" onClick={()=>void restoreRevision()} disabled={dirty||busy}>Restore this version</button></>}<p className="notes-storage-note">Restoring creates a new version and preserves the current page in history.</p></section></div>}
  </main>
}
