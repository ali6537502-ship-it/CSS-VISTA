#!/usr/bin/env python3
"""Restore the owner-provided CSS past-paper PDFs from the source archive.

The generated TypeScript registry is the source of truth for public URLs. The
archive contains duplicate working folders, so this importer selects exactly
one source PDF for every registered CSS paper and ignores everything else.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
import tempfile
import zipfile
from collections import defaultdict
from pathlib import Path, PurePosixPath

from pypdf import PdfReader


REGISTRY_EXPORT = "export const importedPastPapers"


def parse_registry(path: Path) -> list[dict[str, object]]:
    source = path.read_text(encoding="utf-8")
    marker = source.find(REGISTRY_EXPORT)
    if marker < 0:
        raise ValueError(f"Missing {REGISTRY_EXPORT} in {path}")
    assignment = source.find("=", marker)
    array_start = source.find("[", assignment)
    array_end = source.rfind("]")
    if assignment < 0 or array_start < 0 or array_end < array_start:
        raise ValueError(f"Invalid generated registry in {path}")
    json_source = re.sub(r",\s*([}\]])", r"\1", source[array_start : array_end + 1])
    records = json.loads(json_source)
    if not isinstance(records, list):
        raise ValueError("Past-paper registry must contain a JSON array")
    return records


def canonical_filename(name: str) -> str:
    stem = Path(name).stem.casefold()
    stem = re.sub(r"[-_ ]*css[-_ ]*vista$", "", stem)
    stem = re.sub(r"\s+", "-", stem)
    stem = re.sub(r"[^a-z0-9()]+", "-", stem).strip("-")
    return f"{stem}.pdf"


def is_real_pdf_entry(entry: zipfile.ZipInfo) -> bool:
    path = PurePosixPath(entry.filename)
    return (
        not entry.is_dir()
        and entry.file_size > 0
        and path.suffix.casefold() == ".pdf"
        and "__MACOSX" not in path.parts
        and not path.name.startswith("._")
    )


def choose_entry(
    expected_name: str,
    year: str,
    by_name: dict[str, list[zipfile.ZipInfo]],
    by_canonical_name: dict[str, list[zipfile.ZipInfo]],
) -> tuple[zipfile.ZipInfo, str]:
    exact = by_name.get(expected_name.casefold(), [])
    candidates = exact or by_canonical_name.get(canonical_filename(expected_name), [])
    if not candidates:
        raise ValueError(f"No archive PDF matches {year}/{expected_name}")

    year_candidates = [
        entry
        for entry in candidates
        if year in PurePosixPath(entry.filename).parts or year in entry.filename
    ]
    candidates = year_candidates or candidates
    candidates = sorted(candidates, key=lambda entry: (len(entry.filename), entry.filename.casefold()))
    return candidates[0], "exact" if exact else "normalised"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_pdf(path: Path) -> int:
    reader = PdfReader(path, strict=False)
    page_count = len(reader.pages)
    if page_count < 1:
        raise ValueError(f"PDF contains no pages: {path}")
    # Reading the first and last page objects catches broken cross-reference
    # tables without unnecessarily rendering hundreds of source documents.
    _ = reader.pages[0].mediabox
    _ = reader.pages[-1].mediabox
    return page_count


def restore_papers(
    archive: Path,
    registry: Path,
    output_root: Path,
    plan_only: bool,
    force: bool,
) -> None:
    records = parse_registry(registry)
    expected_records: list[tuple[str, str, str]] = []
    seen_urls: set[str] = set()
    for record in records:
        file_url = str(record.get("fileUrl", ""))
        match = re.fullmatch(r"/past-papers/(20\d{2})/([^/]+\.pdf)", file_url, re.IGNORECASE)
        if not match:
            raise ValueError(f"Unsafe or invalid CSS paper URL: {file_url!r}")
        if file_url.casefold() in seen_urls:
            raise ValueError(f"Duplicate CSS paper URL: {file_url}")
        seen_urls.add(file_url.casefold())
        expected_records.append((match.group(1), match.group(2), file_url))

    restored = 0
    skipped = 0
    exact_matches = 0
    normalised_matches = 0
    total_bytes = 0
    total_pages = 0
    selected_entries: set[str] = set()

    with zipfile.ZipFile(archive) as source_zip:
        entries = [entry for entry in source_zip.infolist() if is_real_pdf_entry(entry)]
        by_name: dict[str, list[zipfile.ZipInfo]] = defaultdict(list)
        by_canonical_name: dict[str, list[zipfile.ZipInfo]] = defaultdict(list)
        for entry in entries:
            name = PurePosixPath(entry.filename).name
            by_name[name.casefold()].append(entry)
            by_canonical_name[canonical_filename(name)].append(entry)

        selections: list[tuple[str, str, zipfile.ZipInfo, str]] = []
        for year, expected_name, file_url in expected_records:
            entry, match_type = choose_entry(expected_name, year, by_name, by_canonical_name)
            if entry.filename in selected_entries:
                raise ValueError(f"One source file matched multiple registry records: {entry.filename}")
            selected_entries.add(entry.filename)
            selections.append((year, expected_name, entry, match_type))

        if plan_only:
            exact_matches = sum(match_type == "exact" for *_, match_type in selections)
            normalised_matches = len(selections) - exact_matches
            total_bytes = sum(entry.file_size for _, _, entry, _ in selections)
            print(
                f"Import plan verified: {len(selections)} registered PDFs "
                f"({exact_matches} exact, {normalised_matches} normalised), "
                f"{total_bytes} source bytes."
            )
            return

        output_root.mkdir(parents=True, exist_ok=True)
        for year, expected_name, entry, match_type in selections:
            destination = output_root / year / expected_name
            destination.parent.mkdir(parents=True, exist_ok=True)
            exact_matches += match_type == "exact"
            normalised_matches += match_type == "normalised"
            if destination.exists() and not force:
                try:
                    page_count = validate_pdf(destination)
                except Exception:
                    pass
                else:
                    skipped += 1
                    total_pages += page_count
                    total_bytes += destination.stat().st_size
                    continue
            with tempfile.NamedTemporaryFile(
                prefix=f".{expected_name}.", suffix=".tmp", dir=destination.parent, delete=False
            ) as temporary:
                temporary_path = Path(temporary.name)
                with source_zip.open(entry) as source:
                    shutil.copyfileobj(source, temporary, length=1024 * 1024)
            try:
                if destination.exists() and sha256_file(destination) == sha256_file(temporary_path):
                    temporary_path.unlink()
                    skipped += 1
                else:
                    temporary_path.replace(destination)
                    restored += 1
                page_count = validate_pdf(destination)
            except Exception:
                temporary_path.unlink(missing_ok=True)
                raise
            total_pages += page_count
            total_bytes += destination.stat().st_size

    print(
        f"CSS past papers restored: {restored} written, {skipped} unchanged, "
        f"{exact_matches} exact matches, {normalised_matches} normalised matches, "
        f"{total_pages} pages, {total_bytes} bytes."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="Owner-provided ZIP archive")
    parser.add_argument(
        "--registry",
        type=Path,
        default=Path("src/data/pastPapers.generated.ts"),
        help="Generated CSS paper registry",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("public/past-papers"),
        help="Destination corresponding to the /past-papers URL root",
    )
    parser.add_argument("--plan", action="store_true", help="Verify mappings without extracting files")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace valid existing PDFs with the exact archive copies",
    )
    args = parser.parse_args()

    try:
        restore_papers(
            archive=args.archive.resolve(),
            registry=args.registry.resolve(),
            output_root=args.output_root.resolve(),
            plan_only=args.plan,
            force=args.force,
        )
    except Exception as error:
        print(f"CSS past-paper import failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
