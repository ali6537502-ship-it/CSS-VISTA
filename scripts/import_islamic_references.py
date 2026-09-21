#!/usr/bin/env python3
"""
Import the Islamic Studies bilingual reference banks into CSS Vista.

Seven chapter documents, each authored at a different time and therefore each
laid out slightly differently. Rather than encode seven layouts, this reads the
one invariant they all share:

  * every reference entry is a table whose first row is
    "Reference NNN | title" (English) beside "حوالہ NNN | عنوان" (Urdu);
  * a row with two cells is an English/Urdu pair, in that order;
  * a row with one cell spans the width and carries the Arabic source text.

That model is preserved verbatim rather than flattened, because the English and
Urdu columns must never be interleaved: English stays left, Urdu stays right,
and the Arabic original sits full width between them.

Single-row two-cell tables appearing between entries are the chapter's topic
sections. Tables before the first entry are the chapter's front matter (scope,
evidence rules, how to read an entry); tables after the last entry are its
verification audit. Both are kept: the verification record is the point of
these documents, not decoration.

Inline hyperlinks are preserved as segments so every "Verify" link stays live.

Writes:
  public/study-material/islamic-studies/<chapter>.json   per chapter, fetched
  src/data/bundled/islamic-references-index.json         chapters and topics

Usage: python3 scripts/import_islamic_references.py [--check]
"""

import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
PKG = '{http://schemas.openxmlformats.org/package/2006/relationships}'

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / 'data-archive/islamic-studies'
OUT_DIR = ROOT / 'public/study-material/islamic-studies'
INDEX_OUT = ROOT / 'src/data/bundled/islamic-references-index.json'

# Chapter order follows the FPSC Islamic Studies paper, not the filenames.
CHAPTERS = [
    ('i', 'Introduction_to_Islam_Expanded_225_References.docx', 'introduction-to-islam'),
    ('ii', 'II_Sirah_Prophet_Role_Model_Reference_Bank_EN_UR.docx', 'sirah-of-the-prophet'),
    ('iii', 'Chapter_III_Human_Rights_Women_Islam_175_References.docx', 'human-rights-and-status-of-woman'),
    ('iv', 'Islamic_Civilization_and_Culture_Reference_Bank_EXPANDED_EN_UR.docx', 'islamic-civilization-and-culture'),
    ('v', 'Islam_and_the_World_Expanded_Reference_Bank.docx', 'islam-and-the-world'),
    ('vi', 'VI_Public_Administration_Governance_Islam_Reference_Bank.docx', 'public-administration-and-governance'),
    ('vii', 'VII_Islamic_Code_of_Life_Reference_Bank.docx', 'islamic-code-of-life'),
]

REFERENCE_EN = re.compile(r'^Reference\s+(\d+)\s*\|\s*(.*)$', re.S)
REFERENCE_UR = re.compile(r'^\s*حوالہ\s+[\d٠-٩]+\s*\|\s*(.*)$', re.S)

ARABIC_RANGES = ((0x0600, 0x06FF), (0x0750, 0x077F), (0xFB50, 0xFDFF), (0xFE70, 0xFEFF))
# Letters that appear in Urdu but not in Qur'anic/classical Arabic orthography.
URDU_ONLY = set('ٹڈڑںھےۓۂپچژگک')


def is_rtl_char(char):
    code = ord(char)
    return any(low <= code <= high for low, high in ARABIC_RANGES)


def rtl_ratio(text):
    letters = [c for c in text if unicodedata.category(c).startswith('L')]
    if not letters:
        return 0.0
    return sum(1 for c in letters if is_rtl_char(c)) / len(letters)


def looks_arabic_not_urdu(text):
    """An Arabic source passage, as opposed to the Urdu column."""
    return rtl_ratio(text) > 0.8 and not (URDU_ONLY & set(text))


def hyperlink_map(archive):
    rels = ET.fromstring(archive.read('word/_rels/document.xml.rels'))
    return {
        rel.get('Id'): rel.get('Target')
        for rel in rels.iter(f'{PKG}Relationship')
        if rel.get('Type', '').endswith('/hyperlink')
    }


