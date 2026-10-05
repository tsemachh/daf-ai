let ready = false;
export async function ensure(db) {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS lab_votes (
    page TEXT NOT NULL, vid TEXT NOT NULL, choice TEXT NOT NULL,
    at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')), PRIMARY KEY (page, vid))`).run();
  ready = true;
}
