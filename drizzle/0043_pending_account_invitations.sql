ALTER TABLE club_invites ADD COLUMN invite_ref TEXT;
ALTER TABLE club_invites ADD COLUMN invite_copy TEXT;
CREATE UNIQUE INDEX club_invites_private_ref ON club_invites(invite_ref) WHERE invite_ref IS NOT NULL;

UPDATE club_invites SET invite_ref=lower(hex(randomblob(16)))
WHERE login IS NOT NULL AND reset_id IS NULL AND role IN ('member','committee','treasurer')
  AND used_by IS NULL AND expires>CAST(strftime('%s','now') AS INTEGER);
CREATE TRIGGER club_invite_private_ref AFTER INSERT ON club_invites
WHEN NEW.login IS NOT NULL AND NEW.reset_id IS NULL AND NEW.role IN ('member','committee','treasurer')
BEGIN
  UPDATE club_invites SET invite_ref=lower(hex(randomblob(16))) WHERE digest=NEW.digest;
END;
CREATE TRIGGER club_invite_clear_copy AFTER UPDATE OF used_by ON club_invites
WHEN NEW.used_by IS NOT NULL AND OLD.invite_copy IS NOT NULL
BEGIN
  UPDATE club_invites SET invite_copy=NULL WHERE digest=NEW.digest;
END;
CREATE TRIGGER club_invite_relink AFTER UPDATE OF digest ON club_invites
WHEN OLD.digest<>NEW.digest
BEGIN
  UPDATE membership_applications SET invite_digest=NEW.digest
    WHERE invite_digest=OLD.digest AND invite_login=NEW.login AND status='invited' AND account_id IS NULL;
  UPDATE officer_price_recipients SET recipient='invite:'||NEW.digest WHERE recipient='invite:'||OLD.digest;
END;
