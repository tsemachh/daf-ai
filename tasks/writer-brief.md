# Writer brief — one daf page (given to the Sonnet writer subagent)

You write ONE Hebrew review page (דף חזרה) for a Daf Yomi daf. Readers have learned the daf and review it.
Your ONLY input is `pack.md` (segment-aligned: `[<daf><amud>.<seg>]` G=Gemara, S=Steinsaltz, R=Rashi,
M=auto-detected moves; then the next daf's opening, the previous daf's last sugya, and a Sinai summary).
Read nothing else. The Gemara (G) is the source of truth; S and R are for understanding; the Sinai
summary is only a cross-check of the flow — paraphrase, never copy any commentary.

## Output: the page JSON (UTF-8). Do NOT write `srctext` or glossary entries — scripts add them.
```jsonc
{"key":"berachot2","tractate":"Berakhot","slug":"berachot","tractate_he":"ברכות","daf":2,
 "title":"ברכות ב׳","eyebrow":"הדף היומי · מסכת ברכות · פרק ראשון (מאימתי)","thesis":"<one line: the daf's main ideas>",
 "meta":["<Hebrew date given to you>","עמודים א–ב","~25 דקות לימוד"],   // ~25 for ~40 steps, ~35 for ~70
 "nav":[{"id":"s1","amud":"עמוד א","title":"<same as the section title>"}],
 "storyline":"<one paragraph of prose: how the daf moves from sugya to sugya>",
 "sections":[{"id":"s1","kind":"sugya","amud":"עמוד א · משנה","ref":"Berakhot.2a.1-4","title":"…",
   "flow":"<בקצרה 1–3 sentences: the question, why it arises, how it ends>",
   "steps":[{"seg":"2a.2","tag":"קושיה","type":"q","hideable":true,"p":0,"body":"<html>","short":"<the move in ≤12 words>"}],
   "unlock"?:"<optional, 1–2 sentences: the case or concept the sugya assumes the learner already knows>",
   "post":"<optional think box, EXACTLY this HTML — question visible, answer collapsed: <div class=\"think\"><div class=\"lbl\">חשבו לפני שממשיכים</div><p>QUESTION</p><button class=\"reveal\" type=\"button\">הצג תשובה</button><div class=\"ans\" hidden=\"\">ANSWER from the Gemara</div></div>>",
   "table"?:{…},"decide"?:{…},"chain"?:{…},"calc"?:{…},"seq"?:{…},
   "skip"?:["2a.5"], "ends_next"?:true, "cont"?:"prev"|"next"}],
 "quiz":[{"s":"s2","q":"…","o":["…","…","…","…"],"a":1,"e":"…","w":{"0":"…"}}],
 "card":{"topics":"<6–14 key terms joined by ' · '>","date":"<short Hebrew date>","stats_html":["<span>N סוגיות</span>","<span>8 שאלות חזרה</span>"]}}
```
Ids: `s1`, `s2`, … in order. `kind` is "sugya" for every section. `hideable`: true on q/a/c steps, false on "" steps.

## Structure
- One section per sugya; `ref` = its exact segment range (`Berakhot.2a.5-2b.3`, cross-daf `Berakhot.2b.18-3a.2`).
  Every segment of both amudim is in exactly one section.
- An answer that brings a source (״כיוצא בה שמעתי, דתנן…״) and the story or discussion that continues it (״ויתיב רב…״)
  until the original question is resolved is ONE sugya, with `stages` — never split it where the source begins (Bechorot 37).
- `seg` on EVERY step = the segment it explains (`2a.7`). A segment with M: hints needs at least one step.
- `type`: q = question / challenge / request for a source / proof offered against; a = answer / rejection;
  c = conclusion / תיובתא / שמע מינה / ruling; "" = statement, Mishnah, background. In חברותא mode the
  site hides a/c steps and shows q as prompts — type carefully.
- `p` = index (in the section) of the earlier step this one responds to: objection → the claim it attacks
  (several objections to one claim are siblings); answer/rejection → the objection; proof → the claim;
  conclusion → the statement that falls or stands. איכא דאמרי, ואיבעית אימא, an independent new view → no `p`. "No `p`" means the key is omitted (never `p: 0` on a root).
