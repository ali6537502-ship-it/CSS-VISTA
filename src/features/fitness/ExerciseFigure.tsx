import { Activity, Footprints, HeartPulse } from 'lucide-react'

/** Original schematic position cues. Not a substitute for linked technique demonstrations. */
const VISUALS:Record<string,{title:string;first:string;second:string;points:string[];emoji:string}>={
  squat:{title:'Squat',first:'Standing',second:'Lower toward chair',points:['Feet steady','Hips move back','Stand up with control'],emoji:'🪑'},
  wallpush:{title:'Wall press-up',first:'Arms extended',second:'Chest toward wall',points:['Hands on firm wall','Body stays straight','Push away slowly'],emoji:'🧱'},
  push:{title:'Incline press-up',first:'Hands on firm surface',second:'Elbows bend',points:['Use secure surface','Avoid sagging hips','Push away steadily'],emoji:'💪'},
  bridge:{title:'Glute bridge',first:'Hips down',second:'Hips up',points:['Knees remain bent','Raise hips gently','Do not arch the back'],emoji:'🧘'},
  bird:{title:'Bird dog',first:'Hands and knees',second:'Opposite arm / leg',points:['Move slowly','Keep hips level','Alternate sides'],emoji:'🐦'},
  lunge:{title:'Reverse step',first:'Stand supported',second:'Small step backward',points:['Hold a solid support','Step back only as far as comfortable','Return tall'],emoji:'🦵'},
  calf:{title:'Calf raise',first:'Feet flat',second:'Heels lifted',points:['Hold firm support','Raise heels','Lower slowly'],emoji:'👣'},
  hinge:{title:'Hip hinge',first:'Stand upright',second:'Hips backward',points:['Keep spine neutral','Hips move backward','Stand tall'],emoji:'↩️'},
  side:{title:'Side leg raise',first:'Side lying',second:'Top leg rises',points:['Keep hips stacked','Move top leg slowly','Avoid twisting'],emoji:'🦵'},
  plank:{title:'Knee plank',first:'Forearms / knees',second:'Hold position',points:['Breathe steadily','Maintain trunk alignment','Stop if uncomfortable'],emoji:'🧘'},
  march:{title:'March',first:'Stand comfortably',second:'Step in place',points:['Keep a comfortable pace','Breathe naturally','Slow down if needed'],emoji:'🚶'},
  reach:{title:'Shoulder reach',first:'Arms lowered',second:'Arms raise slowly',points:['Do not shrug','Move without pain','Lower gently'],emoji:'🙆'},
}
export function ExerciseFigure({exerciseId,label}:{exerciseId:string;label:string}){
  const data=VISUALS[exerciseId]
  if(exerciseId==='rest')return <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl bg-emerald-50 p-5 text-center text-emerald-950"><HeartPulse size={40}/><strong className="mt-2 text-xl">Recovery</strong><p className="mt-1 text-sm text-emerald-800">Breathe naturally. You can take more rest before continuing.</p></div>
  const info=data||VISUALS.march
  return <div className="rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50 to-white p-4">
    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Movement guide · {label}</p>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="flex min-h-32 flex-col items-center justify-center rounded-xl bg-white p-3 text-center"><span aria-hidden="true" className="text-4xl">{info.emoji}</span><span className="mt-2 text-xs font-bold text-slate-700">1. {info.first}</span></div>
      <div className="flex min-h-32 flex-col items-center justify-center rounded-xl bg-emerald-100 p-3 text-center"><span aria-hidden="true" className="text-4xl">{info.emoji}</span><span className="mt-2 text-xs font-bold text-slate-700">2. {info.second}</span></div>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">{info.points.map(p=><span key={p} className="rounded-full bg-white px-3 py-1 text-xs text-emerald-900">{p}</span>)}</div>
    <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-500"><Activity size={13}/>{data?'Textual position cues, not animated biomechanical instruction.':'Follow form notes and official technique links.'}</p>
  </div>
}