def paragraph_segments(paragraph, links):
    """
    The paragraph as ordered segments, each optionally carrying a URL.

    Runs are merged while their link target is unchanged, so a sentence does
    not arrive as thirty fragments.
    """
    segments = []

    def push(text, url):
        if not text:
            return
        if segments and segments[-1].get('url') == url:
            segments[-1]['text'] += text
        else:
            segment = {'text': text}
            if url:
                segment['url'] = url
            segments.append(segment)

    def walk(node, url):
        for child in node:
            tag = child.tag
            if tag == f'{W}hyperlink':
                walk(child, links.get(child.get(f'{R}id')) or url)
            elif tag == f'{W}r':
                for run_child in child:
                    if run_child.tag == f'{W}t':
                        push(run_child.text or '', url)
                    elif run_child.tag in (f'{W}tab',):
                        push(' ', url)
                    elif run_child.tag in (f'{W}br', f'{W}cr'):
                        push(' ', url)
            elif tag in (f'{W}smartTag', f'{W}ins', f'{W}sdt', f'{W}sdtContent'):
                walk(child, url)

    walk(paragraph, None)
    for segment in segments:
        segment['text'] = re.sub(r'\s+', ' ', segment['text'])
    # Trim the ends without losing interior spacing between segments.
    while segments and not segments[0]['text'].strip():
        segments.pop(0)
    while segments and not segments[-1]['text'].strip():
        segments.pop()
    if segments:
        segments[0]['text'] = segments[0]['text'].lstrip()
        segments[-1]['text'] = segments[-1]['text'].rstrip()
    return [s for s in segments if s['text']]


def cell_paragraphs(cell, links):
    out = []
    for paragraph in cell.findall(f'{W}p'):
        segments = paragraph_segments(paragraph, links)
        if segments:
            out.append(segments)
    return out


def plain(paragraphs):
    return ' '.join(''.join(seg['text'] for seg in para) for para in paragraphs).strip()


def table_rows(table, links):
    rows = []
    for row in table.findall(f'{W}tr'):
        cells = [cell_paragraphs(cell, links) for cell in row.findall(f'{W}tc')]
        if any(cells):
            rows.append(cells)
    return rows


def slugify(value, limit=60):
    cleaned = value.replace('&', ' and ').replace('’', '').replace("'", '')
    cleaned = re.sub(r'[^a-zA-Z0-9]+', '-', cleaned).strip('-').lower()
    while len(cleaned) > limit and '-' in cleaned:
        cleaned = cleaned.rsplit('-', 1)[0]
    return cleaned or 'topic'


def split_heading(text):
    """'Justice, rights and the rule of law | References 018–066' -> both parts."""
    match = re.match(r'^(.*?)\s*\|\s*(References?\s+[\d–—\-\s]+)$', text)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    match = re.match(r'^(.*?)(References?\s+\d[\d–—\-\s]*)$', text)
    if match and match.group(1).strip():
        return match.group(1).strip(), match.group(2).strip()
    # A bare range label such as "References 001-012" or its Urdu equivalent
    # is not a heading; it belongs to the heading printed above it.
    if re.match(r'^(References?|حوالے|حوالہ)\s+[\d٠-٩]', text):
        return '', text.strip()
    return text.strip(), ''


def parse_entry(rows):
    """One reference entry: a bilingual heading, Arabic blocks and EN/UR pairs."""
    head = rows[0]
    en_paras = head[0]
    ur_paras = head[1] if len(head) > 1 else []
    # Some chapters add a subtitle paragraph under the reference heading.
    # Only the first paragraph is the title; the rest become a subtitle.
    en_head = plain(en_paras[:1])
    ur_head = plain(ur_paras[:1])
    match = REFERENCE_EN.match(en_head)
    number = int(match.group(1))
    title_en = match.group(2).strip()
    ur_match = REFERENCE_UR.match(ur_head)
    title_ur = ur_match.group(1).strip() if ur_match else ur_head
    subtitle_en = plain(en_paras[1:])
    subtitle_ur = plain(ur_paras[1:])

    arabic, blocks = [], []
    for cells in rows[1:]:
        if len(cells) == 1:
            text = plain(cells[0])
            if not text:
                continue
            # A full-width row is the Arabic source. Anything else that spans
            # the width is kept as a shared note so nothing is silently lost.
            arabic.append({
                'kind': 'arabic' if looks_arabic_not_urdu(text) else 'note',
                'paragraphs': cells[0],
            })
        else:
            english, urdu = cells[0], cells[1] if len(cells) > 1 else []
            if not english and not urdu:
                continue
            blocks.append({'en': english, 'ur': urdu})
    entry = {
        'number': number,
        'titleEn': title_en,
        'titleUr': title_ur,
        'arabic': arabic,
        'blocks': blocks,
    }
    if subtitle_en or subtitle_ur:
        entry['subtitleEn'] = subtitle_en
        entry['subtitleUr'] = subtitle_ur
    return entry


HEADING_SIGNATURES = (
    re.compile(r'^\d{1,2}[.)]?\s+\S'),        # "01  Concept of Islam"
    re.compile(r'^[A-Z][.)]\s+\S'),            # "B. Spiritual agency"
    re.compile(r'References?\s+\d'),           # "Foundations | References 001-008"
)


