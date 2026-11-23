-- Audit trail for shared Social Studio pattern and day-plan settings.
-- This table is also created idempotently by the authenticated Worker endpoint;
-- Cloudflare Git deployments do not automatically apply D1 migrations.
CREATE TABLE IF NOT EXISTS committee_social_campaign_history (
  version INTEGER PRIMARY KEY CHECK(version>0),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_office TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  changes_json TEXT NOT NULL CHECK(json_valid(changes_json)),
  settings_json TEXT NOT NULL CHECK(json_valid(settings_json))
);
