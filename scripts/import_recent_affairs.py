#!/usr/bin/env python3
"""Extract the supplied current-affairs dossier without inventing missing details."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from docx import Document


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("docx", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    paragraphs = [(clean(p.text), p.style.name if p.style else "") for p in Document(args.docx).paragraphs]
    date = ""
    development = ""
    background = ""
    why = ""
    source = ""
    mode = ""
    one_liners: list[dict] = []
    mcqs: list[dict] = []
    pending: dict | None = None

    def finish_pending() -> None:
        nonlocal pending
        if not pending:
            return
        if pending.get("question") and len(pending.get("options", [])) == 4 and pending.get("answer") in range(4):
            raw = pending["question"].lower()
            digest = hashlib.sha256(raw.encode()).hexdigest()[:16]
            pending["id"] = f"ca-20260816-{digest}"
            pending["date"] = date
            pending["development"] = development
            pending["background"] = background
            pending["whyItMatters"] = why
            pending["source"] = source
            mcqs.append(pending)
        pending = None

    for index, (text, style) in enumerate(paragraphs):
        if not text:
            continue
        if style == "Heading 1" and re.fullmatch(r"\d{1,2} [A-Za-z]+ 2026", text):
            finish_pending()
            date = text
            mode = ""
        elif style == "Heading 2":
            finish_pending()
            development = re.sub(r"^\d+[.)]\s*", "", text)
            background = ""
            why = ""
            source = ""
            mode = "background"
        elif style == "Heading 3":
            finish_pending()
            mode = text.lower()
        elif style == "QuestionText":
            finish_pending()
            pending = {"question": re.sub(r"^\d+[.)]\s*", "", text), "options": [], "answer": -1, "explanation": ""}
            mode = "mcqs"
        elif style == "SourceLine":
            source = text.replace(" — source", "")
            if mcqs and mcqs[-1].get("development") == development:
                mcqs[-1]["source"] = source
        elif mode == "background" and not background:
            background = text
        elif mode == "why it matters":
            why = text
        elif mode == "high-yield facts" and text.startswith("•"):
            one_liners.append({"date": date, "development": development, "fact": text.lstrip("• "), "source": source})
        elif mode == "mcqs" and pending:
            if not pending["options"]:
                markers = list(re.finditer(r"(?:^|\s)([A-D])[.)]\s+", text))
                if len(markers) >= 4:
                    opts = []
                    for n, marker in enumerate(markers[:4]):
                        end = markers[n + 1].start() if n < 3 else len(text)
                        opts.append(clean(text[marker.end():end]))
                    pending["options"] = opts
            elif pending["answer"] == -1:
                answer = re.match(r"Answer:\s*([A-D])", text, re.I)
                if answer:
                    pending["answer"] = ord(answer.group(1).upper()) - ord("A")
            elif not pending["explanation"]:
                pending["explanation"] = text

    finish_pending()
    # Sources are declared after questions in the source document; propagate per development.
    source_by_development: dict[str, str] = {}
    for text, style in paragraphs:
        if style == "Heading 2":
            development = re.sub(r"^\d+[.)]\s*", "", text)
        elif style == "SourceLine":
            source_by_development[development] = text.replace(" — source", "")
    for item in one_liners + mcqs:
        item["source"] = source_by_development.get(item["development"], item.get("source", ""))

    payload = {
        "batch": "11 July–16 August 2026",
        "title": "Global & Pakistan Affairs",
        "sourceDocument": args.docx.name,
        "verification": "Source-supplied dossier; citations retained as written in the supplied document.",
        "oneLiners": one_liners,
        "mcqs": mcqs,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"oneLiners": len(one_liners), "mcqs": len(mcqs)}, indent=2))


if __name__ == "__main__":
    main()
