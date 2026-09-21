#!/usr/bin/env python3
"""
Import the CSS optional-subject study notes into CSS Vista.

The 23 source documents were authored separately and their heading levels do
not mean the same thing: in the Group II resource a Heading 1 names a SUBJECT,
in the Economics file it names the whole paper, and in the history files the
subject is the document Title while Heading 1 is a topic. There is no reliable
way to infer that, and guessing wrong silently mis-slices a student's syllabus.

So the mapping is declared, not inferred. SOURCES below states, per document,
which heading level names the subject, which names a topic, and which headings
are front matter. Everything else is generic: the parser builds a heading tree
and preserves paragraphs, bullets, tables and the authors' own callout styles.

Every subject name is then checked against the FPSC taxonomy the site already
publishes (src/data/syllabus.ts), so notes can never appear under a subject or
group that does not exist, and the student's Group -> Subject -> Topic path is
the same one the Subject Selector uses.

Writes:
  public/study-material/optional/<subject>/<topic>.json   per topic, fetched
  public/study-material/optional/<subject>.json           subject front matter
  src/data/bundled/optional-notes-index.json              groups and topics

Usage: python3 scripts/import_optional_notes.py [--check]
"""

import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
PKG = '{http://schemas.openxmlformats.org/package/2006/relationships}'

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / 'data-archive/optional-notes'
OUT_DIR = ROOT / 'public/study-material/optional'
INDEX_OUT = ROOT / 'src/data/bundled/optional-notes-index.json'

# Headings that introduce a subject rather than a topic of it.
FRONT_MATTER = re.compile(
    r'^(how to (use|study)|about this|table of contents|subject map|complete syllabus map|'
    r'preparation strategy|group [ivx]+ at a glance|bibliography|selected primary|'
    r'consolidated (academic )?reference|references and further reading|'
    r'final revision|master revision|overview)\b', re.I)

# A topic heading in documents that number their topics.
NUMBERED = re.compile(r'^(?:\d+|[IVXL]+|[A-Z])[.)]\s*\S')

