"""Import the owner's DOCX into native blocks; no DOCX dependency at runtime."""
import hashlib
import json
import re
import sys
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

source = Path(sys.argv[1])
expected = 'MASTER PRÉCIS WRITING STEP-BY-STEP HANDBOOK'
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
root = ET.fromstring(ZipFile(source).read('word/document.xml'))
text = lambda node: ''.join(t.text or '' for t in node.findall('.//w:t', ns))
chapters = []
current = None
for node in root.find('w:body', ns):
    if node.tag.endswith('}p'):
        value = text(node).strip()
        style = node.find('w:pPr/w:pStyle', ns)
        kind = style.get('{%s}val' % ns['w'], '') if style is not None else ''
        if kind == 'Heading1' and re.match(r'^(\d+\.|Appendix [ABC]\.)', value):
            current = {'id': str(len(chapters) + 1), 'title': value, 'blocks': []}
            chapters.append(current)
        elif current is not None and value:
            current['blocks'].append({'type': 'heading' if kind == 'Heading2' else 'bullet' if kind == 'Bullet' else 'paragraph', 'text': value})
    elif current is not None and node.tag.endswith('}tbl'):
        current['blocks'].append({'type': 'table', 'rows': [[text(cell).strip() for cell in row.findall('w:tc', ns)] for row in node.findall('w:tr', ns)]})
assert len(chapters) == 25
# Preserve the owner's unverified assertion in source notes, not as published official guidance.
chapters[1]['blocks'] = [
    {'type': 'paragraph', 'text': 'Follow the current official FPSC syllabus and the instructions printed in your question. The handbook describes a 20-mark allocation (15 for the précis and 5 for the title); this assertion is awaiting independent official-source verification and is not presented here as a verified exam rule.'},
    {'type': 'paragraph', 'text': 'About one-third is a teaching convention. An explicit question length instruction takes priority. Preserve meaning, fidelity, concision, grammatical correctness and an appropriate title.'}]
chapters[24]['blocks'] = [
    {'type': 'paragraph', 'text': 'Primary teaching source: the Master Précis Writing Step-by-Step Handbook supplied by Ali Hassan Sargana. Its examples and drills are instructional material, not authenticated past-paper questions.'},
    {'type': 'paragraph', 'text': 'Official rules must be checked against the current FPSC syllabus. The source handbook cites https://www.fpsc.gov.pk/Syllabuses?section=CSS+Syllabi and https://www.fpsc.gov.pk/assets/media/2024-10-22-01-45-26-Syllabus_for_CE-2016_and_onwards.pdf. Its marks assertion remains pending independent verification.'}]
full = '\n'.join(text(node).strip() for node in root.findall('.//w:p', ns))
passages = []
for i in range(1, 6):
    part = full.split(f'Example {i} - ', 1)[1].split('\nExample ', 1)[0].split('\n19. ', 1)[0]
    label, body = part.split('\nORIGINAL\n', 1)
    original, commentary = body.split('\n\n', 1)
    model = re.search(r'Précis: “(.+?)”', commentary).group(1)
    title = re.search(r'Title: “(.+?)”', commentary).group(1)
    hint = commentary.split('\nPrécis:', 1)[0]
    passages.append({'id': f'example-{i}', 'label': label, 'text': original, 'hint': hint, 'model': model, 'model_title': title, 'source': f'Owner-supplied handbook, chapter 18, example {i}', 'limit': None})
original = full.split('Drill D - Two-sentence précis\nPASSAGE\n', 1)[1].split('\n\n', 1)[0]
model = re.search(r'Drill D model: “(.+?)” Title: “(.+?)”', full)
passages.append({'id': 'drill-d', 'label': 'Institutional credibility', 'text': original, 'hint': 'Map fair conduct → trust → legitimacy and policy effectiveness. Preserve the possibility in “may face resistance”.', 'model': model.group(1), 'model_title': model.group(2), 'source': 'Owner-supplied handbook, chapter 20, Drill D', 'limit': None})
# Full worked drafts are delivered through the owned, two-version reveal path.
chapters[17]['blocks'] = [{'type': 'paragraph', 'text': 'Open a worked passage in Full Practice. Identify its argument, write independently, then save a revision before choosing to compare with the handbook model. Models illustrate a method; they are not the only valid answers.'}]
chapters[19]['blocks'] = [b for b in chapters[19]['blocks'] if not (b.get('text', '').startswith(('A:', 'B:', 'C:', 'D:', 'Drill B:', 'Drill D model:', 'Answer key')))]
data = {'title': expected, 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'chapters': chapters, 'passages': passages}
output = "<?php\ndeclare(strict_types=1);\n// Generated from the owner-supplied handbook; see scripts/precis/import-handbook.py.\nreturn json_decode(<<<'HANDBOOK'\n" + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + "\nHANDBOOK, true, 64, JSON_THROW_ON_ERROR);\n"
Path('public/api/_precis_handbook.php').write_text(output)
print(f'Imported {len(chapters)} chapters/appendices and {len(passages)} worked passages; models separated from lessons.')
