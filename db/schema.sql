-- D1 database: daf-ai-feedback  (binding name: DB)
CREATE TABLE IF NOT EXISTS feedback (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  token         TEXT    NOT NULL,              -- secret for the author's tracking link
  page          TEXT    NOT NULL,              -- e.g. bechorot/9
  section       TEXT    NOT NULL DEFAULT '',   -- e.g. s5
  section_title TEXT    NOT NULL DEFAULT '',
  kind          TEXT    NOT NULL,              -- fix | missing | feature
  text          TEXT    NOT NULL,
  name          TEXT    NOT NULL DEFAULT '',
  email         TEXT    NOT NULL DEFAULT '',   -- optional; cleared after notification
  notify        INTEGER NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'new',-- new | fixed | feature | rejected | needs-info | in-progress
  reply         TEXT    NOT NULL DEFAULT '',   -- public answer (Hebrew)
  commit_sha    TEXT    NOT NULL DEFAULT '',
  notified_at   TEXT,
  ip_hash       TEXT    NOT NULL DEFAULT '',
  public        INTEGER NOT NULL DEFAULT 0,    -- author allowed showing the text on /notes/ (no name/email)
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_page   ON feedback(page, status);
CREATE INDEX IF NOT EXISTS idx_feedback_ip     ON feedback(ip_hash, created_at);
