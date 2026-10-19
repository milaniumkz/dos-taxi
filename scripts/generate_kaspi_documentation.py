"""Render Kaspi handoff PDF. Requires reportlab and system DejaVu fonts.

Run: python3 scripts/generate_kaspi_documentation.py
The Markdown source is versioned alongside the current OpenAPI contract.
"""
from pathlib import Path
import re
import textwrap
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Preformatted, KeepTogether, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'docs/api/kaspi-bank-handoff-v4.md'
OUTPUT = ROOT / 'apps/mobile/web/docs/kaspi-driver-topup-v4.pdf'
FONT_DIR = Path('/usr/share/fonts/truetype/dejavu')
for name, filename in [('DOS', 'DejaVuSans.ttf'), ('DOS-Bold', 'DejaVuSans-Bold.ttf'), ('DOS-Mono', 'DejaVuSansMono.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / filename)))
normal = ParagraphStyle('Body', fontName='DOS', fontSize=9, leading=13, spaceAfter=7)
heading = ParagraphStyle('Section', parent=normal, fontName='DOS-Bold', fontSize=12, leading=17, spaceBefore=12, spaceAfter=9, keepWithNext=True)
title = ParagraphStyle('Title', parent=heading, fontSize=17, leading=23)
code = ParagraphStyle('Code', fontName='DOS-Mono', fontSize=7.1, leading=10, spaceAfter=6)
cell = ParagraphStyle('Cell', parent=normal, fontSize=8, leading=11, spaceAfter=0)


def markup(value):
    value = escape(value.strip())
    value = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', value)
    return value.replace('`', '')


def footer(canvas, doc):
    canvas.setFont('DOS', 8)
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.drawString(42, 24, 'DOS / Kaspi — версия 4 — 19.10.2026')
    canvas.drawRightString(553, 24, str(doc.page))


def render():
    lines = SOURCE.read_text().splitlines()
    story = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('```'):
            content = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                content.extend(textwrap.wrap(lines[i], width=98, replace_whitespace=False, drop_whitespace=False) or [''])
                i += 1
            story.append(KeepTogether([Preformatted('\n'.join(content), code), Spacer(1, 6)]))
        elif line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                if not re.match(r'^\|[\s:|-]+\|$', lines[i]):
                    rows.append([Paragraph(markup(value), cell) for value in lines[i].strip('|').split('|')])
                i += 1
            widths = [62, 150, 299] if len(rows[0]) == 3 else [100, 411]
            table = Table(rows, colWidths=widths, repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
                ('GRID', (0, 0), (-1, -1), .4, colors.HexColor('#cbd5e1')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.extend([table, Spacer(1, 10)])
            continue
        elif line.startswith('# '):
            story.append(Paragraph(markup(line[2:]), title))
        elif line.startswith('## '):
            story.append(Paragraph(markup(line[3:]), heading))
        elif line.strip():
            story.append(Paragraph(markup(line), normal))
        i += 1
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    SimpleDocTemplate(str(OUTPUT), pagesize=(595, 842), leftMargin=42, rightMargin=42, topMargin=36, bottomMargin=42,
                      title='DOS — Kaspi: пополнение баланса водителя', author='DOS', invariant=1).build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == '__main__':
    render()
