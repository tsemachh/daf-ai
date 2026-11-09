"""Print the NotebookLM slide-deck prompt for one daf (paste into "תיאור המצגת").
usage: python3 tools/slides_prompt.py <slug> <daf> [--js]   (--js: the makeDeck(...) line for tools/nlm_helpers.js)"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
slug, daf = sys.argv[1], sys.argv[2]
d = json.load(open(os.path.join(ROOT, "data", slug, f"{daf}.json"), encoding="utf8"))
rows = []
for i, s in enumerate(d["sections"], 1):
    am = re.sub(r"\s*·.*", "", s.get("amud", "")).strip()
    rows.append(f"סוגיה {i}: {re.sub('<[^>]+>', '', s['title'])} ({am})")
if "--js" in sys.argv:   # sources: Sefaria pages are titled "<Name> 5a | …", our pages "<מסכת> ה׳ · …"
    sef = {"arachin": "Arakhin", "temurah": "Temurah", "keritot": "Keritot", "meilah": "Meilah", "kinnim": "Kinnim", "tamid": "Tamid",
           "middot": "Middot", "niddah": "Niddah", "berachot": "Berakhot", "sukkah": "Sukkah", "bechorot": "Bekhorot"}[slug]
    j = lambda x: json.dumps(x, ensure_ascii=False)
    print(f"await makeDeck({j([f'{sef} {daf}a |', f'{sef} {daf}b |', d.get('title', '') + ' ·'])}, {j(d.get('title', ''))}, {j([r.split(': ', 1)[1] for r in rows])}, true)")
    sys.exit()
print(f"""מצגת למלמד על {d.get('title', '')} — רק לפי שלושת המקורות שנבחרו (הגמרא בספריא, עמוד א ו־ב, ודף החזרה שלנו).
עקוב בדיוק אחרי רשימת הסוגיות של הדף שלנו, באותו סדר ובאותם שמות:
{chr(10).join(rows)}
לכל סוגיה 1–2 שקפים. כותרת כל שקף: "סוגיה N: שם". בראש השקף ציטוט קצר מהגמרא, ומתחתיו הסבר בעברית פשוטה.
שמות החכמים בדיוק כמו בגמרא. שום דבר מחוץ לגמרא, רש״י והדף שלנו. בלי טבלאות עמוסות טקסט. שקף סיכום אחד בסוף.
תרשימים זורמים מימין לשמאל: מתחילים בימין, החצים מימין לשמאל, מספור השלבים מימין לשמאל.
איורים: תרשימים, חצים, אייקונים וטקסט. לעולם לא דמויות לא לבושות או ציורי אנטומיה. אנשים רק בלבוש צנוע.
חכם מצויר רק כשהוא צד בסוגיה ושמו כתוב לידו — כרב: טלית או כיפה/מצנפת, זקן, לבוש של תלמיד חכם. בלי רבנים דקורטיביים.
רקע: קלף חלק ונקי. בלי מטבעות בכלל, בלי פסלים, בלי דיוקנאות ובלי דמויות רומיות או יווניות — גם לא ברקע.
סוגיות צניעות או איברי גוף: שורת טקסט עניינית אחת, בלי איור.
בדוק שכל דין משויך לחלק הנכון במשנה ולחכם הנכון, בדיוק כמו בדף שלנו.""")
