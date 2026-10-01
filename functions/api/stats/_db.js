// Anonymous daily-visitor counter (D1 binding DB). A visitor is a random id kept in the reader's
// browser; no IP, no cookie, no personal data. One row per (day, visitor).
let ready = false;
export async function ensure(db) {
  if (ready) return;
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS visits (
       day TEXT NOT NULL, vid TEXT NOT NULL, country TEXT NOT NULL DEFAULT '',
       views INTEGER NOT NULL DEFAULT 1, first_path TEXT NOT NULL DEFAULT '',
       PRIMARY KEY (day, vid))`
  ).run();
  ready = true;
}
export function today(offsetDays = 0) {
  const d = new Date(Date.now() - offsetDays * 864e5);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" }); // YYYY-MM-DD
}