- `amud` labels: "עמוד א · משנה", "עמוד א · גמרא", "עמוד א–ב" (spans both), "עמוד א · המשך מדף X׳"
  (continues from the previous daf: open with one רקע step recapping where it stands — see the pack's
  "Previous daf" block; set `"cont":"prev"`).
- Sugya running into the next daf: if the rest of the same give-and-take is ≤ ~8 segments (they are in
  the pack), finish it here — extend `ref` across the break, tag those steps "… · דף X", set `"ends_next":true`.
  Only if it is longer: end with one step on where it is heading, say so in `flow`, set `"cont":"next"`.

## Writing rules (all required)
0. **Key to the sugya (`unlock`, optional).** Many sugyot assume the learner already knows a case or concept —
   especially when the Gemara jumps to a new topic (״תנן התם״, a Mishnah from another tractate, a new halachic
   field). Then add 1–2 plain sentences that set up that background so the give-and-take makes sense: what the
   case is, in which area of halacha, and what is at stake. It is NOT a summary of the moves (that is `flow`) and
   not the conclusion. Leave it out when the first step already makes the case clear. Draw it from S/R (Steinsaltz
   often opens a sugya with exactly this) — paraphrased, never copied. When the pack has a Daf Spoiler block, its
   opening question for each topic is a good check that you framed the case right (and a source of application
   cases for the quiz) — never copy its wording. Models:
   - בכורות כב, ״אין לנפלים פתיחת הקבר״: ״פתיחת הקבר״ הוא דין בטומאת מת: אשה שעוברה מת במעיה — משעה שרחמה נפתח
     ללידה, הבית כבר טמא כאילו נולד המת בתוכו, גם אם הוולד עדיין לא יצא. נפל קטן אינו גורם לכך עד שראשו הגיע
     לשיעור ״פיקה״ — ועל השיעור הזה נסובה הסוגיה.
   - בכורות כג, ציר שנפלו לתוכו מים: הסוגיה עוסקת ב״טומאה שבטלה ברוב״: משקים של עם הארץ בחזקת טמאים, ועם הארץ
     נוהג לערב מים בציר הדגים. כל עוד המים הטמאים הם מיעוט — הם בטלים ברוב הציר והציר טהור; אם נוספו מים והם נעשו
     רוב — הציר טמא. לכן השאלה היא כמה מים עם הארץ חשוד לערב, וכמה צריך להוסיף כדי שיהיו רוב.
   It must add what the first step does not already say — never a restatement of the sugya's opening line or of
   Steinsaltz on it, and never the answer. In the first backfill, half the proposed keys failed exactly this test.
   A sugya that opens by quoting a Mishnah printed on the previous daf (״… כו׳״) needs an `unlock` restating that
   Mishnah's case and what each number or time span in it measures — the learner did not see it on this page.
   The same holds for a Gemara section on a later amud that dissects a phrase of a Mishnah given in an earlier
   section (״גמ׳ … אימת?״): restate the Mishnah's rule and what hinges on that phrase — readers jump in by amud.
   Every claim in `unlock` must be stated in S or R — background that "everyone knows" but the sources don't say is
   where errors creep in.
1. **Complete shakla vetarya.** Every move is its OWN step: every question (מיתיבי, ורמינהו, מאי טעמא,
   מנא הני מילי, בשלמא…אלא, והא, ולא?, פשיטא), answer (אלא, הכא במאי עסקינן, לא קשיא, שאני, מהו דתימא…קא משמע לן),
   rejection (דלמא, ממאי), איכא דאמרי / לישנא אחרינא, ראיה (תא שמע, תניא נמי הכי), תיובתא / קשיא / שמע מינה,
   ואיבעית אימא. Never merge two moves; never summarise a chain with "ונדחה". M: lines are hints, not a full list.