#: Per-document mapping. `subject` names the single subject a file covers;
#: `subjects` maps a heading to a subject when one file covers several.
#: `topic_level` is the heading level whose headings become topic pages, and
#: `numbered_topics` restricts those to headings the author numbered.
SOURCES = [
    # Group I — one file per subject; Heading 2 is the syllabus section.
    dict(file='01_Accountancy_Auditing.docx', group=1, subject='Accounting & Auditing', topic_level=2),
    dict(file='02_Economics.docx', group=1, subject='Economics', topic_level=2),
    dict(file='03_Computer_Science.docx', group=1, subject='Computer Science', topic_level=2),
    dict(file='04_Political_Science.docx', group=1, subject='Political Science', topic_level=2),
    dict(file='05_International_Relations.docx', group=1, subject='International Relations', topic_level=2),

    # Group II — one file per subject pair; Heading 1 names the subject.
    dict(file='Group_II_Physics_Chemistry_Master_Resource.docx', group=2,
         subjects={'PHYSICS': 'Physics', 'CHEMISTRY': 'Chemistry'}, topic_level=3),
    dict(file='Group_II_Applied_Pure_Mathematics_Master_Resource.docx', group=2,
         subjects={'APPLIED MATHEMATICS': 'Applied Mathematics', 'PURE MATHEMATICS': 'Pure Mathematics'},
         topic_level=3),
    dict(file='Group_II_Statistics_Geology_Master_Resource.docx', group=2,
         subjects={'STATISTICS': 'Statistics', 'GEOLOGY': 'Geology'}, topic_level=3),

    # Group III — topics are roman-numbered Heading 1s. The combined resource
    # also carries Business Administration and Town Planning, which have their
    # own fuller files, so only its two remaining subjects are taken from it.
    dict(file='Business Administration - Expanded Master Study Resource.docx', group=3, autonumbered=True,
         subject='Business Administration', topic_level=1, numbered_topics=True),
    dict(file='Town Planning and Urban Management - Expanded Master Study Resource.docx', group=3, autonumbered=True,
         subject='Town Planning & Urban Management', topic_level=1, numbered_topics=True),
    dict(file='Group III Optional Subjects - Expanded Master Study Resource.docx', group=3, autonumbered=True,
         topic_level=1, numbered_topics=True,
         # Subjects run in order, each ending at "Bibliography and Further Reading".
         segments=[None, 'Public Administration', 'Governance & Public Policies', None]),

    # Group IV — the subject is the document Title; Heading 1 is a topic.
    dict(file='History_of_Pakistan_and_India_Expanded.docx', group=4,
         subject='History of Pakistan & India', topic_level=1, numbered_topics=True),
    dict(file='Islamic_History_and_Culture_Expanded.docx', group=4,
         subject='Islamic History & Culture', topic_level=1, numbered_topics=True),
    dict(file='British_History_Expanded.docx', group=4,
         subject='British History', topic_level=1, numbered_topics=True),
    dict(file='European_History_Expanded.docx', group=4,
         subject='European History', topic_level=1, numbered_topics=True),
    dict(file='History_of_USA_Expanded.docx', group=4,
         subject='History of USA', topic_level=1, numbered_topics=True),

    # Group V — "Subject N — Name" at Heading 1, syllabus units at Heading 2.
    dict(file='Gender_Studies_Expanded_Master_Notes.docx', group=5, subject='Gender Studies', topic_level=2),
    dict(file='Botany_Expanded_Master_Notes.docx', group=5, subject='Botany', topic_level=2),
    dict(file='Zoology_Expanded_Master_Notes.docx', group=5, subject='Zoology', topic_level=2),
    dict(file='English_Literature_Expanded_Master_Notes.docx', group=5, subject='English Literature', topic_level=2),

    # Groups VI and VII — several subjects per file, topics numbered at Heading 2.
    dict(file='Group_VI_Optional_Subjects_MASTER_STUDY_RESOURCE.docx', group=6, topic_level=2,
         numbered_topics=True,
         subjects={'1. LAW (Code 38)': 'Law', '2. CONSTITUTIONAL LAW (Code 39)': 'Constitutional Law',
                   '3. INTERNATIONAL LAW (Code 40)': 'International Law',
                   '4. MUSLIM LAW & JURISPRUDENCE (Code 41)': 'Muslim Law & Jurisprudence',
                   '5. MERCANTILE LAW (Code 42)': 'Mercantile Law',
                   '6. CRIMINOLOGY (Code 43)': 'Criminology', '7. PHILOSOPHY (Code 44)': 'Philosophy'}),
    dict(file='Group_VII_Master_Study_Resource_Sociology_Psychology_Geography_FINAL.docx', group=7,
         topic_level=2, numbered_topics=True,
         subjects={'PSYCHOLOGY': 'Psychology', 'GEOGRAPHY': 'Geography', 'SOCIOLOGY': 'Sociology'}),
]

# The authors' own paragraph styles carry meaning; keep it rather than
# flattening every one of them into an anonymous paragraph.
CALLOUT_STYLES = {
    'KeyTakeaway': 'takeaway', 'TakeawayBullet': 'takeaway',
    'SourceNote': 'source', 'TopicIntro': 'intro',
}
BULLET_STYLES = {'MasterBullet', 'TeachingBullet', 'FocusBullet', 'TakeawayBullet', 'Compact'}


