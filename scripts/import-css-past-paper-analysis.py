#!/usr/bin/env python3
"""Convert the supplied topic-wise CSS past-paper DOCX into site data.

The importer reads WordprocessingML directly so it has no runtime dependency on
Microsoft Word. It preserves the document's headings, question wording and
analysis notes, then creates a compact secondary index for the FPSC syllabus UI.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
import zipfile
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}
QUESTION_RE = re.compile(
    r"^\d{2,3}\.\s+(?P<year>\d{4})\s+·\s+"
    r"(?:(?P<paper>Paper\s+[IVX]+)\s+·\s+)?"
    r"(?P<number>Q\S+)\s+(?P<text>.*)$"
)
SUMMARY_RE = re.compile(
    r"^(?P<questions>\d+) descriptive questions extracted · "
    r"(?P<topics>\d+) topic groups · Years represented: (?P<years>.+)$"
)


def paragraph_text(node: ET.Element) -> str:
    return "".join((part.text or "") for part in node.findall(".//w:t", NS)).strip()


def paragraph_style(node: ET.Element) -> str:
    style = node.find("./w:pPr/w:pStyle", NS)
    return style.get(f"{{{W_NS}}}val") if style is not None else "Normal"


def cell_text(node: ET.Element) -> str:
    return " ".join(
        text for paragraph in node.findall(".//w:p", NS)
        if (text := paragraph_text(paragraph))
    ).strip()


def slugify(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).lower()
    value = value.replace("&", " and ").replace("�", " ")
    value = re.sub(r"^\s*[ivxlcdm]+\s*[.)-]\s*", "", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def similarity(left: str, right: str) -> float:
    left_n, right_n = normalized(left), normalized(right)
    if not left_n or not right_n:
        return 0.0
    if left_n == right_n:
        return 1.0
    left_tokens, right_tokens = set(left_n.split()), set(right_n.split())
    overlap = len(left_tokens & right_tokens)
    token_f1 = (2 * overlap / (len(left_tokens) + len(right_tokens))) if overlap else 0.0
    sequence = SequenceMatcher(None, left_n, right_n).ratio()
    containment = min(len(left_n), len(right_n)) / max(len(left_n), len(right_n)) if left_n in right_n or right_n in left_n else 0.0
    return max(sequence, token_f1, containment)


def subject_slug(name: str, syllabus_subjects: list[dict[str, Any]]) -> str:
    aliases = {
        "accountancy and auditing": "accounting-auditing",
        "english precis and composition": "precis-composition",
        "environmental science": "environmental-sciences",
    }
    key = normalized(name)
    if key in aliases:
        return aliases[key]
    exact = {normalized(subject["name"]): subject["slug"] for subject in syllabus_subjects}
    if key in exact:
        return exact[key]
    candidate = max(syllabus_subjects, key=lambda item: similarity(name, item["name"]))
    if similarity(name, candidate["name"]) < 0.82:
        raise ValueError(f"Could not safely match subject: {name}")
    return candidate["slug"]


def map_section(title: str, syllabus_subject: dict[str, Any]) -> tuple[int | None, float]:
    sections = syllabus_subject["sections"]
    if not sections:
        return None, 0.0
    if title == "Integrated / Cross-Syllabus Questions":
        return None, 0.0
    if len(sections) == 1:
        return 0, 1.0
    candidates = []
    for index, section in enumerate(sections):
        combined = " ".join([section["title"], *section["items"]])
        score = max(similarity(title, section["title"]), similarity(title, combined))
        title_n, combined_n = normalized(title), normalized(combined)
        if len(title_n.split()) >= 2 and f" {title_n} " in f" {combined_n} ":
            score = max(score, 0.96)
        candidates.append((score, index))
    score, index = max(candidates)
    return (index, round(score, 4)) if score >= 0.42 else (None, round(score, 4))


def map_topic(title: str, section_index: int | None, syllabus_subject: dict[str, Any]) -> tuple[list[int], float]:
    if section_index is None or title == "Integrated / Cross-Syllabus Questions":
        return [], 0.0
    section = syllabus_subject["sections"][section_index]
    if not section["items"]:
        return [], 0.0
    topic_n = normalized(title)
    candidates: list[tuple[float, int]] = []
    for index, item in enumerate(section["items"]):
        item_n = normalized(item)
        score = similarity(title, item)
        if topic_n and item_n and (f" {topic_n} " in f" {item_n} " or f" {item_n} " in f" {topic_n} "):
            score = max(score, 0.96 if len(topic_n.split()) >= 2 else 0.86)
        candidates.append((score, index))
    score, index = max(candidates)
    return ([index], round(score, 4)) if score >= 0.48 else ([], round(score, 4))


def parse_docx(source: Path, syllabus: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    with zipfile.ZipFile(source) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))

    paragraphs = [
        {"style": paragraph_style(node), "text": paragraph_text(node)}
        for node in root.findall(".//w:body/w:p", NS)
    ]
    paragraphs = [item for item in paragraphs if item["text"]]
    tables = [
        [[cell_text(cell) for cell in row.findall("./w:tc", NS)] for row in table.findall("./w:tr", NS)]
        for table in root.findall(".//w:body/w:tbl", NS)
    ]

    intro_end = next(index for index, item in enumerate(paragraphs) if item["style"] == "Heading1" and item["text"] == "English Essay")
    integrity_start = next(index for index, item in enumerate(paragraphs) if item["style"] == "Heading1" and item["text"] == "Source Integrity Appendix")
    method_start = next(index for index, item in enumerate(paragraphs) if item["style"] == "Heading1" and item["text"] == "Scope, Method & Integrity")
    subjects_start = next(index for index, item in enumerate(paragraphs) if item["style"] == "Heading2" and item["text"] == "Subjects Included")
    method = [item["text"] for item in paragraphs[method_start + 1:subjects_start]]

    syllabus_by_slug = {subject["slug"]: subject for subject in syllabus["subjects"]}
    heading1_indexes = [
        index for index, item in enumerate(paragraphs)
        if item["style"] == "Heading1" and intro_end <= index < integrity_start
    ]
    subjects: list[dict[str, Any]] = []
    question_ids: set[str] = set()

    for subject_position, start in enumerate(heading1_indexes):
        end = heading1_indexes[subject_position + 1] if subject_position + 1 < len(heading1_indexes) else integrity_start
        name = paragraphs[start]["text"]
        slug = subject_slug(name, syllabus["subjects"])
        syllabus_subject = syllabus_by_slug[slug]
        summary_match = SUMMARY_RE.match(paragraphs[start + 1]["text"])
        if not summary_match:
            raise ValueError(f"Missing subject summary for {name}")
        summary = paragraphs[start + 1]["text"]
        official_reference = paragraphs[start + 2]["text"]
        frequent_topics = paragraphs[start + 3]["text"]
        sections: list[dict[str, Any]] = []
        current_section: dict[str, Any] | None = None
        current_topic: dict[str, Any] | None = None
        phase = "metadata"

        for item in paragraphs[start + 4:end]:
            text, style = item["text"], item["style"]
            if style == "Heading2":
                section_index, section_score = map_section(text, syllabus_subject)
                current_section = {
                    "title": text,
                    "syllabusSectionIndex": section_index,
                    "syllabusMatchScore": section_score,
                    "topics": [],
                }
                sections.append(current_section)
                current_topic = None
                phase = "metadata"
                continue
            if style == "Heading3":
                if current_section is None:
                    raise ValueError(f"Topic without section in {name}: {text}")
                topic_section_index = current_section["syllabusSectionIndex"]
                topic_section_score = current_section["syllabusMatchScore"]
                if topic_section_index is None and current_section["title"] != "Integrated / Cross-Syllabus Questions":
                    topic_section_index, topic_section_score = map_section(text, syllabus_subject)
                item_indexes, item_score = map_topic(text, topic_section_index, syllabus_subject)
                current_topic = {
                    "id": f"{slug}:{len(sections) - 1}:{len(current_section['topics'])}",
                    "title": text,
                    "summary": "",
                    "analysis": [],
                    "syllabusSectionIndex": topic_section_index,
                    "syllabusSectionMatchScore": topic_section_score,
                    "syllabusItemIndexes": item_indexes,
                    "syllabusMatchScore": item_score,
                    "questions": [],
                }
                current_section["topics"].append(current_topic)
                phase = "metadata"
                continue
            if current_topic is None:
                continue
            if text == "Past-Paper Questions":
                phase = "questions"
                continue
            if text == "Past-Paper Analysis":
                phase = "analysis"
                continue
            question_match = QUESTION_RE.match(text)
            if question_match:
                question = question_match.groupdict()
                question_id = f"{current_topic['id']}:{len(current_topic['questions'])}"
                if question_id in question_ids:
                    raise ValueError(f"Duplicate generated question ID: {question_id}")
                question_ids.add(question_id)
                current_topic["questions"].append({
                    "id": question_id,
                    "year": int(question["year"]),
                    "paper": question["paper"] or "Single Paper",
                    "number": question["number"],
                    "text": question["text"],
                })
                phase = "questions"
                continue
            if phase == "metadata" and not current_topic["summary"]:
                current_topic["summary"] = text
            elif phase == "analysis":
                current_topic["analysis"].append(text)

        actual_questions = sum(len(topic["questions"]) for section in sections for topic in section["topics"])
        actual_topics = sum(len(section["topics"]) for section in sections)
        expected_questions = int(summary_match.group("questions"))
        expected_topics = int(summary_match.group("topics"))
        if (actual_questions, actual_topics) != (expected_questions, expected_topics):
            raise ValueError(
                f"{name}: extracted {actual_questions}/{actual_topics}, expected {expected_questions}/{expected_topics}"
            )
        years = sorted({question["year"] for section in sections for topic in section["topics"] for question in topic["questions"]})
        subjects.append({
            "slug": slug,
            "name": name,
            "summary": summary,
            "officialReference": official_reference,
            "frequentTopics": frequent_topics,
            "questionCount": actual_questions,
            "topicCount": actual_topics,
            "years": years,
            "sections": sections,
        })

    metrics = {row[0]: row[1] for row in tables[0] if len(row) >= 2}
    limitations = [
        {"subject": row[0], "year": int(row[1]), "note": row[2]}
        for row in tables[1][1:] if len(row) >= 3 and row[1].isdigit()
    ]
    coverage = [
        {"subject": row[0], "files": int(row[1]), "questions": int(row[2]), "years": [int(value) for value in re.findall(r"\d{4}", row[3])]}
        for row in tables[2][1:] if len(row) >= 4
    ]

    question_count = sum(subject["questionCount"] for subject in subjects)
    topic_count = sum(subject["topicCount"] for subject in subjects)
    years = sorted({year for subject in subjects for year in subject["years"]})
    mapped_sections = sum(
        section["syllabusSectionIndex"] is not None
        for subject in subjects for section in subject["sections"]
    )
    mapped_topics = sum(
        topic["syllabusSectionIndex"] is not None
        for subject in subjects for section in subject["sections"] for topic in section["topics"]
    )
    full = {
        "version": 1,
        "source": {
            "title": "CSS All Past Papers — Topic-Wise Analysis",
            "fileName": source.name,
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "coverageLabel": "2016–2019, 2021–2026",
            "method": method,
        },
        "stats": {
            "subjects": len(subjects),
            "topics": topic_count,
            "questions": question_count,
            "years": years,
            "mappedSections": mapped_sections,
            "mappedTopics": mapped_topics,
            "sourceLimitations": len(limitations),
        },
        "sourceMetrics": metrics,
        "integrity": {
            "description": paragraphs[integrity_start + 1]["text"],
            "limitations": limitations,
            "coverage": coverage,
        },
        "subjects": subjects,
    }

    compact_subjects = []
    for subject in subjects:
        compact_sections = []
        for section in subject["sections"]:
            compact_topics = []
            for topic in section["topics"]:
                compact_topics.append({
                    "id": topic["id"],
                    "title": topic["title"],
                    "questionCount": len(topic["questions"]),
                    "years": sorted({question["year"] for question in topic["questions"]}),
                    "syllabusSectionIndex": topic["syllabusSectionIndex"],
                    "syllabusItemIndexes": topic["syllabusItemIndexes"],
                })
            compact_sections.append({
                "title": section["title"],
                "syllabusSectionIndex": section["syllabusSectionIndex"],
                "questionCount": sum(topic["questionCount"] for topic in compact_topics),
                "topics": compact_topics,
            })
        compact_subjects.append({
            "slug": subject["slug"],
            "name": subject["name"],
            "questionCount": subject["questionCount"],
            "topicCount": subject["topicCount"],
            "years": subject["years"],
            "sections": compact_sections,
        })
    compact = {"version": 1, "stats": full["stats"], "subjects": compact_subjects}
    return full, compact


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--syllabus", type=Path, default=Path("public/fpsc-syllabus.json"))
    parser.add_argument("--output", type=Path, default=Path("public/css-past-paper-analysis.json"))
    parser.add_argument("--index-output", type=Path, default=Path("public/css-past-paper-analysis-index.json"))
    args = parser.parse_args()
    syllabus = json.loads(args.syllabus.read_text(encoding="utf-8"))
    full, compact = parse_docx(args.source, syllabus)
    args.output.write_text(json.dumps(full, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    args.index_output.write_text(json.dumps(compact, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({
        **full["stats"],
        "outputBytes": args.output.stat().st_size,
        "indexBytes": args.index_output.stat().st_size,
        "sourceSha256": full["source"]["sha256"],
    }, indent=2))


if __name__ == "__main__":
    main()
