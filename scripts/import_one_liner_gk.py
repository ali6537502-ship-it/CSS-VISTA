#!/usr/bin/env python3
"""Extract structured one-line study notes from the owner-provided GK tables PDF.

The source PDF uses two logical pages side by side. This importer crops each half,
extracts table rows, removes branding/watermarks, classifies the resulting facts,
deduplicates them, and writes small category shards for lazy loading in the site.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Iterable

import pdfplumber


@dataclass(frozen=True)
class Section:
    start: int
    end: int
    slug: str
    name: str


SECTIONS = (
    Section(1, 28, "pakistan-affairs", "Pakistan Affairs"),
    Section(29, 40, "islamic-history", "Islamic History"),
    Section(41, 62, "islamiat", "Islamiat"),
    Section(63, 66, "general-ability", "General Ability"),
    Section(67, 79, "current-affairs-archive", "Current Affairs Archive"),
    Section(80, 84, "pakistan-current-affairs", "Pakistan Current Affairs Archive"),
    Section(85, 116, "general-knowledge", "General Knowledge"),
    Section(117, 147, "geography", "Geography"),
    Section(148, 150, "astronomy", "Astronomy"),
    Section(151, 160, "science-health", "Science, Health & Chemistry"),
    Section(161, 174, "science-health", "Science, Health & Chemistry"),
    Section(175, 207, "computer", "Computer Studies"),
)

BRAND_PATTERNS = (
    "gk tables by humza altaf",
    "humza altaf",
    "css vista",
)

HEADER_WORDS = {
    "#", "no.", "no", "year", "date", "timeline", "event", "event/ruler",
    "question", "answer", "term", "full form", "description", "record",
    "achievement", "country", "capital", "currency", "details", "feature",
    "personality", "contributions", "category", "books", "type", "location",
    "organization", "headquarters", "founded", "founder", "river", "mountain",
    "continent", "ocean", "generation", "years", "technology used",
    "languages used", "examples", "format", "player name", "tournament",
    "observance", "institution", "designation", "article", "amendment",
    "region", "chief minister cm", "governor", "particle", "symbol",
    "relative charge", "absolute mass kg", "relative mass amu", "printer type",
    "important details", "info", "topic", "fact", "key features",
    "outcome impact", "key figures designations", "impact on indo pak region",
}

HEADER_HINTS = (
    "name", "title", "year", "date", "timeline", "period", "reign", "event",
    "detail", "information", "notes", "fact", "description", "explanation",
    "function", "contribution", "significance", "outcome", "impact", "cause",
    "reason", "location", "country", "region", "city", "capital", "currency",
    "code", "organization", "institution", "headquarters", "founded", "founder",
    "member", "summit", "subject", "book", "author", "question", "answer",
    "term", "full form", "concept", "formula", "expression", "example", "type",
    "category", "feature", "attribute", "component", "device", "software",
    "version", "release", "shortcut", "key", "tab", "group", "model", "company",
    "range", "peak", "height", "length", "width", "river", "lake", "mountain",
    "sea", "desert", "peninsula", "site", "discovered", "instrument", "measure",
    "player", "tournament", "sport", "record", "party", "portfolio", "minister",
    "designation", "ruler", "caliph", "dynasty", "emperor", "sultan", "scholar",
    "scientist", "battle", "crusade", "operation", "indicator", "statistic",
    "article", "amendment", "rate", "percentage", "threshold", "nisab",
    "mother", "birth", "death", "burial", "origin", "purpose", "status",
    "aspect", "position", "gulf",
)


def section_for_page(page_number: int, side_index: int = 0) -> Section | None:
    # Page 174 transitions from General Science (left) to Computer Studies (right).
    if page_number == 174 and side_index == 1:
        return Section(174, 174, "computer", "Computer Studies")
    for section in SECTIONS:
        if section.start <= page_number <= section.end:
            return section
    return None


def clean_cell(value: object) -> str:
    text = "" if value is None else str(value)
    text = text.replace("\u00ad", "").replace("\u2022", "; ").replace("\uf0b7", "; ")
    text = text.replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", " - ")
    text = text.replace("’", "'").replace("“", '"').replace("”", '"')
    text = re.sub(r"\(cid:\d+\)", " ", text)
    text = re.sub(r"(?i)gk\s+tables\s+by\s+humza\s+altaf", " ", text)
    text = re.sub(r"(?i)humza\s+altaf", " ", text)
    text = re.sub(r"(?i)\bcss\s+vista\b", " ", text)
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"\s*;\s*", "; ", text)
    text = re.sub(r"\s+", " ", text).strip(" |;:-")
    return text


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9\u0600-\u06ff]+", " ", value.casefold()).strip()


def is_brand_or_heading(value: str) -> bool:
    key = normalized(value)
    if not key:
        return True
    if any(pattern in key for pattern in BRAND_PATTERNS):
        return True
    if key in {
        "pakistan affairs", "islamic history", "islamiat", "mathematics",
        "current affairs", "gk", "geography", "astronomy",
        "food science health chemistry", "computer",
    }:
        return True
    words = value.split()
    if value == value.upper() and 1 <= len(words) <= 7 and not any(char.isdigit() for char in value):
        return True
    return False


def looks_like_header(row: list[str]) -> bool:
    values = [normalized(cell) for cell in row if cell]
    if not values:
        return False
    if len(values) == 1:
        return values[0] in HEADER_WORDS
    hits = sum(
        value in HEADER_WORDS or any(hint in value for hint in HEADER_HINTS)
        for value in values
    )
    return hits >= max(2, (len(values) + 1) // 2)


TRUNCATED_ENDING = re.compile(
    r"(?i)\b(?:a|an|the|of|to|in|on|at|by|for|and|or|with|from|into|"
    r"he|she|his|her|their|was|were|became|led|established|during|against)$"
)


def row_looks_truncated(row: list[str]) -> bool:
    """Reject visibly cut-off source rows rather than publish incomplete facts."""
    for cell in (clean_cell(value) for value in row):
        if not cell:
            continue
        if TRUNCATED_ENDING.search(cell.rstrip(" .,:;-")):
            return True
        if cell.count("(") != cell.count(")"):
            return True
    return False


def merge_continuation(existing: str, headers: list[str], row: list[str]) -> str:
    """Append continuation cells to their matching labelled fields."""
    result = existing
    clean_headers = [clean_cell(header) for header in headers]
    clean_row = [clean_cell(cell) for cell in row]
    for index, fragment in enumerate(clean_row):
        if not fragment:
            continue
        label = clean_headers[index] if index < len(clean_headers) else ""
        marker = f"{label}: " if label else ""
        marker_pos = result.find(marker) if marker else -1
        if marker_pos < 0:
            result = f"{result}; {label}: {fragment}" if label else f"{result}; {fragment}"
            continue
        value_start = marker_pos + len(marker)
        later_positions = [
            result.find(f"; {later}: ", value_start)
            for later in clean_headers[index + 1:]
            if later
        ]
        later_positions = [position for position in later_positions if position >= 0]
        insert_at = min(later_positions) if later_positions else len(result)
        separator = "" if result[:insert_at].endswith((" ", "-", "/")) else " "
        result = f"{result[:insert_at]}{separator}{fragment}{result[insert_at:]}"
    return clean_cell(result)


def labelled_note_looks_truncated(note: str, headers: list[str]) -> bool:
    """Check each labelled field after any continuation cells have been merged."""
    clean_headers = [clean_cell(header) for header in headers if clean_cell(header)]
    if not clean_headers:
        return row_looks_truncated([note])
    for index, header in enumerate(clean_headers):
        marker = f"{header}: "
        marker_pos = note.find(marker)
        if marker_pos < 0:
            continue
        value_start = marker_pos + len(marker)
        later_positions = [
            note.find(f"; {later}: ", value_start)
            for later in clean_headers[index + 1:]
        ]
        later_positions = [position for position in later_positions if position >= 0]
        value_end = min(later_positions) if later_positions else len(note)
        if row_looks_truncated([note[value_start:value_end]]):
            return True
    return False


def remove_number_column(headers: list[str], row: list[str]) -> tuple[list[str], list[str]]:
    if not row:
        return headers, row
    first_header = normalized(headers[0]) if headers else ""
    first_value = normalized(row[0])
    if first_header in {"", "no", "no.", "#", "sr", "serial"} or re.fullmatch(r"\d+[a-z]?", first_value):
        if re.fullmatch(r"\d+[a-z]?", first_value) or first_header in {"no", "no.", "#", "sr", "serial"}:
            return headers[1:], row[1:]
    return headers, row


def row_to_note(headers: list[str], row: list[str]) -> str:
    headers, row = remove_number_column(headers, row)
    cells = [clean_cell(cell) for cell in row]
    pairs = [(clean_cell(headers[index]) if index < len(headers) else "", cell)
             for index, cell in enumerate(cells) if cell]
    if not pairs:
        return ""

    header_keys = [normalized(header) for header, _ in pairs]
    values = [value for _, value in pairs]

    if "question" in header_keys and "answer" in header_keys:
        question = re.sub(r"^\d+\s+", "", values[header_keys.index("question")])
        answer = values[header_keys.index("answer")]
        return f"{question} - {answer}".strip()

    if header_keys[:3] == ["term", "full form", "description"] and len(values) >= 3:
        return f"{values[0]} ({values[1]}): {values[2]}"

    if len(values) == 1:
        return values[0]

    if len(values) == 2 and header_keys:
        return f"{values[0]} - {values[1]}"

    labelled = []
    for header, value in pairs:
        if header and normalized(header) not in {"#", "no", "no."}:
            labelled.append(f"{header}: {value}")
        else:
            labelled.append(value)
    return "; ".join(labelled)


def split_compound_notes(note: str) -> list[str]:
    """Keep every source-table row together as one coherent study note.

    Earlier versions split on labelled semicolons. That separated fields which
    belong to the same row (for example, a country's currency and currency
    code), producing orphan fragments in the public notes.
    """
    note = clean_cell(note)
    return [note] if note else []


SUBCATEGORY_RULES: dict[str, tuple[tuple[str, tuple[str, ...]], ...]] = {
    "pakistan-affairs": (
        ("Constitution & Governance", ("constitution", "amendment", "article ", "parliament", "president", "prime minister", "judiciary")),
        ("Economy of Pakistan", ("economy", "gdp", "budget", "debt", "export", "import", "agriculture", "industry")),
        ("Pakistan Movement", ("muslim league", "jinnah", "iqbal", "pakistan movement", "partition", "lahore resolution")),
        ("Indo-Pak History", ("empire", "dynasty", "sultan", "mughal", "ghaznavid", "ghurid", "delhi sultanate", "civilization")),
        ("Foreign Relations", ("relations", "treaty", "agreement", "saudi", "china", "iran", "india", "afghanistan")),
    ),
    "islamic-history": (
        ("Caliphates & Dynasties", ("caliph", "umayyad", "abbasid", "ottoman", "dynasty", "sultan")),
        ("Battles & Conquests", ("battle", "conquest", "army", "commander", "siege")),
        ("Personalities", ("imam", "scholar", "ruler", "born", "died")),
    ),
    "islamiat": (
        ("Quran & Hadith", ("quran", "surah", "ayah", "hadith", "revelation")),
        ("Seerah", ("prophet", "muhammad", "hijrah", "madinah", "makkah", "ghazwa")),
        ("Beliefs & Worship", ("prayer", "salah", "zakat", "fast", "hajj", "faith", "belief")),
        ("Islamic Law & Economics", ("fiqh", "ijma", "ijtihad", "riba", "ushr", "law", "tax")),
        ("Comparative Religion", ("christian", "judaism", "hindu", "buddh", "sikh", "religion")),
    ),
    "general-ability": (
        ("Arithmetic", ("percentage", "ratio", "average", "profit", "loss", "interest", "fraction")),
        ("Algebra & Geometry", ("equation", "algebra", "triangle", "circle", "angle", "area", "volume")),
    ),
    "current-affairs-archive": (
        ("Pakistan Affairs 2024-25", ("pakistan", "pakistani", "islamabad")),
        ("World Affairs 2024-25", ("world", "global", "united states", "china", "russia", "europe")),
        ("International Relations", ("relations", "agreement", "summit", "treaty", "diplomatic")),
    ),
    "pakistan-current-affairs": (
        ("Pakistan Affairs 2024-25", ("pakistan", "pakistani", "islamabad")),
        ("Foreign Relations", ("relations", "agreement", "china", "iran", "saudi", "india", "afghanistan")),
    ),
    "general-knowledge": (
        ("Countries, Capitals & Currencies", ("country", "capital", "currency", "continent")),
        ("International Organisations", ("organization", "organisation", "headquarters", "united nations", "world bank", "imf")),
        ("Sports", ("cricket", "football", "tennis", "olympic", "hockey", "record")),
        ("Books, Awards & Personalities", ("book", "author", "award", "nobel", "personality")),
        ("Important Days", ("day", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december")),
    ),
    "geography": (
        ("Physical Geography", ("mountain", "river", "ocean", "sea", "desert", "lake", "island", "plateau")),
        ("Countries & Continents", ("country", "continent", "capital", "border")),
        ("Pakistan Geography", ("pakistan", "punjab", "sindh", "balochistan", "khyber", "gilgit")),
        ("Climate & Environment", ("climate", "rainfall", "weather", "temperature", "environment")),
    ),
    "astronomy": (
        ("Solar System", ("planet", "sun", "moon", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune")),
        ("Space Exploration", ("space", "satellite", "apollo", "nasa", "astronaut", "mission", "moon")),
        ("Astronomy Facts", ("star", "galaxy", "universe", "eclipse", "comet", "asteroid")),
    ),
    "science-health": (
        ("Biology & Health", ("body", "disease", "vitamin", "blood", "cell", "organ", "health")),
        ("Chemistry", ("element", "chemical", "acid", "base", "compound", "atomic")),
        ("Food Science", ("food", "nutrition", "protein", "carbohydrate", "fat", "mineral")),
    ),
    "computer": (
        ("Hardware", ("hardware", "cpu", "processor", "memory", "ram", "rom", "device")),
        ("Software & Operating Systems", ("software", "operating system", "windows", "linux", "application")),
        ("Internet & Networking", ("internet", "network", "protocol", "url", "web", "email")),
        ("Programming & Databases", ("programming", "language", "database", "sql", "algorithm")),
        ("Cybersecurity", ("security", "malware", "virus", "firewall", "encryption", "cyber")),
        ("Computer History", ("generation", "invented", "founder", "first computer", "babbage")),
    ),
}


def classify_subcategory(category: str, note: str) -> str:
    lowered = note.casefold()
    for name, keywords in SUBCATEGORY_RULES.get(category, ()):
        if any(keyword in lowered for keyword in keywords):
            return name
    defaults = {
        "pakistan-affairs": "Pakistan Affairs Facts",
        "islamic-history": "Islamic History Facts",
        "islamiat": "Islamiat Facts",
        "general-ability": "General Ability Facts",
        "current-affairs-archive": "Current Affairs 2024-25",
        "pakistan-current-affairs": "Pakistan Affairs 2024-25",
        "general-knowledge": "General Knowledge Facts",
        "geography": "Geography Facts",
        "astronomy": "Astronomy Facts",
        "science-health": "Science & Health Facts",
        "computer": "Computer Facts",
    }
    return defaults[category]


ASTRONOMY_KEYWORDS = (
    "astronom", "planet", "solar", "sun", "moon", "mercury", "venus", "earth",
    "mars", "jupiter", "saturn", "uranus", "neptune", "star", "galaxy",
    "universe", "eclipse", "comet", "asteroid", "space", "satellite", "apollo",
    "nasa", "astronaut", "orbit", "light year", "milky way",
)

SCIENCE_KEYWORDS = (
    "cell", "blood", "body", "biology", "chemistry", "chemical", "element",
    "acid", "base", "vitamin", "disease", "organ", "food", "nutrition",
    "atmosphere", "climate", "global warming", "greenhouse", "radiation",
)


def effective_category(section: Section, note: str) -> str:
    """Correct mixed-topic appendix rows that sit under a misleading source header."""
    lowered = note.casefold()
    if section.slug == "astronomy" and not any(word in lowered for word in ASTRONOMY_KEYWORDS):
        if any(word in lowered for word in SCIENCE_KEYWORDS):
            return "science-health"
        return "general-knowledge"
    return section.slug


def extract_notes(pdf_path: Path) -> dict[str, list[dict[str, object]]]:
    notes_by_category: dict[str, list[dict[str, object]]] = {}
    seen: dict[str, set[str]] = {}
    seen_global: set[str] = set()
    last_note_ref: tuple[str, int, int] | None = None

    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            halves = ((0, page.width / 2), (page.width / 2, page.width))
            for side_index, (x0, x1) in enumerate(halves):
                section = section_for_page(page_number, side_index)
                if section is None:
                    continue

                notes_by_category.setdefault(section.slug, [])
                seen.setdefault(section.slug, set())
                crop = page.crop((x0, 0, x1, page.height))
                for table in crop.extract_tables():
                    rows = [[clean_cell(cell) for cell in row] for row in table]
                    rows = [row for row in rows if any(row)]
                    if not rows:
                        continue
                    table_blob = " ".join(cell for row in rows for cell in row)
                    if normalized(table_blob).startswith("gk tables by") or (
                        len(rows) <= 4 and any(pattern in normalized(table_blob) for pattern in BRAND_PATTERNS)
                    ):
                        continue

                    headers: list[str] = []
                    if looks_like_header(rows[0]):
                        headers = rows.pop(0)

                    for row_index, row in enumerate(rows):
                        previous_headers = []
                        if last_note_ref:
                            previous = notes_by_category[last_note_ref[0]][last_note_ref[1]]
                            previous_headers = [
                                normalized(str(header))
                                for header in previous.get("_headers", [])
                            ]
                        current_headers = [normalized(header) for header in headers]
                        if (
                            headers
                            and row_index == 0
                            and row
                            and not row[0]
                            and normalized(headers[0]) not in {"", "no", "no.", "#", "sr", "serial"}
                            and last_note_ref
                            and last_note_ref[2] >= page_number - 1
                            and last_note_ref[0] == section.slug
                            and previous_headers == current_headers
                        ):
                            previous_slug, previous_index, _ = last_note_ref
                            previous = notes_by_category[previous_slug][previous_index]
                            old_key = normalized(str(previous["text"]))
                            merged_text = merge_continuation(str(previous["text"]), headers, row)
                            merged_key = normalized(merged_text)
                            if merged_key and (merged_key == old_key or merged_key not in seen_global):
                                seen_global.discard(old_key)
                                seen_global.add(merged_key)
                                previous["text"] = merged_text
                                previous["subcategory"] = classify_subcategory(previous_slug, merged_text)
                                previous["_truncated"] = labelled_note_looks_truncated(merged_text, headers)
                            continue
                        note = row_to_note(headers, row)
                        for candidate in split_compound_notes(note):
                            if is_brand_or_heading(candidate):
                                continue
                            if len(candidate) < 12 or len(candidate) > 900:
                                continue
                            if re.fullmatch(r"(?i)type:\s*\d+\..{0,70}", candidate):
                                continue
                            target_slug = effective_category(section, candidate)
                            notes_by_category.setdefault(target_slug, [])
                            seen.setdefault(target_slug, set())
                            key = normalized(candidate)
                            if len(key) < 10 or key in seen_global:
                                continue
                            alpha_count = sum(char.isalpha() for char in candidate)
                            if alpha_count < 5:
                                continue
                            seen[target_slug].add(key)
                            seen_global.add(key)
                            time_sensitive = (
                                section.slug in {"current-affairs-archive", "pakistan-current-affairs"}
                                or bool(re.search(r"(?i)\b(?:as of|as per|currently|latest)\b", candidate))
                                or bool(re.search(r"(?i)\bcurrent\s+(?:president|prime minister|chief|chairman|record)\b", candidate))
                            )
                            notes_by_category[target_slug].append({
                                "id": f"{target_slug}-{len(notes_by_category[target_slug]) + 1}",
                                "text": candidate,
                                "subcategory": classify_subcategory(target_slug, candidate),
                                "sourcePage": page_number,
                                "timeSensitive": time_sensitive,
                                "_truncated": labelled_note_looks_truncated(candidate, headers),
                                "_headers": [clean_cell(header) for header in headers],
                            })
                            last_note_ref = (target_slug, len(notes_by_category[target_slug]) - 1, page_number)

    cleaned: dict[str, list[dict[str, object]]] = {}
    final_seen: set[str] = set()
    for slug, notes in notes_by_category.items():
        cleaned[slug] = []
        for note in notes:
            if bool(note.pop("_truncated", False)):
                continue
            note.pop("_headers", None)
            key = normalized(str(note["text"]))
            if key in final_seen:
                continue
            final_seen.add(key)
            note["id"] = f"{slug}-{len(cleaned[slug]) + 1}"
            cleaned[slug].append(note)
    return cleaned


def write_output(notes_by_category: dict[str, list[dict[str, object]]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    section_lookup = {section.slug: section for section in SECTIONS}
    categories = []

    for slug, notes in notes_by_category.items():
        section = section_lookup[slug]
        subcategories = Counter(str(note["subcategory"]) for note in notes)
        payload = {
            "slug": slug,
            "name": section.name,
            "count": len(notes),
            "notes": notes,
        }
        (output_dir / f"{slug}.json").write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        categories.append({
            "slug": slug,
            "name": section.name,
            "count": len(notes),
            "timeSensitiveCount": sum(bool(note["timeSensitive"]) for note in notes),
            "subcategories": [
                {"name": name, "count": count}
                for name, count in sorted(subcategories.items())
            ],
        })

    index = {
        "generatedAt": date.today().isoformat(),
        "total": sum(category["count"] for category in categories),
        "sourcePagesProcessed": 207,
        "excludedPages": "208-244 (Urdu and English grammar material, outside One-Liner GK scope)",
        "categories": categories,
    }
    (output_dir / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    if not args.pdf.exists():
        raise SystemExit(f"PDF not found: {args.pdf}")
    notes = extract_notes(args.pdf)
    write_output(notes, args.output)
    for slug, items in notes.items():
        print(f"{slug}: {len(items):,}")
    print(f"total: {sum(len(items) for items in notes.values()):,}")


if __name__ == "__main__":
    main()
