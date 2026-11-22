"""Render reviewed, private member editions into a directory outside the public site."""
from argparse import ArgumentParser
from hashlib import sha256
from pathlib import Path
from xml.sax.saxutils import escape
import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer


def build(record, filename):
    doc = SimpleDocTemplate(str(filename), pagesize=A4, title=record['title'], author='Point Lookout Fishing Club',
                            invariant=True, leftMargin=24*mm, rightMargin=24*mm, topMargin=29*mm, bottomMargin=24*mm)
    ink = colors.HexColor('#173d3d')
    head = ParagraphStyle('Title', fontName='Helvetica-Bold', fontSize=25, leading=29, textColor=ink, spaceAfter=7)
    sub = ParagraphStyle('Sub', fontName='Helvetica', fontSize=11, leading=15, textColor=colors.HexColor('#4c6864'), spaceAfter=18)
    heading = ParagraphStyle('Heading', fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=ink, spaceAfter=3)
    body = ParagraphStyle('Body', fontName='Helvetica', fontSize=11.2, leading=16, textColor=colors.HexColor('#203b39'))
    story = [Paragraph(escape(record['heading']), head), Paragraph(escape(record['dateLabel'])+'  |  Member edition', sub)]
    for section, text in record['sections']:
        story.append(KeepTogether([Paragraph(escape(section), heading), Paragraph(escape(text), body), Spacer(1, 11)]))
    story += [Spacer(1, 6), Paragraph(escape(record['sourceLine']), sub)]

    def page(canvas, document):
        width, height = A4
        canvas.setFillColor(colors.HexColor('#07575a'))
        canvas.rect(0, height-17*mm, width, 17*mm, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont('Helvetica-Bold', 10)
        canvas.drawString(24*mm, height-10.8*mm, 'POINT LOOKOUT FISHING CLUB')
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(ink)
        canvas.drawString(24*mm, 13*mm, 'Members library')
        canvas.drawRightString(width-24*mm, 13*mm, str(document.page))

    doc.build(story, onFirstPage=page, onLaterPages=page)


if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('source', type=Path, help='Reviewed local JSON, kept outside public or tracked files')
    parser.add_argument('directory', type=Path, help='Private output directory inside .local')
    args = parser.parse_args()
    private = Path(__file__).resolve().parents[1]/'.local'
    if not args.directory.resolve().is_relative_to(private) or not args.source.resolve().is_relative_to(private):
        raise SystemExit('Use private inputs and outputs inside the project .local directory.')
    args.directory.mkdir(parents=True, exist_ok=True)
    records = json.loads(args.source.read_text(encoding='utf8'))
    manifest = []
    for rec in records:
        filename = args.directory/(rec['id']+'.pdf')
        if filename.resolve().parent != args.directory.resolve():
            raise SystemExit('Unexpected document filename.')
        build(rec, filename)
        manifest.append({key:rec[key] for key in ['id','title','date','type','originalId']} |
                        {'sha256':sha256(filename.read_bytes()).hexdigest()})
    (args.directory/'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf8')
    print(f'Rendered {len(records)} member editions for verification.')
