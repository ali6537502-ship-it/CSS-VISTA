"""Fetch public authorities; save metadata/digests, never third-party source bodies."""
import json,pathlib,urllib.request,urllib.error,concurrent.futures,hashlib,re,time
root=pathlib.Path(__file__).resolve().parents[2]
sources=json.loads((root/'docs/grammar-reconstruction/source-register.json').read_text())['sources']
def check(s):
 result={'id':s['id'],'url':s['url'],'declaredConsultation':s['consulted'],'checkedAt':'2026-10-22','editorialNote':s['note']}
 try:
  request=urllib.request.Request(s['url'],headers={'User-Agent':'Mozilla/5.0 (compatible; CSSVistaEditorialVerification/1.0)'})
  with urllib.request.urlopen(request,timeout=30) as response:
   body=response.read();text=body.decode('utf8',errors='replace');title=re.search(r'<title[^>]*>(.*?)</title>',text,re.S|re.I)
   blocked=bool(re.search(r'Access Denied|Request Rejected|Just a moment|Checking your browser',text[:15000],re.I))
   result.update(status=response.status,finalUrl=response.url,title=re.sub('<[^>]+>','',title.group(1)).strip() if title else '',bytes=len(body),sha256=hashlib.sha256(body).hexdigest(),accessibleArticle=response.status==200 and not blocked,verification='Fetched metadata; editorial relevance requires review, not inferred from HTTP status.')
 except Exception as e:result.update(accessibleArticle=False,error=str(e))
 return result
out=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for result in pool.map(check,sources):
  out.append(result)
  if len(out)%20==0:print('Checked',len(out),'of',len(sources),flush=True)
(root/'docs/grammar-reconstruction/evidence/source-access.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Finished',len(out),'sources;',sum(x['accessibleArticle'] for x in out),'accessible responses.',flush=True)
