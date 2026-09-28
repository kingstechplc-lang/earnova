#!/usr/bin/env python3
"""Merge cover PDF (page 1) + body PDF (pages 2+) into final deliverable."""
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject

A4_W, A4_H = 595.28, 841.89

def force_a4(page):
    """Force page MediaBox + CropBox to exact A4 dimensions."""
    page.mediabox = RectangleObject([0, 0, A4_W, A4_H])
    page.cropbox  = RectangleObject([0, 0, A4_W, A4_H])
    return page

COVER = '/home/z/my-project/scripts/cover.pdf'
BODY  = '/home/z/my-project/scripts/body.pdf'
OUT   = '/home/z/my-project/download/Global_Earning_Pages_Refined_Architecture_v2.pdf'

writer = PdfWriter()
cover_page = PdfReader(COVER).pages[0]
writer.add_page(force_a4(cover_page))
for page in PdfReader(BODY).pages:
    writer.add_page(force_a4(page))

writer.add_metadata({
    '/Title':   'Global Earning Pages — Refined Architecture v2.0',
    '/Author':  'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Technical architecture refinement addressing six open issues in the platform pivot',
})

with open(OUT, 'wb') as f:
    writer.write(f)

import os
size_kb = os.path.getsize(OUT) / 1024
print(f'Final PDF: {OUT}')
print(f'Pages: {len(writer.pages)}')
print(f'Size: {size_kb:.1f} KB')
