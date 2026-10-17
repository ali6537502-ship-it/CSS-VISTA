#!/usr/bin/env python3
"""Bounded, read-only HTTP audit. No Google/account status is inferred from HTTP.
Uses inherited proxy/CA settings. Unmeasured fields remain null. Default samples
one URL from each source family plus all exact public routes, capped at 120.
Run: python scripts/seo/crawl-production.py [--origin URL] [--limit 120]
"""
import argparse
import concurrent.futures
import csv
import datetime
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.canonicals, self.robots, self.h1, self.links, self.assets = [], [], [], [], []
        self.title, self.description, self.text, self.main_text, self.structured_data = '', None, [], [], []
        self.in_title = self.in_h1 = self.main_depth = self.ignore_depth = self.jsonld = 0
        self.json_text = ''
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title': self.in_title += 1
        if tag == 'h1': self.in_h1 += 1
        if tag in ('script', 'style'): self.ignore_depth += 1
        if tag == 'main': self.main_depth += 1
        if tag == 'script' and a.get('type') == 'application/ld+json': self.jsonld = 1; self.json_text = ''
        if tag == 'meta':
            if a.get('name', '').lower() in ('robots', 'googlebot'): self.robots.append(a.get('content', ''))
            if a.get('name') == 'description': self.description = a.get('content')
        if tag == 'link' and a.get('rel') == 'canonical': self.canonicals.append(a.get('href'))
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag == 'script' and a.get('src'): self.assets.append(a['src'])
        if tag == 'link' and a.get('rel') == 'stylesheet' and a.get('href'): self.assets.append(a['href'])
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = max(0, self.in_title - 1)
        if tag == 'h1': self.in_h1 = max(0, self.in_h1 - 1)
        if tag in ('script', 'style'): self.ignore_depth = max(0, self.ignore_depth - 1)
        if tag == 'main': self.main_depth = max(0, self.main_depth - 1)
        if tag == 'script' and self.jsonld:
            try: self.structured_data.append({'valid_json': True, 'data': json.loads(self.json_text)})
            except ValueError: self.structured_data.append({'valid_json': False})
            self.jsonld = 0
    def handle_data(self, text):
        if self.in_title: self.title += text
        if self.in_h1: self.h1.append(text)
        if self.jsonld: self.json_text += text
        if not self.ignore_depth and text.strip():
            self.text.append(text.strip())
            if self.main_depth: self.main_text.append(text.strip())

class Redirects(urllib.request.HTTPRedirectHandler):
    def __init__(self): self.chain = []
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.chain.append({'url': req.full_url, 'status': code, 'location': newurl})
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def fetch(url):
    redirects = Redirects()
    opener = urllib.request.build_opener(redirects)
    started = time.monotonic()
    result = {'url': url, 'status': None, 'final_url': None, 'redirects': [], 'error': None}
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'CSSVistaOwnerAudit/1.0 (+read-only technical audit)', 'Accept-Encoding': 'identity'})
        try: response = opener.open(req, timeout=30)
        except urllib.error.HTTPError as e: response = e
        with response:
            body = response.read(6_000_001)
            result.update(status=response.status, final_url=response.url, headers=dict(response.headers), body_sha256=hashlib.sha256(body).hexdigest(), response_bytes=len(body), truncated=len(body)>6_000_000)
            result['_body'] = body[:6_000_000].decode('utf-8', errors='replace')
    except Exception as e: result['error'] = str(e)
    result['redirects'] = redirects.chain
    result['duration_seconds'] = round(time.monotonic() - started, 3)
    return result

def load_json(path): return json.loads((ROOT / path).read_text())

