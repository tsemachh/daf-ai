"""Daf Yomi for a date — computed locally (no network).

Cycle 14 began 2020-01-05 with Berakhot 2; each cycle is 2711 days. Masechtot are listed with their
last daf (every masechet starts at daf 2). Kinnim, Tamid and Middot follow Me'ilah in the Vilna
pagination the cycle uses (Me'ilah 22 → Kinnim 23–25 → Tamid 26–33 → Middot 34–37), so they are
listed as their own entries with those page ranges.

usage: python tools/dafyomi.py [YYYY-MM-DD ...]      (default: today, Asia/Jerusalem)
"""
import datetime as dt, sys

# (Hebrew, Sefaria name, slug, first daf, last daf)
MASECHTOT = [
    ("ברכות", "Berakhot", "berachot", 2, 64), ("שבת", "Shabbat", "shabbat", 2, 157),
    ("עירובין", "Eruvin", "eruvin", 2, 105), ("פסחים", "Pesachim", "pesachim", 2, 121),
    ("שקלים", "Shekalim", "shekalim", 2, 22), ("יומא", "Yoma", "yoma", 2, 88),
    ("סוכה", "Sukkah", "sukkah", 2, 56), ("ביצה", "Beitzah", "beitzah", 2, 40),
    ("ראש השנה", "Rosh Hashanah", "rosh-hashanah", 2, 35), ("תענית", "Taanit", "taanit", 2, 31),
    ("מגילה", "Megillah", "megillah", 2, 32), ("מועד קטן", "Moed Katan", "moed-katan", 2, 29),
    ("חגיגה", "Chagigah", "chagigah", 2, 27), ("יבמות", "Yevamot", "yevamot", 2, 122),
    ("כתובות", "Ketubot", "ketubot", 2, 112), ("נדרים", "Nedarim", "nedarim", 2, 91),
    ("נזיר", "Nazir", "nazir", 2, 66), ("סוטה", "Sotah", "sotah", 2, 49),
    ("גיטין", "Gittin", "gittin", 2, 90), ("קידושין", "Kiddushin", "kiddushin", 2, 82),
    ("בבא קמא", "Bava Kamma", "bava-kamma", 2, 119), ("בבא מציעא", "Bava Metzia", "bava-metzia", 2, 119),
    ("בבא בתרא", "Bava Batra", "bava-batra", 2, 176), ("סנהדרין", "Sanhedrin", "sanhedrin", 2, 113),
    ("מכות", "Makkot", "makkot", 2, 24), ("שבועות", "Shevuot", "shevuot", 2, 49),
    ("עבודה זרה", "Avodah Zarah", "avodah-zarah", 2, 76), ("הוריות", "Horayot", "horayot", 2, 14),
    ("זבחים", "Zevachim", "zevachim", 2, 120), ("מנחות", "Menachot", "menachot", 2, 110),
    ("חולין", "Chullin", "chullin", 2, 142), ("בכורות", "Bekhorot", "bechorot", 2, 61),
    ("ערכין", "Arakhin", "arachin", 2, 34), ("תמורה", "Temurah", "temurah", 2, 34),
    ("כריתות", "Keritot", "keritot", 2, 28), ("מעילה", "Meilah", "meilah", 2, 22),
    ("קינים", "Kinnim", "kinnim", 23, 25), ("תמיד", "Tamid", "tamid", 26, 33),
    ("מדות", "Middot", "middot", 34, 37), ("נדה", "Niddah", "niddah", 2, 73),
]
CYCLE_START = dt.date(2020, 1, 5)
CYCLE_LEN = sum(last - first + 1 for *_, first, last in MASECHTOT)
assert CYCLE_LEN == 2711, CYCLE_LEN


def daf_for(day: dt.date):
    """Return (hebrew, sefaria_name, slug, daf) for a date."""
    n = (day - CYCLE_START).days % CYCLE_LEN
    for he, sef, slug, first, last in MASECHTOT:
        span = last - first + 1
        if n < span:
            return he, sef, slug, first + n
        n -= span


if __name__ == "__main__":
    try:
        from zoneinfo import ZoneInfo
        today = dt.datetime.now(ZoneInfo("Asia/Jerusalem")).date()
    except Exception:
        today = dt.date.today()
    days = [dt.date.fromisoformat(a) for a in sys.argv[1:]] or [today]
    for d in days:
        he, sef, slug, daf = daf_for(d)
        print(f"{d}\t{he} {daf}\t{sef}.{daf}\t{slug}/{daf}")
