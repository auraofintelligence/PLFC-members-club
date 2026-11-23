CREATE TABLE committee_social_campaign_settings (
  id INTEGER PRIMARY KEY CHECK(id=1),
  version INTEGER NOT NULL CHECK(version>0),
  settings_json TEXT NOT NULL CHECK(json_valid(settings_json)),
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL REFERENCES club_accounts(id)
);
