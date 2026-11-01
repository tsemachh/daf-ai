# NotebookLM slide decks — brief

Sources per deck: Sefaria <daf>a, <daf>b + daf.tsemach.dev/<slug>/<daf>/ (only these three).
Prompt: follow our page's sugya list exactly ("סוגיה N: שם" + עמוד א/ב), 1–2 slides per sugya,
short Gemara quote on top + plain Hebrew explanation, exact names of sages, nothing outside Gemara/Rashi/our page,
no text-heavy tables, one summary slide.

Diagrams flow RTL: start on the right, arrows point right→left, step numbering right→left.

Imagery (Tsemach, 2026-10-30): diagrams, arrows, icons and text only.
- Never unclothed figures (no Vitruvian man, no anatomy drawings of people).
- People are allowed when clothed and modest: modest women, or cartoon-style women; Moshe and Aharon allowed (respectful, modest dress).
- Coins are fine; when drawing coins prefer Israeli-style coins (e.g. ancient Jewish shekel motifs).
- Modesty / body-organ sugyot: one factual text line, no illustration.
- A modest woman may be drawn when the sugya is about a woman; when the sugya is about a baby (נפלים, יצא ראשו, פטר רחם, פדיון הבן) — the baby is the focus; a modest mother may appear only when she is relevant to the point.

Review every slide before publishing (tools/slides_publish.py --drop): wrong attribution, garbled text,
or any imagery above → fix in NotebookLM's per-slide edit, or drop.

- Faint background figures (Vitruvian man, anatomy sketches) in an otherwise good slide: remove the background, keep the slide (Tsemach, 2026-10-31). Unclothed figures in the foreground: clothe them or drop the slide.
- Sages may be drawn (modest, respectful) — draw them as rabbis: tallit/kippah or turban-style head covering, beard, scholarly dress; not as shepherds or generic figures (Tsemach, 2026-10-31).
- Arrow direction in generated images is not critical; RTL arrows can be added in the HTML viewer if needed.
- (Tsemach, 2026-11-01) Arrow direction DOES matter when it shows an order in time or logic: e.g. ערב יום טוב → לילה → בוקר יום טוב must flow right→left with heads toward the later step. Wrong-way arrows are errors: fix or flag.
- (Tsemach, 2026-11-01) Draw a rabbi only when that sage is a party in the sugya (named beside the drawing). No generic/decorative rabbis (title slides, 'the learner', 'a person').

## Verification (Tsemach, 2026-11-01)
Invest in verification before publishing. Every slide: zoom each text block and read word by word (typos, repeated words at line wraps, garbled/gibberish labels), check arrows/timelines, imagery rules, and content vs our page.
Fix only what is certain. Everything not certain goes to the review page (artifact "Slides review") with links; Tsemach decides; his decisions are recorded below as rules.

## Rules learned from review decisions

