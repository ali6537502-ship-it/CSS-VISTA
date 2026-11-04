"""Preserve the owner's DOCX as native blocks; no DOCX dependency at runtime.

Importing prepares a candidate catalogue, not a progress migration or deployment.
An explicit output path is required. No output is written until parsing and all
practice-source validations succeed. See docs/pro/precis-source-import.md.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

EXPECTED_TITLE = 'MASTER PRÉCIS WRITING STEP-BY-STEP HANDBOOK'
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
NS = {'w': W[1:-1]}


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                     separators=(',', ':')).encode()).hexdigest()


def paragraph_text(node):
    """Keep run boundaries invisible, but preserve explicit tabs and line breaks."""
    return ''.join(item.text or '' if item.tag == W + 't' else
                   '\t' if item.tag == W + 'tab' else '\n'
                   for item in node.iter()
                   if item.tag in {W + 't', W + 'tab', W + 'br', W + 'cr'}).strip()


def block_for(node):
    if node.findall('.//w:drawing', NS) or node.findall('.//w:object', NS) or node.findall('.//w:footnoteReference', NS) or node.findall('.//w:endnoteReference', NS):
        raise ValueError('Embedded media or notes need a source-preservation mapping before import.')
    if node.tag == W + 'p':
        value = paragraph_text(node)
        if not value:
            return None
        style = node.find('w:pPr/w:pStyle', NS)
        kind = style.get(W + 'val', '') if style is not None else ''
        return {'type': 'heading' if kind.startswith('Heading') else
                'bullet' if kind in {'Bullet', 'ListBullet'} or
                node.find('w:pPr/w:numPr', NS) is not None else 'paragraph', 'text': value}
    if node.tag == W + 'tbl':
        if node.findall('.//w:tbl', NS):
            raise ValueError('Nested tables need a source-preservation mapping before import.')
        # Paragraphs within a cell must not be concatenated into one word.
        return {'type': 'table', 'rows': [
            ['\n'.join(paragraph_text(p) for p in cell.findall('w:p', NS))
             for cell in row.findall('w:tc', NS)]
            for row in node.findall('w:tr', NS)]}
    if node.findall('.//w:t', NS):
        raise ValueError('Unsupported text container in DOCX body; review it before importing.')
    return None


def require_match(pattern, value, label):
    found = re.search(pattern, value, re.DOTALL)
    if not found:
        raise ValueError(f'Missing or ambiguous {label}; no catalogue was written.')
    return found


def practice_sources(root):
    # These copies support the existing writing tools. They never replace or
    # remove their original chapter blocks, commentary, models or answer keys.
    full = '\n'.join(paragraph_text(node) for node in root.findall('.//w:p', NS))
    passages = []
    for i in range(1, 6):
        markers = list(re.finditer(rf'(?:^|\n)Example {i} - ([^\n]+)\nORIGINAL\n', full))
        if len(markers) != 1:
            raise ValueError(f'Expected exactly one chapter-18 example {i}.')
        marker = markers[0]
        part = re.split(r'\n(?:Example \d+ - |19\. )', full[marker.end():], maxsplit=1)[0]
        original = require_match(r'^(.+?)\n\n', part, f'example {i} original').group(1)
        commentary = part[len(original):].lstrip('\n')
        model = require_match(r'Précis: “([^”]+)”', commentary, f'example {i} model').group(1)
        title = require_match(r'Title: “([^”]+)”', commentary, f'example {i} title').group(1)
        hint = commentary.split('\nPrécis:', 1)[0]
        passages.append({'id': f'example-{i}', 'label': marker.group(1), 'text': original,
                         'hint': hint, 'model': model, 'model_title': title,
                         'source': f'Owner-supplied handbook, chapter 18, example {i}', 'limit': None})
    original = require_match(r'Drill D - Two-sentence précis\nPASSAGE\n(.+?)\n\n',
                             full, 'chapter-20 Drill D passage').group(1)
    model = require_match(r'Drill D model: “([^”]+)” Title: “([^”]+)”', full,
                          'chapter-20 Drill D answer')
    passages.append({'id': 'drill-d', 'label': 'Institutional credibility', 'text': original,
                     'hint': 'Map fair conduct → trust → legitimacy and policy effectiveness. Preserve the possibility in “may face resistance”.',
                     'model': model.group(1), 'model_title': model.group(2),
                     'source': 'Owner-supplied handbook, chapter 20, Drill D', 'limit': None})
    return passages


def import_handbook(source):
    source = Path(source)
    with ZipFile(source) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    body = root.find('w:body', NS)
    if body is None:
        raise ValueError('DOCX has no document body.')
    if not any(paragraph_text(p) == EXPECTED_TITLE for p in body.findall('w:p', NS)):
        raise ValueError('The document title does not match the confirmed handbook.')
    chapters, front_matter = [], []
    current = None
    source_blocks = 0
    for node in body:
        block = block_for(node)
        if block is None:
            continue
        source_blocks += 1
        value = block.get('text', '')
        style = node.find('w:pPr/w:pStyle', NS)
        level_one = style is not None and style.get(W + 'val') == 'Heading1'
        if level_one and re.match(r'^(\d+\.|Appendix [ABC]\.)', value):
            ordinal = str(len(chapters) + 1)
            expected_prefix = f'{ordinal}.' if len(chapters) < 22 else f'Appendix {chr(65 + len(chapters) - 22)}.'
            if not value.startswith(expected_prefix + ' '):
                raise ValueError(f'Expected chapter heading {expected_prefix}; got {value}.')
            current = {'id': ordinal, 'title': value, 'blocks': []}
            chapters.append(current)
        else:
            (current['blocks'] if current is not None else front_matter).append(block)
    if len(chapters) != 25 or any(not chapter['blocks'] for chapter in chapters):
        raise ValueError('Expected 22 non-empty chapters and appendices A–C in source order.')
    passages = practice_sources(root)
    content = {'title': EXPECTED_TITLE, 'front_matter': front_matter, 'chapters': chapters}
    manifest = {'parser_version': 2, 'source_body_blocks': source_blocks,
                'front_matter_blocks': len(front_matter), 'chapter_count': len(chapters),
                'chapters': [{'id': c['id'], 'title': c['title'], 'blocks': len(c['blocks']),
                              'sha256': digest(c)} for c in chapters]}
    if source_blocks != len(front_matter) + sum(1 + len(c['blocks']) for c in chapters):
        raise ValueError('Source block accounting failed.')
    return {**content, 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'content_sha256': digest(content), 'import_manifest': manifest, 'passages': passages}


def php_catalogue(data):
    return ("<?php\ndeclare(strict_types=1);\n"
            "// Generated from the owner-supplied handbook; see scripts/precis/import-handbook.py.\n"
            "return json_decode(<<<'HANDBOOK'\n" +
            json.dumps(data, ensure_ascii=False, separators=(',', ':')) +
            "\nHANDBOOK, true, 64, JSON_THROW_ON_ERROR);\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', required=True, type=Path, help='Candidate PHP catalogue path')
    parser.add_argument('--manifest', type=Path, help='Optional independent JSON evidence file')
    args = parser.parse_args()
    paths = [args.source.resolve(), args.output.resolve()]
    if args.manifest:
        paths.append(args.manifest.resolve())
    if len(paths) != len(set(paths)):
        parser.error('Source, output and manifest must have different paths.')
    data = import_handbook(args.source)
    output = php_catalogue(data)
    evidence = {key: data[key] for key in ('source_sha256', 'content_sha256', 'import_manifest')}
    # Validate everything before replacing either candidate output.
    for path in [args.output, *([args.manifest] if args.manifest else [])]:
        if not path.parent.is_dir():
            parser.error(f'Output directory does not exist: {path.parent}')
    args.output.write_text(output, encoding='utf-8')
    if args.manifest:
        args.manifest.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared 25 chapters/appendices and {len(data["passages"])} practice copies; all source blocks retained. Review source fidelity and progress migration before release.')


if __name__ == '__main__':
    main()
