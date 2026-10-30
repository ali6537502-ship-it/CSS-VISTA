import { BookOpen, Globe2, Landmark, FlaskConical, PenLine, Languages, Leaf, Scale, FileText, ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
export const subjectVisual = (name: string): { icon: LucideIcon; tone: string; label: string } => {
  if (/english|essay|precis/i.test(name)) return {icon:PenLine,tone:'lavender',label:'Language & expression'}
  if (/general science|ability|chemistry|physics|computer science/i.test(name)) return {icon:FlaskConical,tone:'blue',label:'Science & discovery'}
  if (/environment|agriculture|botany/i.test(name)) return {icon:Leaf,tone:'mint',label:'Environment & systems'}
  if (/affairs|history|political/i.test(name)) return {icon:Globe2,tone:/pakistan/i.test(name)?'mint':'peach',label:'People & perspectives'}
  if (/law|criminology/i.test(name)) return {icon:Scale,tone:'blue',label:'Law & society'}
  if (/punjabi|urdu|sindhi|arabic|persian/i.test(name)) return {icon:Languages,tone:'lavender',label:'Language & culture'}
  return {icon:Landmark,tone:'mint',label:'Ideas & understanding'}
}
export function ProgressRing({ value, total, label }: { value: number; total: number; label: string }) {
  const percent = total > 0 ? Math.max(0,Math.min(100,value/total*100)) : null
  return <div className="ws-ring" role="img" aria-label={total > 0 ? `${label}: ${value} of ${total}` : `${label}: no records`}><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="41" className="ws-ring-track"/><circle cx="50" cy="50" r="41" className="ws-ring-fill" strokeDasharray={`${(percent ?? 0)*2.576} 257.6`}/></svg><span>{percent === null ? <BookOpen size={25}/> : <>{Math.round(percent)}<small>%</small></>}</span></div>
}
export function ResourceCover({ kind, tone = 'lavender' }: { kind: string; tone?: string }) {
  return <div className={`ws-resource-cover ws-tone-${tone}`} aria-hidden="true"><div className="ws-paper-cover"><FileText size={23}/><i/><i/><i/><b>{kind}</b></div><ArrowUpRight size={19} className="ws-cover-arrow"/></div>
}
