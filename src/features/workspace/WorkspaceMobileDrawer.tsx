import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Activity, BookOpen, BookMarked, CalendarDays, ChartNoAxesCombined, Compass, Dumbbell, Home, LibraryBig, LogOut, PenLine, Settings, X } from 'lucide-react'
import { sections } from './registry'
import type { LucideIcon } from 'lucide-react'

const sectionIcons:LucideIcon[] = [Home, CalendarDays, BookOpen, PenLine, ChartNoAxesCombined, LibraryBig, Settings]
const extras:{to:string;label:string;icon:LucideIcon;hint:string}[] = [
 {to:'/account/fitness-coach',label:'My Fitness Coach',icon:Dumbbell,hint:'Food, workouts & target'},
 {to:'/account/gsa-tutor',label:'GSA Tutor',icon:BookMarked,hint:'Your science course'},
 {to:'/account/resources',label:'My Vista Resources',icon:BookOpen,hint:'Study material and downloads'},
 {to:'/account/directory',label:'Find All Features',icon:Compass,hint:'Search every tool'},
 {to:'/account/more',label:'More Account Features',icon:Activity,hint:'Full workspace menu'},
]
export default function WorkspaceMobileDrawer({onClose,onLogout,busy}:{onClose:()=>void;onLogout:()=>void;busy:boolean}){
 const drawer=useRef<HTMLElement>(null)
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null
  const original=document.body.style.overflow
  document.body.style.overflow='hidden'
  drawer.current?.querySelector<HTMLElement>('[data-drawer-close]')?.focus()
  function key(event:KeyboardEvent){
   if(event.key==='Escape'){event.preventDefault();onClose();return}
   if(event.key!=='Tab'||!drawer.current)return
   const focusables=Array.from(drawer.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'))
   const first=focusables[0],last=focusables[focusables.length-1]
   if(!first||!last)return
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
  document.addEventListener('keydown',key)
  return ()=>{document.body.style.overflow=original;document.removeEventListener('keydown',key);previous?.focus()}
 },[onClose])
 const link=(to:string,label:string,Icon:LucideIcon,hint?:string)=><Link key={to} to={to} onClick={onClose} className="ws-drawer-link"><Icon size={20} aria-hidden="true"/><span><strong>{label}</strong>{hint&&<small>{hint}</small>}</span></Link>
 return <div className="ws-drawer-layer">
   <button className="ws-drawer-backdrop" type="button" onClick={onClose} aria-label="Close account menu"/>
   <aside ref={drawer} className="ws-drawer-panel" role="dialog" aria-modal="true" aria-label="My CSS Vista account menu">
     <div className="ws-drawer-top"><div><span className="ws-drawer-eyebrow">MY CSS VISTA</span><h2>Account menu</h2></div><button type="button" data-drawer-close className="ws-drawer-close" aria-label="Close account menu" onClick={onClose}><X size={21}/></button></div>
     <nav aria-label="My account sections">
       <p className="ws-drawer-heading">Workspace</p>
       {sections.map((section,i)=>link(section.to,section.title,sectionIcons[i]))}
       <p className="ws-drawer-heading">More tools</p>
       {extras.map(e=>link(e.to,e.label,e.icon,e.hint))}
     </nav>
     <div className="ws-drawer-bottom"><Link to="/" onClick={onClose}>Visit CSS Vista website</Link><button type="button" disabled={busy} onClick={()=>{onClose();onLogout()}}><LogOut size={17}/>{busy?'Signing out…':'Sign out'}</button></div>
   </aside>
 </div>
}
