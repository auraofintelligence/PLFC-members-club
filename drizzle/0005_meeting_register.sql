CREATE TABLE meeting_register (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
  location TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL
);
INSERT INTO meeting_register VALUES ('hotel-meeting-2026-11-22','Club meeting at Point Lookout Hotel','2026-11-22','10:00','Point Lookout Hotel, Point Lookout, Queensland','club','2026-11-20T00:00:00Z');
CREATE TABLE member_minutes (
  meeting_id TEXT PRIMARY KEY REFERENCES meeting_register(id), version INTEGER NOT NULL,
  body TEXT NOT NULL, released_at TEXT NOT NULL, released_by TEXT NOT NULL, mutation TEXT NOT NULL
);
