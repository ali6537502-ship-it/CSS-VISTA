"""Parse the final Hostinger artifact, after every content transformation.

Complements audit-route-integrity (rewrite/canonical destination), duplicates
(primary content), and links; never estimates Google indexing or editorial merit.
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
MAX_BYTES = 50 * 1024 * 1024
MAX_ENTRIES = 50000


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.in_head = False
        self.root = False
        self.main = False
        self.metadata = {}
        self.titles = 0
        self.canonicals = []
        self.scripts = []
        self.script = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'head':
            self.in_head = True
        if tag == 'div' and attrs.get('id') == 'root':
            self.root = True
        if tag == 'main':
            self.main = True
        if tag == 'script' and attrs.get('type', '').lower() == 'application/ld+json':
            self.script = [attrs.get('id'), '']
        if self.in_head:
            if tag == 'title':
                self.titles += 1
            if tag == 'link' and 'canonical' in attrs.get('rel', '').lower().split():
                self.canonicals.append(attrs.get('href', ''))
            if tag == 'meta':
                key = attrs.get('name', attrs.get('property', '')).lower()
                self.metadata.setdefault(key, []).append(attrs.get('content', ''))

    def handle_endtag(self, tag):
        if tag == 'head':
            self.in_head = False
        if tag == 'script' and self.script is not None:
            self.scripts.append(self.script)
            self.script = None

    def handle_data(self, data):
        if self.script is not None:
            self.script[1] += data


def check_date(value, label, errors):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?', value):
        errors.append(f'{label}: invalid ISO date {value!r}')
        return
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        if parsed > datetime.now(timezone.utc):
            errors.append(f'{label}: future modification/publication date {value}')
    except ValueError:
        errors.append(f'{label}: invalid calendar date {value!r}')


def walk_dates(value, label, errors):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in ('datePublished', 'dateModified'):
                check_date(child, f'{label} {key}', errors)
            else:
                walk_dates(child, label, errors)
    elif isinstance(value, list):
        for child in value:
            walk_dates(child, label, errors)


def audit_pages(root, errors):
    count = 0
    for file in sorted(root.rglob('*.html')):
        if 'assets' in file.relative_to(root).parts:
            continue
        html = file.read_text(encoding='utf-8')
        page = Page(html)
        if not page.root:
            continue  # Google verification tokens and non-application documents.
        count += 1
        label = str(file.relative_to(root))
        if page.titles != 1:
            errors.append(f'{label}: expected one title, found {page.titles}')
        robots = ','.join(page.metadata.get('robots', [])).lower()
        if len(page.canonicals) > 1 or (not page.canonicals and 'noindex' not in robots):
            errors.append(f'{label}: expected a unique canonical for indexable pages, found {len(page.canonicals)}')
        canonical = page.canonicals[0] if page.canonicals else None
        for key in ('description', 'robots', 'googlebot', 'og:url', 'og:title', 'og:description'):
            values = page.metadata.get(key, [])
            if len(values) > 1:
                errors.append(f'{label}: duplicate/conflicting {key} metadata')
            if key in ('description', 'robots') and (not values or not values[0].strip()):
                errors.append(f'{label}: missing {key} metadata')
        if page.metadata.get('og:url', [canonical])[0] != canonical:
            errors.append(f'{label}: og:url conflicts with canonical')
        robots = ','.join(page.metadata.get('robots', [])).lower()
        if 'noindex' not in robots:
            if not page.main:
                errors.append(f'{label}: indexable application page has no main element')
            if 'noindex' in ','.join(page.metadata.get('googlebot', [])).lower():
                errors.append(f'{label}: Googlebot robots conflicts with indexable page')
        if 'data-cssv-collection-context' in html:
            errors.append(f'{label}: retired repetitive collection study essay returned')
        if '__SITE_ORIGIN__' in html or re.search(r'Use .*? as the main entry point', html):
            errors.append(f'{label}: unresolved origin or retired route-name SEO template')
        for identifier, text in page.scripts:
            try:
                value = json.loads(text)
                if not isinstance(value, (dict, list)):
                    raise ValueError('structured data must be an object or array')
            except (json.JSONDecodeError, ValueError) as error:
                errors.append(f'{label}: invalid JSON-LD: {error}')
                continue
            if identifier == 'cssv-route-structured-data' and isinstance(value, dict):
                # A route graph may also contain breadcrumbs whose ancestors
                # correctly have different URLs. Check the page entities only.
                for entity in value.get('@graph', [value]):
                    if isinstance(entity, dict) and entity.get('@type') != 'BreadcrumbList':
                        if entity.get('url', canonical) != canonical:
                            errors.append(f'{label}: route JSON-LD url conflicts with canonical')
            walk_dates(value, f'{label} JSON-LD', errors)
    return count


def audit_sitemaps(root, origin, errors):
    seen_urls = set()
    seen_files = set()

    def load(file, expected):
        if file in seen_files:
            errors.append(f'{file.name}: duplicate sitemap reference')
            return
        seen_files.add(file)
        try:
            raw = file.read_bytes()
            if len(raw) > MAX_BYTES:
                raise ValueError('exceeds 50 MB uncompressed limit')
            if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
                raise ValueError('DTD/entities are not supported in sitemaps')
            xml = ET.fromstring(raw)
            if xml.tag != f'{{{NS}}}{expected}':
                raise ValueError(f'expected {expected} in sitemap 0.9 namespace')
            entries = list(xml)
            if not entries or len(entries) > MAX_ENTRIES:
                raise ValueError(f'entry count {len(entries)} outside 1..50,000')
            item_tag = 'sitemap' if expected == 'sitemapindex' else 'url'
            for item in entries:
                if item.tag != f'{{{NS}}}{item_tag}':
                    raise ValueError('unexpected sitemap entry element')
                locs = item.findall(f'{{{NS}}}loc')
                if len(locs) != 1 or not locs[0].text:
                    raise ValueError('entry must contain exactly one nonempty loc')
                loc = locs[0].text
                url = urlsplit(loc)
                if url.scheme + '://' + url.netloc != origin or url.query or url.fragment or not url.path.startswith('/'):
                    raise ValueError(f'noncanonical sitemap URL {loc}')
                lastmods = item.findall(f'{{{NS}}}lastmod')
                if len(lastmods) > 1:
                    raise ValueError('entry has multiple lastmod elements')
                for lastmod in lastmods:
                    check_date(lastmod.text, f'{file.name} {loc} lastmod', errors)
                if expected == 'sitemapindex':
                    child = (root / url.path.lstrip('/')).resolve()
                    if root.resolve() not in child.parents:
                        raise ValueError('child sitemap path escapes artifact root')
                    load(child, 'urlset')
                elif loc in seen_urls:
                    errors.append(f'{file.name}: duplicate sitemap URL {loc}')
                else:
                    seen_urls.add(loc)
        except (OSError, ET.ParseError, ValueError) as error:
            errors.append(f'{file.name}: {error}')

    load(root / 'sitemap.xml', 'sitemapindex')
    return len(seen_files), len(seen_urls)


def main():
    root, origin = Path(sys.argv[1]), sys.argv[2]
    errors = []
    pages = audit_pages(root, errors)
    files, urls = audit_sitemaps(root, origin, errors)
    if not pages:
        errors.append('artifact has no application HTML pages')
    if errors:
        print(f'Search-readiness syntax/metadata audit failed with {len(errors)} problem(s):', file=sys.stderr)
        for error in errors[:60]:
            print(f'  - {error}', file=sys.stderr)
        return 1
    print(f'Search-readiness audit passed: {pages} application pages; unique metadata, valid JSON-LD dates, {files} parsed sitemap files and {urls} unique sitemap URLs. Editorial quality and Google indexing require separate review.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
