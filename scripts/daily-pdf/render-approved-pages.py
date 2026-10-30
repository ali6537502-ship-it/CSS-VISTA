#!/usr/bin/env python3
"""Render an owner-approved, page-separated daily issue source for PDF publication."""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit

source = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
output = Path(sys.argv[2])
if source.get("date") != "2026-10-30" or source.get("issue") != 11:
    raise SystemExit("Incorrect date or issue number")
pages = source.get("pages")
if not isinstance(pages, list) or len(pages) != 15 or not all(isinstance(p, str) and len(p) > 500 for p in pages):
    raise SystemExit("The approved 15-page source is incomplete")

font_path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
bold_path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
if not (font_path.exists() and bold_path.exists()):
    raise SystemExit("DejaVu fonts unavailable; not falling back to missing glyphs")
pdfmetrics.registerFont(TTFont("VistaSans", str(font_path)))
pdfmetrics.registerFont(TTFont("VistaBold", str(bold_path)))
green = HexColor("#1d533e")
ink = HexColor("#1c2b2b")
muted = HexColor("#65746f")
W, H = A4
left = 47
right = 47
available = W - left - right
output.parent.mkdir(parents=True, exist_ok=True)
pdf = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
pdf.setTitle(source["title"])
pdf.setAuthor("CSS VISTA")
pdf.setSubject("Daily Current Affairs — 30 October 2026 — Issue No. 11")

def paragraphs(page):
    cleaned = []
    for line in page.splitlines():
        line = line.strip()
        if not line:
            cleaned.append("")
            continue
        if re.search(r"CSS VISTA\s*\|\s*www\.css-vista\.com\s*\|\s*Page\s+\d+$", line, re.I):
            continue
        if re.search(r"CSS VISTA\s*/\s*ISSUE NO\.\s*11\s*/\s*30 OCTOBER 2026", line, re.I):
            continue
        if line == "CSS VISTA":
            continue
        cleaned.append(re.sub(r"[ \t]{2,}", " ", line))
    entries = []
    for piece in re.split(r"\n\s*\n+", "\n".join(cleaned)):
        text = " ".join(part.strip() for part in piece.splitlines() if part.strip())
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            continue
        if len(text) > 14000:
            raise SystemExit("Unexpected text length on a source page")
        entries.append(text)
    return entries

def arrange(blocks, font_size):
    content = []
    height = 0
    for piece in blocks:
        heading = len(piece) <= 95 and (piece.isupper() or piece.startswith(("01 ", "02 ", "03 ", "04 ", "05 ", "06 ", "07 ", "08 ", "09 ", "10 ", "11 ", "12 ")))
        weight = "VistaBold" if heading else "VistaSans"
        size = font_size + 1.2 if heading else font_size
        lead = size * (1.39 if heading else 1.43)
        # Keep long words (such as URLs) inside the page's printable width.
        words = []
        for word in piece.split():
            if pdfmetrics.stringWidth(word, weight, size) > available:
                unit = ""
                for ch in word:
                    if pdfmetrics.stringWidth(unit + ch, weight, size) > available - 4:
                        words.append(unit)
                        unit = ""
                    unit += ch
                if unit:
                    words.append(unit)
            else:
                words.append(word)
        lines = simpleSplit(" ".join(words), weight, size, available)
        content.append((heading, weight, size, lead, lines))
        height += len(lines) * lead + 4.5
    return content, height

for index, raw in enumerate(pages, start=1):
    blocks = paragraphs(raw)
    if not blocks:
        raise SystemExit("Empty source page")
    content = None
    for point in (9.4, 9.0, 8.6, 8.2, 7.8, 7.4, 7.0):
        result, content_height = arrange(blocks, point)
        if content_height <= H - 151:
            content = result
            break
    if content is None:
        raise SystemExit(f"Page {index} cannot be rendered without losing content")

    pdf.setFillColor(green)
    pdf.rect(0, H - 10, W, 10, fill=1, stroke=0)
    pdf.setFont("VistaBold", 16.0)
    pdf.drawString(left, H - 48, "CSS VISTA")
    pdf.setFont("VistaSans", 8.4)
    pdf.setFillColor(muted)
    pdf.drawRightString(W - right, H - 40, "30 OCTOBER 2026  |  ISSUE NO. 11")
    pdf.setStrokeColor(HexColor("#d6e1db"))
    pdf.line(left, H - 61, W - right, H - 61)
    y = H - 83
    for heading, face, size, lead, lines in content:
        pdf.setFont(face, size)
        pdf.setFillColor(green if heading else ink)
        for line in lines:
            pdf.drawString(left, y, line)
            y -= lead
        y -= 4.5
    if y < 53:
        raise SystemExit(f"Page {index} exceeded footer; no truncation allowed")
    pdf.setStrokeColor(HexColor("#d6e1db"))
    pdf.line(left, 43, W-right, 43)
    pdf.setFillColor(muted)
    pdf.setFont("VistaSans", 7.8)
    pdf.drawString(left, 29, "www.css-vista.com")
    pdf.drawRightString(W-right, 29, f"30 OCT 2026  |  PAGE {index} OF {len(pages)}")
    pdf.showPage()
pdf.save()
if output.stat().st_size < 10000:
    raise SystemExit("Suspiciously small PDF")
print(f"Rendered {len(pages)} complete source pages to {output} ({output.stat().st_size} bytes)")
