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
- Never Roman/Greek coins with emperor portraits or standing deity figures, not even faint in the background (NotebookLM adds them to money sugyot — the prompt now asks for a plain parchment background with no coins).
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
Tsemach, 2026-11-01. He gives rules, not item-by-item answers. Don't send him per-item questions; apply these.
- Wrong-way arrow inside the drawing: mirror the arrow in the image yourself (flip just the arrow region). If the slide is too complex to do cleanly, drop the slide.
- Rabbi who is not a party in the sugya: erase the figure from the image and keep the rest of the slide.
- Content points (wording vs the Gemara, who said what, a missing qualifier, a wrong icon such as a calf for a lamb or a wheel for an עגלה ערופה): decide by our daf page. If the page is clear, fix the text or icon. If it stays unclear, drop the slide. Don't ask.
- Small things: fix silently and don't report them. This covers made-up letters on coins or decorations (erase), duplicated items in summary slides (remove), a patched line in a slightly different font, and Gemara quotes without nikud (fine).


## Placement (Tsemach, 2026-11-01)
Slides are a teacher aid, not part of daily learning: no per-sugya button. One "📊 מצגת הדף" button in the page header opens the whole deck; the עזרים page lists one card per daf under "מצגות למלמדים". Finish Bechorot so the set is complete; don't start other tractates unless asked.
