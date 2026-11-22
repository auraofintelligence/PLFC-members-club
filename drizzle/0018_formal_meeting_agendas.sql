ALTER TABLE meeting_register ADD COLUMN agenda_kind TEXT NOT NULL DEFAULT 'committee'
  CHECK (agenda_kind IN ('committee','general','agm','special','informal'));

-- The Secretary identified this particular gathering as a hotel catch-up.
UPDATE meeting_register SET agenda_kind='informal',
  title=CASE WHEN title='Club meeting at Point Lookout Hotel' THEN 'Informal catch-up with Point Lookout Hotel' ELSE title END
WHERE id='hotel-meeting-2026-11-22'
  AND NOT EXISTS (SELECT 1 FROM meeting_notes WHERE id=meeting_register.id AND status='approved');

-- Existing topic lists and reviewed reminder snapshots remain intact.
ALTER TABLE meeting_agendas ADD COLUMN formal_json TEXT CHECK(formal_json IS NULL OR json_valid(formal_json));
