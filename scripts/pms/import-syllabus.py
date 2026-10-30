import json,re,pathlib,subprocess,hashlib
root=pathlib.Path(__file__).resolve().parents[2]
m=json.loads((root/'content/pms-punjab/source-manifest.json').read_text())
resumes={
'optional-compuer-science':['Computer Communications & Networks','Problem Solving','SECTION –B','Operating Systems','Digital Logic Design (DLD)','SECTION -C','Database Management Systems (DBMS)','Artificial Intelligence (AI)'],
'optional-commerce':['INTRODUCTION TO COMMERCE','COST ACCOUNTING','ADVANCED ACCOUNTING','INTRODUCTION TO BUSINESS FINANCE','FINANCIAL REPORTING & ANALYSIS','BUSINESS ECONOMICS','PRINCIPLES OF AUDITING','TAXATION MANAGEMENT','MANAGEMENT','TRADE POLICIES AND REGULATORY FRAMEWORK'],
'optional-business-administration':['MANAGEMENT','HUMAN RESOURCE MANAGEMENT','MARKETING','ORGANIZATIONAL BEHAVIOR','INTRODUCTION TO BUSINESS FINANCE','FINANCIAL REPORTING AND ANALYSIS','SUPPLY CHAIN MANAGEMENT','STRATEGIC MANAGEMENT'],
'optional-economics':['PART-II','PART-III'],
'optional-engineering-fundamentals-and-engineering-managemnet':['2.    APPLIED CHEMISTRY:','3.    APPLIED ELECTRICITY AND ELECTRONICS:','4.   MECHANICAL ENGINEERING FUNDAMENTALS:','5.   MATERIALS ENGINEERING :','6.   CIVIL ENGINEERING FUNDAMENTALS:','PART B: ENGINEERING MANAGEMENT']}
# Manually transcribed from the rendered PPSC source; its embedded legacy font has no Unicode mapping.
manual={
'optional-punjabi':[
(1,'پہلا حصہ · کلاسیکی شاعری','بابا فرید گنج شکر|شاہ حسین|سلطان باھو|سید بلھے شاہ|خواجہ غلام فرید'),
(1,'دوجا حصہ · جدید شاعری','سفر دی رات — منیر نیازی|کچے گھڑے — باقی صدیقی|جھگ راتے — شریف کنجاہی|ڈونگھے پینڈے — پیرفضل گجراتی|ترنجن — احمد راہی|سوچ وچار سفر — یونس احقر|برفاں ہیٹھ تندور — نجم حسین سید|چندن رکھ تے ویہڑا — نجم حسین سید|گل وچ پائیم پریت مہار — ڈاکٹر شہزاد قیصر|مواتے — ڈاکٹر فقیر محمد فقیر|تائے — مشتاق صوفی'),
(2,'تیجا حصہ · قدیم نثر','مواعظ نوشہ — مرتب: شرافت نوشاہی|پکی روٹی — مرتب: شہباز ملک|سچی سرکار — حکیم عبدالکریم ثمر'),
(2,'تیجا حصہ · جدید نثر','ٹاہلی تھلے — اشفاق احمد|سورج مکھی — سجاد حیدر|جندواں اگیاں — فرخندہ لودھی|وگدا پانی — منشا یاد|نوری — نور علی'),
(2,'چوتھا حصہ · داستانی ادب','ہیر رانجھا — وارث شاہ|سیف الملوک — میاں محمد بخش|سسی پنوں — ہاشم شاہ|مرزا صاحباں — حافظ برخوردار'),
(2,'پنجواں حصہ · پنجابی ادب، تحقیق، تنقید تے لسانیات','پنجابی بولی دا پچھوکڑ — محمد آصف خان|پنجابی لسانیات — ڈاکٹر شہباز ملک|پرکھ پڑچول — عارف عبدالمتین|سیدھاں — نجم حسین سید|مرزا روایت — محمد اسلم رانا'),
(2,'پنجابی ادب دیاں صنفاں','نثر: افسانہ، ڈرامہ، ناول، سفرنامہ، انشائیہ|شاعری: حمد، نعت، غزل، کافی تے حرفی|لوک ادب: ماہیے، ڈھولا، بولی، لوری، دوہڑا، ڈھولک دے گیت، پنجابی اکھان، لوک کہانیاں')],
'optional-urdu':[
(1,'حصہ اول · شعری ادب','مثنوی — مثنوی سحرالبیان از میر حسن|غزل — میر تقی میر، اسد اللہ خان غالب، مومن خان مومن|نظم — نظیر اکبر آبادی'),
(1,'حصہ دوم · نثری ادب','داستان — باغ و بہار از میر امن دہلوی|مضمون — مضامین سرسید از سرسید احمد خان|تاریخ و تذکرہ — آب حیات از مولانا محمد حسین آزاد'),
(1,'حصہ سوم · نظم','اقبال|فیض احمد فیض|مجید امجد|منیر نیازی'),
(2,'حصہ سوم · غزل','ناصر کاظمی|احمد فراز|پروین شاکر'),
(2,'حصہ چہارم · ناول','اداس نسلیں — عبداللہ حسین|راجہ گدھ — بانو قدسیہ|غلام باغ — مرزا اطہر بیگ|آگ کا دریا — قرۃ العین حیدر'),
(2,'حصہ چہارم · افسانہ','سعادت حسن منٹو — نیا قانون، فرشتہ|غلام عباس — کتبہ، آنندی|انتظار حسین — آخری آدمی، کایا کلپ|اسد محمد خان — باسودے کی مریم، شیر ہونے کا ایک آدمی'),
(2,'حصہ پنجم · ادبی تحریکیں اور تنقیدی رجحانات','ترقی پسند تحریک|حلقہ ارباب ذوق|مابعد نو آبادیاتی تنقید|ماحولیاتی تنقید')]
}
def norm(s):return re.sub(r'\s+',' ',re.sub(r'[\u202a-\u202e\u2066-\u2069]','',s)).strip()
out=[]
for d in m['documents']:
 text=subprocess.check_output(['pdftotext','-layout',str(root/'public'/d['file'].lstrip('/')),'-']).decode()
 (root/'content/pms-punjab/extracted').mkdir(exist_ok=True)
 (root/'content/pms-punjab/extracted'/(d['id']+'.txt')).write_text(text)
 topics=[];section='Syllabus';bucket=[];start=1;page=1;skip=False;sectionContinuation=False;persianContent=False;begun=d['id']=='optional-english-literature'
 def flush():
  global bucket
  full=norm(' '.join(bucket));bucket=[]
  if len(full)<4:return
  title=re.sub(r'^(?:(?:\d+|[ivxlcdm]+|[a-z])[.)]+\s*|\d+\s+|\([ivxlcdm]+\)\.?\s+|[•]\s*)','',full,flags=re.I)
  title=title.split(': ',1)[0] if ': ' in title[:130] else title
  if len(title)>125:title=title[:122].rsplit(' ',1)[0]+'…'
  topics.append({'title':title,'detail':full,'section':section,'page':start})
 for raw in text.splitlines(keepends=True):
  # str.splitlines includes form-feed as its own line; page count follows the original PDF.
  if '\f' in raw:page+=raw.count('\f')
  s=norm(raw)
  if not s or s=='\f':continue
  s=s.replace('\f','').strip()
  if re.search('Total Marks',s,re.I):begun=True;continue
  if not begun:continue
  if d['id']=='optional-persian' and not persianContent:
   if re.match(r'^Part-I$',s,re.I):persianContent=True
   else:continue
  if s in ['PUNJAB PUBLIC SERVICE COMMISSION','COMBINED COMPETITIVE EXAMINATION (CCE) SYLLABUS','ENGLISH LITERATURE']:continue
  if re.search(r'^(?:(?:PART[-–][A-Z]:\s*)?Suggested\s+[Rr]eadings|Suggested\s+Books|Recommended\s+[Rr]eadings|End of Document|Note\s*:)',s,re.I):flush();skip=True;continue
  resume=next((x for x in resumes.get(d['id'],[]) if norm(x)==s),None)
  if resume:flush();section=s;skip=False;continue
  if skip:continue
  if re.match(r'^Page \d+ of \d+$',s):continue
  is_section=bool(re.match(r'^(?:PART(?:\s*[–—-]\s*|\s+)[A-ZIVX]+(?=[:\s]|$)|SECTION(?:\s*[–—-]\s*|\s+)[A-ZIVX]+(?=[:\s]|$)|AGRICULTURE COMPONENT)',s,re.I))
  if is_section:flush();section=s;sectionContinuation=True;continue
  if s.lower()=='topics':continue
  marker=bool(re.match(r'^(?:(?:\d+|[ivxlcdm]+|[a-z])[.)]+\s+|\d+\s+\D|\([ivxlcdm]+\)\.?\s+|[•]\s+)',s,re.I))
  # Agriculture uses a two-column numbered table without periods.
  if d['id']=='optional-agriculture' and re.match(r'^\d+\s+\D',s):marker=True
  if sectionContinuation and not marker and s.isupper():section+=' '+s;continue
  if marker:sectionContinuation=False;flush();start=page
  elif bucket:sectionContinuation=False
  if not bucket:start=page
  bucket.append(s)
 flush()
 if d['id']=='optional-agriculture':
  # Source table headings, read down its left column; preserve the original right-column text in detail.
  source_titles=['Agriculture and Cropping Systems','Genetic Improvements of Crop Plants','Modern Plant-Breeding Techniques and Biotechnology','Plant Protection, Diseases and Integrated Pest Management','Soil Science, Water Resources and Irrigation System','Climate-Smart Agriculture and the Environment','Mechanization and Post-Harvest','Role of Horticulture in Agriculture','Agricultural Economics and Sectoral Challenges','Agribusiness Marketing and Finance','Livestock and Dairy, Poultry, Fisheries, and Apiculture','Agricultural Extension and Rural Development','Food Security and Nutrition','Precision Agriculture, Innovation and Technology','Policy and Governance Framework','Biodiversity','Forestry, Rangelands, Watersheds']
  if len(source_titles)!=len(topics):raise RuntimeError('Agriculture table rows require source review')
  for item,source_title in zip(topics,source_titles):item['title']=source_title
 if d['id'] in manual:
  topics=[{'title':t,'detail':t,'section':sec,'page':p,'transcription':'visual'} for p,sec,ts in manual[d['id']] for t in ts.split('|')]
 # The two source filenames have PPSC spelling errors; display names are from the PDF headings.
 title={'optional-compuer-science':'Computer Science','optional-engineering-fundamentals-and-engineering-managemnet':'Engineering Fundamentals and Engineering Management'}.get(d['id'],d['title'])
 seen={}
 for t in topics:
  digest=hashlib.sha256(t['detail'].encode()).hexdigest()[:12];seen[digest]=seen.get(digest,0)+1
  t['id']=f"pms-punjab:2026-10:{d['id']}:{digest}:{seen[digest]}"
 out.append({k:d[k] for k in ['id','designation','file','sourceUrl','sha256']}|{'title':title,'marks':100 if re.search(r'Total Marks:\s*100',text) or d['id'] in manual else None,'topics':topics})
 print(d['id'],len(topics),[(t['title'][:55],t['page']) for t in topics[:2]])
(root/'public/pms-punjab/catalogue.json').write_text(json.dumps({'version':'ppsc-2026-10-30','retrievedOn':m['retrievedOn'],'publisher':m['publisher'],'sourcePages':m['sourcePages'],'subjects':out},ensure_ascii=False,indent=2)+'\n')

# A deterministic download containing the unmodified official originals and their provenance.
import zipfile,io
archive=io.BytesIO()
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for doc in m['documents']:
  entry=zipfile.ZipInfo('syllabi/'+pathlib.Path(doc['file']).name,date_time=(2026,10,30,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=0o644<<16
  z.writestr(entry,(root/'public'/doc['file'].lstrip('/')).read_bytes())
 entry=zipfile.ZipInfo('source-manifest.json',date_time=(2026,10,30,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=0o644<<16
 z.writestr(entry,(root/'content/pms-punjab/source-manifest.json').read_bytes())
(root/'public/pms-punjab/ppsc-syllabi-2026-10-30.zip').write_bytes(archive.getvalue())
