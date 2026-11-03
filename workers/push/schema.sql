-- Daily check-in pushes (D1 database lunara-push), shared by the Pages Functions in
-- app/pages/functions/api/push (write) and the cron sender in src/index.js (read).
-- Apply: npx wrangler d1 execute lunara-push --remote --file schema.sql
--
-- One row per device. No push encryption keys (pushes carry no payload) and nothing
-- about the user's cycle: only when, in their own clock, they want to be nudged.
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  local_time TEXT NOT NULL,              -- HH:MM chosen by the user
  time_zone TEXT NOT NULL,               -- IANA zone, so the time follows DST
  next_at INTEGER NOT NULL,              -- Unix ms of the next send
  failures INTEGER NOT NULL DEFAULT 0,   -- consecutive failed sends; removed after 5
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS push_subs_next_at ON push_subs (next_at);
