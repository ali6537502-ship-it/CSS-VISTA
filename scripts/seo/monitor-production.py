#!/usr/bin/env python3
"""Bounded, read-only production regression monitor; never claims Google indexing.

Reuses the existing crawler's HTTP/HTML parser. No cookies, credentials, API
mutations, Google requests, artificial traffic or account contents are involved.
"""
import argparse
import concurrent.futures
import datetime
import importlib.util
import json
from pathlib import Path
import subprocess
import urllib.parse
import urllib.robotparser
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('cssv_crawler', Path(__file__).with_name('crawl-production.py'))
CRAWLER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CRAWLER)
ORIGIN = 'https://www.css-vista.com'
LOADER = 'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'


def inspect_page(response, expected_url, *, indexable, ads_allowed):
    """Validate the actual response, independently of Google inclusion."""
    page = CRAWLER.Page()
    page.feed(response.get('_body', ''))
    errors = []
    headers = {key.lower(): value for key, value in response.get('headers', {}).items()}
    if response.get('status') != 200 or response.get('redirects'):
        errors.append('Expected a direct HTTP 200 response')
    if response.get('error') or response.get('truncated'):
        errors.append('Fetch failed or response was truncated')
    robots = ' '.join([*page.robots, headers.get('x-robots-tag', '')]).lower()
    if indexable:
        if page.canonicals != [expected_url]: errors.append('Canonical is missing, conflicting or different')
        if 'noindex' in robots: errors.append('Intended sitemap page became noindex')
        main = ' '.join(page.main_text).strip()
        if not page.title.strip() or not page.h1 or not main or main.lower() in {'loading', 'loading...', 'loading…', 'please wait…'}:
            errors.append('Missing meaningful title, heading or rendered main content')
    elif 'noindex' not in robots:
        errors.append('Account utility lost its noindex directive')
    if any(not item['valid_json'] for item in page.structured_data): errors.append('Invalid JSON-LD')
    loader = any(LOADER in asset for asset in page.assets)
    if loader != ads_allowed: errors.append('Initial ad loader disagrees with the reviewed route policy')
    return {'url': expected_url, 'status': response.get('status'), 'canonical': page.canonicals,
            'robots': robots, 'title': page.title, 'mainCharacters': len(' '.join(page.main_text)),
            'adLoader': loader, 'sha256': response.get('body_sha256'), 'errors': errors}