def finish_decisions(report):
    """Apply observed output decisions separately from broad registry candidates."""
    for rec in report['urls']:
        rec['source_indexable_candidate'] = rec.get('intended_indexability')
        robots = rec.get('robots') or ''
        if rec.get('status') in (404, 410):
            rec['intended_indexability'] = False
            rec['indexability_recommendation'] = 'retain_genuine_not_found'
        elif rec.get('access') in ('authenticated', 'admin'):
            rec['intended_indexability'] = False
            rec['indexability_recommendation'] = 'retain_private_noindex'
        elif rec.get('redirects'):
            rec['intended_indexability'] = False
            rec['indexability_recommendation'] = 'retain_redirect_to_equivalent_canonical'
        elif rec.get('http_observed') and 'noindex' in robots:
            rec['intended_indexability'] = False
            rec['indexability_recommendation'] = 'retain_exclusion_pending_individual_value_review'
        elif rec.get('sitemap_presence'):
            rec['intended_indexability'] = True
            rec['indexability_recommendation'] = 'retain_indexable_subject_to_content_accuracy_review'
        elif 'technical_probe' in rec.get('sources', []):
            rec['intended_indexability'] = False
            rec['indexability_recommendation'] = 'consolidate_variant_or_exclude_technical_resource'
        elif rec.get('source_indexable_candidate'):
            rec['intended_indexability'] = None
            rec['indexability_recommendation'] = 'check_final_content_gate_before_indexing'
        else:
            rec['indexability_recommendation'] = 'retain_exclusion_or_review_unclassified_url'
    return report


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--origin', default='https://www.css-vista.com')
    ap.add_argument('--limit', type=int, default=120)
    ap.add_argument('--output', default='docs/seo')
    args = ap.parse_args()
    origin = args.origin.rstrip('/')
    if args.limit < 1 or args.limit > 300: ap.error('--limit must be between 1 and 300; this audit is intentionally bounded')
    out = ROOT / args.output
    evidence = out / 'evidence'
    evidence.mkdir(parents=True, exist_ok=True)
    module = "import {ROUTE_REGISTRY,ROUTE_REDIRECTS} from './src/data/routeRegistry.mjs'; console.log(JSON.stringify({routes:ROUTE_REGISTRY,redirects:ROUTE_REDIRECTS}))"
    registry = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', module], cwd=ROOT))
    records = {}
    def add(path, source, family=None):
        if not path.startswith('/'): return
        url = origin + path
        rec = records.setdefault(url, {'url': url, 'family': family, 'sources': [], 'status': None, 'final_url': None, 'canonical': None, 'robots': None, 'x_robots_tag': None, 'sitemap_presence': False, 'intended_indexability': None, 'google_status': None, 'action_taken': 'inventory_only', 'http_observed': False})
        if source not in rec['sources']: rec['sources'].append(source)
        rec['family'] = rec['family'] or '/unclassified'
    for r in registry['routes']:
        if r['match']=='exact': add(r['path'], 'route_registry', r['path'])
    for r in registry['redirects']: add(r['from'], 'legacy_redirect')
    for path in re.findall(r'<Route\s+path="([^"]+)"', (ROOT/'src/App.tsx').read_text()):
        if ':' not in path and '*' not in path: add(path, 'react_route')
    for book in load_json('public/book-summaries/index.json')['books']: add('/book-summaries/'+book['slug'], 'book_source', '/book-summaries/:slug')
    optional = load_json('src/data/bundled/optional-notes-index.json')
    for group in optional['groups']:
        for subject in group['subjects']:
            base = '/study-material/optional/'+subject['slug']; add(base, 'optional_source', '/study-material/optional/:subject')
            for topic in subject['topics']: add(base+'/'+topic['slug'], 'optional_source', '/study-material/optional/:subject/:topic')
    for chapter in load_json('src/data/bundled/islamic-references-index.json')['chapters']:
        base = '/study-material/islamic-studies/'+chapter['slug']; add(base, 'islamic_source', '/study-material/islamic-studies/:chapter')
        for topic in chapter['topics']: add(base+'/'+topic['slug'], 'islamic_source', '/study-material/islamic-studies/:chapter/:topic')
    for post in load_json('public/vistagram-content/index.json').get('posts', []): add('/vistagram/'+post['slug'], 'vistagram_source', '/vistagram/:slug')
    for cat in load_json('public/mcq/index.json')['categories']: add('/gk/cat/'+cat['slug'], 'mcq_source', '/gk/cat/:slug')
    for path in ('src/data/pastPapers.generated.ts', 'src/data/pmsPastPapers.generated.ts', 'src/data/supplementalPastPapers.generated.ts'):
        for match in re.findall(r'^\s*(\{"id".*\}),?\s*$', (ROOT/path).read_text(), flags=re.M):
            paper = json.loads(match)
            add('/past-papers/view/'+paper['id'], 'past_paper_source', '/past-papers/view/:id')
            add('/past-papers/'+paper['examination'].lower()+'/'+str(paper['year']), 'past_paper_source', '/past-papers/:exam/:year')
    supplementary = ['/robots.txt', '/ads.txt', '/deployment-fingerprint.json', '/this-is-a-css-vista-audit-missing-20261014', '/book-summaries/not-a-real-book-20261014', '/study-material/optional/not-a-real-subject-20261014', '/study-material/optional/political-science/not-a-real-topic-20261014', '/seo/routes/account.html', '/index.html', '/start-css/', '/START-CSS', '/%73tart-css', '/start-css?audit=20261014', '/privacy', '/opinions', '/api/journal.php', '/study-material/optional/pure-mathematics', '/past-papers/view/not-a-real-paper-20261014', '/gk/cat/not-a-real-category-20261014', '/start-css//']
    for path in supplementary: add(path, 'technical_probe', '/technical-probe')
    sitemap_fetches, sitemap_urls, sitemap_errors, sitemap_queue = [], [], [], [origin+'/sitemap.xml']
    while sitemap_queue and len(sitemap_fetches)<30:
        url = sitemap_queue.pop(0)
        if any(r['url']==url for r in sitemap_fetches): continue
        result = fetch(url); body=result.pop('_body', ''); sitemap_fetches.append(result)
        (evidence / urllib.parse.urlsplit(url).path.lstrip('/')).write_text(body)
        try:
            xml = ET.fromstring(body)
            locs = [n.text for n in xml.findall('.//{*}loc')]
            if xml.tag.endswith('sitemapindex'): sitemap_queue.extend(locs)
            else:
                for loc in locs:
                    if urllib.parse.urlsplit(loc).netloc != urllib.parse.urlsplit(origin).netloc: sitemap_errors.append({'url':loc,'issue':'foreign_sitemap_origin'});continue
                    sitemap_urls.append(loc);add(urllib.parse.urlsplit(loc).path, 'production_sitemap');records[loc]['sitemap_presence']=True
        except ET.ParseError as e: sitemap_errors.append({'url': url, 'issue': str(e)})
    selected = []
    def choose(url):
        if url not in selected: selected.append(url)
    for p in supplementary: choose(origin+p)
    choose('http://css-vista.com/start-css'); choose('http://www.css-vista.com/start-css'); choose('https://css-vista.com/start-css')
    families = {}
    for url, rec in records.items(): families.setdefault(rec['family'], []).append(url)
    for family, urls in families.items():
        if ':' in family: choose(urls[0])
    for r in registry['routes']:
        if r['match']=='exact' and r['access']=='public': choose(origin+r['path'])
    for p in ('/account','/account/settings','/account/dashboard','/sadiaali/login','/mpt','/daily-briefing','/journal'): choose(origin+p)
    for i in range(1, 4):
        for family, urls in families.items():
            if ':' in family and len(urls)>i: choose(urls[i])
    selected=selected[:args.limit]
    snapshots = {'/', '/start-css', '/study-material/optional', '/study-material/islamic-studies', '/journal', '/book-summaries', '/account', '/this-is-a-css-vista-audit-missing-20261014'}
    snapshot_families=set()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(fetch, selected))
    discovered=[]
    robot = urllib.robotparser.RobotFileParser()
    for result in results:
        if result['url']==origin+'/robots.txt': robot.parse(result.get('_body','').splitlines())
    for result in results:
        body=result.pop('_body','');url=result['url'];path=urllib.parse.urlsplit(url).path
        if url not in records: records[url]={'url':url,'family':'/host-variant','sources':['technical_probe'],'sitemap_presence':False,'intended_indexability':False,'google_status':None,'action_taken':'inventory_only'}
        rec=records[url]; rec.update(result);rec['http_observed']=True
        headers={k.lower():v for k,v in result.get('headers',{}).items()}
        rec['x_robots_tag']=headers.get('x-robots-tag')
        rec['robots_txt_allowed']=robot.can_fetch('Googlebot',url) if robot.last_checked else None
        rec['adsbot_robots_txt_allowed']=robot.can_fetch('Mediapartners-Google',url) if robot.last_checked else None
        if 'html' in headers.get('content-type',''):
            page=Page();page.feed(body)
            main=' '.join(page.main_text)
            rec.update(canonical=page.canonicals[0] if page.canonicals else None, canonical_tags=page.canonicals, robots=', '.join(page.robots), title=page.title.strip(), description=page.description, h1=page.h1, main_text_characters=len(main), main_text_sample=main[:500], main_text_sha256=hashlib.sha256(main.encode()).hexdigest(), internal_links=sorted(set(urllib.parse.urljoin(result.get('final_url') or url, x) for x in page.links if urllib.parse.urlsplit(urllib.parse.urljoin(url,x)).netloc==urllib.parse.urlsplit(origin).netloc)), required_assets=page.assets, structured_data_json_valid=all(x['valid_json'] for x in page.structured_data), rendering_observation='raw HTTP HTML only; browser/hydration separately required', adsense_loader_present='pagead/js/adsbygoogle.js' in body, mobile_browser_observation=None)
            for link in rec['internal_links']:
                p=urllib.parse.urlsplit(link)
                if not p.query and not p.fragment and not re.search(r'\.[a-z0-9]{2,5}$',p.path): discovered.append(p.path)
            family=rec['family']
            if path in snapshots or (':' in family and family not in snapshot_families):
                filename='http-'+hashlib.sha256(url.encode()).hexdigest()[:12]+'.html';(evidence/filename).write_text(body);rec['html_evidence']='docs/seo/evidence/'+filename;snapshot_families.add(family)
        elif path in ('/robots.txt','/ads.txt','/deployment-fingerprint.json'):
            (evidence/path.lstrip('/')).write_text(body)
    for path in discovered: add(path, 'production_html_link')
    # Resolve overlapping patterns with the exact application authority, not a
    # second approximation (paper viewer paths overlap the exam/year pattern).
    policy_script = "import {readFileSync} from 'node:fs'; import {findRouteDefinition,getRoutePolicy} from './src/data/routeRegistry.mjs'; const paths=JSON.parse(readFileSync(0,'utf8')); console.log(JSON.stringify(paths.map(path=>({path,definition:findRouteDefinition(path),policy:getRoutePolicy(path)}))))"
    paths = [urllib.parse.urlsplit(url).path for url in records]
    policies = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', policy_script], input=json.dumps(paths), text=True, cwd=ROOT))
    for rec, resolved in zip(records.values(), policies):
        policy, definition = resolved['policy'], resolved['definition']
        rec.update(access=policy['access'], content_quality=policy['contentQuality'], ad_mode=policy['adMode'], source_robots=policy['robots'], intended_indexability=policy['indexable'])
        if definition and rec['family'] == '/unclassified': rec['family'] = definition['path']
    # Asset responses are bounded and shared assets are checked once, not on every page.
    assets=sorted(set(urllib.parse.urljoin(r['url'],x) for r in records.values() for x in r.get('required_assets',[]) if urllib.parse.urlsplit(urllib.parse.urljoin(r['url'],x)).netloc==urllib.parse.urlsplit(origin).netloc))
    asset_checks=[]
    for asset in assets[:8]:
        r=fetch(asset);r.pop('_body',None);asset_checks.append(r)
    counts={}
    for rec in records.values():counts[rec['family']]=counts.get(rec['family'],0)+1
    report={'observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_inventory_note':'Git SHA identifies baseline checkout; source inventory can include local review-branch changes. Live HTTP observations preserve their own response headers and hashes.','source_git_sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'origin':origin,'scope':'Complete discovered source/sitemap/link union; bounded live representative HTTP sample. No Search Console/account evidence. Pattern definitions are not concrete URLs. Source inventory includes private routes but never their data.','known_google_urls':None,'indexed_canonical_urls':None,'sitemap_url_entries':len(sitemap_urls),'sitemap_unique_urls':len(set(sitemap_urls)),'sitemap_errors':sitemap_errors,'sitemap_fetches':sitemap_fetches,'inventory_urls':len(records),'live_html_and_technical_probes':len(results),'live_asset_probes':asset_checks,'families':counts,'route_definitions':registry['routes'],'urls':sorted(records.values(),key=lambda r:r['url'])}
    report = finish_decisions(report)
    (out/'URL_INVENTORY.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    fields=['url','family','status','final_url','canonical','robots','x_robots_tag','sitemap_presence','intended_indexability','access','content_quality','http_observed','robots_txt_allowed','title','main_text_characters','google_status','indexability_recommendation','action_taken']
    with (out/'URL_INVENTORY.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');writer.writeheader();writer.writerows(report['urls'])
    (evidence/'crawl-summary.json').write_text(json.dumps({k:v for k,v in report.items() if k!='urls'},indent=2)+'\n')
    print(json.dumps({'inventory_urls':len(records),'sitemap_unique_urls':len(set(sitemap_urls)),'live_probes':len(results),'status_counts':{str(s):sum(r.get('status')==s for r in results) for s in set(r.get('status') for r in results)},'output':str(out)},indent=2))

if __name__=='__main__':main()
