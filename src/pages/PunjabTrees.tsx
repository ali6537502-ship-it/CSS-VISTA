import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BadgeCheck, Camera, CheckCircle2, ChevronRight, CircleHelp, CloudUpload, Eye, Globe2, HandHeart, Heart, Leaf, LogIn, LogOut, MapPin, Menu, ShieldCheck, Sprout, TreeDeciduous, Trophy, UserRound, X } from 'lucide-react'
import { compressImage, MAX_INPUT_BYTES } from '@/lib/photoCompression'
import { PUNJAB_MAP, projectPunjab } from '@/data/punjabTreeMap'
import './punjabTrees.css'

type Species = { name: string, scientific: string, category: string }
type Member = { name: string, city: string, has_photo: boolean, public_name: boolean, joined_at: string }
type Report = { id: string, species: string, method: string, quantity: number, city: string, locality: string, planted_on: string, status: string, review_note: string | null, full_name?: string, member_id?: string }
type Summary = { trees: number, seeds: number, contributors: number, cities: number, pending_reports: number, target: number, city_totals: { city: string, trees: number, seeds: number }[], leaderboard: { rank: number, name: string, city: string, trees: number }[] }
type Tab = 'overview' | 'contribute' | 'leaderboard' | 'account' | 'review'
const EMPTY: Summary = { trees: 0, seeds: 0, contributors: 0, cities: 0, pending_reports: 0, target: 100000000, city_totals: [], leaderboard: [] }
const API = '/api/trees/index.php?action='
const CITIES: [string, number, number][] = [
  ['Lahore', 74.3587, 31.5204], ['Faisalabad', 73.0851, 31.4504], ['Rawalpindi', 73.0479, 33.5651],
  ['Multan', 71.5249, 30.1575], ['Gujranwala', 74.1945, 32.1877], ['Sialkot', 74.5313, 32.4945],
  ['Sargodha', 72.6711, 32.0836], ['Bahawalpur', 71.6833, 29.3956], ['Rahim Yar Khan', 70.3015, 28.4212],
  ['Dera Ghazi Khan', 70.6403, 30.0489], ['Sahiwal', 73.1068, 30.6682], ['Okara', 73.4532, 30.8081],
  ['Jhelum', 73.7257, 32.9425], ['Kasur', 74.4467, 31.1167], ['Sheikhupura', 73.9783, 31.7131],
  ['Mianwali', 71.5264, 32.5849], ['Bhakkar', 71.0657, 31.6269], ['Chakwal', 72.853, 32.9328],
  ['Jhang', 72.3287, 31.2681], ['Khanewal', 71.9299, 30.3017], ['Lodhran', 71.6336, 29.5391],
  ['Vehari', 72.3525, 30.0445], ['Muzaffargarh', 71.1933, 30.0736], ['Attock', 72.3594, 33.7731],
  ['Narowal', 74.8737, 32.1024], ['Gujrat', 74.0789, 32.5731], ['Hafizabad', 73.6855, 32.0709],
  ['Toba Tek Singh', 72.4827, 30.9709], ['Chiniot', 72.9788, 31.72], ['Bahawalnagar', 73.2536, 29.9984],
  ['Rajanpur', 70.3255, 29.1041], ['Layyah', 70.9447, 30.9693], ['Pakpattan', 73.3866, 30.3437],
  ['Nankana Sahib', 73.702, 31.449], ['Khushab', 72.3524, 32.2967], ['Mandi Bahauddin', 73.4849, 32.5861],
  ['Jampur', 70.5958, 29.6424], ['Murree', 73.3928, 33.906], ['Wah Cantt', 72.7518, 33.7715],
  ['Kot Addu', 70.9695, 30.469], ['Shakargarh', 75.1605, 32.2635],
]
const fmt = (n: number) => new Intl.NumberFormat('en-PK').format(n)
const typeLabel = (method: string) => method === 'seed' ? 'Seed sown' : 'Nursery sapling'
const COMMONS = 'https://commons.wikimedia.org/w/api.php?'
const thumbs = new Map<string, string>()
function SpeciesPhoto({ scientific, name }: { scientific: string, name: string }) {
  const [url, setUrl] = useState(thumbs.get(scientific) || '')
  useEffect(() => {
    if (url) return
    let alive = true
    const query = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: scientific, gsrnamespace: '6', gsrlimit: '1', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '112', format: 'json', origin: '*' })
    fetch(COMMONS + query.toString()).then(r => r.ok ? r.json() : null).then(data => {
      const pages = Object.values(data?.query?.pages || {}) as { imageinfo?: { thumburl?: string, url?: string }[] }[]
      const src = pages[0]?.imageinfo?.[0]?.thumburl || ''
      if (src) { thumbs.set(scientific, src); if (alive) setUrl(src) }
    }).catch(() => {})
    return () => { alive = false }
  }, [scientific, url])
  return <span className="trees-species-photo">{url ? <img loading="lazy" src={url} alt={name} /> : <Leaf size={25} aria-hidden="true" />}</span>
}
async function getApi(action: string) {
  const r = await fetch(API + action, { credentials: 'same-origin', cache: 'no-store' })
  const data = await r.json()
  if (!r.ok || data.ok !== true) throw new Error(data.message || 'Please try again.')
  return data
}
async function postApi(action: string, body: Record<string, unknown> | FormData, csrf?: string) {
  const isForm = body instanceof FormData
  const r = await fetch(API + action, { method: 'POST', credentials: 'same-origin', headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: isForm ? body : JSON.stringify(body) })
  const data = await r.json()
  if (!r.ok || !data.ok) throw new Error(data.message || 'Request failed.')
  return data
}
async function compressPhoto(file: File, kb: number) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > MAX_INPUT_BYTES) throw new Error('Choose a JPG, PNG, or WebP photo smaller than 20 MB.')
  const result = await compressImage(file, kb)
  if (result.blob.size > kb * 1024) throw new Error('Photo is too large after compression.')
  return new File([result.blob], 'planting-photo.jpg', { type: 'image/jpeg' })
}
function Brand() {
  return <div className="trees-brand">
    <Link to="/" aria-label="CSS Vista website"><img className="trees-vista-logo" src="/images/logo.webp" alt="CSS Vista" /></Link>
    <span className="trees-brand-cross">×</span>
    <a className="trees-foundation-brand" href="https://esarulebad.org/" target="_blank" rel="noopener noreferrer">
      <img src="/images/esar-ul-ebad-logo.webp" alt="Esar-ul-Ebad Foundation official emblem" className="trees-foundation-logo" />
      <span>ESAR UL EBAD<br/><strong>WELFARE FOUNDATION</strong></span>
    </a>
  </div>
}
function PunjabMap({ summary }: { summary: Summary }) {
  const [selected, setSelected] = useState<string | null>(null)
  const cityPoints = useMemo(() => summary.city_totals.map((c) => {
    const coords = CITIES.find(v => v[0].toLowerCase() === c.city.toLowerCase())
    return coords ? { ...c, ...projectPunjab(coords[1], coords[2]) } : null
  }).filter((c): c is { city: string, trees: number, seeds: number, x: number, y: number } => !!c), [summary.city_totals])
  const focus = selected ? summary.city_totals.find(c => c.city === selected) : null
  return <div className="trees-map-panel">
    <div className="trees-section-head"><div><span className="trees-kicker">PUNJAB IMPACT ATLAS</span><h2>Every city. One greener future.</h2></div><span className="trees-light-tag"><span className="trees-live-dot" /> Verified records only</span></div>
    <div className="trees-map-grid">
      <div className="trees-map-canvas">
        <svg aria-label="Geographic outline of Punjab with city-level tree planting activity" viewBox={'0 0 ' + PUNJAB_MAP.width + ' ' + PUNJAB_MAP.height} role="img" preserveAspectRatio="xMidYMid meet">
          <defs><linearGradient id="trees-gradient" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#174d36"/><stop offset="1" stopColor="#073323"/></linearGradient></defs>
          <path d={PUNJAB_MAP.path} fill="url(#trees-gradient)" stroke="#5fbb82" strokeWidth="2.8" fillRule="evenodd"/>
          {cityPoints.map(c => <g key={c.city} onClick={() => setSelected(c.city)} className="trees-map-pin" role="presentation">
            <circle cx={c.x} cy={c.y} r={Math.max(8, Math.min(19, 8 + Math.log10(c.trees + 1) * 3))} fill="#bfffa9" fillOpacity=".18" stroke="#c6eb9c" strokeWidth="1"/>
            <circle cx={c.x} cy={c.y} r="4.4" fill="#d9ffaf"/>
            <title>{c.city + ': ' + fmt(c.trees) + ' reviewed saplings'}</title>
          </g>)}
        </svg>
        {cityPoints.length === 0 && <div className="trees-map-empty">The map will light up as planting reports are approved.</div>}
        <span className="trees-map-credit">Punjab provincial boundary · Open GeoJSON / MIT</span>
      </div>
      <div className="trees-city-list"><div className="trees-city-list-title"><MapPin size={17}/> Plantings by city</div>
        {summary.city_totals.length ? summary.city_totals.slice(0, 7).map((c,i) =>
          <button type="button" onClick={() => setSelected(c.city)} className={'trees-city-row' + (selected === c.city ? ' selected' : '')} key={c.city}><span className="trees-city-rank">{String(i+1).padStart(2,'0')}</span><span>{c.city}</span><b>{fmt(c.trees)}</b></button>
        ) : <div className="trees-city-empty">No approved planting reports yet. You can help your city become the first on the map.</div>}
        {focus && <div className="trees-city-focus"><b>{focus.city}</b><span>{fmt(focus.trees)} saplings · {fmt(focus.seeds)} seeds recorded</span></div>}
        <p className="trees-city-footnote">Map points represent aggregated city totals, not participants’ private planting addresses.</p>
      </div>
    </div>
  </div>
}
function Overview({ summary, onContribute, onRankings }: { summary: Summary, onContribute: () => void, onRankings: () => void }) {
  const pct = Math.min(100, summary.trees / summary.target * 100)
  return <>
    <section className="trees-hero">
      <div className="trees-hero-copy"><span className="trees-hero-eyebrow"><span className="trees-live-dot"/> A PEOPLE-POWERED ENVIRONMENTAL INITIATIVE</span>
        <h1>100 million trees.<br/><em>One greener Punjab.</em></h1>
        <p>From your neighbourhood to the farthest corner of Punjab, every sapling can be part of something bigger. Plant it. Document it. Help it thrive.</p>
        <div className="trees-hero-actions"><button type="button" className="trees-btn-main" onClick={onContribute}><Sprout size={19}/> I want to contribute <ArrowRight size={17}/></button><button type="button" className="trees-btn-ghost" onClick={onRankings}>Explore leaderboard <ChevronRight size={16}/></button></div>
        <div className="trees-trust-line"><ShieldCheck size={17}/> Public figures include reviewed planting records only</div>
      </div>
      <div className="trees-hero-art" aria-hidden="true"><div className="trees-art-glow"/><div className="trees-rings"><TreeDeciduous size={184} strokeWidth={0.7}/></div><div className="trees-art-label">ROOTED IN PUNJAB <span>•</span> GROWING TOGETHER</div></div>
    </section>
    <section className="trees-progress-section"><div className="trees-progress-copy"><span className="trees-kicker">THE COLLECTIVE MISSION</span><h2>Our progress, transparently tracked.</h2></div><div className="trees-progress-top"><b>{fmt(summary.trees)}</b><span>of {fmt(summary.target)} saplings</span></div><div className="trees-progress-track"><span style={{width: pct + '%'}} /></div><div className="trees-progress-bottom"><span>{pct.toFixed(5)}% of target</span><span>{fmt(Math.max(0,summary.target-summary.trees))} still to plant</span></div>
      <div className="trees-stat-grid"><div className="trees-stat"><TreeDeciduous/><span>Verified saplings</span><strong>{fmt(summary.trees)}</strong></div><div className="trees-stat"><Sprout/><span>Seeds sown (separate)</span><strong>{fmt(summary.seeds)}</strong></div><div className="trees-stat"><Heart/><span>Contributors</span><strong>{fmt(summary.contributors)}</strong></div><div className="trees-stat"><MapPin/><span>Participating cities</span><strong>{fmt(summary.cities)}</strong></div></div>
    </section>
    <PunjabMap summary={summary}/>
    <section className="trees-how"><div className="trees-section-head"><div><span className="trees-kicker">HOW TO PARTICIPATE</span><h2>Four simple steps. A lasting impact.</h2></div></div><div className="trees-how-grid">
      {[['01','Create your campaign account','Register with your name, mobile number, CNIC and Punjab city.','user'],['02','Choose a species','Select an appropriate nursery sapling or a seed from the planting catalogue.','leaf'],['03','Plant and upload proof','Share your planting date, location and a photo—compressed automatically.','camera'],['04','Get your record reviewed','Approved saplings appear in verified counts and on the leaderboard.','check']].map(([n,t,d,kind])=><div className="trees-how-card" key={n}><span className="trees-step-n">{n}</span><span className="trees-how-icon">{kind==='user'?<UserRound/>:kind==='leaf'?<Leaf/>:kind==='camera'?<Camera/>:<BadgeCheck/>}</span><h3>{t}</h3><p>{d}</p></div>)}
    </div></section>
  </>
}
function Leaderboard({ summary }: { summary: Summary }) {
  return <section className="trees-panel trees-leaders"><span className="trees-kicker">PUNJAB'S GREEN CHAMPIONS</span><h1>Community leaderboard</h1><p className="trees-muted">Ranked by approved nursery saplings. Seed contributions are recorded separately. Names appear only with participant consent.</p>
    <div className="trees-leader-head"><span>RANK & CONTRIBUTOR</span><span>VERIFIED SAPLINGS</span></div>
    {summary.leaderboard.length ? summary.leaderboard.map(row=><div className="trees-leader-row" key={row.rank}><div><span className={'trees-medal trees-medal-' + row.rank}><Trophy size={18}/></span><div><strong>{row.name}</strong><small><MapPin size={12}/>{row.city}</small></div></div><b>{fmt(row.trees)}</b></div>) : <div className="trees-empty"><Trophy size={44}/><h3>The first green champions are yet to arrive.</h3><p>Approved submissions will determine the rankings. No test or fictional records are displayed.</p></div>}
    <div className="trees-review-note"><ShieldCheck size={19}/> All public rankings are based on reviewed submissions. Reported quantities may be amended or rejected.</div>
  </section>
}
function Account({ member, onSigned, onLogout, csrf }: { member: Member | null, onSigned: (m:Member, csrf:string)=>void, onLogout:()=>void, csrf:string }) {
  const [mode,setMode]=useState<'register'|'login'>('register')
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  const [name,setName]=useState(''),[city,setCity]=useState(''),[cnic,setCnic]=useState(''),[mobile,setMobile]=useState(''),[password,setPassword]=useState(''),[consent,setConsent]=useState(false),[publish,setPublish]=useState(false)
  const [reports,setReports]=useState<Report[]>([])
  const [avatarBusy,setAvatarBusy]=useState(false)
  const [note,setNote]=useState('')
  useEffect(()=>{ if (member) getApi('mine').then(data => setReports(data.reports)).catch(()=>{}) },[member])
  async function submit(e:FormEvent) {e.preventDefault();setBusy(true);setError('')
    try {const data=await postApi(mode,mode==='register'?{name,city,cnic,mobile,password,consent,public_name:publish}:{mobile,password});onSigned(data.member,data.csrf_token);setPassword('');setCnic('')}
    catch(e){setError(e instanceof Error?e.message:'Could not continue.')}finally{setBusy(false)}
  }
  async function photo(e:ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0];if(!file)return;setAvatarBusy(true);setError('');setNote('')
    try {const compressed=await compressPhoto(file,40);const fd=new FormData();fd.append('photo',compressed);await postApi('avatar',fd,csrf);const data=await getApi('session');onSigned(data.member,data.csrf_token);setNote('Profile photo saved privately. You can now submit planting evidence.')}
    catch(e){setError(e instanceof Error?e.message:'Could not upload photo.')}finally{setAvatarBusy(false);e.target.value=''}
  }
  if(member) return <section className="trees-panel"><span className="trees-kicker">MY TREE CAMPAIGN ACCOUNT</span><div className="trees-account-head"><div><h1>Welcome, {member.name.split(' ')[0]}.</h1><p className="trees-muted"><MapPin size={14}/> {member.city} · {member.has_photo?'Profile photo saved':'Complete your profile photo before reporting'}</p></div><button type="button" className="trees-btn-outline" onClick={onLogout}><LogOut size={16}/> Sign out</button></div>
    {!member.has_photo && <div className="trees-upload-avatar"><Camera size={26}/><div><strong>Add your profile photograph</strong><p>Required before your first planting report. Automatically compressed to 40 KB and never shown publicly.</p></div><label className="trees-upload-btn">{avatarBusy?'Processing…':'Choose photo'}<input disabled={avatarBusy} type="file" accept="image/jpeg,image/png,image/webp" onChange={photo} hidden/></label></div>}
    {note && <div className="trees-success"><CheckCircle2 size={18}/>{note}</div>}{error&&<p className="trees-error">{error}</p>}
    <div className="trees-profile-title"><h2>My planting records</h2><span>{reports.length} submissions</span></div>
    {reports.length ? <div className="trees-report-list">{reports.map(r=><div className="trees-report" key={r.id}><div><strong>{r.quantity} × {r.species}</strong><span>{typeLabel(r.method)} · {r.locality} · {r.planted_on}</span>{r.review_note&&<small>{r.review_note}</small>}</div><span className={'trees-status trees-status-'+r.status}>{r.status}</span></div>)}</div> : <div className="trees-empty compact"><Sprout size={35}/><p>No planting reports submitted yet.</p></div>}
  </section>
  return <section className="trees-auth-wrap"><div className="trees-auth-side"><Sprout size={41}/><span className="trees-kicker">YOUR PERSONAL GREEN JOURNEY</span><h1>Your contribution deserves to be counted.</h1><p>One secure campaign profile. Every approved planting recorded for a greener Punjab.</p><div><ShieldCheck size={20}/> CNIC never appears on the public website.</div><div><Globe2 size={20}/> Separate from your existing study account.</div><div><Leaf size={20}/> Free registration. No payment required.</div></div><form className="trees-panel trees-auth-form" onSubmit={submit}><div className="trees-auth-toggle"><button className={mode==='register'?'active':''} type="button" onClick={()=>setMode('register')}>Create account</button><button className={mode==='login'?'active':''} type="button" onClick={()=>setMode('login')}>Sign in</button></div><h2>{mode==='register'?'Join the movement':'Welcome back'}</h2><p className="trees-muted">{mode==='register'?'Create a free, dedicated planting account.':'Sign in with your campaign mobile number and password.'}</p>
    {mode==='register'&&<><label>Full name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" maxLength={100}/></label><label>Your city in Punjab<select required value={city} onChange={e=>setCity(e.target.value)}><option value="">Select your city</option>{CITIES.map(c=><option value={c[0]} key={c[0]}>{c[0]}</option>)}</select></label><label>CNIC number<input required value={cnic} onChange={e=>setCnic(e.target.value)} placeholder="13 digits (not displayed publicly)" inputMode="numeric" autoComplete="off" pattern="[0-9]{5}-?[0-9]{7}-?[0-9]" /></label></>}
    <label>Mobile number<input required value={mobile} onChange={e=>setMobile(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="03XX-XXXXXXX" /></label><label>Password<input type="password" required minLength={10} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='register'?'new-password':'current-password'} placeholder={mode==='register'?'Minimum 10 characters':'Your password'}/></label>
    {mode==='register'&&<><label className="trees-check"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I consent to the collection of my details for account protection, duplicate prevention and reviewing planting records. I understand my CNIC is processed as a secure fingerprint, not displayed or stored in plain text.</span></label><label className="trees-check"><input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)}/><span>Show my name on the public leaderboard if my plantings are approved.</span></label></>}
    {error&&<p className="trees-error">{error}</p>}<button disabled={busy} className="trees-btn-main trees-submit" type="submit">{busy?'Securing your account…':mode==='register'?'Create my campaign account':'Sign in'} <ArrowRight size={17}/></button>
    <p className="trees-auth-foot"><ShieldCheck size={14}/> Private details are never published. A CNIC fingerprint prevents exact duplicate registrations; additional identity verification is not implied.</p>
  </form></section>
}
function Contribute({ member, csrf, species, onDone, onAccount }: { member: Member | null, csrf: string, species: Record<string, Species>, onDone: ()=>void, onAccount:()=>void }) {
  const [method,setMethod]=useState<'sapling'|'seed'>('sapling'),[selected,setSelected]=useState(''),[quantity,setQuantity]=useState(1),[locality,setLocality]=useState(''),[date,setDate]=useState(()=>new Date().toISOString().slice(0,10)),[image,setImage]=useState<File|null>(null),[preview,setPreview]=useState(''),[publish,setPublish]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('')
  const speciesEntries=Object.entries(species)
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
  function choosePhoto(e:ChangeEvent<HTMLInputElement>) {const file=e.target.files?.[0];if(!file)return;setImage(file);setPreview(URL.createObjectURL(file));setError('')}
  async function submit(e:FormEvent){e.preventDefault();setError('');setSuccess('');if(!image){setError('Please attach a photograph of the planted saplings or seed site.');return;}setBusy(true)
    try {const compressed=await compressPhoto(image,70);const fd=new FormData();fd.append('species',selected);fd.append('method',method);fd.append('quantity',String(quantity));fd.append('locality',locality);fd.append('planted_on',date);fd.append('public_photo',publish?'yes':'no');fd.append('photo',compressed);await postApi('plant',fd,csrf);setSuccess('Report received for review. It will count only after approval.');setSelected('');setQuantity(1);setImage(null);setPreview('');setLocality('');onDone()}
    catch(e){setError(e instanceof Error?e.message:'Could not submit record.')}finally{setBusy(false)}
  }
  if(!member)return <div className="trees-gate"><div className="trees-gate-icon"><LogIn size={42}/></div><h1>Begin your green journey.</h1><p>To submit a planting record, first create or sign in to your dedicated campaign account. Registration is free.</p><button className="trees-btn-main" type="button" onClick={onAccount}>Create my campaign account <ArrowRight size={17}/></button></div>
  if(!member.has_photo)return <div className="trees-gate"><div className="trees-gate-icon"><Camera size={42}/></div><h1>One quick step before you plant.</h1><p>Add your profile photograph in My Account. It stays private and is automatically compressed to 40 KB.</p><button className="trees-btn-main" type="button" onClick={onAccount}>Add my profile photo <ArrowRight size={17}/></button></div>
  return <section className="trees-panel trees-plant-panel"><span className="trees-kicker">RECORD YOUR CONTRIBUTION</span><h1>What did you plant?</h1><p className="trees-muted">Choose your species, add location details and upload a real photo of the planting. Only confirmed saplings increase the tree counter.</p>
    <form onSubmit={submit}><div className="trees-method"><button type="button" className={method==='sapling'?'active':''} onClick={()=>setMethod('sapling')}><TreeDeciduous size={25}/><strong>Nursery sapling</strong><small>A living young tree already planted</small></button><button type="button" className={method==='seed'?'active':''} onClick={()=>setMethod('seed')}><Sprout size={25}/><strong>Seed sown</strong><small>A seed planted in soil</small></button></div>
    <div className="trees-form-caption"><h2>Select a species</h2><span>Locally suitable choices vary by soil and climate</span></div><div className="trees-species-grid">{speciesEntries.map(([id,s])=><button type="button" aria-pressed={selected===id} key={id} className={'trees-species-card'+(selected===id?' active':'')} onClick={()=>setSelected(id)}><SpeciesPhoto scientific={s.scientific} name={s.name}/><span><strong>{s.name}</strong><small>{s.scientific}</small></span>{selected===id&&<CheckCircle2 className="trees-selected-check" size={17}/>}</button>)}</div><div className="trees-photo-source">Botanical thumbnails supplied by Wikimedia Commons where available. For species suitability, consult a local forestry nursery.</div>
    <div className="trees-plant-fields"><label>Number {method==='seed'?'of seeds sown':'of nursery saplings planted'}<input required type="number" min="1" max="20" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/><small>Maximum 20 per evidence report. Each claim is reviewed.</small></label><label>Date planted<input required type="date" max={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/></label><label>City<input readOnly value={member.city}/></label><label>Area or planting location<input required value={locality} maxLength={120} onChange={e=>setLocality(e.target.value)} placeholder="e.g. school courtyard or residential area"/></label></div>
    <div className="trees-evidence"><div className="trees-evidence-head"><div><span className="trees-kicker">PHOTOGRAPHIC PROOF</span><h2>Show us what you've planted.</h2><p>The original image is compressed inside your browser to a maximum of 70 KB before upload. No manual resizing needed.</p></div><CloudUpload size={29}/></div><label className="trees-dropzone"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} hidden/>{preview?<img src={preview} alt="Selected planting evidence" />:<Camera size={31}/>}<strong>{image?image.name:'Tap to choose your planted tree photo'}</strong><small>{image?'Ready to compress securely on submission':'JPG, PNG or WebP · Max original file size 20 MB'}</small></label><label className="trees-check"><input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)}/><span>Allow this planting photograph to appear in the public campaign gallery after approval.</span></label></div>
    <div className="trees-truth-note"><CircleHelp size={18}/> Do not report unplanted seeds or trees. Photos prove a submission exists, not that a tree has survived. Reviewers may request additional evidence.</div>
    {error&&<p className="trees-error">{error}</p>}{success&&<p className="trees-success"><CheckCircle2 size={18}/>{success}</p>}<button disabled={busy||!selected} className="trees-btn-main trees-submit" type="submit">{busy?'Compressing and sending…':'Submit planting for review'}<ArrowRight size={18}/></button></form>
  </section>
}
function Review({ csrf }: { csrf: string }) {
  const [rows,setRows]=useState<Report[]>([]),[err,setErr]=useState(''),[busy,setBusy]=useState('')
  useEffect(()=>{getApi('queue').then(x=>setRows(x.reports)).catch(e=>setErr(e instanceof Error?e.message:'Access denied.'))},[])
  async function decision(id:string,status:'approved'|'rejected'){setBusy(id);setErr('');try{await postApi('review',{id,decision:status,note:status==='approved'?'Evidence manually reviewed and approved.':'Evidence insufficient or unverifiable.'},csrf);setRows(old=>old.filter(x=>x.id!==id))}catch(e){setErr(e instanceof Error?e.message:'Review failed.')}finally{setBusy('')}}
  return <section className="trees-panel"><span className="trees-kicker">PRIVATE MODERATION DESK</span><h1>Review planting submissions</h1><p className="trees-muted">Only administrators with an active two-factor session can view or approve planting evidence.</p>{err&&<p className="trees-error">{err}</p>}{rows.map(r=><div className="trees-admin-item" key={r.id}><img src={API+'photo&kind=proof&id='+encodeURIComponent(r.id)} alt={'Evidence for '+r.city}/><div><h3>{r.full_name} · {r.city}</h3><p>{r.species} · {r.quantity} {typeLabel(r.method)} · {r.locality}</p><small>{r.planted_on}</small><div className="trees-admin-buttons"><button disabled={busy===r.id} type="button" onClick={()=>decision(r.id,'approved')}><CheckCircle2 size={16}/> Approve</button><button disabled={busy===r.id} type="button" onClick={()=>decision(r.id,'rejected')}><X size={16}/> Reject</button></div></div></div>)}{!rows.length&&!err&&<div className="trees-empty compact">No pending reports in the moderation queue.</div>}</section>
}
export default function PunjabTrees() {
  const [tab,setTab]=useState<Tab>('overview'),[summary,setSummary]=useState<Summary>(EMPTY),[species,setSpecies]=useState<Record<string,Species>>({}),[member,setMember]=useState<Member|null>(null),[csrf,setCsrf]=useState(''),[error,setError]=useState(''),[isAdmin,setIsAdmin]=useState(false),[mobileNav,setMobileNav]=useState(false)
  const refresh=()=>getApi('summary').then(d=>setSummary(d)).catch(e=>setError(e instanceof Error?e.message:'Unable to load live progress.'))
  useEffect(()=>{refresh();getApi('catalog').then(d=>setSpecies(d.species)).catch(()=>{});getApi('session').then(d=>{setMember(d.member);setCsrf(d.csrf_token||'')}).catch(()=>{});fetch('/api/admin-auth/session.php',{credentials:'same-origin'}).then(r=>{if(r.ok)setIsAdmin(true)}).catch(()=>{})},[])
  const select=(next:Tab)=>{setTab(next);setMobileNav(false);window.scrollTo({top:0,behavior:'smooth'})}
  async function logout(){try{await postApi('logout',{},csrf);setMember(null);setCsrf('');select('overview')}catch(e){setError(e instanceof Error?e.message:'Could not sign out.')}}
  return <main className="trees-root">
    <div className="trees-topline"><div className="trees-shell"><span><Leaf size={13}/> 100 MILLION TREES FOR PUNJAB</span><span>CSS VISTA <span className="trees-topline-x">×</span> ESAR UL EBAD WELFARE FOUNDATION</span></div></div>
    <div className="trees-sitebar"><div className="trees-shell trees-sitebar-content"><Brand/><button type="button" className="trees-menu-toggle" aria-label="Toggle campaign navigation" onClick={()=>setMobileNav(!mobileNav)}>{mobileNav?<X/>:<Menu/>}</button><nav className={mobileNav?'is-open':''} aria-label="Tree campaign navigation"><button className={tab==='overview'?'active':''} type="button" onClick={()=>select('overview')}>Overview</button><button className={tab==='contribute'?'active':''} type="button" onClick={()=>select('contribute')}>Plant & report</button><button className={tab==='leaderboard'?'active':''} type="button" onClick={()=>select('leaderboard')}>Leaderboard</button><button className={tab==='account'?'active':''} type="button" onClick={()=>select('account')}>{member?'My account':'Join / sign in'}</button>{isAdmin&&<button className={tab==='review'?'active':''} type="button" onClick={()=>select('review')}>Review</button>}</nav><button className="trees-sitebar-cta" type="button" onClick={()=>select('contribute')}><Leaf size={15}/> Contribute <ArrowRight size={14}/></button></div></div>
    <div className="trees-shell trees-main-content">
      {error&&<div className="trees-error trees-page-error">{error}<button onClick={()=>setError('')} type="button"><X size={17}/></button></div>}
      {tab==='overview'&&<Overview summary={summary} onContribute={()=>select('contribute')} onRankings={()=>select('leaderboard')}/>}
      {tab==='leaderboard'&&<Leaderboard summary={summary}/>}
      {tab==='account'&&<Account member={member} csrf={csrf} onSigned={(m,token)=>{setMember(m);setCsrf(token)}} onLogout={logout}/>}
      {tab==='contribute'&&<Contribute member={member} csrf={csrf} species={species} onDone={refresh} onAccount={()=>select('account')}/>}
      {tab==='review'&&<Review csrf={csrf}/>}
    </div>
    <footer className="trees-footer"><div className="trees-shell"><div><Brand/><p>Growing a greener Punjab, one verified contribution at a time.</p></div><div><span>Transparency</span><p>Saplings and seeds are counted separately. Approved does not mean independently certified survival.</p></div><div><a href="https://esarulebad.org/" target="_blank" rel="noopener noreferrer">Foundation website <ArrowRight size={13}/></a><Link to="/privacy-policy">CSS Vista Privacy Policy <ArrowRight size={13}/></Link><Link to="/">Return to CSS Vista <ArrowRight size={13}/></Link></div></div></footer>
  </main>
}