def same_origin(url):
    parsed = urllib.parse.urlsplit(url)
    return f'{parsed.scheme}://{parsed.netloc}' == ORIGIN and not parsed.username and not parsed.password


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-sha')
    parser.add_argument('--sample', type=int, default=24)
    parser.add_argument('--output', default='test-artifacts/seo-monitor.json')
    args = parser.parse_args()
    if not 12 <= args.sample <= 64: parser.error('--sample must be between 12 and 64')
    report = {'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'scope': 'Bounded anonymous technical regression checks, not Google account/indexing/approval or field performance data.',
              'expectedSha': args.expected_sha, 'liveSha': None, 'errors': [], 'pages': []}
    errors = report['errors']
    robots = CRAWLER.fetch(ORIGIN + '/robots.txt')
    robot_rules = urllib.robotparser.RobotFileParser()
    robot_rules.parse(robots.get('_body', '').splitlines())
    if robots.get('status') != 200 or not robots.get('_body', '').strip(): errors.append('robots.txt is unavailable')
    if ORIGIN + '/sitemap.xml' not in robots.get('_body', ''): errors.append('robots.txt lost its canonical sitemap reference')
    fingerprint = CRAWLER.fetch(ORIGIN + '/deployment-fingerprint.json')
    try: report['liveSha'] = json.loads(fingerprint.get('_body', ''))['gitSha']
    except (ValueError, KeyError): errors.append('Deployment fingerprint is unavailable or invalid')
    if fingerprint.get('status') != 200: errors.append('Deployment fingerprint is not HTTP 200')
    if args.expected_sha and report['liveSha'] != args.expected_sha: errors.append('Live release does not match the expected Git SHA')
    ads = CRAWLER.fetch(ORIGIN + '/ads.txt')
    if ads.get('status') != 200 or 'google.com, pub-6131271603014611, DIRECT' not in ads.get('_body', ''):
        errors.append('Existing ads.txt publisher authorization is unavailable')
    seen, sitemap_files = set(), []
    queue = [ORIGIN + '/sitemap.xml']
    while queue:
        url = queue.pop(0)
        if url in sitemap_files: errors.append('Repeated/cyclic child sitemap'); continue
        sitemap_files.append(url)
        if len(sitemap_files) > 10: errors.append('Unexpected sitemap expansion'); break
        response = CRAWLER.fetch(url)
        try:
            if response.get('status') != 200 or response.get('redirects'): raise ValueError('not a direct HTTP 200')
            xml = ET.fromstring(response.get('_body', ''))
            locations = [element.text for element in xml.findall('.//{*}loc')]
            if not locations or any(not item or not same_origin(item) for item in locations): raise ValueError('empty/noncanonical locations')
            root_tag = xml.tag.rsplit('}', 1)[-1]
            if root_tag == 'sitemapindex': queue.extend(locations)
            elif root_tag == 'urlset':
                if len(locations) > 50000: raise ValueError('URL limit exceeded')
                for item in locations:
                    if item in seen: errors.append('Duplicate sitemap URL: ' + item)
                    seen.add(item)
            else: raise ValueError('unexpected XML root')
        except (ET.ParseError, ValueError) as error: errors.append(f'{url}: {error}')
    report['sitemapFiles'] = len(sitemap_files)
    report['sitemapUrls'] = len(seen)
    core = ['/', '/start-css', '/grammar-course', '/css-eligibility-calculator', '/book-summaries/why-nations-fail',
            '/book-summaries/development-as-freedom', '/study-material/optional/accounting-and-auditing/paper-i-financial-accounting-50-marks',
            '/study-material/islamic-studies/introduction-to-islam/01-concept-of-islam-submission-faith-and-excellence']
    selected = [ORIGIN + path for path in core]
    for url in selected:
        if url not in seen: errors.append('Important canonical page is missing from sitemap: ' + url)
    candidates = sorted(seen.difference(selected))
    offset = (datetime.date.today().toordinal() // 7 * 17) % max(1, len(candidates))
    selected.extend((candidates[offset:] + candidates[:offset])[:max(0, args.sample - len(selected))])
    selected.extend([ORIGIN + '/account', ORIGIN + '/account/dashboard'])
    paths = [urllib.parse.urlsplit(url).path for url in selected]
    policy_script = "import {readFileSync} from 'node:fs';import {getAdRoutePolicy} from './src/lib/ads.ts';process.stdout.write(JSON.stringify(JSON.parse(readFileSync(0,'utf8')).map(path=>getAdRoutePolicy(path).autoAdsEnabled)))"
    policies = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', policy_script], input=json.dumps(paths), text=True, cwd=ROOT))
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        responses = list(pool.map(CRAWLER.fetch, selected))
    for url, response, ad_policy in zip(selected, responses, policies):
        indexable = urllib.parse.urlsplit(url).path not in {'/account', '/account/dashboard'}
        record = inspect_page(response, url, indexable=indexable, ads_allowed=ad_policy)
        if indexable and not all(robot_rules.can_fetch(agent, url) for agent in ['Googlebot', 'AdsBot-Google']):
            record['errors'].append('Public sitemap URL is blocked in robots.txt')
        report['pages'].append(record)
        errors.extend(url + ': ' + error for error in record['errors'])
    missing = CRAWLER.fetch(ORIGIN + '/seo-monitor-nonexistent-20261016')
    if missing.get('status') != 404: errors.append('Missing URL no longer returns a genuine HTTP 404')
    report['passed'] = not errors
    target = ROOT / args.output
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'passed': report['passed'], 'liveSha': report['liveSha'], 'sitemapUrls': len(seen), 'sampledPages': len(selected), 'errors': errors}))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