2. **Explain, don't transcribe.** Each step says in clear modern Hebrew what is argued and WHY: the
   assumption, the logic, what the questioner thinks and why it fails. Use S and R; credit (רש״י) when
   you use him. Anchor with a SHORT Gemara key-phrase ״<b>…</b>״ (2–8 words, unvocalised). Quotes ≤ 30%
   of step text. Specific tags ("מאי טעמא?", "תא שמע", "תיובתא"), not generic "קושיה/תירוץ" everywhere.
   Never leave a step as a bare quote or "…".
   Every ״…״ on the page opens Steinsaltz for those words, so ״…״ is ONLY for Gemara words: a term from Rashi
   or S (״ממון המוטל בספק״) is written and explained unquoted; a 2-word anchor S leaves unexplained (a bare name
   or place, ״כאילא ביבנה״) is lengthened into the words S does explain. Page references and your own words
   (״בדף כ״ה״, ״כאן״) are never inside ״…״.
3. **Aids only when they clarify, never invented** (most sugyot need none): `table` {"title","cols":["","<שיטה>",…],
   "rows":[["<מקרה>","<תשובה>",…]]} when ≥2 opinions × ≥2 cases, max 2 per daf; `decide` {"title","branches":
   [{"if","then":[…]}]}; `chain` {"title","links":[{"k":"פסוק|דרשה|דין|תוצאה","t"}],"note"?}; `calc`
   {"title","rows":[[label,value,cite?]],"lines":[…]}; `seq` {"title","items":[…]} — each item one card, written "move — answer" (the question or step, then its outcome) or "label: text"; keep each under ~20 words;
   `map` (מפת השיטות) when a sugya layers views — tannaim disputing WHERE/WHY others disagree, amoraim explaining,
   rejecting, ruling, supporting — so the learner sees who answers whom and where it ends: {"title","tiers":[{"tone"?: "t1" (earlier tannaim) | "t2" (later tannaim) | "a" (amoraim),"label":
   "תנאים|אמוראים|המחלוקת היסודית…","nodes":[{"id","name","say":"<their position in ≤20 words>","rejected"?:true}]}],
   "links":[{"from","to":id|[ids],"k":"מבאר|מעמיד|חולק|דוחה|מקשה|הלכה כ|מסייע|מציע"}],"end":"<where it converges>"};
   3–8 nodes, links point from the later speaker to the earlier view. Every cell is stated
   by the Gemara; else ״לא נאמר״ or leave the aid out.
   A long sugya (≥12 steps) that tries several derivations, each refuted by a פירכא, gets a `table` of the
   attempts (what is learned from what · the פירכא · result) so the learner can track it.
   The same for a run of ≥4 ״תא שמע״ proofs each deflected (one row per proof: source · what it seems to show ·
   the answer) — reader note, Bechorot 42.
4. **Quiz: exactly 8**, testing understanding: 4 reasoning (why the ruling / why a proof failed / what the
   הו״א was), 2 principle or distinction, 2 application to a new case. At most 1 "who said". Never a recall stem (״מה הקשה אביי?״, ״מה מקור שיטתו?״) — ask
   why the objection works, what it shows, or what changes in a new case; the learner should be able to answer from
   understanding, not memory (reader note). Stem opens
   with the case so it reads alone days later ("בקריאת שמע של ערבית — …"); never "הנ״ל" or a bare name.
   Distractors are real misconceptions (rejected proof, other side, הו״א, neighbouring sugya). Options of
   similar length and form; `a` any index; `s` = section id; `e` explains from the Gemara; `w` one line per wrong option.
   1–3 think boxes per daf in `post`, not reused as quiz items.
5. **Content boundary:** passages about nazi symbols get one neutral step "קטע זה לא הורחב כאן — ראוי
   ללמדו בגמרא" and their segments go in `skip`. Everything else — including legal-monetary and intimate
   halachic topics — is presented fully and neutrally, as the Gemara does.
6. Hebrew content, no niqqud, nothing that G/S/R do not support.
   Sages by full name as the glossary keys them: ״רבי יוחנן״, not ״ר׳ יוחנן״ (the abbreviation is not linked), and the
   full form when a short one names someone else (״רבי יוסי בר חנינא״, not ״רבי יוסי״).
   ״במערבא״ / ״אמרי במערבא״ = בארץ ישראל — write ״בארץ ישראל״, never ״במערב״ (reader note, Bechorot 38).
   Exception: a word a first reading gets wrong (פסח ועור = צולע ועיוור, not Pesach) gets niqqud once, in
   `<span class="nogl">…</span>`; also wrap in `nogl` a word the glossary would mislink (״בציר״ ≠ ציר).
