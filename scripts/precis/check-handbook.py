"""Reproduce the served book from the real DOCX and verify its legacy mapping."""
import argparse
import importlib.util
import json
from pathlib import Path
from reading_compat import compatibility, php_compat

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('handbook_import', Path(__file__).with_name('import-handbook.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Prepare reviewed book and compatibility artifacts')
    args = parser.parse_args()
    source = ROOT / 'data-archive/precis/master-precis-writing-handbook.docx'
    previous = json.loads((ROOT / 'data-archive/precis/stored-edition-before-restoration.json').read_text())
    current = module.import_handbook(source)
    compat = compatibility(previous, current)
    manifest = {key: current[key] for key in ('source_sha256', 'content_sha256', 'import_manifest')}
    artifacts = {
        ROOT / 'public/api/_precis_handbook.php': module.php_catalogue(current),
        ROOT / 'public/api/_precis_reading_compat.php': php_compat(compat),
        ROOT / 'docs/audits/precis-source-manifest.json': json.dumps(manifest, ensure_ascii=False, indent=2) + '\n',
    }
    for path, expected in artifacts.items():
        if args.write:
            path.write_text(expected, encoding='utf-8')
        elif not path.exists() or path.read_text() != expected:
            raise SystemExit(f'Source preservation artifact differs: {path.relative_to(ROOT)}')
    print(f'PASS: real DOCX matches 25 chapters, {len(current["front_matter"])} front-matter blocks and {sum(len(c["blocks"]) for c in current["chapters"])} chapter blocks; six practice copies; {sum(u["matched_unit_id"] is not None for u in compat["units"])}/{len(compat["units"])} earlier units have a unique exact-text match. Earlier records are not rewritten.')


if __name__ == '__main__':
    main()
