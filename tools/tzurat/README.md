# צורת הדף — where each sugya sits on the printed page

Pages: the Nehardea edition (הוצאת ספרים ח. וגשל, credited with a link on every page view) as served by
daf-yomi.com — text PDFs, one per amud. They cannot be fetched from the container; fetch them in the
browser and stage them (Bechorot: page id 4889 + 2·(daf−2) + {a:0, b:1} under `/Data/UploadedFiles/DY_Page/<id>.pdf`).

Per amud:

    python3 tools/tzurat/align_pdf.py <slug> <daf> <a|b> <page.pdf> <out-prefix>   # PDF text → words with segment numbers
    python3 tools/tzurat/publish.py  <slug> <daf> <a|b> <out-prefix>.png <out-prefix>.json   # → site/static/tz-… + data json "tzurat"

`align.py` is the older OCR route (tesseract) for scanned pages; `publish.py … vilna` sets the HebrewBooks credit for those.
Sections whose text is on the previous daf get no rectangles on this one — expected.
