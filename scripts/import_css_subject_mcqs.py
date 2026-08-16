#!/usr/bin/env python3
"""Import supplied CSS subject MCQ DOCX files into lazy, subject-level shards.

The importer is deliberately conservative: a record is published only when it has
one meaningful question, four distinct options, and an explicit/recoverable answer.
Rejected material remains counted in the generated audit report.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from docx import Document
from docx.document import Document as DocumentType
from docx.table import Table
from docx.text.paragraph import Paragraph


OPTION_RE = re.compile(r"(?:(?<=^)|(?<=\n)|(?<=\s))(?:\(([A-Da-d])\)|([A-Da-d])[.)])\s+", re.M)
QUESTION_RE = re.compile(r"(?:(?<=^)|(?<=\n))(\d{1,4})[.)]\s+(?=\S)", re.M)
ANSWER_RE = re.compile(r"(?:correct\s+answer|answer|ans(?:wer)?)[\s:–—-]*\(?([A-Da-d])\)?", re.I)
KEY_PAIR_RE = re.compile(r"(?:^|\s)(\d{1,4})\s*[-.:)]\s*([A-Da-d])(?=\s|$)")
SOURCE_RE = re.compile(r"^(?:source|sources|reference|references)\s*[:–—-]\s*(.+)$", re.I)
QUESTION_PREFIX_RE = re.compile(r"^\s*([0-9۰-۹٠-٩]{1,4})[.)۔]\s*(\S.*)$", re.S)
LOCAL_LABEL = r"(?:A|B|C|D|a|b|c|d|الف|[أاابجد])"
OPTION_MARKER_LOCAL_RE = re.compile(rf"(?:(?<=^)|(?<=\s))(?:\(\s*({LOCAL_LABEL})\s*\)|({LOCAL_LABEL})[.)۔])\s*", re.I)
ANSWER_LOCAL_RE = re.compile(
    rf"(?:correct\s+answer|answer|ans(?:wer)?|الإجابة\s+الصحيحة|درست\s+جواب|صحیح\s+جواب|"
    rf"پاسخ(?:\s+صحیح|\s+درست)?|جواب(?:\s+درست)?)[\s:–—-]*\(?\s*({LOCAL_LABEL})\s*\)?",
    re.I,
)
KEY_PAIR_LOCAL_RE = re.compile(
    rf"(?<!\w)([0-9۰-۹٠-٩]{{1,4}})\s*(?:[-.:)—–—]|\.\s*)\s*\(?\s*({LOCAL_LABEL})\s*\)?",
    re.I,
)
ANSWER_KEY_HEADING_RE = re.compile(r"(?:answer\s*key|key\s*answers|جواب\s*نام|جوابنام|الإجابات|پاسخ\s*نامه)", re.I)

LABEL_MAP = {
    "A": "A", "B": "B", "C": "C", "D": "D",
    "ا": "A", "أ": "A", "الف": "A", "ب": "B", "ج": "C", "د": "D",
}


@dataclass(frozen=True)
class SubjectMeta:
    subject: str
    slug: str
    designation: str
    group: int | None


SUBJECTS: tuple[tuple[tuple[str, ...], SubjectMeta], ...] = (
    (("account", "audit"), SubjectMeta("Accounting & Auditing", "accounting-auditing", "optional", 1)),
    (("economics",), SubjectMeta("Economics", "economics", "optional", 1)),
    (("computer science",), SubjectMeta("Computer Science", "computer-science", "optional", 1)),
    (("political science",), SubjectMeta("Political Science", "political-science", "optional", 1)),
    (("international relations",), SubjectMeta("International Relations", "international-relations", "optional", 1)),
    (("physics",), SubjectMeta("Physics", "physics", "optional", 2)),
    (("chemistry",), SubjectMeta("Chemistry", "chemistry", "optional", 2)),
    (("applied math", "applied mathematics"), SubjectMeta("Applied Mathematics", "applied-mathematics", "optional", 2)),
    (("pure math", "pure mathematics"), SubjectMeta("Pure Mathematics", "pure-mathematics", "optional", 2)),
    (("statistics",), SubjectMeta("Statistics", "statistics", "optional", 2)),
    (("geology",), SubjectMeta("Geology", "geology", "optional", 2)),
    (("business admin",), SubjectMeta("Business Administration", "business-administration", "optional", 3)),
    (("public administration",), SubjectMeta("Public Administration", "public-administration", "optional", 3)),
    (("governance", "public policies"), SubjectMeta("Governance & Public Policies", "governance-public-policies", "optional", 3)),
    (("town planning", "urban management"), SubjectMeta("Town Planning & Urban Management", "town-planning-urban-management", "optional", 3)),
    (("history of pakistan", "pakistan india", "pakistan_india"), SubjectMeta("History of Pakistan & India", "history-pakistan-india", "optional", 4)),
    (("islamic history", "culture"), SubjectMeta("Islamic History & Culture", "islamic-history-culture", "optional", 4)),
    (("british history",), SubjectMeta("British History", "british-history", "optional", 4)),
    (("european history",), SubjectMeta("European History", "european-history", "optional", 4)),
    (("history of usa", "history usa", "u.s.a"), SubjectMeta("History of USA", "history-usa", "optional", 4)),
    (("gender studies",), SubjectMeta("Gender Studies", "gender-studies", "optional", 5)),
    (("environmental science",), SubjectMeta("Environmental Sciences", "environmental-sciences", "optional", 5)),
    (("agriculture", "forestry"), SubjectMeta("Agriculture & Forestry", "agriculture-forestry", "optional", 5)),
    (("botany",), SubjectMeta("Botany", "botany", "optional", 5)),
    (("zoology",), SubjectMeta("Zoology", "zoology", "optional", 5)),
    (("english literature",), SubjectMeta("English Literature", "english-literature", "optional", 5)),
    (("urdu literature",), SubjectMeta("Urdu Literature", "urdu-literature", "optional", 5)),
    (("law",), SubjectMeta("Law", "law", "optional", 6)),
    (("constitutional law",), SubjectMeta("Constitutional Law", "constitutional-law", "optional", 6)),
    (("international law",), SubjectMeta("International Law", "international-law", "optional", 6)),
    (("muslim law", "jurisprudence"), SubjectMeta("Muslim Law & Jurisprudence", "muslim-law-jurisprudence", "optional", 6)),
    (("mercantile law",), SubjectMeta("Mercantile Law", "mercantile-law", "optional", 6)),
    (("criminology",), SubjectMeta("Criminology", "criminology", "optional", 6)),
    (("philosophy",), SubjectMeta("Philosophy", "philosophy", "optional", 6)),
    (("journalism", "mass communication"), SubjectMeta("Journalism & Mass Communication", "journalism-mass-communication", "optional", 7)),
    (("psychology",), SubjectMeta("Psychology", "psychology", "optional", 7)),
    (("geography",), SubjectMeta("Geography", "geography", "optional", 7)),
    (("sociology",), SubjectMeta("Sociology", "sociology", "optional", 7)),
    (("anthropology",), SubjectMeta("Anthropology", "anthropology", "optional", 7)),
    (("punjabi",), SubjectMeta("Punjabi", "punjabi", "optional", 7)),
    (("sindhi",), SubjectMeta("Sindhi", "sindhi", "optional", 7)),
    (("pashto",), SubjectMeta("Pashto", "pashto", "optional", 7)),
    (("balochi",), SubjectMeta("Balochi", "balochi", "optional", 7)),
    (("persian",), SubjectMeta("Persian", "persian", "optional", 7)),
    (("arabic",), SubjectMeta("Arabic", "arabic", "optional", 7)),
    (("islamic studies", "islamiat"), SubjectMeta("Islamic Studies", "islamic-studies", "compulsory", None)),
    (("current affairs", "global_pakistan_affairs"), SubjectMeta("Recent Current & Pakistan Affairs", "recent-current-pakistan-affairs", "compulsory", None)),
)


def iter_blocks(parent: DocumentType) -> Iterable[Paragraph | Table]:
    for child in parent.element.body.iterchildren():
        if child.tag.endswith("}p"):
            yield Paragraph(child, parent)
        elif child.tag.endswith("}tbl"):
            yield Table(child, parent)


def read_blocks(path: Path) -> tuple[list[str], list[str]]:
    doc = Document(path)
    blocks: list[str] = []
    headings: list[str] = []
    for block in iter_blocks(doc):
        if isinstance(block, Paragraph):
            text = clean(block.text)
            if text:
                blocks.append(text)
                style = (block.style.name if block.style else "").lower()
                if "heading" in style or "title" in style:
                    headings.append(text)
        else:
            for row in block.rows:
                cells = [clean(cell.text) for cell in row.cells]
                text = " ".join(cell for cell in cells if cell)
                if text:
                    blocks.append(text)
    return blocks, headings


def clean(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "")
    value = value.replace("\u00a0", " ").replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def fingerprint(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).lower()
    value = "".join(ch for ch in value if ch.isalnum())
    return value


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:96] or "general"


def infer_subject(path: Path, blocks: list[str]) -> SubjectMeta | None:
    haystack = clean(path.stem.replace("_", " ").replace("-", " ")).lower()
    first = " ".join(blocks[:8]).lower()
    # More specific names must win over the generic "law" rule.
    candidates: list[tuple[int, SubjectMeta]] = []
    for needles, meta in SUBJECTS:
        score = 0
        for needle in needles:
            if needle in haystack:
                score += 8 + len(needle)
            if needle in first:
                score += 2
        if score:
            candidates.append((score, meta))
    return max(candidates, key=lambda item: item[0])[1] if candidates else None


def topic_for(offset: int, heading_positions: list[tuple[int, str]], subject: str) -> str:
    valid = [text for pos, text in heading_positions if pos <= offset]
    if not valid:
        return "General"
    heading = re.sub(r"^\s*(?:unit|section|chapter|topic|part|volume)\s*\d*\s*[:.\-–—]*\s*", "", valid[-1], flags=re.I)
    heading = clean(heading)
    if len(heading) < 3 or fingerprint(heading) == fingerprint(subject):
        return "General"
    return heading[:160]


def file_topic(path: Path) -> str:
    """Derive a readable fallback only from an explicit source filename title."""
    value = path.stem.replace("_", " ")
    value = re.sub(r"\b(?:FPSC|CSS|MCQs?|bank|master|index|advanced|verified|expanded|rebuilt)\b", " ", value, flags=re.I)
    value = re.sub(r"\b(?:high yield|exam style|per topic subtopic)\b", " ", value, flags=re.I)
    value = re.sub(r"\b(?:vol(?:ume)?|unit)\s*0*\d+\b", " ", value, flags=re.I)
    value = re.sub(r"\b\d+\b", " ", value)
    value = clean(value.replace("-", " "))
    return value[:160] if len(fingerprint(value)) >= 3 else "General"


def answer_keys(text: str) -> dict[int, str]:
    found: dict[int, set[str]] = defaultdict(set)
    for num, label in KEY_PAIR_RE.findall(text):
        found[int(num)].add(label.upper())
    return {num: next(iter(values)) for num, values in found.items() if len(values) == 1}


def local_label(value: str | None) -> str | None:
    if not value:
        return None
    return LABEL_MAP.get(clean(value).upper()) or LABEL_MAP.get(clean(value))


def local_number(value: str) -> int:
    return int("".join(str(unicodedata.digit(ch)) if ch.isdigit() else ch for ch in value))


def local_answer(value: str) -> str | None:
    match = ANSWER_LOCAL_RE.search(clean(value))
    return local_label(match.group(1)) if match else None


def local_key_pairs(value: str) -> dict[int, str]:
    pairs: dict[int, str] = {}
    for number, label in KEY_PAIR_LOCAL_RE.findall(clean(value)):
        normalized = local_label(label)
        if normalized:
            pairs[local_number(number)] = normalized
    return pairs


def unique_local_key_pairs(value: str) -> dict[int, str]:
    found: dict[int, set[str]] = defaultdict(set)
    for number, label in KEY_PAIR_LOCAL_RE.findall(clean(value)):
        normalized = local_label(label)
        if normalized:
            found[local_number(number)].add(normalized)
    return {number: next(iter(labels)) for number, labels in found.items() if len(labels) == 1}


def local_options(value: str) -> tuple[str, dict[str, str], str | None]:
    """Return text before the first option, normalized A–D options and an inline answer."""
    value = clean(value)
    answer_match = ANSWER_LOCAL_RE.search(value)
    markers = [
        marker for marker in OPTION_MARKER_LOCAL_RE.finditer(value)
        if not answer_match or marker.start() < answer_match.start()
    ]
    options: dict[str, str] = {}
    if not markers:
        return value, options, local_answer(value)
    for index, marker in enumerate(markers):
        label = local_label(marker.group(1) or marker.group(2))
        if not label or label in options:
            continue
        end = markers[index + 1].start() if index + 1 < len(markers) else (answer_match.start() if answer_match else len(value))
        option = clean(value[marker.end():end]).strip(" ;|—–-")
        if option:
            options[label] = option
    return clean(value[:markers[0].start()]), options, local_label(answer_match.group(1)) if answer_match else None


def parse_chunk(chunk: str, number: int, key: dict[int, str]) -> tuple[str, list[str], int, str | None, str | None] | None:
    markers = list(OPTION_RE.finditer(chunk))
    sequence: list[tuple[str, re.Match[str]]] = []
    for marker in markers:
        label = (marker.group(1) or marker.group(2)).upper()
        if not sequence and label != "A":
            continue
        if label == chr(ord("A") + len(sequence)):
            sequence.append((label, marker))
        elif label == "A" and len(sequence) < 4:
            sequence = [(label, marker)]
        if len(sequence) == 4:
            break
    if len(sequence) != 4:
        return None

    answer_match = ANSWER_RE.search(chunk, sequence[-1][1].end())
    answer_label = answer_match.group(1).upper() if answer_match else key.get(number)
    if answer_label not in {"A", "B", "C", "D"}:
        return None

    question = clean(chunk[: sequence[0][1].start()])
    question = re.sub(r"^\d{1,4}[.)]\s+", "", question)
    if len(fingerprint(question)) < 12:
        return None

    options: list[str] = []
    for index, (_, marker) in enumerate(sequence):
        end = sequence[index + 1][1].start() if index < 3 else (answer_match.start() if answer_match else len(chunk))
        option = clean(chunk[marker.end():end])
        if index == 3 and not answer_match:
            option = re.split(r"\n(?:explanation|details|source|references?)\s*[:–—-]", option, maxsplit=1, flags=re.I)[0]
        options.append(option.strip(" ;|"))
    if any(len(fingerprint(option)) < 1 or len(option) > 800 for option in options):
        return None
    if len({fingerprint(option) for option in options}) != 4:
        return None

    explanation = None
    source = None
    if answer_match:
        tail = clean(chunk[answer_match.end():]).lstrip(" .–—-:")
        source_match = SOURCE_RE.search(tail)
        if source_match:
            source = clean(source_match.group(1))[:500]
            tail = clean(tail[:source_match.start()])
        tail = re.sub(r"^(?:explanation|details|why it matters)\s*[:–—-]\s*", "", tail, flags=re.I)
        if tail:
            explanation = tail[:1500]
    return question, options, ord(answer_label) - ord("A"), explanation, source


def parse_document(path: Path, batch: str) -> tuple[list[dict], dict, list[str]]:
    blocks, headings = read_blocks(path)
    meta = infer_subject(path, blocks)
    if not meta:
        return [], {"file": path.name, "status": "unclassified", "accepted": 0, "rejected": 0}, headings

    doc = Document(path)
    accepted: list[dict] = []
    rejected = 0
    current_topic = "General"
    current: dict | None = None
    pending: list[dict] = []
    section_keys: dict[int, str] = {}
    answer_key_mode = False

    # A few banks use one consolidated key with globally unique numbering. It is
    # only a fallback; section-local keys encountered in document order win.
    all_text = "\n".join(blocks)
    global_keys = answer_keys(all_text)
    global_keys.update(unique_local_key_pairs(all_text))
    row_key_candidates: dict[int, set[str]] = defaultdict(set)
    for table in doc.tables:
        for row in table.rows:
            cells = [clean(cell.text) for cell in row.cells]
            if len(cells) < 2 or not re.fullmatch(r"[0-9۰-۹٠-٩]{1,4}", cells[0]):
                continue
            label = local_label(cells[1].strip(" ().–—-"))
            if label:
                row_key_candidates[local_number(cells[0])].add(label)
    global_keys.update({number: next(iter(labels)) for number, labels in row_key_candidates.items() if len(labels) == 1})

    def emit(question: dict, fallback_keys: dict[int, str] | None = None) -> None:
        nonlocal rejected
        labels = question.get("options", {})
        options = [clean(labels.get(label, "")) for label in ("A", "B", "C", "D")]
        answer_label = question.get("answer") or (fallback_keys or {}).get(question.get("number")) or global_keys.get(question.get("number"))
        text = clean(question.get("question", ""))
        if (
            len(fingerprint(text)) < 12
            or any(not fingerprint(option) or len(option) > 800 for option in options)
            or len({fingerprint(option) for option in options}) != 4
            or answer_label not in {"A", "B", "C", "D"}
        ):
            rejected += 1
            return
        normalized = fingerprint(text)
        digest = hashlib.sha256((meta.slug + "|" + normalized).encode()).hexdigest()
        accepted.append({
            "id": f"css-{meta.slug}-{digest[:16]}",
            "hash": digest,
            "designation": meta.designation,
            "group": meta.group,
            "subject": meta.subject,
            "subjectSlug": meta.slug,
            "topic": clean(question.get("topic") or "General")[:160],
            "question": text,
            "options": options,
            "answer": ord(answer_label) - ord("A"),
            "explanation": clean(question.get("explanation", ""))[:1500] or None,
            "sourceDocument": path.name,
            "source": clean(question.get("source", ""))[:500] or None,
            "importBatch": batch,
            "verification": "source-supplied",
        })

    def finish_current() -> None:
        nonlocal current
        if not current:
            return
        if current.get("answer"):
            emit(current)
        else:
            pending.append(current)
        current = None

    def flush_pending(keys: dict[int, str] | None = None) -> None:
        nonlocal pending, section_keys
        merged = dict(section_keys)
        if keys:
            merged.update(keys)
        for question in pending:
            emit(question, merged)
        pending = []
        section_keys = {}

    def start_question(value: str, style: str) -> bool:
        nonlocal current, answer_key_mode
        match = QUESTION_PREFIX_RE.match(value)
        if not match and "question" not in style:
            return False
        finish_current()
        number = local_number(match.group(1)) if match else len(accepted) + len(pending) + 1
        body = match.group(2) if match else value
        question_text, inline_options, inline_answer = local_options(body)
        question_topic = current_topic
        if "current_affairs_500" in path.stem.lower():
            question_topic = (
                "Pakistan Domestic Affairs" if number <= 100
                else "Pakistan External Affairs" if number <= 300
                else "Global Issues"
            )
        elif question_topic in {"General", "MCQs"}:
            question_topic = file_topic(path)
        current = {
            "number": number,
            "question": re.sub(r"^Q\s*", "", question_text, flags=re.I),
            "options": inline_options,
            "answer": inline_answer,
            "topic": question_topic,
        }
        answer_key_mode = False
        return True

    for block in iter_blocks(doc):
        if isinstance(block, Table):
            cell_texts = [clean(cell.text) for row in block.rows for cell in row.cells if clean(cell.text)]
            table_keys: dict[int, str] = {}
            table_options: dict[str, str] = {}
            # Some verified banks store one complete question in each one-cell
            # table so that the question stays together in print.
            if len(cell_texts) == 1 and QUESTION_PREFIX_RE.match(cell_texts[0]):
                start_question(cell_texts[0], "question")
                finish_current()
                continue
            # Other banks use a three-column Q / Ans. / Source table. Join the
            # first two cells row-wise before falling back to inline key pairs.
            for row in block.rows:
                row_cells = [clean(cell.text) for cell in row.cells]
                if len(row_cells) >= 2 and re.fullmatch(r"[0-9۰-۹٠-٩]{1,4}", row_cells[0]):
                    label = local_label(row_cells[1].strip(" ().–—-"))
                    if label:
                        table_keys[local_number(row_cells[0])] = label
            for cell_text in cell_texts:
                table_keys.update(local_key_pairs(cell_text))
                _, found_options, _ = local_options(cell_text)
                table_options.update(found_options)
            if current and len(table_options) >= 2:
                current["options"].update(table_options)
            elif table_keys and (pending or current):
                finish_current()
                flush_pending(table_keys)
                answer_key_mode = False
            continue

        value = clean(block.text)
        if not value:
            continue
        style = (block.style.name if block.style else "").lower()
        is_heading = "heading" in style or style == "title"

        if ANSWER_KEY_HEADING_RE.search(value) or "answer key" in style:
            finish_current()
            answer_key_mode = True
            section_keys.update(local_key_pairs(value))
            continue

        key_pairs = local_key_pairs(value)
        if answer_key_mode and key_pairs:
            section_keys.update(key_pairs)
            continue

        if is_heading:
            if pending:
                flush_pending(section_keys)
            heading = re.sub(r"^\s*(?:[IVXLCDM]+|[0-9۰-۹٠-٩]+)[.)۔-]\s*", "", value, flags=re.I)
            current_topic = clean(heading)[:160] if len(fingerprint(heading)) >= 3 else "General"
            answer_key_mode = False
            continue

        if start_question(value, style):
            continue

        if not current:
            continue

        explicit_answer = local_answer(value)
        if explicit_answer or "answer" in style:
            current["answer"] = explicit_answer or current.get("answer")
            continue
        before, found_options, inline_answer = local_options(value)
        if "option" in style or found_options:
            current["options"].update(found_options)
            if inline_answer:
                current["answer"] = inline_answer
            continue
        if "rationale" in style or "explanation" in style or value.lower().startswith(("explanation:", "rationale:", "details:")):
            current["explanation"] = re.sub(r"^(?:explanation|rationale|details)\s*[:–—-]\s*", "", value, flags=re.I)
            continue
        if "reference" in style or SOURCE_RE.match(value):
            current["source"] = re.sub(r"^(?:verification|source|sources|reference|references)\s*[:–—-]\s*", "", value, flags=re.I)
            continue
        if value.lower().startswith("syllabus focus:"):
            current["topic"] = clean(value.split(":", 1)[1])[:160]

    finish_current()
    flush_pending(section_keys)
    status = "accepted" if accepted else "no-valid-records"
    return accepted, {
        "file": path.name,
        "subject": meta.subject,
        "status": status,
        "accepted": len(accepted),
        "rejected": rejected,
    }, headings


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("roots", nargs="+", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--batch", default="2026-08-16-supplied-academic-material")
    parser.add_argument("--preserve-from", type=Path)
    args = parser.parse_args()

    paths: list[Path] = []
    for root in args.roots:
        paths.extend(path for path in root.rglob("*.docx") if "__MACOSX" not in path.parts and not path.name.startswith("._"))
    paths = sorted(set(path.resolve() for path in paths))

    by_subject: dict[str, list[dict]] = defaultdict(list)
    topic_index: dict[str, set[str]] = defaultdict(set)
    file_report: list[dict] = []
    duplicate_count: Counter[str] = Counter()
    seen: dict[str, str] = {}
    preserved: dict[str, dict] = {}
    if args.preserve_from and args.preserve_from.exists():
        for shard in args.preserve_from.glob("*.json"):
            if shard.name in {"index.json", "import-report.json"}:
                continue
            try:
                previous = json.loads(shard.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if isinstance(previous, list):
                preserved.update({item["id"]: item for item in previous if isinstance(item, dict) and item.get("id")})

    for path in paths:
        try:
            records, report, headings = parse_document(path, args.batch)
        except Exception as exc:  # malformed source is reported, never silently published
            file_report.append({"file": path.name, "status": "read-error", "error": str(exc), "accepted": 0, "rejected": 0})
            continue
        file_report.append(report)
        for record in records:
            previous = preserved.get(record["id"])
            if previous:
                if (
                    "current_affairs_500" not in record["sourceDocument"].lower()
                    and previous.get("topic") not in {None, "", "General", "MCQs"}
                ):
                    record["topic"] = previous["topic"]
                record["explanation"] = previous.get("explanation") or record.get("explanation")
                record["source"] = previous.get("source") or record.get("source")
            key = fingerprint(record["question"])
            if key in seen:
                duplicate_count[record["subject"]] += 1
                continue
            seen[key] = record["id"]
            by_subject[record["subjectSlug"]].append(record)
            topic_index[record["subjectSlug"]].add(record["topic"])

    args.out.mkdir(parents=True, exist_ok=True)
    subjects: list[dict] = []
    for slug, records in sorted(by_subject.items(), key=lambda item: item[1][0]["subject"]):
        records.sort(key=lambda item: (item["topic"], item["sourceDocument"], item["id"]))
        filename = f"{slug}.json"
        (args.out / filename).write_text(json.dumps(records, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        first = records[0]
        subjects.append({
            "slug": slug,
            "name": first["subject"],
            "designation": first["designation"],
            "group": first["group"],
            "count": len(records),
            "topics": sorted(topic_index[slug]),
            "file": filename,
        })

    aggregate = Counter()
    for report in file_report:
        aggregate["accepted_before_dedupe"] += report.get("accepted", 0)
        aggregate["rejected"] += report.get("rejected", 0)
        aggregate[report.get("status", "unknown")] += 1
    summary = {
        "batch": args.batch,
        "documentsInspected": len(paths),
        "subjectsPublished": len(subjects),
        "accepted": sum(item["count"] for item in subjects),
        "duplicatesRemoved": sum(duplicate_count.values()),
        "malformedOrMissingAnswerRejected": aggregate["rejected"],
        "readErrors": aggregate["read-error"],
        "unclassifiedDocuments": aggregate["unclassified"],
        "subjects": subjects,
        "duplicatesBySubject": dict(sorted(duplicate_count.items())),
        "files": file_report,
    }
    (args.out / "index.json").write_text(json.dumps({"batch": args.batch, "subjects": subjects}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (args.out / "import-report.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key: summary[key] for key in ("documentsInspected", "subjectsPublished", "accepted", "duplicatesRemoved", "malformedOrMissingAnswerRejected", "readErrors", "unclassifiedDocuments")}, indent=2))


if __name__ == "__main__":
    main()
