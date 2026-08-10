#!/usr/bin/env python3
"""Import the Urdu and English grammar appendices from the supplied GK notes PDF."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import OrderedDict
from datetime import date
from pathlib import Path

import pdfplumber

from import_one_liner_gk import BRAND_PATTERNS, clean_cell, normalized


URDU_TOPICS = (
    (208, 211, "علمِ صرف", "لفظ، کلمہ، اسم، فعل اور ان کی اقسام"),
    (212, 213, "علمِ ہجا", "حروف، علامات اور املا کے بنیادی اصول"),
    (214, 216, "علمِ نحو اور ادبی اصطلاحات", "مرکبات، محاورہ، ضرب المثل اور شعری اصطلاحات"),
    (217, 220, "تعارفِ اردو اور اصنافِ ادب", "اردو زبان، نثر، نظم اور اہم اصناف"),
    (221, 223, "اہم ادبا، شعرا اور کتب", "مصنفین، شعرا اور ان کی معروف تصانیف"),
)

ENGLISH_TOPICS = (
    (224, 224, "Active and Passive Voice", "Voice formulas, imperative forms and worked examples"),
    (225, 225, "Articles", "Rules and examples for a, an and the"),
    (226, 228, "Direct and Indirect Speech", "Narration rules, tense changes and sentence types"),
    (229, 230, "Parts of Speech", "Definitions, types and examples"),
    (231, 232, "Prepositions", "Usage rules and contextual examples"),
    (233, 234, "Sentences, Clauses and Phrases", "Sentence structures and clause types"),
    (235, 238, "Tenses", "Present, past and future tense structures"),
    (239, 241, "Pronouns and Voice Review", "Pronoun cases and additional voice/narration notes"),
)

URDU_EXTRACTION_REPAIRS = {
    "بوال جائے": "بولا جائے",
    "الہور": "لاہور",
    "داللت": "دلالت",
    "اکیال": "اکیلا",
    "واال": "والا",
    "دھالئی": "دھلائی",
    "نح وِ": "نحوِ",
    "متعل قِ": "متعلقِ",
    "حر فِ": "حرفِ",
    "پہال": "پہلا",
}


def topic_for_page(page: int, language: str) -> tuple[str, str]:
    ranges = URDU_TOPICS if language == "urdu" else ENGLISH_TOPICS
    for start, end, title, description in ranges:
        if start <= page <= end:
            return title, description
    raise ValueError(f"No {language} topic for page {page}")


def graphemes(text: str) -> list[str]:
    clusters: list[str] = []
    for char in text:
        if unicodedata.combining(char) and clusters:
            clusters[-1] += char
        else:
            clusters.append(char)
    return clusters


def repair_urdu_line(line: str) -> str:
    line = line.strip().replace("🔹", "")
    if not re.search(r"[\u0600-\u06ff]", line):
        return clean_cell(line)

    match = re.match(r"^(\d+\s*[.)-]?)\s*(.*)$", line)
    prefix = ""
    body = line
    if match:
        prefix, body = match.groups()

    repaired = "".join(reversed(graphemes(body)))
    repaired = re.sub(r"[A-Za-z]+", lambda item: item.group(0)[::-1], repaired)
    repaired = re.sub(r"\d+(?:[./:-]\d+)*", lambda item: item.group(0)[::-1], repaired)
    repaired = re.sub(r"\s+([،۔,:;!?])", r"\1", repaired)
    repaired = re.sub(r"\s+", " ", repaired).strip()
    for extracted, corrected in URDU_EXTRACTION_REPAIRS.items():
        repaired = repaired.replace(extracted, corrected)
    return f"{prefix} {repaired}".strip()


def repair_urdu(value: object) -> str:
    text = "" if value is None else str(value)
    lines = [repair_urdu_line(line) for line in text.splitlines()]
    return clean_cell(" ".join(line for line in lines if line))


def clean_english(value: object) -> str:
    text = clean_cell(value)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def is_brand_table(rows: list[list[str]]) -> bool:
    blob = normalized(" ".join(cell for row in rows for cell in row))
    return any(pattern in blob for pattern in BRAND_PATTERNS) and len(rows) <= 5


def usable(value: str) -> bool:
    if not value or value in {"-", "-", "🔹"}:
        return False
    return len(normalized(value)) >= 2


def extract_language(pdf_path: Path, language: str) -> dict[str, object]:
    start, end = (208, 223) if language == "urdu" else (224, 234)
    cleaner = repair_urdu if language == "urdu" else clean_english
    direction = "rtl" if language == "urdu" else "ltr"
    lang_code = "ur" if language == "urdu" else "en"
    grouped: OrderedDict[str, dict[str, object]] = OrderedDict()
    seen: set[str] = set()

    with pdfplumber.open(pdf_path) as pdf:
        for page_number in range(start, end + 1):
            page = pdf.pages[page_number - 1]
            topic_title, topic_description = topic_for_page(page_number, language)
            topic = grouped.setdefault(topic_title, {
                "slug": re.sub(r"[^a-z0-9]+", "-", topic_title.casefold()).strip("-")
                        or f"{language}-{len(grouped) + 1}",
                "title": topic_title,
                "description": topic_description,
                "items": [],
            })

            for x0, x1 in ((0, page.width / 2), (page.width / 2, page.width)):
                for table in page.crop((x0, 0, x1, page.height)).extract_tables():
                    raw_rows = [[cleaner(cell) for cell in row] for row in table]
                    rows = [row for row in raw_rows if any(usable(cell) for cell in row)]
                    if len(rows) < 2 or is_brand_table(rows):
                        continue

                    headers = rows.pop(0)
                    if sum(usable(header) for header in headers) < 2:
                        continue

                    for row in rows:
                        fields = []
                        for index, value in enumerate(row):
                            if not usable(value):
                                continue
                            label = headers[index] if index < len(headers) and usable(headers[index]) else (
                                "تفصیل" if language == "urdu" else "Detail"
                            )
                            fields.append({"label": label, "value": value})
                        if not fields:
                            continue
                        key = normalized(" ".join(field["value"] for field in fields))
                        if len(key) < 8 or key in seen:
                            continue
                        seen.add(key)
                        topic["items"].append({
                            "id": f"{language}-{len(seen)}",
                            "fields": fields,
                            "sourcePage": page_number,
                        })

    topics = [topic for topic in grouped.values() if topic["items"]]
    return {
        "language": language,
        "lang": lang_code,
        "direction": direction,
        "sourcePages": f"{start}-{end}",
        "total": sum(len(topic["items"]) for topic in topics),
        "topics": topics,
    }


ENGLISH_SUPPLEMENT = [
    {
        "slug": "pronoun-cases",
        "title": "Pronoun Cases",
        "description": "Subjective, objective and possessive forms by person and number",
        "items": [
            {"id": "english-pronouns-1", "fields": [
                {"label": "Case", "value": "Subjective"},
                {"label": "First person", "value": "I / we"},
                {"label": "Second person", "value": "you / you"},
                {"label": "Third person", "value": "he, she, it / they"},
            ], "sourcePage": 241},
            {"id": "english-pronouns-2", "fields": [
                {"label": "Case", "value": "Objective"},
                {"label": "First person", "value": "me / us"},
                {"label": "Second person", "value": "you / you"},
                {"label": "Third person", "value": "him, her, it / them"},
            ], "sourcePage": 241},
            {"id": "english-pronouns-3", "fields": [
                {"label": "Case", "value": "Possessive"},
                {"label": "First person", "value": "my, mine / our, ours"},
                {"label": "Second person", "value": "your, yours / your, yours"},
                {"label": "Third person", "value": "his, her, hers, its / their, theirs"},
            ], "sourcePage": 241},
        ],
    },
    {
        "slug": "indefinite-pronouns",
        "title": "Indefinite Pronouns",
        "description": "Number agreement for indefinite pronouns",
        "items": [
            {"id": "english-supplement-1", "fields": [
                {"label": "Singular", "value": "another, anybody, anyone, anything, each, either, everybody, everyone, everything, little, much, neither, nobody, no one, nothing, one, other, somebody, someone, something"},
            ], "sourcePage": 242},
            {"id": "english-supplement-2", "fields": [
                {"label": "Plural", "value": "both, few, many, others, several"},
            ], "sourcePage": 242},
            {"id": "english-supplement-3", "fields": [
                {"label": "Singular or plural by context", "value": "all, any, more, most, none, some, such"},
            ], "sourcePage": 242},
        ],
    },
    {
        "slug": "subjunctive-were",
        "title": "Subjunctive Were vs Past Was",
        "description": "Use were for unreal or hypothetical conditions; use was for a real or possible past state.",
        "items": [
            {"id": "english-supplement-4", "fields": [
                {"label": "Unreal or hypothetical", "value": "Use were: If I were rich, I would buy a car."},
                {"label": "Real or possible past", "value": "Use was: If I was rude yesterday, I apologise."},
            ], "sourcePage": 242},
        ],
    },
    {
        "slug": "twelve-tenses",
        "title": "Twelve-Tense Reference",
        "description": "Compact tense structures reconstructed from the image-only reference pages.",
        "items": [
            {"id": f"english-tense-{index}", "fields": [
                {"label": "Tense", "value": tense},
                {"label": "Structure", "value": structure},
                {"label": "Example", "value": example},
            ], "sourcePage": 244}
            for index, (tense, structure, example) in enumerate((
                ("Present Simple", "subject + base verb (s/es for third-person singular)", "She writes daily."),
                ("Present Continuous", "subject + is/am/are + verb-ing", "She is writing now."),
                ("Present Perfect", "subject + has/have + past participle", "She has written the letter."),
                ("Present Perfect Continuous", "subject + has/have been + verb-ing", "She has been writing for an hour."),
                ("Past Simple", "subject + past form", "She wrote yesterday."),
                ("Past Continuous", "subject + was/were + verb-ing", "She was writing at noon."),
                ("Past Perfect", "subject + had + past participle", "She had written before I arrived."),
                ("Past Perfect Continuous", "subject + had been + verb-ing", "She had been writing for an hour."),
                ("Future Simple", "subject + will/shall + base verb", "She will write tomorrow."),
                ("Future Continuous", "subject + will/shall be + verb-ing", "She will be writing at noon."),
                ("Future Perfect", "subject + will/shall have + past participle", "She will have written by noon."),
                ("Future Perfect Continuous", "subject + will/shall have been + verb-ing", "She will have been writing for two hours."),
            ), 1)
        ],
    },
]


def write_output(pdf_path: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    urdu = extract_language(pdf_path, "urdu")
    english = extract_language(pdf_path, "english")
    english["topics"].extend(ENGLISH_SUPPLEMENT)
    english["total"] = sum(len(topic["items"]) for topic in english["topics"])
    english["sourcePages"] = "224-244"

    for name, payload in (("urdu", urdu), ("english", english)):
        (output_dir / f"{name}.json").write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

    index = {
        "generatedAt": date.today().isoformat(),
        "source": "Owner-provided grammar appendix",
        "languages": [
            {"slug": "urdu", "name": "Urdu Grammar", "nativeName": "اردو قواعد", "total": urdu["total"], "topics": len(urdu["topics"])},
            {"slug": "english", "name": "English Grammar", "nativeName": "English Grammar", "total": english["total"], "topics": len(english["topics"])},
        ],
    }
    (output_dir / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"urdu: {urdu['total']} records across {len(urdu['topics'])} topics")
    print(f"english: {english['total']} records across {len(english['topics'])} topics")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not args.pdf.exists():
        raise SystemExit(f"PDF not found: {args.pdf}")
    write_output(args.pdf, args.output)


if __name__ == "__main__":
    main()
