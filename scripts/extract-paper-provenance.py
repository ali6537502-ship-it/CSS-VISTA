"""Record what each archived past-paper document says about its own provenance.

Some documents in the archive state on their first page that they are not
official examination booklets: they are candidate-recalled or model-paper
reconstructions compiled by a third party, and their wording may carry recall
errors. The website presented every one of them simply as a "Past Paper", so a
visitor had no way to tell a reconstruction from an official FPSC or PPSC
paper unless they opened the PDF and read the notice.

This script reads that notice out of each document and writes it to
src/data/paperProvenance.json, which the build renders onto the matching paper
page. Running it requires pypdf; the generated file is committed so ordinary
builds need neither the dependency nor the several minutes of PDF parsing.

    python3 scripts/extract-paper-provenance.py --write
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUTPUT = ROOT / "src" / "data" / "paperProvenance.json"

# Phrases a document uses to disclaim official status. Matching any of them
# means the page must not present the document as an official paper.
#
# Each phrase names the document's own status, so it cannot be tripped by
# ordinary examination text. A bare "not an official" was deliberately dropped:
# it reads as a disclaimer but would also match a question or a note about
# something else being unofficial, and every document currently in the archive
# matches on one of the specific phrases below without it.
UNOFFICIAL_MARKERS = (
    "unofficial candidate-recalled",
    "candidate-recalled/model-paper reconstruction",
    "mcq reconstruction",
    "candidate-recalled reconstruction",
)

FIELD_PATTERNS = {
    "examinationDate": r"Examination date\s+([0-9]{2}-[0-9]{2}-[0-9]{4})",
    "department": r"Department / stream\s+(.+?)\s+(?:Recovered questions|Verification class|Source paper ID)",
    "recoveredQuestions": r"Recovered questions\s+([0-9]+)",
    "verificationClass": r"Verification class\s+(VERY HIGH|HIGH|MEDIUM|LOW)",
    "primarySource": r"Primary reconstruction source:\s*(.+?)\s*(?:Independent checks|Important|$)",
    "independentChecks": r"Independent checks:\s*(.+?)\s*(?:Important|Page \d|$)",
}


def load_papers() -> list[dict]:
    """The generated registry is the authority on which documents exist."""
    result = subprocess.run(
        [
            "node",
            "-e",
            "import('./scripts/lib/past-paper-registry.mjs').then(async r => {"
            "const p = await r.loadGeneratedPastPapers(process.cwd());"
            "console.log(JSON.stringify(p.filter(x => x.fileUrl)))})",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def first_page_text(pdf_path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(pdf_path))
    if not reader.pages:
        return ""
    text = reader.pages[0].extract_text() or ""
    return re.sub(r"\s+", " ", text).strip()


def extract(paper: dict) -> dict | None:
    pdf_path = PUBLIC / paper["fileUrl"].lstrip("/")
    if not pdf_path.exists():
        return None
    try:
        text = first_page_text(pdf_path)
    except Exception:
        return None
    if not text:
        return None

    lowered = text.lower()
    if not any(marker in lowered for marker in UNOFFICIAL_MARKERS):
        return None

    record: dict[str, str | bool] = {"official": False}
    for key, pattern in FIELD_PATTERNS.items():
        match = re.search(pattern, text)
        if not match:
            continue
        value = re.sub(r"\s+", " ", match.group(1)).strip(" .;,")
        # A greedy source line can swallow the sentence that follows it.
        if key in {"primarySource", "independentChecks"} and len(value) > 160:
            value = value[:160].rsplit(" ", 1)[0]
        if value:
            record[key] = value
    return record


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write the generated file.")
    args = parser.parse_args()

    papers = load_papers()
    records: dict[str, dict] = {}
    for paper in papers:
        record = extract(paper)
        if record:
            records[paper["id"]] = record

    payload = {
        "generatedBy": "scripts/extract-paper-provenance.py",
        "note": (
            "Documents that state on their own first page that they are not official "
            "examination booklets. Read out of the PDFs; never authored by hand."
        ),
        "scanned": len(papers),
        "papers": dict(sorted(records.items())),
    }

    print(f"Scanned {len(papers)} documents; {len(records)} declare themselves unofficial reconstructions.")
    by_exam: dict[str, int] = {}
    for paper in papers:
        if paper["id"] in records:
            by_exam[paper["examination"]] = by_exam.get(paper["examination"], 0) + 1
    print(f"  by examination: {by_exam}")

    if args.write:
        OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"  wrote {OUTPUT.relative_to(ROOT)}")
    else:
        print("  (dry run; pass --write to update the generated file)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