7. **`short` on every step** (the תמצית reading level shows it instead of `body`): the move in one line, ≤12 words,
   plain text (no HTML, no quote marks), standing on its own — who says what and why in a nutshell, e.g.
   ״רב: רק בבכור תם — בעל מום אינו קדוש לכך״, ״קושיה: אם כן, למה צריך פסוק?״, ״מסקנה: הלכה כרשב״ג״.
   Never a bare tag ("קושיה"), never more than the body says.
8. **`stages` on every sugya with 10+ steps** — its milestones, shown as folding headers (״שלב 2 מתוך 4״) with the
   stage's question and where it lands: `"stages":[{"at":<index of the stage's first step>,"q":"<question>","a":"<answer>"}]`.
   2–5 stages, the first `at` 0, increasing, each ≥3 steps; break where the sugya turns to a NEW sub-question (a source
   and its derivation · an objection chain to its answer · ״ולמה…?״ · another opinion · a new case), never between a
   question and its answer. `q` ≤10 words ending in ״?״ (״האם ״לא יגאל״ מופנה?״); `a` ≤18 words, what the stage
   concludes — say so when it ends in תיובתא / קשיא / תיקו. A run of parallel בעיות (״ואם תמצא לומר…״) that all end in
   one תיקו is ONE stage, not split by topic (reader note, Bechorot 38).
9. **Mishnah steps are explained too** (reader note, Bechorot 26): every clause gets its reason or what it
   means in practice (from S/R), and every step names who acts and on what — never a bare restatement or a
   sentence that leans on the previous step ("שוב מחדש", "עליהן") for its subject.
10. **Aids stay readable on a phone** (reader notes, Bechorot 19, 32): a `table`'s row labels are ≤6 words and column
   heads ≤3 (the first column must not crowd the others); a `seq` has ≤8 cards. A stage `q` asks the stage's real
   question in the Gemara's terms (״מה המקור שאין פודים על מום עובר?״), not a generic topic name.

11. **״לימא כתנאי״ gets a `kt` box** (reader note, Bechorot 39): whenever the Gemara asks whether an amoraic dispute
   or an open question is a tannaitic dispute (״לימא כתנאי״, ״כתנאי״, ״מאי לאו בהא קמיפלגי״ on a baraita), the section gets
   `"kt":{"q":"<the question/dispute being tied to tannaim, in one sentence>","sides":[{"label":"<amora or צד א>","say":"…"},
   {"label":"…","say":"…"}],"src":"<מחלוקת בברייתא | במשנה>","tannaim":[{"who":"<full name>","say":"<his view>"}],
   "rounds":[{"k":"הצעה|דחייה|העמדה|מסקנה","t":"<who is mapped to which side, or why it fails>","res":"נדחה|מסקנה"?}]}` —
   shown open above the steps, so the learner sees what is tied to what and where each round lands. Every line is
   stated by G (or credited to S/R). When a section has `kt`, its `flow` does not retell the rounds: one or two sentences — what
   the sugya is about and where it ends up.
12. **Measures to scale (`scale`)** (reader note, Bechorot 39): when the sugya compares sizes or measures (שיעורים,
   אמות, טפחים, אצבעות, כזית/כביצה, distances) between opinions or objects, add
   `"scale":{"title","groups":[{"label","unit","min"?,"bars":[{"name","v":<number>,"note"?}],"note"?}]}` — one group per
   comparison, values in one unit, `min` only to zoom in on small differences. Every number stated by G or credited
   to S/R; never a modern conversion (cm, grams).
## Work order (keeps tokens low)
Write sugya by sugya into the output file (re-write the file after each sugya, so a stop loses nothing).
Then ONE re-read against pack.md: every segment covered, every move its own step, `p` and `type` right,
every step has `seg`. Fix and stop. Reply with: sections, steps, and one line per segment you were unsure of.
