#!/usr/bin/env python3
"""
Import the Essay Themes 2027 research roadmap into CSS Vista.

The source is a structured Word document: `ThemeHeading` marks each theme,
`ThemeSubheading` marks its A-M research sections, `Bullet1` marks every single
research direction a student can tick off, and `Body`/`SmallNote` carry the
theme brief and its tier.

Two preamble headings ("How to Use This Roadmap" and "Universal Operating
Modules") are not themes. They apply to every theme, so they are emitted once
as `universal` and surfaced on each theme page rather than duplicated 25 times.

Checkpoint ids are content hashes, not positions. Re-importing a corrected
document therefore keeps a student's existing ticks on every direction whose
wording did not change, instead of silently shifting them onto other bullets.

Writes:
  public/study-material/essay-themes.json        full roadmap, fetched at runtime
  src/data/bundled/essay-themes-index.json       counts and titles, bundled

Usage: python3 scripts/import_essay_themes.py [--check]
"""

import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'data-archive/essay-themes/essay-themes-2027-roadmap.docx'
FULL_OUT = ROOT / 'public/study-material/essay-themes.json'
INDEX_OUT = ROOT / 'src/data/bundled/essay-themes-index.json'

# What each lettered section actually contains, which decides how the page
# renders it. Measured from the source: A and I are bare terms/source names,
# D pairs a dimension with its detail, E is indicators that feed the evidence
# capture card, L is essay titles, M is a search template, the rest are
# directive sentences.
SECTION_KINDS = {
    'A': 'terms', 'B': 'directions', 'C': 'frameworks', 'D': 'dimensions',
    'E': 'indicators', 'F': 'directions', 'G': 'directions', 'H': 'documents',
    'I': 'sources', 'J': 'directions', 'K': 'directions', 'L': 'titles',
    'M': 'search',
}


def paragraphs(document_xml):
    """(style, text) for every paragraph, in document order."""
    root = ET.fromstring(document_xml)
    body = root.find(f'{W}body')
    for element in body:
        if element.tag != f'{W}p':
            continue
        style = ''
        properties = element.find(f'{W}pPr')
        if properties is not None:
            node = properties.find(f'{W}pStyle')
            if node is not None:
                style = node.get(f'{W}val', '')
        text = ''.join(node.text or '' for node in element.iter(f'{W}t')).strip()
        if text:
            yield style, text


def table_headers(document_xml):
    """Column headers of the Evidence Capture Card."""
    root = ET.fromstring(document_xml)
    for table in root.iter(f'{W}tbl'):
        for row in table.iter(f'{W}tr'):
            cells = [
                ''.join(node.text or '' for node in cell.iter(f'{W}t')).strip()
                for cell in row.iter(f'{W}tc')
            ]
            if any(cells):
                return cells
    return []


def slugify(value, limit=60):
    cleaned = (value.replace('&', ' and ')
                    .replace('’', '').replace("'", ''))
    cleaned = re.sub(r'[^a-zA-Z0-9]+', '-', cleaned).strip('-').lower()
    while len(cleaned) > limit and '-' in cleaned:
        cleaned = cleaned.rsplit('-', 1)[0]
    return cleaned


def checkpoint_id(theme_slug, letter, text):
    """Stable across re-imports: derived from the direction's own wording."""
    digest = hashlib.sha1(f'{theme_slug}|{letter}|{text}'.encode()).hexdigest()
    return f'{letter.lower()}{digest[:8]}'


def clean_bullet(text):
    return re.sub(r'^[•\-–—]\s*', '', text).strip()


def split_dimension(text):
    """'Economic: productivity, wages...' -> ('Economic', 'productivity, wages...')"""
    match = re.match(r'^([A-Z][A-Za-z/ &‑-]{2,40}?):\s+(.*)$', text)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return None, text


