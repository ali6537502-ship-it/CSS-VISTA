#!/usr/bin/env python3
"""Extract the official FPSC CE syllabus hierarchy into a browser-friendly JSON file."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader


@dataclass(frozen=True)
class Subject:
    name: str
    slug: str
    start: int
    end: int
    marks: int
    designation: str
    group: int | None = None


SUBJECTS = [
    Subject("English Essay", "essay", 4, 4, 100, "compulsory"),
    Subject("English (Precis & Composition)", "precis-composition", 5, 6, 100, "compulsory"),
    Subject("General Science & Ability", "general-science-ability", 7, 9, 100, "compulsory"),
    Subject("Current Affairs", "current-affairs", 10, 11, 100, "compulsory"),
    Subject("Pakistan Affairs", "pakistan-affairs", 12, 14, 100, "compulsory"),
    Subject("Islamic Studies", "islamic-studies", 15, 19, 100, "compulsory"),
    Subject("Comparative Study of Major Religions", "comparative-religions", 20, 22, 100, "compulsory"),
    Subject("Accounting & Auditing", "accounting-auditing", 23, 27, 200, "optional", 1),
    Subject("Agriculture & Forestry", "agriculture-forestry", 28, 29, 100, "optional", 5),
    Subject("Anthropology", "anthropology", 30, 33, 100, "optional", 7),
    Subject("Applied Mathematics", "applied-mathematics", 34, 35, 100, "optional", 2),
    Subject("Arabic", "arabic", 36, 38, 100, "optional", 7),
    Subject("Balochi", "balochi", 39, 40, 100, "optional", 7),
    Subject("Botany", "botany", 41, 43, 100, "optional", 5),
    Subject("British History", "british-history", 44, 46, 100, "optional", 4),
    Subject("Business Administration", "business-administration", 47, 50, 100, "optional", 3),
    Subject("Chemistry", "chemistry", 51, 55, 200, "optional", 2),
    Subject("Computer Science", "computer-science", 56, 59, 200, "optional", 1),
    Subject("Constitutional Law", "constitutional-law", 60, 61, 100, "optional", 6),
    Subject("Criminology", "criminology", 62, 64, 100, "optional", 6),
    Subject("Economics", "economics", 65, 67, 200, "optional", 1),
    Subject("English Literature", "english-literature", 68, 69, 100, "optional", 5),
    Subject("Environmental Sciences", "environmental-sciences", 70, 72, 100, "optional", 5),
    Subject("European History", "european-history", 73, 75, 100, "optional", 4),
    Subject("Gender Studies", "gender-studies", 76, 78, 100, "optional", 5),
    Subject("Geography", "geography", 79, 81, 100, "optional", 7),
    Subject("Geology", "geology", 82, 85, 100, "optional", 2),
    Subject("Governance & Public Policies", "governance-public-policies", 86, 89, 100, "optional", 3),
    Subject("History of Pakistan & India", "history-pakistan-india", 90, 91, 100, "optional", 4),
    Subject("History of USA", "history-usa", 92, 93, 100, "optional", 4),
    Subject("International Law", "international-law", 94, 95, 100, "optional", 6),
    Subject("International Relations", "international-relations", 96, 99, 200, "optional", 1),
    Subject("Islamic History & Culture", "islamic-history-culture", 100, 103, 100, "optional", 4),
    Subject("Journalism & Mass Communication", "journalism-mass-communication", 104, 107, 100, "optional", 7),
    Subject("Law", "law", 108, 108, 100, "optional", 6),
    Subject("Mercantile Law", "mercantile-law", 109, 112, 100, "optional", 6),
    Subject("Muslim Law & Jurisprudence", "muslim-law-jurisprudence", 113, 114, 100, "optional", 6),
    Subject("Pashto", "pashto", 115, 118, 100, "optional", 7),
    Subject("Persian", "persian", 119, 124, 100, "optional", 7),
    Subject("Philosophy", "philosophy", 125, 125, 100, "optional", 6),
    Subject("Physics", "physics", 126, 127, 200, "optional", 2),
    Subject("Political Science", "political-science", 128, 131, 200, "optional", 1),
    Subject("Psychology", "psychology", 132, 133, 100, "optional", 7),
    Subject("Public Administration", "public-administration", 134, 136, 100, "optional", 3),
    Subject("Punjabi", "punjabi", 137, 138, 100, "optional", 7),
    Subject("Pure Mathematics", "pure-mathematics", 139, 140, 100, "optional", 2),
    Subject("Sindhi", "sindhi", 141, 144, 100, "optional", 7),
    Subject("Sociology", "sociology", 145, 146, 100, "optional", 7),
    Subject("Statistics", "statistics", 147, 149, 100, "optional", 2),
    Subject("Town Planning & Urban Management", "town-planning-urban-management", 150, 151, 100, "optional", 3),
    Subject("Urdu Literature", "urdu-literature", 152, 153, 100, "optional", 5),
    Subject("Zoology", "zoology", 154, 155, 100, "optional", 5),
]

HEADING_RE = re.compile(r"^\s*((?:PART\s*[-—:]?\s*[IVXLC0-9]+)|(?:[IVXLCDM]+|[A-H]|\d+)[.)])\s+(.+)$", re.I)
BULLET_RE = re.compile(r"^\s*[•]\s*(.+)$")
STOP_RE = re.compile(r"^\s*(?:SUGGESTED|RECOMMENDED|REQUIRED)\s+READINGS|^\s*S\.?\s*No\.?\s+Title", re.I)


def clean_line(value: str) -> str:
    value = value.replace("\u00ad", "").replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", value).strip()


def pages_for(reader: PdfReader, subject: Subject) -> str:
    # Printed page 1 is PDF page index 3; therefore printed N is index N + 2.
    return "\n".join((reader.pages[number + 2].extract_text() or "") for number in range(subject.start, subject.end + 1))


def parse_sections(text: str) -> list[dict]:
    lines = text.splitlines()
    sections: list[dict] = []
    current: dict | None = None
    prose: list[str] = []
    stopped = False
    for raw in lines:
        line = clean_line(raw)
        if not line or re.fullmatch(r"\d+", line):
            continue
        if "Revised Scheme and Syllabus for CSS Competitive Examination" in line or line.startswith("PAPER:"):
            continue
        if STOP_RE.search(line):
            stopped = True
        if stopped:
            continue
        heading = HEADING_RE.match(line)
        bullet = BULLET_RE.match(raw)
        if heading:
            current = {"title": clean_line(f"{heading.group(1)} {heading.group(2)}"), "items": []}
            sections.append(current)
            continue
        if bullet:
            value = clean_line(bullet.group(1))
            if current and value:
                current["items"].append(value)
            continue
        if current and len(line) >= 3:
            if current["items"] and raw[:1].isspace():
                current["items"][-1] = clean_line(f"{current['items'][-1]} {line}")
            elif len(line) <= 260:
                current["items"].append(line)
        elif len(line) >= 20 and not any(token in line for token in ("MARKS)", "Paper-I", "Paper-II")):
            prose.append(line)
    if not sections and prose:
        sections.append({"title": "Official FPSC description", "items": prose[:12]})
    return [section for section in sections if section["title"] and (section["items"] or len(section["title"]) > 4)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    reader = PdfReader(args.pdf)
    subjects = []
    for subject in SUBJECTS:
        sections = parse_sections(pages_for(reader, subject))
        subjects.append({
            "slug": subject.slug,
            "name": subject.name,
            "designation": subject.designation,
            "group": subject.group,
            "marks": subject.marks,
            "pages": [subject.start, subject.end],
            "sections": sections,
        })
    output = {
        "source": {
            "title": "Revised Syllabi for CSS Competitive Examination, CE-2016",
            "publisher": "Federal Public Service Commission",
            "updated": "2015-07-07",
            "url": "https://www.fpsc.gov.pk/uploads/syllabus/1767002683737_Syllabus-for-CE-2016-and-onwards.pdf",
        },
        "subjects": subjects,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "subjects": len(subjects),
        "compulsory": sum(item["designation"] == "compulsory" for item in subjects),
        "optional": sum(item["designation"] == "optional" for item in subjects),
        "sections": sum(len(item["sections"]) for item in subjects),
        "subjectsWithoutExtractedSections": [item["name"] for item in subjects if not item["sections"]],
    }, indent=2))


if __name__ == "__main__":
    main()
