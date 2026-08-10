#!/usr/bin/env python3
"""Validate and import the owner-provided PMS past-paper archives."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from pypdf import PdfReader


@dataclass(frozen=True)
class Archive:
    label: str
    folder: str
    path: Path


SUBJECT_PATTERNS = (
    ("English-precis-composition", "Precis & Composition"),
    ("English-Essay", "English Essay"),
    ("Islamic-Studies", "Islamic Studies"),
    ("pakistan-study", "Pakistan Studies"),
    ("Urdu-Essay-Precies", "Urdu Essay & Precis"),
    ("Business-Administration", "Business Administration"),
    ("Public-Administration", "Public Administration"),
    ("Veterinary-Science", "Veterinary Science"),
    ("Computer-Science", "Computer Science"),
    ("Principle-of-Engineering", "Principles of Engineering"),
    ("Mass-Communication", "Mass Communication"),
    ("Political-Science", "Political Science"),
    ("English-Literature", "English Literature"),
    ("Social-Work", "Social Work"),
    ("Philosphy", "Philosophy"),
    ("Economics", "Economics"),
    ("commerce", "Commerce"),
    ("Botany", "Botany"),
    ("Zoology", "Zoology"),
    ("agriculture", "Agriculture"),
    ("Mathematics", "Mathematics"),
    ("Statistics", "Statistics"),
    ("Chemistry", "Chemistry"),
    ("Geography", "Geography"),
    ("Geology", "Geology"),
    ("Physics", "Physics"),
    ("History", "History"),
    ("Law", "Law"),
    ("Psychology", "Psychology"),
    ("Sociology", "Sociology"),
    ("Arabic", "Arabic"),
    ("Education", "Education"),
    ("Persian", "Persian"),
    ("Punjabi", "Punjabi"),
    ("Urdu-", "Urdu"),
)


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")


def subject_for(filename: str) -> str:
    for pattern, subject in SUBJECT_PATTERNS:
        if pattern.casefold() in filename.casefold():
            return subject
    raise ValueError(f"Cannot classify subject: {filename}")


def paper_year(filename: str) -> int:
    match = re.search(r"\b(20\d{2})\b", filename)
    if not match:
        raise ValueError(f"Cannot determine year: {filename}")
    return int(match.group(1))


def validate_pdf(data: bytes, filename: str) -> int:
    reader = PdfReader(BytesIO(data), strict=False)
    if reader.is_encrypted:
        raise ValueError(f"Encrypted PDF is not supported: {filename}")
    if not reader.pages:
        raise ValueError(f"PDF has no pages: {filename}")
    # Access every page so truncated or malformed page trees fail before publishing.
    for page in reader.pages:
        _ = page.mediabox
    return len(reader.pages)


def import_archives(archives: list[Archive], public_dir: Path, output_ts: Path) -> None:
    destination_root = public_dir / "past-papers" / "pms"
    records: list[dict[str, object]] = []
    hashes: dict[str, str] = {}
    total_pages = 0

    for archive in archives:
        with ZipFile(archive.path) as zipped:
            damaged_member = zipped.testzip()
            if damaged_member:
                raise ValueError(f"Archive CRC failure in {archive.path.name}: {damaged_member}")

            entries = [
                item
                for item in zipped.infolist()
                if not item.is_dir()
                and not item.filename.startswith("__MACOSX/")
                and item.filename.casefold().endswith(".pdf")
            ]
            if not entries:
                raise ValueError(f"No PDFs found in {archive.path.name}")

            destination = destination_root / archive.folder
            destination.mkdir(parents=True, exist_ok=True)

            for entry in entries:
                original_name = Path(entry.filename).name
                data = zipped.read(entry)
                digest = hashlib.sha256(data).hexdigest()
                if digest in hashes:
                    raise ValueError(
                        f"Duplicate PDF content: {original_name} duplicates {hashes[digest]}"
                    )
                hashes[digest] = original_name

                pages = validate_pdf(data, original_name)
                total_pages += pages
                subject = subject_for(original_name)
                year = paper_year(original_name)
                compulsory = archive.label == "Compulsory"
                combined = not compulsory or subject == "Urdu"
                paper = "Combined Papers" if combined else "Single Paper"
                title = (
                    f"{subject} Papers I & II - {year}"
                    if combined
                    else f"{subject} - {year}"
                )
                file_path = destination / original_name
                file_path.write_bytes(data)

                record: dict[str, object] = {
                    "id": f"pms-{year}-{slugify(subject)}",
                    "title": title,
                    "examination": "PMS",
                    "subject": subject,
                    "subjectType": "Compulsory" if compulsory else "Optional",
                    "year": year,
                    "paper": paper,
                    "mode": "Subjective",
                    "fileUrl": f"/past-papers/pms/{archive.folder}/{original_name}",
                    "source": "Owner-provided",
                }
                if not compulsory:
                    record["optionalGroup"] = archive.label
                records.append(record)

    ids = [str(record["id"]) for record in records]
    if len(ids) != len(set(ids)):
        duplicates = sorted({item for item in ids if ids.count(item) > 1})
        raise ValueError(f"Duplicate generated IDs: {duplicates}")

    records.sort(
        key=lambda record: (
            0 if record["subjectType"] == "Compulsory" else 1,
            str(record.get("optionalGroup", "")),
            str(record["subject"]),
            -int(record["year"]),
        )
    )
    output_ts.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "import type { PastPaper } from './pastPapers'",
        "",
        "// Generated from the owner-provided PMS compulsory and Group A-G archives.",
        "// Original PDF filenames are preserved under public/past-papers/pms/.",
        "export const importedPmsPastPapers: PastPaper[] = [",
    ]
    lines.extend(
        f"  {json.dumps(record, ensure_ascii=False, separators=(',', ':'))},"
        for record in records
    )
    lines.extend(["]", ""])
    output_ts.write_text("\n".join(lines), encoding="utf-8")

    print(
        f"Imported {len(records)} PMS PDFs ({total_pages} pages) "
        f"from {len(archives)} archives; duplicates: 0; unreadable: 0"
    )
    for archive in archives:
        count = sum(
            1
            for record in records
            if (
                record["subjectType"] == "Compulsory"
                if archive.label == "Compulsory"
                else record.get("optionalGroup") == archive.label
            )
        )
        print(f"{archive.label}: {count}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--downloads", type=Path, required=True)
    parser.add_argument("--public", type=Path, required=True)
    parser.add_argument("--output-ts", type=Path, required=True)
    args = parser.parse_args()

    archive_specs = (
        ("Compulsory", "compulsory", "PMS_Compulsory_Past_Papers_CSS_VISTA_Watermarked.zip"),
        ("A", "group-a", "PMS_Group_A_All_Past_Papers_Watermarked.zip"),
        ("B", "group-b", "PMS_Group_B_All_Past_Papers_Watermarked.zip"),
        ("C", "group-c", "PMS_Group_C_All_Available_Past_Papers_CSS_VISTA_Watermarked.zip"),
        ("D", "group-d", "PMS_Group_D_All_Available_Past_Papers_CSS_VISTA_Watermarked.zip"),
        ("E", "group-e", "PMS_Group_E_All_Available_Past_Papers_CSS_VISTA_Watermarked.zip"),
        ("F", "group-f", "PMS_Group_F_All_Available_Past_Papers_CSS_VISTA_Watermarked.zip"),
        ("G", "group-g", "PMS_Group_G_All_Available_Past_Papers_CSS_VISTA_Watermarked.zip"),
    )
    archives = [
        Archive(label, folder, args.downloads / filename)
        for label, folder, filename in archive_specs
    ]
    missing = [str(archive.path) for archive in archives if not archive.path.exists()]
    if missing:
        raise SystemExit("Missing archives:\n" + "\n".join(missing))

    import_archives(archives, args.public, args.output_ts)


if __name__ == "__main__":
    main()
