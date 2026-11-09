# NotebookLM teacher decks — runbook (one chunk)

Content and review rules: `tasks/slides-brief.md` (read it first; it wins over anything here).
Runs on Tsemach's Mac (Claude in Chrome + device bridge). The Mac stays awake on the charger
(LaunchAgent `dev.tsemach.awake-on-charger` = `caffeinate -s`); with the lid closed and no external display it still sleeps.

## 0. What to make
`python3 tools/slides_queue.py 6` → next dafim without a deck, in daf-yomi order (Arachin first, then Temurah …).
One chunk = as many decks as the NotebookLM quota allows (about 6 a day on Tsemach's Pro plan; the
deck dialog shows "שימוש ב-AI": stop when the used part + the estimate would pass the end of the bar).

## 1. Generate (Chrome, NotebookLM)
- One notebook per masechet, holding Sefaria `<Name>.<daf>a/b?lang=he` + `https://daf.tsemach.dev/<slug>/<daf>/` for every daf.
  ערכין: notebook "מסכת ערכין" — https://notebook.google.com/notebook/56c90b56-c348-4ae4-bc1c-e4de1cbd3fbe
  (new masechet: "יצירת נוטבוק" → rename → "הוספת מקורות" → "אתרים" → paste all URLs space-separated → "הוספה").
- Paste `tools/nlm_helpers.js` into the tab once (javascript_tool).
- Per daf: paste the line from `python3 tools/slides_prompt.py arachin 5 --js` — `await makeDeck([...3 sources], title, [sugya rows], true)`.
  It opens Studio → "מצגת" ("התאמה אישית של המצגת": מצגת מפורטת, עברית, ברירת מחדל), picks exactly the 3 sources,
  fills the prompt and presses "ליצירה"; it returns the picked sources — check them. Wait ~2s between decks.
  Several decks generate at once; each takes ~10 minutes.

## 2. Download
- A ready deck appears in Studio as an English title ("Tractate Arakhin 2 …", "3 מקורות"); hover it → ⋮ (left end of the row)
  → "הורדת מסמך PDF (.pdf)". It lands in ~/Downloads as `<Title_with_underscores>.pdf` (~10 MB).
- Stage it into the container (`device_stage_files` with the ~/Downloads path) and work on the copy there.
- Quota: each deck is roughly 7% of the "שימוש ב-AI" bar (Pro), so about a dozen a day, regenerations included.

## 3. Review (every slide — see the brief)
Typical misses seen on the first Arachin run: a ריבוי attached to the wrong word of the Mishnah (check every
arrow/row against our page), duplicated labels, and Roman coins with emperor portraits or idol figures in the
background — the prompt now forbids coins; if they still appear, regenerate or drop those slides.
`pdftoppm -r 80 -png deck.pdf /tmp/s` and read each slide image; zoom text blocks. Apply the brief's rules
(fix what is certain, drop what isn't; small things silently). Note the slide → sugya map from the "סוגיה N" titles.

## 4. Publish
`python3 tools/slides_publish.py <slug> <daf> deck.pdf "intro:1 s1:2-3 … end:N" [--drop 7,9] [--replace 2=fixed.png]`
(map keys are the page's real section ids, in order — after merges they may start at s2; "סוגיה N" in the deck = the N-th section.
A slide fixed by hand — e.g. a decorative rabbi erased with `cv2.inpaint` on the `pdfimages` PNG — goes in with `--replace`.)
then `python3 build.py`, commit (data + site/static/sl-*.webp) and push. Remove nothing else.
