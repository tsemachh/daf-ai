# Brief v2 — הלכות תשובה פרק א, "לימוד רמב״ם": every halacha taught clause by clause

The owner's rule: Rambam is learned differently from Gemara. Each halacha is taught on its own; the Rambam's text is
split into short clauses, and each clause is followed directly by its explanation, in order, so the girl reads
"text → explanation → text → explanation" and every word of the Rambam is covered. Long halachot may be split into
sub-parts (a heading inside the halacha).

Inputs: /home/claude/rambam/teshuva1/halachot.json (the 4 halachot, verbatim with nikud — the ONLY text you may put in
"t"), pack.md (R/S/K/L sources; S = Steinsaltz, copyrighted: paraphrase only, credit), and the current page
/home/claude/rambam/teshuva1/page.json (good explanations, think boxes, aids and a strong quiz — REUSE them; re-cut
them to the clause where they belong; keep the quiz, adjusting its "s" to the new halacha ids).
Reader: 9th-grade girl, Hebrew only. Plain, warm, precise Hebrew; short lines; define each term once.

Write /home/claude/rambam/teshuva1/page2.json:
{"key":"teshuva1","work":"teshuva","perek":1,"title":"הלכות תשובה — פרק א׳","eyebrow":"רמב״ם · ספר המדע · הלכות תשובה",
 "thesis":"…","meta":["פרק א׳ · 4 הלכות","~25 דקות"],
 "opening":{"t":"הלכות תשובה. מצות עשה אחת, והיא שישוב החוטא מחטאו לפני ה' ויתודה. וביאור מצוה זו ועיקרים הנגררים עמה בגללה בפרקים אלו.","parts":[ …same part shape… ]},
 "storyline":"<how the chapter is built, 3–4 short lines>",
 "halachot":[{"id":"h1","n":1,"title":"<short title>","gist":"<the halacha in one sentence, before learning it>",
   "groups":[{"title"?:"<sub-part heading, only when the halacha changes topic>","parts":[
      {"t":"<exact consecutive slice of the halacha text, with nikud, 3–25 words — a meaningful clause>",
       "x":"<explanation HTML: what it means, why (from S/K/L, credited), what it adds. 1–5 short lines, '<br>' between lines. No quote of the clause again.>",
       "w"?:[["<hard word as in t, no nikud>","<simple meaning>"]],
       "ask"?:{"q":"<a short check-yourself question on this clause>","a":"<answer>"},
       "aid"?:{"seq"|"table"|"chain":{…same shape as in page.json…}} }]}],
   "sum":"<what we learned in this halacha, 1–2 lines>",
   "think"?:{"q":"…","a":"…"} }],
 "quiz":[…as in page.json, "s" = "h1".."h4"…],
 "card":{…}, "links":[…], "footer":"…"}

HARD RULES
1. For each halacha, the "t" values of all its parts, joined with single spaces, must equal the halacha text in
   halachot.json exactly (same words, same order, same nikud and punctuation; whitespace normalised). Same for
   "opening" against its "t". Check this with a script before you finish; fix until it passes for all 4 + opening.
2. Clause size: split where the meaning turns (a list item, a condition, a reason, a verse). Lists (e.g. the forms of
   viduy, the types of offerings) may be one part per item when each needs explaining; otherwise keep 2–3 items together.
3. "x" never repeats the clause; it explains it. Use S/K/L; credit (שטיינזלץ / כסף משנה / לחם משנה) when leaning on one.
   If nobody explains something, say ״הרמב״ם אינו מסביר כאן״. Never invent reasons.
4. ask: 1 per halacha at most 3; short, thinking not recall. think: at most 2 in the chapter (reuse the best existing).
5. aids: keep the 3 from page.json (chain on h1, seq for the viduy formula, table for the levels of kappara), each on
   the part where it is needed.
6. Plain text in "t" (no HTML). HTML allowed in "x", "sum", "think", quiz.
Reply: number of parts per halacha, that the join check passed, and anything you were unsure of.
