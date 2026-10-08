#!/usr/bin/env python3
"""Account for every supplied file without treating OCR as reviewed course content.

Writes private source workbooks, never an uploadable/publishable topic package.
Actual lesson teaching, distractors, explanations and references require review.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path


def private_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_suffix('.tmp')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w', encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    os.chmod(temporary, 0o600)
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--expected-files', required=True, type=int)
    args = parser.parse_args()
    source_root, output = args.source_root.resolve(), args.output.resolve()
    repository = Path(__file__).resolve().parents[2]
    if output == repository or repository in output.parents:
        raise ValueError('Private source content must remain outside this public repository.')
    if output == source_root or output in source_root.parents:
        raise ValueError('Choose a dedicated workbook directory, not a source ancestor.')
    manifest = json.loads((source_root / 'manifest.json').read_text())['files']
    source_map = json.loads((source_root / 'topic-source-map.json').read_text())
    if len(manifest) != args.expected_files or len({f['id'] for f in manifest}) != len(manifest):
        raise ValueError('The supplied-file coverage count or file identities do not match.')
    versions = {}
    for family in source_map['families']:
        for version in family['source_versions']:
            digest = version['source_sha256']
            if digest in versions:
                raise ValueError('A source checksum was assigned to multiple provisional families.')
            versions[digest] = (family['id'], version)
    if set(versions) != {f['sha256'] for f in manifest}:
        raise ValueError('The provisional family map does not account for every source hash.')
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(output, 0o700)
    files, sources, failures = [], [], []
    for file in manifest:
        path = Path(file['path']).resolve()
        if source_root not in path.parents:
            raise ValueError('A source file escaped the private source directory.')
        with path.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        if digest != file['sha256'] or path.stat().st_size != file['bytes']:
            raise ValueError('A source copy failed its checksum or byte count.')
        family, version = versions[digest]
        if file['id'] not in {c['id'] for c in version['copies']}:
            raise ValueError('A file identity is missing from its checksum group.')
        files.append({
            'file_id': file['id'], 'title': file['title'], 'sha256': digest,
            'provisional_family': family, 'source_workbook': f'sources/{digest}.json',
            'same_bytes_as': [c['id'] for c in version['copies'] if c['id'] != file['id']],
            'conversion_status': 'awaiting-academic-conversion',
        })
    for digest, (family, version) in sorted(versions.items()):
        text_path = Path(version['text_path']).resolve()
        if source_root not in text_path.parents:
            raise ValueError('An extracted source escaped the private directory.')
        text = text_path.read_text(encoding='utf-8')
        pages = text.split('\f')
        expected_pages = version.get('pages')
        if expected_pages is not None and len(pages) == expected_pages + 1 and not pages[-1].strip():
            pages.pop()  # pdftotext's final page delimiter is not a new page.
        if expected_pages is not None and len(pages) != expected_pages:
            failures.append({'sha256': digest, 'expected_pages': expected_pages, 'extracted_pages': len(pages)})
        sample_id = version['copies'][0]['id']
        page_records = []
        for index, page in enumerate(pages, 1):
            quality_path = source_root / 'ocr' / sample_id / f'{index}.quality.json'
            quality = json.loads(quality_path.read_text()) if quality_path.exists() else None
            page_records.append({
                'page': index if expected_pages is not None else None,
                'text': page,
                'extraction': version['extraction'],
                'ocr_quality': quality,
                'review_state': 'unreviewed-source-text',
            })
        record = {
            'schema': 'css-vista-private-source-workbook-v1',
            'source_sha256': digest, 'provisional_family': family,
            'files': [{'id': c['id'], 'title': c['title']} for c in version['copies']],
            'source_pages': expected_pages, 'extracted_segments': len(page_records),
            'page_coverage_matches': expected_pages is None or len(pages) == expected_pages,
            'pages': page_records,
            'editorial_requirements': [
                'Review all source text and visual material against the original file.',
                'Verify dated developments, numbers, quotations, legal and historical claims.',
                'Preserve each substantive chapter; reconcile editions and visual companions explicitly.',
                'Author short teaching sections with a reviewed learning question per section.',
                'Author separate revision questions, defensible distractors and explanation feedback.',
                'Add topic-specific independent writing and reliable references.',
                'Validate as a guided-course definition before private owner-admin import and review.',
            ],
            'publishable': False,
        }
        private_json(output / 'sources' / f'{digest}.json', record)
        sources.append({'sha256': digest, 'files': len(version['copies']), 'segments': len(page_records), 'family': family})
    result = {
        'schema': 'css-vista-all-source-coverage-v1',
        'owner_scope': 'Every one of the supplied files contributes to guided Pro learning.',
        'expected_files': args.expected_files, 'accounted_files': len(files),
        'unique_byte_sources': len(sources), 'exact_duplicate_copies': len(files) - len(sources),
        'provisional_families': len(source_map['families']),
        'family_reconciliation': 'provisional-not-a-published-topic-count',
        'pdf_pages': sum(f.get('pages', 0) for f in manifest),
        'unique_extracted_segments': sum(s['segments'] for s in sources),
        'coverage_failures': failures, 'files': files, 'sources': sources,
        'conversion_complete': False, 'production_publication_complete': False,
    }
    private_json(output / 'coverage.json', result)
    print(json.dumps({k: result[k] for k in [
        'expected_files', 'accounted_files', 'unique_byte_sources', 'exact_duplicate_copies',
        'provisional_families', 'pdf_pages', 'unique_extracted_segments', 'coverage_failures',
        'conversion_complete', 'production_publication_complete',
    ]}))
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
