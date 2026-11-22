-- This catch-up did not take place. Remove only the unused seeded record and
-- its reminders. Preserve any other club records if they have since appeared.
DELETE FROM meeting_reminders WHERE meeting_id='hotel-meeting-2026-11-22';
DELETE FROM meeting_register
WHERE id='hotel-meeting-2026-11-22'
  AND NOT EXISTS(SELECT 1 FROM meeting_notes WHERE id=meeting_register.id)
  AND NOT EXISTS(SELECT 1 FROM meeting_agendas WHERE meeting_id=meeting_register.id)
  AND NOT EXISTS(SELECT 1 FROM member_minutes WHERE meeting_id=meeting_register.id)
  AND NOT EXISTS(SELECT 1 FROM partner_handoffs WHERE meeting_id=meeting_register.id)
  AND NOT EXISTS(SELECT 1 FROM operating_authorities WHERE meeting_id=meeting_register.id)
  AND NOT EXISTS(SELECT 1 FROM officer_action_owners WHERE meeting_id=meeting_register.id)
  AND NOT EXISTS(SELECT 1 FROM agm_job_plans WHERE meeting_id=meeting_register.id)
  AND NOT EXISTS(SELECT 1 FROM agm_job_state WHERE meeting_id=meeting_register.id);