def canonical_subjects():
    """The FPSC optional subjects the site already publishes."""
    script = (
        "import { optionalGroups } from './src/data/syllabus.ts';"
        "console.log(JSON.stringify(optionalGroups.map(g => ({group: g.group,"
        "subjects: g.subjects.map(s => ({name: s.name, marks: s.marks}))}))))"
    )
    out = subprocess.run(['node', '--input-type=module', '-e', script],
                         cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def hyperlinks(archive):
    rels = ET.fromstring(archive.read('word/_rels/document.xml.rels'))
    return {rel.get('Id'): rel.get('Target') for rel in rels.iter(f'{PKG}Relationship')
            if rel.get('Type', '').endswith('/hyperlink')}


def segments_of(paragraph, links):
    """Paragraph text as runs, keeping bold and links."""
    out = []

    def push(text, url, bold):
        if not text:
            return
        if out and out[-1].get('url') == url and bool(out[-1].get('b')) == bold:
            out[-1]['text'] += text
            return
        piece = {'text': text}
        if url:
            piece['url'] = url
        if bold:
            piece['b'] = True
        out.append(piece)

    def walk(node, url):
        for child in node:
            if child.tag == f'{W}hyperlink':
                walk(child, links.get(child.get(f'{R}id')) or url)
            elif child.tag == f'{W}r':
                properties = child.find(f'{W}rPr')
                bold = properties is not None and properties.find(f'{W}b') is not None
                for run_child in child:
                    if run_child.tag == f'{W}t':
                        push(run_child.text or '', url, bold)
                    elif run_child.tag in (f'{W}tab', f'{W}br', f'{W}cr'):
                        push(' ', url, bold)
            elif child.tag in (f'{W}smartTag', f'{W}ins', f'{W}sdt', f'{W}sdtContent'):
                walk(child, url)

    walk(paragraph, None)
    for piece in out:
        piece['text'] = re.sub(r'\s+', ' ', piece['text'])
    while out and not out[0]['text'].strip():
        out.pop(0)
    while out and not out[-1]['text'].strip():
        out.pop()
    if out:
        out[0]['text'] = out[0]['text'].lstrip()
        out[-1]['text'] = out[-1]['text'].rstrip()
    return [piece for piece in out if piece['text']]


def plain(segments):
    return ''.join(piece['text'] for piece in segments).strip()


def style_of(paragraph):
    properties = paragraph.find(f'{W}pPr')
    if properties is None:
        return ''
    node = properties.find(f'{W}pStyle')
    return node.get(f'{W}val', '') if node is not None else ''


def is_list(paragraph):
    properties = paragraph.find(f'{W}pPr')
    return properties is not None and properties.find(f'{W}numPr') is not None


def heading_level(style):
    match = re.match(r'^Heading(\d)$', style)
    return int(match.group(1)) if match else None


def strip_autonumber(text):
    """
    Three documents carry a flattened Word list number in the heading text
    itself: "2I. Management" rather than "I. Management".

    This is applied only where the manifest says so. A blanket rule would
    also eat the leading year of a legitimate heading such as "1947 ...".
    """
    return re.sub(r'^\d+\s{0,2}(?=\S)', '', text).strip()


def read_flow(path, autonumbered=False):
    """The document as a flat stream of headings and content blocks."""
    archive = zipfile.ZipFile(path)
    links = hyperlinks(archive)
    document = ET.fromstring(archive.read('word/document.xml'))
    body = document.find(f'{W}body')
    flow = []
    title = ''

    for element in body:
        if element.tag == f'{W}tbl':
            rows = []
            for row in element.findall(f'{W}tr'):
                cells = [plain(segments_of_cell(cell, links)) for cell in row.findall(f'{W}tc')]
                if any(cells):
                    rows.append(cells)
            if rows:
                flow.append({'kind': 'table', 'rows': rows})
            continue
        if element.tag != f'{W}p':
            continue
        style = style_of(element)
        segments = segments_of(element, links)
        if not segments:
            continue
        if style == 'Title' and not title:
            title = plain(segments)
            continue
        if style == 'Subtitle':
            continue
        level = heading_level(style)
        if level:
            # Word emits the list number as its own run, so strip it from the
            # joined text rather than from the first segment.
            text = plain(segments)
            if autonumbered:
                text = strip_autonumber(text)
            if text:
                flow.append({'kind': 'heading', 'level': level, 'text': text})
            continue
        if style in CALLOUT_STYLES:
            flow.append({'kind': 'callout', 'tone': CALLOUT_STYLES[style], 'segments': segments})
            continue
        if is_list(element) or style in BULLET_STYLES:
            if flow and flow[-1]['kind'] == 'list':
                flow[-1]['items'].append(segments)
            else:
                flow.append({'kind': 'list', 'items': [segments]})
            continue
        flow.append({'kind': 'para', 'segments': segments})

    return title, flow


def segments_of_cell(cell, links):
    out = []
    for paragraph in cell.findall(f'{W}p'):
        pieces = segments_of(paragraph, links)
        if pieces:
            if out:
                out.append({'text': ' '})
            out.extend(pieces)
    return out


def slugify(value, limit=64):
    cleaned = value.replace('&', ' and ').replace('’', '').replace("'", '')
    cleaned = re.sub(r'^(?:\d+|[IVXL]+|[A-Z])[.)]\s*', '', cleaned)
    cleaned = re.sub(r'[^a-zA-Z0-9]+', '-', cleaned).strip('-').lower()
    while len(cleaned) > limit and '-' in cleaned:
        cleaned = cleaned.rsplit('-', 1)[0]
    return cleaned or 'topic'


def split_subjects(flow, spec, title):
    """(subject name, blocks) for every subject this document covers."""
    subjects = spec.get('subjects')
    segments = spec.get('segments')

    if subjects:
        found, current = [], None
        wanted = {key.strip().lower(): value for key, value in subjects.items()}
        for block in flow:
            if block['kind'] == 'heading' and block['level'] == 1:
                name = wanted.get(block['text'].strip().lower())
                if name:
                    current = {'subject': name, 'blocks': []}
                    found.append(current)
                    continue
                if current is not None and FRONT_MATTER.match(block['text']):
                    # A trailing "Master revision"/"Consolidated references"
                    # chapter belongs to the document, not to a subject.
                    current = None
                    continue
            if current is not None:
                current['blocks'].append(block)
        missing = set(subjects.values()) - {item['subject'] for item in found}
        if missing:
            raise SystemExit(f'{spec["file"]}: subject heading(s) not found for {sorted(missing)}')
        return [(item['subject'], item['blocks']) for item in found]

    if segments:
        chunks, current = [], []
        for block in flow:
            current.append(block)
            if block['kind'] == 'heading' and re.match(r'^Bibliography', block['text'], re.I):
                chunks.append(current)
                current = []
        if current:
            chunks.append(current)
        if len(chunks) < len(segments):
            raise SystemExit(
                f'{spec["file"]}: expected {len(segments)} subject segments, found {len(chunks)}')
        return [(name, chunks[position]) for position, name in enumerate(segments) if name]

    return [(spec['subject'], flow)]


def build_topics(blocks, spec):
    """Topic pages, plus the subject-level front matter above them."""
    level = spec['topic_level']
    numbered = spec.get('numbered_topics', False)
    intro, topics, current = [], [], None

    for block in blocks:
        if block['kind'] == 'heading' and block['level'] == level:
            text = block['text']
            if FRONT_MATTER.match(text) or (numbered and not NUMBERED.match(text)):
                current = None
                intro.append(block)
                continue
            current = {'title': text, 'blocks': []}
            topics.append(current)
            continue
        if block['kind'] == 'heading' and block['level'] < level:
            # A shallower heading closes the current topic.
            current = None
            intro.append(block)
            continue
        (current['blocks'] if current else intro).append(block)

    used = set()
    for topic in topics:
        base = slugify(topic['title'])
        slug, suffix = base, 2
        while slug in used:
            slug, suffix = f'{base}-{suffix}', suffix + 1
        used.add(slug)
        topic['slug'] = slug
    return intro, [topic for topic in topics if topic['blocks']]


def words_in(blocks):
    total = 0
    for block in blocks:
        if block['kind'] == 'para':
            total += len(plain(block['segments']).split())
        elif block['kind'] == 'callout':
            total += len(plain(block['segments']).split())
        elif block['kind'] == 'list':
            total += sum(len(plain(item).split()) for item in block['items'])
        elif block['kind'] == 'table':
            total += sum(len(' '.join(row).split()) for row in block['rows'])
        elif block['kind'] == 'heading':
            total += len(block['text'].split())
    return total


def main():
    check = '--check' in sys.argv
    taxonomy = canonical_subjects()
    by_name = {}
    for group in taxonomy:
        for subject in group['subjects']:
            by_name[subject['name']] = (group['group'], subject['marks'])

    texts, index_groups, totals = {}, {}, {'subjects': 0, 'topics': 0, 'words': 0}

    for spec in SOURCES:
        path = SOURCE_DIR / spec['file']
        if not path.exists():
            raise SystemExit(f'Missing source document: {path}')
        title, flow = read_flow(path, spec.get('autonumbered', False))

        for subject_name, blocks in split_subjects(flow, spec, title):
            if subject_name not in by_name:
                raise SystemExit(
                    f'{spec["file"]}: "{subject_name}" is not an FPSC optional subject in '
                    'src/data/syllabus.ts. Fix the name or add the subject there.')
            group_number, marks = by_name[subject_name]
            if group_number != spec['group']:
                raise SystemExit(
                    f'{spec["file"]}: "{subject_name}" is in group {group_number}, '
                    f'but the manifest says group {spec["group"]}.')

            intro, topics = build_topics(blocks, spec)
            if not topics:
                raise SystemExit(f'{spec["file"]}: no topics found for "{subject_name}"')

            subject_slug = slugify(subject_name)
            for topic in topics:
                count = words_in(topic['blocks'])
                if count < 25:
                    raise SystemExit(
                        f'{spec["file"]}: topic "{topic["title"]}" of {subject_name} '
                        f'has only {count} words')
                totals['words'] += count
                texts[OUT_DIR / subject_slug / f'{topic["slug"]}.json'] = json.dumps({
                    'subject': subject_name, 'subjectSlug': subject_slug, 'group': group_number,
                    'slug': topic['slug'], 'title': topic['title'],
                    'blocks': topic['blocks'], 'words': count,
                }, ensure_ascii=False, separators=(',', ':')) + '\n'

            texts[OUT_DIR / f'{subject_slug}.json'] = json.dumps({
                'subject': subject_name, 'subjectSlug': subject_slug, 'group': group_number,
                'marks': marks, 'generatedFrom': spec['file'], 'documentTitle': title,
                'intro': intro,
            }, ensure_ascii=False, separators=(',', ':')) + '\n'

            index_groups.setdefault(group_number, []).append({
                'subject': subject_name, 'slug': subject_slug, 'marks': marks,
                'topicCount': len(topics),
                'topics': [{'slug': topic['slug'], 'title': topic['title'],
                            'words': words_in(topic['blocks'])} for topic in topics],
            })
            totals['subjects'] += 1
            totals['topics'] += len(topics)

    index = {
        'groups': [
            {'group': number,
             'rule': next(g for g in taxonomy if g['group'] == number).get('rule', ''),
             'subjects': sorted(index_groups[number], key=lambda s: s['subject'])}
            for number in sorted(index_groups)
        ],
        'subjectTotal': totals['subjects'],
        'topicTotal': totals['topics'],
    }
    texts[INDEX_OUT] = json.dumps(index, ensure_ascii=False, indent=1) + '\n'

    if check:
        stale = [str(p.relative_to(ROOT)) for p, text in texts.items()
                 if not p.exists() or p.read_text(encoding='utf-8') != text]
        if stale:
            raise SystemExit(f'Optional-notes data is stale ({len(stale)} file(s), e.g. {stale[0]}). '
                             'Run scripts/import_optional_notes.py')
        print(f'Optional subject notes up to date: {totals["subjects"]} subjects, '
              f'{totals["topics"]} topics.')
        return

    expected = {p.resolve() for p in texts}
    if OUT_DIR.exists():
        for existing in OUT_DIR.rglob('*.json'):
            if existing.resolve() not in expected:
                existing.unlink()
    for path, text in texts.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')

    print(f'Wrote {totals["subjects"]} subjects, {totals["topics"]} topics, '
          f'{totals["words"]:,} words.')
    for group in index['groups']:
        print(f'  Group {group["group"]}: '
              + ', '.join(f'{s["subject"]} ({s["topicCount"]})' for s in group['subjects']))


if __name__ == '__main__':
    main()