def looks_like_heading(text):
    """
    A topic heading rather than prose.

    Chapters were authored separately, so headings appear as numbers, letters,
    "| References NNN-NNN" or a bare short phrase. Prose is excluded by length
    and by ending in a full stop.
    """
    if not text or len(text) > 140:
        return False
    if any(signature.search(text) for signature in HEADING_SIGNATURES):
        return True
    return len(text) <= 90 and not text.endswith(('.', '؟', '۔'))


def parse_chapter(path):
    archive = zipfile.ZipFile(path)
    links = hyperlink_map(archive)
    document = ET.fromstring(archive.read('word/document.xml'))
    body = document.find(f'{W}body')
    tables = [el for el in body if el.tag == f'{W}tbl']

    parsed = []
    for table in tables:
        rows = table_rows(table, links)
        if not rows:
            continue
        first = plain(rows[0][0]) if rows[0] else ''
        parsed.append({
            'isReference': REFERENCE_EN.match(first) is not None,
            'rows': rows,
            'first': first,
        })

    reference_positions = [i for i, item in enumerate(parsed) if item['isReference']]
    if not reference_positions:
        raise SystemExit(f'{path.name}: no reference entries found')
    first_ref, last_ref = reference_positions[0], reference_positions[-1]

    # A heading is a topic heading only when reference entries follow it almost
    # immediately. Front matter and the closing audit are also short, bold and
    # two-column, but they are followed by prose, which is what separates them.
    def starts_a_topic(position):
        item = parsed[position]
        if item['isReference'] or len(item['rows'][0]) != 2:
            return False
        if not looks_like_heading(item['first']):
            return False
        return any(parsed[j]["isReference"] for j in range(position + 1, min(position + 5, len(parsed))))

    topic_positions = [i for i in range(1, last_ref + 1) if starts_a_topic(i)]
    body_start = min([first_ref] + topic_positions)

    title_rows = parsed[0]['rows']
    title_en = plain(title_rows[0][0])
    title_ur = plain(title_rows[0][1]) if len(title_rows[0]) > 1 else ''

    def matter(chunk):
        out = []
        for item in chunk:
            for cells in item['rows']:
                if len(cells) >= 2:
                    out.append({'en': cells[0], 'ur': cells[1]})
                elif cells and cells[0]:
                    out.append({'en': cells[0], 'ur': []})
        return out

    front = matter(parsed[1:body_start])
    back = matter(parsed[last_ref + 1:])

    topic_set = set(topic_positions)
    topics, current = [], None
    for position in range(body_start, last_ref + 1):
        item = parsed[position]
        if item['isReference']:
            if current is None:
                current = {'titleEn': title_en, 'titleUr': title_ur,
                           'rangeEn': '', 'rangeUr': '', 'intro': [], 'entries': []}
                topics.append(current)
            current['entries'].append(parse_entry(item['rows']))
        elif position in topic_set:
            en_title, en_range = split_heading(plain(item['rows'][0][0]))
            ur_title, ur_range = split_heading(plain(item['rows'][0][1]))
            # Chapters I and IV print a heading and its reference range as two
            # separate tables. The range labels the heading above it; it is not
            # a topic of its own.
            if current is not None and not current['entries'] and not en_title:
                current['rangeEn'] = current['rangeEn'] or en_range
                current['rangeUr'] = current['rangeUr'] or ur_range
                current['intro'].extend(matter([{'rows': item['rows'][1:]}]))
                continue
            current = {
                'titleEn': en_title, 'titleUr': ur_title,
                'rangeEn': en_range, 'rangeUr': ur_range,
                # Rows below the heading are the section's own introduction.
                'intro': matter([{'rows': item['rows'][1:]}]),
                'entries': [],
            }
            topics.append(current)
        elif current is not None:
            current['intro'].extend(matter([item]))
        else:
            front.extend(matter([item]))

    topics = [topic for topic in topics if topic['entries']]
    used = set()
    for topic in topics:
        base = slugify(topic['titleEn'])
        slug, suffix = base, 2
        while slug in used:
            slug, suffix = f'{base}-{suffix}', suffix + 1
        used.add(slug)
        topic['slug'] = slug
        topic['first'] = topic['entries'][0]['number']
        topic['last'] = topic['entries'][-1]['number']

    return {
        'titleEn': title_en,
        'titleUr': title_ur,
        'frontMatter': front,
        'topics': topics,
        'audit': back,
    }


