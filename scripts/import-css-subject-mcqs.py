"""Import source-supplied CSS subject MCQs from DOCX files.

The importer is deliberately conservative: a question is published only when it
has four distinct options and a recoverable A-D answer.  It records unresolved
items in the generated index instead of inventing an answer.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

from docx import Document
from docx.document import Document as DocumentType
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P


QUESTION_RE = re.compile(r"^\s*(?:Q(?:uestion)?\s*)?(\d{1,4})\s*[.):\-]\s+(.+)$", re.I)
OPTION_RE = re.compile(r"^\s*\(?(الف|[A-Dاأبجد])\)?\s*[.)\-:،]?\s+(.+)$", re.I)
ANSWER_RE = re.compile(
    r"\b(?:correct\s+)?answer(?:\s+is)?\s*[:\-–—]?\s*(?:option\s*)?([A-D])\b(?:\s*[:\-–—]\s*(.*))?",
    re.I,
)
LOCAL_ANSWER_RE = re.compile(r"(?:(?:صحیح|صحيح|درست)\s+جواب|جواب(?:\s+نام[وهہ])?|پاسخ|الإجابة(?:\s+الصحيحة)?)\s*[:\-–—]?\s*\(?(الف|[A-Dاأبجد])\)?(?:\s|$)", re.I)
KEY_RE = re.compile(r"(?:^|[|;,\s])(?:Q\s*)?(\d{1,4})\s*[.)\-:–—]\s*(الف|[A-Dاأبجد])(?=$|[|;,\s])", re.I)
SPACE_RE = re.compile(r"\s+")


SUBJECT_RULES: tuple[tuple[str, str], ...] = (
    ("account", "Accounting & Auditing"),
    ("agriculture", "Agriculture & Forestry"),
    ("anthropology", "Anthropology"),
    ("applied_mathematics", "Applied Mathematics"),
    ("arabic", "Arabic"),
    ("balochi", "Balochi"),
    ("botany", "Botany"),
    ("business_administration", "Business Administration"),
    ("chemistry", "Chemistry"),
    ("criminology", "Criminology"),
    ("current_affairs", "Current Affairs"),
    ("english_literature", "English Literature"),
    ("environmental_science", "Environmental Sciences"),
    ("european_history", "European History"),
    ("computer_science", "Computer Science"),
    ("constitutional_law", "Constitutional Law"),
    ("economics", "Economics"),
    ("islamic_history", "Islamic History & Culture"),
    ("fpsc_law", "Law"),
    ("persian", "Persian"),
    ("gender_studies", "Gender Studies"),
    ("zoology", "Zoology"),
    ("geography", "Geography"),
    ("geology", "Geology"),
    ("governance", "Governance & Public Policies"),
    ("history_of_usa", "History of USA"),
    ("history_of_pakistan", "History of Pakistan & India"),
    ("international_law", "International Law"),
    ("international_relations", "International Relations"),
    ("journalism", "Journalism & Mass Communication"),
    ("mercantile_law", "Mercantile Law"),
    ("muslim_law", "Muslim Law & Jurisprudence"),
    ("pashto", "Pashto"),
    ("philosophy", "Philosophy"),
    ("physics", "Physics"),
    ("political_science", "Political Science"),
    ("public_administration", "Public Administration"),
    ("punjabi", "Punjabi"),
    ("pure_mathematics", "Pure Mathematics"),
    ("sindhi", "Sindhi"),
    ("sociology", "Sociology"),
    ("statistics", "Statistics"),
    ("town_planning", "Town Planning & Urban Management"),
    ("urdu", "Urdu Literature"),
)


def clean(value: Any) -> str:
    return SPACE_RE.sub(" ", str(value or "").replace("\u00a0", " ")).strip()


def option_index(label: str) -> int | None:
    normalized = clean(label).upper()
    if normalized in {"A", "ا", "أ", "الف"}:
        return 0
    if normalized in {"B", "ب"}:
        return 1
    if normalized in {"C", "ج"}:
        return 2
    if normalized in {"D", "د"}:
        return 3
    return None


def answer_from_text(text: str) -> tuple[int | None, str]:
    match = ANSWER_RE.search(text)
    if match:
        return option_index(match.group(1)), clean(match.group(2))
    match = LOCAL_ANSWER_RE.search(text)
    if match:
        return option_index(match.group(1)), ""
    return None, ""


def answer_for_options(text: str, options: list[str]) -> tuple[int | None, str]:
    answer, explanation = answer_from_text(text)
    if answer is not None:
        return answer, explanation
    match = re.search(r"\banswer\s*[:\-–—]\s*(.+)$", text, re.I)
    if not match:
        return None, ""
    supplied = clean(match.group(1))
    answer_text = clean(re.split(r"\s+[—–]\s+|\s+is\s+(?:associated|best)\b", supplied, maxsplit=1, flags=re.I)[0]).casefold()
    for index, option in enumerate(options):
        normalized = clean(option).casefold()
        if answer_text == normalized or answer_text.startswith(f"{normalized} ") or normalized.startswith(f"{answer_text} "):
            return index, supplied[:600]
    return None, ""


def explode_text(value: str) -> list[str]:
    fragments = []
    option_start = r"(?=\(?(?:الف|[A-Dاأبجد])\)?\s*[.)\-:،]?\s+)"
    for line in re.split(r"[\r\n]+", value):
        line = line.strip()
        if not line:
            continue
        parts = re.split(rf"\s{{2,}}{option_start}", line, flags=re.I)
        for part in parts:
            answer_parts = re.split(r"\s{2,}(?=(?:(?:صحیح|صحيح|درست)\s+جواب|جواب|پاسخ|الإجابة|answer)\s*[:\-–—])", part, flags=re.I)
            fragments.extend(clean(fragment) for fragment in answer_parts if clean(fragment))
    return fragments


def slugify(value: str) -> str:
    value = value.lower().replace("&", " and ")
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", value))


def subject_for(path: Path) -> str | None:
    key = path.name.lower().replace(" ", "_")
    for token, subject in SUBJECT_RULES:
        if token in key:
            return subject
    return None


def iter_blocks(parent: DocumentType) -> Iterable[tuple[str, str]]:
    """Yield paragraphs and table cells in true document order."""
    for child in parent.element.body.iterchildren():
        if isinstance(child, CT_P):
            paragraph = Paragraph(child, parent)
            for text in explode_text(paragraph.text):
                yield text, paragraph.style.name or ""
        elif isinstance(child, CT_Tbl):
            table = Table(child, parent)
            for row in table.rows:
                cells = []
                for cell in row.cells:
                    for value in explode_text(cell.text):
                        if value:
                            cells.append(value)
                if cells:
                    if len(row.cells) == 1:
                        for value in cells:
                            yield value, "TableContent"
                    else:
                        yield " | ".join(cells), "Table"


def looks_like_heading(text: str, style: str) -> bool:
    lower = text.lower()
    if "answer key" in lower or answer_from_text(text)[0] is not None or OPTION_RE.match(text) or QUESTION_RE.match(text):
        return False
    if len(text) > 180 or text.endswith("?") or len(text.split()) < 2:
        return False
    if style.lower().startswith("heading") or text.isupper():
        return True
    return bool(re.match(r"^(?:paper|part|section|unit|chapter|topic|volume|[IVXLC]+\.)\b", text, re.I))


def parse_document(path: Path, subject: str) -> tuple[list[dict[str, Any]], dict[str, int]]:
    blocks = list(iter_blocks(Document(path)))
    questions: list[dict[str, Any]] = []
    current_topic = f"General {subject}"
    pending: dict[int, dict[str, Any]] = {}
    previous_number = 0
    section = 1
    index = 0

    while index < len(blocks):
        text, style = blocks[index]
        if style == "Table":
            tokens = [clean(token) for token in text.split("|")]
            paired = []
            for token_index in range(len(tokens) - 1):
                if re.fullmatch(r"\d{1,4}", tokens[token_index]) and option_index(tokens[token_index + 1]) is not None:
                    paired.append((int(tokens[token_index]), option_index(tokens[token_index + 1])))
            if paired:
                for number, answer in paired:
                    target = pending.get(number)
                    if target is not None and target.get("answer") is None:
                        target["answer"] = answer
                index += 1
                continue
        key_pairs = KEY_RE.findall(text)
        if key_pairs and (style == "Table" or "answer" in text.lower() or len(key_pairs) > 1):
            for number, letter in key_pairs:
                target = pending.get(int(number))
                answer = option_index(letter)
                if target is not None and target.get("answer") is None and answer is not None:
                    target["answer"] = answer
            index += 1
            continue

        question_match = QUESTION_RE.match(text)
        if not question_match:
            if looks_like_heading(text, style):
                current_topic = clean(re.sub(r"^\d+\s*[.)]\s*", "", text))[:180]

            answer, explanation = answer_from_text(text)
            if answer is not None and questions:
                target = questions[-1]
                if target.get("answer") is None:
                    target["answer"] = answer
                    if explanation:
                        target["explanation"] = explanation[:600]
            index += 1
            continue

        number = int(question_match.group(1))
        stem = clean(question_match.group(2))
        options: list[str] = []
        cursor = index + 1
        while cursor < len(blocks) and len(options) < 4:
            option_match = OPTION_RE.match(blocks[cursor][0])
            if not option_match:
                break
            if option_index(option_match.group(1)) != len(options):
                break
            options.append(clean(option_match.group(2)))
            cursor += 1

        if len(options) != 4:
            index += 1
            continue

        if number <= previous_number:
            section += 1
            pending = {}
        previous_number = number
        row: dict[str, Any] = {
            "number": number,
            "section": section,
            "subject": subject,
            "topic": current_topic,
            "question": stem,
            "options": options,
            "answer": None,
            "explanation": None,
        }
        questions.append(row)
        pending[number] = row

        if cursor < len(blocks):
            answer, explanation = answer_for_options(blocks[cursor][0], options)
            if answer is not None:
                row["answer"] = answer
                if explanation:
                    row["explanation"] = explanation[:600]
                cursor += 1
        index = cursor

    complete = []
    seen = set()
    for row in questions:
        identity = "|".join([clean(row["question"]).casefold(), *[clean(option).casefold() for option in row["options"]]])
        if row["answer"] is None or len(row["question"]) < 8 or len(set(row["options"])) != 4 or identity in seen:
            continue
        seen.add(identity)
        digest = hashlib.sha1(f"{path.as_posix()}|{identity}".encode("utf-8")).hexdigest()[:14]
        row.update({
            "id": f"css-{slugify(subject)}-{digest}",
            "sourceDocument": path.name,
            "source": f"Owner-supplied MCQ archive · {path.name}",
            "verification": "source-supplied; four-option and answer-key structure checked by CSS Vista",
        })
        row.pop("number", None)
        row.pop("section", None)
        complete.append(row)
    return complete, {"detected": len(questions), "complete": len(complete), "unresolved": len(questions) - len(complete)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--syllabus", type=Path, default=Path("public/fpsc-syllabus.json"))
    args = parser.parse_args()

    syllabus = json.loads(args.syllabus.read_text(encoding="utf-8"))
    official = {item["name"]: item for item in syllabus["subjects"]}
    by_subject: dict[str, list[dict[str, Any]]] = defaultdict(list)
    documents = []
    skipped = []
    hashes = set()

    for path in sorted(args.source.rglob("*.docx")):
        if "__MACOSX" in path.parts or path.name.startswith("~$"):
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in hashes:
            continue
        hashes.add(digest)
        subject = subject_for(path)
        if not subject:
            skipped.append(path.relative_to(args.source).as_posix())
            continue
        rows, stats = parse_document(path, subject)
        by_subject[subject].extend(rows)
        documents.append({"file": path.relative_to(args.source).as_posix(), "subject": subject, **stats})

    if args.output.exists():
        shutil.rmtree(args.output)
    args.output.mkdir(parents=True)

    subject_index = []
    global_stems = set()
    for name, rows in sorted(by_subject.items()):
        unique = []
        for row in rows:
            # A repeated stem is still a repeated question even when a source shuffles or
            # slightly changes its distractors. Keep the first complete, answer-keyed row.
            identity = clean(row["question"]).casefold()
            if identity in global_stems:
                continue
            global_stems.add(identity)
            unique.append(row)
        slug = slugify(name)
        file = f"{slug}.json"
        (args.output / file).write_text(json.dumps(unique, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        meta = official.get(name, {})
        source_docs = sorted({row["sourceDocument"] for row in unique})
        subject_index.append({
            "slug": slug,
            "name": name,
            "designation": meta.get("designation", "compulsory" if name in {"Current Affairs"} else "optional"),
            "group": meta.get("group"),
            "count": len(unique),
            "topics": sorted({row["topic"] for row in unique}),
            "file": file,
            "sourceCount": sum(item["detected"] for item in documents if item["subject"] == name),
            "sourceDocuments": source_docs,
            "audit": "four options, recoverable answer key, duplicate identity and source attribution checked",
        })

    index = {
        "batch": "2026-08-23-owner-supplied-complete-import",
        "generatedAt": "2026-08-23T00:00:00.000Z",
        "policy": "All structurally complete questions from the owner-supplied archive are connected. Unresolved source items are counted, never guessed.",
        "total": sum(item["count"] for item in subject_index),
        "detected": sum(item["detected"] for item in documents),
        "unresolved": sum(item["unresolved"] for item in documents),
        "subjects": subject_index,
        "documents": documents,
        "skippedDocuments": skipped,
    }
    (args.output / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"total": index["total"], "detected": index["detected"], "unresolved": index["unresolved"], "subjects": len(subject_index), "skipped": skipped}, indent=2))


if __name__ == "__main__":
    main()