def build():
    document_xml = zipfile.ZipFile(SOURCE).read('word/document.xml')
    items = list(paragraphs(document_xml))

    preamble_title = ''
    preamble = []            # universal modules, applied to every theme
    themes = []
    current_theme = None
    current_section = None
    in_theme = False

    for style, text in items:
        if style == 'ThemeHeading':
            numbered = re.match(r'^(\d+)\.\s*(.+)$', text)
            current_section = None
            if numbered:
                in_theme = True
                name = numbered.group(2).strip()
                slug = slugify(name)
                current_theme = {
                    'number': int(numbered.group(1)),
                    'slug': slug,
                    'name': name,
                    'tier': '',
                    'brief': '',
                    'sections': [],
                }
                themes.append(current_theme)
            else:
                in_theme = False
                current_theme = None
                preamble.append({'heading': text, 'groups': []})
                preamble_title = preamble_title or text
            continue

        if style == 'SmallNote':
            if in_theme and current_theme is not None:
                tier = re.match(r'^Tier\s+([AB])', text)
                current_theme['tier'] = tier.group(1) if tier else ''
            continue

        if style == 'Body':
            if in_theme and current_theme is not None and not current_theme['brief']:
                current_theme['brief'] = text
            elif preamble:
                preamble[-1].setdefault('intro', text)
            continue

        if style == 'ThemeSubheading':
            if in_theme and current_theme is not None:
                letter = text.split('.', 1)[0].strip()
                title = text.split('.', 1)[1].strip() if '.' in text else text
                # "Scope & Conceptual Foundation — Define and Distinguish"
                label, _, instruction = title.partition('—')
                current_section = {
                    'letter': letter,
                    'title': label.strip(),
                    'instruction': instruction.strip(),
                    'kind': SECTION_KINDS.get(letter, 'directions'),
                    'items': [],
                }
                current_theme['sections'].append(current_section)
            elif preamble:
                current_section = {'heading': text, 'items': []}
                preamble[-1]['groups'].append(current_section)
            continue

        if style == 'Bullet1':
            body = clean_bullet(text)
            if not body:
                continue
            if in_theme and current_theme is not None and current_section is not None:
                entry = {
                    'id': checkpoint_id(current_theme['slug'], current_section['letter'], body),
                    'text': body,
                }
                if current_section['kind'] == 'dimensions':
                    label, detail = split_dimension(body)
                    if label:
                        entry['label'] = label
                        entry['text'] = detail
                current_section['items'].append(entry)
            elif preamble and current_section is not None:
                current_section['items'].append(body)
            continue

    return themes, preamble, preamble_title, table_headers(document_xml)


def main():
    check = '--check' in sys.argv
    themes, preamble, _, evidence_fields = build()

    if len(themes) != 25:
        raise SystemExit(f'Expected 25 themes, parsed {len(themes)}')
    letters = [section['letter'] for theme in themes for section in theme['sections']]
    expected = list('ABCDEFGHIJKLM')
    for theme in themes:
        got = [section['letter'] for section in theme['sections']]
        if got != expected:
            raise SystemExit(f'Theme "{theme["name"]}" has sections {got}, expected {expected}')
        for section in theme['sections']:
            if not section['items']:
                raise SystemExit(f'Theme "{theme["name"]}" section {section["letter"]} is empty')
    ids = [item['id'] for theme in themes for section in theme['sections'] for item in section['items']]
    if len(ids) != len(set(ids)):
        raise SystemExit('Checkpoint ids collide; widen the hash')

    for theme in themes:
        theme['checkpointCount'] = sum(len(section['items']) for section in theme['sections'])

    full = {
        'generatedFrom': SOURCE.name,
        'title': 'Essay Themes 2027 — Research & Data-Collection Roadmap',
        'evidenceCardFields': evidence_fields,
        'universal': preamble,
        'themes': themes,
    }
    index = {
        'title': full['title'],
        'themes': [
            {
                'number': theme['number'],
                'slug': theme['slug'],
                'name': theme['name'],
                'tier': theme['tier'],
                'brief': theme['brief'],
                'checkpointCount': theme['checkpointCount'],
                'sections': [
                    {'letter': s['letter'], 'title': s['title'], 'kind': s['kind'], 'count': len(s['items'])}
                    for s in theme['sections']
                ],
            }
            for theme in themes
        ],
    }

    full_text = json.dumps(full, ensure_ascii=False, indent=2) + '\n'
    index_text = json.dumps(index, ensure_ascii=False, indent=2) + '\n'

    if check:
        stale = [
            path.name for path, text in ((FULL_OUT, full_text), (INDEX_OUT, index_text))
            if not path.exists() or path.read_text(encoding='utf-8') != text
        ]
        if stale:
            raise SystemExit(f'Essay-theme data is stale: {", ".join(stale)}. Run scripts/import_essay_themes.py')
        print(f'Essay-theme roadmap up to date: {len(themes)} themes, {len(ids)} checkpoints.')
        return

    FULL_OUT.parent.mkdir(parents=True, exist_ok=True)
    INDEX_OUT.parent.mkdir(parents=True, exist_ok=True)
    FULL_OUT.write_text(full_text, encoding='utf-8')
    INDEX_OUT.write_text(index_text, encoding='utf-8')
    print(f'Wrote {len(themes)} themes, {len(ids)} checkpoints, {len(preamble)} universal modules.')
    print(f'  {FULL_OUT.relative_to(ROOT)}  ({FULL_OUT.stat().st_size // 1024} KB)')
    print(f'  {INDEX_OUT.relative_to(ROOT)} ({INDEX_OUT.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