def main():
    check = '--check' in sys.argv
    index_chapters, texts, total = [], {}, 0

    for numeral, filename, slug in CHAPTERS:
        path = SOURCE_DIR / filename
        if not path.exists():
            raise SystemExit(f'Missing source document: {path}')
        chapter = parse_chapter(path)
        entries = [entry for topic in chapter['topics'] for entry in topic['entries']]
        numbers = [entry['number'] for entry in entries]

        if len(set(numbers)) != len(numbers):
            raise SystemExit(f'{filename}: duplicate reference numbers')
        if numbers != sorted(numbers):
            raise SystemExit(f'{filename}: reference numbers are out of order')
        if not chapter['topics']:
            raise SystemExit(f'{filename}: no topic sections found')
        for topic in chapter['topics']:
            if not topic['titleEn'].strip():
                raise SystemExit(f'{filename}: topic {topic["first"]}-{topic["last"]} has no English title')
            if not topic['titleUr'].strip():
                raise SystemExit(f'{filename}: topic "{topic["titleEn"]}" has no Urdu title')
        empty = [entry['number'] for entry in entries if not entry['blocks'] and not entry['arabic']]
        if empty:
            raise SystemExit(f'{filename}: references {empty[:5]} have no content')

        # One file per topic. A chapter file would be up to 1.1 MB, which is a
        # punishing download on a phone; a topic is a few tens of kilobytes and
        # is exactly what the student opened.
        for topic in chapter['topics']:
            payload = {
                'chapterSlug': slug,
                'chapterNumeral': numeral.upper(),
                'chapterTitleEn': chapter['titleEn'],
                'chapterTitleUr': chapter['titleUr'],
                'slug': topic['slug'],
                'titleEn': topic['titleEn'],
                'titleUr': topic['titleUr'],
                'rangeEn': topic['rangeEn'],
                'rangeUr': topic['rangeUr'],
                'intro': topic['intro'],
                'entries': topic['entries'],
            }
            texts[OUT_DIR / slug / f'{topic["slug"]}.json'] = (
                json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')

        # The chapter file carries only what the chapter page shows: the
        # compiler's front matter and the verification audit.
        texts[OUT_DIR / f'{slug}.json'] = json.dumps({
            'numeral': numeral.upper(),
            'slug': slug,
            'generatedFrom': filename,
            'titleEn': chapter['titleEn'],
            'titleUr': chapter['titleUr'],
            'frontMatter': chapter['frontMatter'],
            'audit': chapter['audit'],
        }, ensure_ascii=False, separators=(',', ':')) + '\n'

        total += len(entries)
        index_chapters.append({
            'numeral': numeral.upper(),
            'slug': slug,
            'titleEn': chapter['titleEn'],
            'titleUr': chapter['titleUr'],
            'referenceCount': len(entries),
            'topics': [
                {
                    'slug': topic['slug'],
                    'titleEn': topic['titleEn'],
                    'titleUr': topic['titleUr'],
                    'count': len(topic['entries']),
                    'first': topic['first'],
                    'last': topic['last'],
                }
                for topic in chapter['topics']
            ],
        })

    texts[INDEX_OUT] = json.dumps(
        {'chapters': index_chapters, 'referenceTotal': total},
        ensure_ascii=False, indent=1) + '\n'

    if check:
        stale = [str(path.relative_to(ROOT)) for path, text in texts.items()
                 if not path.exists() or path.read_text(encoding='utf-8') != text]
        if stale:
            raise SystemExit(
                f'Islamic reference data is stale ({len(stale)} file(s), e.g. {stale[0]}). '
                'Run scripts/import_islamic_references.py')
        topics = sum(len(chapter['topics']) for chapter in index_chapters)
        print(f'Islamic reference banks up to date: {len(index_chapters)} chapters, '
              f'{topics} topics, {total} references.')
        return

    # Remove topic files whose topic no longer exists, so a renamed section
    # cannot leave an orphan being served.
    expected = {path.resolve() for path in texts}
    if OUT_DIR.exists():
        for existing in OUT_DIR.rglob('*.json'):
            if existing.resolve() not in expected:
                existing.unlink()

    for path, text in texts.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')

    topics = sum(len(chapter['topics']) for chapter in index_chapters)
    print(f'Wrote {len(index_chapters)} chapters, {topics} topics, {total} references.')
    for chapter in index_chapters:
        sizes = [(OUT_DIR / chapter['slug'] / f'{t["slug"]}.json').stat().st_size // 1024
                 for t in chapter['topics']]
        print(f'  {chapter["numeral"]:<4} {chapter["slug"]:<40} '
              f'{chapter["referenceCount"]:>4} refs  {len(chapter["topics"]):>2} topics  '
              f'topic file {min(sizes)}-{max(sizes)} KB')
    print(f'  index {INDEX_OUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
