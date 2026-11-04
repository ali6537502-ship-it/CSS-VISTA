"""Synthetic importer regressions; these do not certify the missing real book."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from xml.etree import ElementTree as ET
from zipfile import ZipFile

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / 'scripts/precis/import-handbook.py'
spec = importlib.util.spec_from_file_location('handbook_import', SCRIPT)
handbook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(handbook)
W = handbook.W


def paragraph(body, text='', style=None):
    p = ET.SubElement(body, W + 'p')
    if style:
        ET.SubElement(ET.SubElement(p, W + 'pPr'), W + 'pStyle', {W + 'val': style})
    ET.SubElement(ET.SubElement(p, W + 'r'), W + 't').text = text
    return p


def fixture(path, *, missing_model=False, unsupported=False):
    root = ET.Element(W + 'document')
    body = ET.SubElement(root, W + 'body')
    paragraph(body, handbook.EXPECTED_TITLE)
    paragraph(body, 'TEST ONLY author introduction')
    for i in range(1, 26):
        name = f'{i}. TEST ONLY chapter' if i <= 22 else f'Appendix {chr(65+i-23)}. TEST ONLY appendix'
        paragraph(body, name, 'Heading1')
        paragraph(body, f'TEST ONLY original body {i}')
        if i == 1:
            paragraph(body, '1. A numbered subsection', 'Heading2')
            p = paragraph(body, 'First')
            run = ET.SubElement(p, W + 'r')
            ET.SubElement(run, W + 'tab')
            ET.SubElement(run, W + 't').text = 'second'
            ET.SubElement(run, W + 'br')
            ET.SubElement(run, W + 't').text = 'third'
            table = ET.SubElement(body, W + 'tbl')
            cell = ET.SubElement(ET.SubElement(table, W + 'tr'), W + 'tc')
            paragraph(cell, 'Table first paragraph')
            paragraph(cell, 'Table second paragraph')
        if i == 18:
            for n in range(1, 6):
                paragraph(body, f'Example {n} - TEST ONLY example')
                paragraph(body, 'ORIGINAL')
                paragraph(body, f'TEST ONLY original passage {n}.')
                paragraph(body)
                paragraph(body, f'TEST ONLY explanation {n}')
                if not (missing_model and n == 5):
                    paragraph(body, f'Précis: “TEST ONLY model {n}.”')
                paragraph(body, f'Title: “TEST ONLY title {n}”')
        if i == 20:
            for value in ['Answer key', 'A: TEST ONLY answer A', 'B: TEST ONLY answer B',
                          'C: TEST ONLY answer C', 'D: TEST ONLY answer D', 'Drill B: TEST ONLY explanation',
                          'Drill D - Two-sentence précis', 'PASSAGE', 'TEST ONLY institutional passage.', '',
                          'Drill D model: “TEST ONLY institutional model.” Title: “TEST ONLY institutional title”']:
                paragraph(body, value)
    if unsupported:
        paragraph(ET.SubElement(body, W + 'sdt'), 'TEST ONLY unsupported container')
    with ZipFile(path, 'w') as archive:
        archive.writestr('word/document.xml', ET.tostring(root, encoding='utf-8'))
    return root


class ImportHandbookTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.source = self.directory / 'source.docx'

    def test_every_source_block_and_answer_is_retained_in_order(self):
        root = fixture(self.source)
        data = handbook.import_handbook(self.source)
        self.assertEqual(len(data['chapters']), 25)
        self.assertEqual(data['front_matter'][1]['text'], 'TEST ONLY author introduction')
        self.assertEqual(data['chapters'][0]['blocks'][1], {'type': 'heading', 'text': '1. A numbered subsection'})
        self.assertEqual(data['chapters'][0]['blocks'][2]['text'], 'First\tsecond\nthird')
        self.assertEqual(data['chapters'][0]['blocks'][3]['rows'], [['Table first paragraph\nTable second paragraph']])
        # Former importer replacements/filters must never remove these.
        for chapter in [2, 18, 20, 25]:
            self.assertEqual(data['chapters'][chapter-1]['blocks'][0]['text'], f'TEST ONLY original body {chapter}')
        actual = [block for c in data['chapters'] for block in [{'type': 'heading', 'text': c['title']}, *c['blocks']]]
        source = [handbook.block_for(node) for node in root.find('w:body', handbook.NS)]
        self.assertEqual(data['front_matter'] + actual, [b for b in source if b is not None])
        chapter20 = '\n'.join(b['text'] for b in data['chapters'][19]['blocks'])
        for key in ['Answer key', 'A:', 'B:', 'C:', 'D:', 'Drill B:', 'Drill D model:']:
            self.assertIn(key, chapter20)
        self.assertEqual(data['passages'][4]['model'], 'TEST ONLY model 5.')
        self.assertEqual(data['source_sha256'], hashlib.sha256(self.source.read_bytes()).hexdigest())
        self.assertEqual(data['import_manifest']['source_body_blocks'], len([b for b in source if b is not None]))
        changed = json.loads(json.dumps(data))
        changed['chapters'][17]['blocks'][0]['text'] = 'changed'
        self.assertNotEqual(data['content_sha256'], handbook.digest({k: changed[k] for k in ['title', 'front_matter', 'chapters']}))

    def test_failed_import_leaves_source_and_both_outputs_unchanged(self):
        fixture(self.source, missing_model=True)
        before = self.source.read_bytes()
        output, manifest = self.directory / 'candidate.php', self.directory / 'manifest.json'
        output.write_text('existing candidate')
        manifest.write_text('existing evidence')
        result = subprocess.run([sys.executable, str(SCRIPT), str(self.source), '--output', str(output), '--manifest', str(manifest)], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(output.read_text(), 'existing candidate')
        self.assertEqual(manifest.read_text(), 'existing evidence')
        self.assertEqual(self.source.read_bytes(), before)

    def test_candidate_is_explicit_and_contains_matching_manifest(self):
        fixture(self.source)
        output, manifest = self.directory / 'candidate.php', self.directory / 'manifest.json'
        result = subprocess.run([sys.executable, str(SCRIPT), str(self.source)], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(output.exists())
        subprocess.run([sys.executable, str(SCRIPT), str(self.source), '--output', str(output), '--manifest', str(manifest)], check=True, capture_output=True)
        encoded = output.read_text().split("<<<'HANDBOOK'\n", 1)[1].split('\nHANDBOOK,', 1)[0]
        data = json.loads(encoded)
        self.assertEqual(json.loads(manifest.read_text()), {k: data[k] for k in ['source_sha256', 'content_sha256', 'import_manifest']})
        self.assertEqual(len(data['passages']), 6)
        before = self.source.read_bytes()
        collision = subprocess.run([sys.executable, str(SCRIPT), str(self.source), '--output', str(self.source)], capture_output=True)
        self.assertNotEqual(collision.returncode, 0)
        self.assertEqual(self.source.read_bytes(), before)

    def test_unmapped_text_and_invalid_chapter_order_fail_closed(self):
        fixture(self.source, unsupported=True)
        with self.assertRaisesRegex(ValueError, 'Unsupported text container'):
            handbook.import_handbook(self.source)
        root = fixture(self.source)
        cell = root.find('.//w:tc', handbook.NS)
        paragraph(ET.SubElement(cell, W + 'sdt'), 'TEST ONLY table content control')
        with ZipFile(self.source, 'w') as archive:
            archive.writestr('word/document.xml', ET.tostring(root))
        with self.assertRaisesRegex(ValueError, 'Unsupported table text container'):
            handbook.import_handbook(self.source)
        root = fixture(self.source)
        paragraphs = root.findall('w:body/w:p', handbook.NS)
        next(p for p in paragraphs if handbook.paragraph_text(p).startswith('2. ')).find('.//w:t', handbook.NS).text = '3. Wrong order'
        with ZipFile(self.source, 'w') as archive:
            archive.writestr('word/document.xml', ET.tostring(root))
        with self.assertRaisesRegex(ValueError, 'Expected chapter heading 2.'):
            handbook.import_handbook(self.source)


if __name__ == '__main__':
    unittest.main()
