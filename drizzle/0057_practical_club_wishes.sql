-- As with the first starter list, the audit trail credits setup, not an officer.
-- A pre-existing wish or a retry never receives another draft or history entry.
CREATE TRIGGER practical_wish_history_0057 AFTER INSERT ON equipment_wishes
WHEN NEW.id LIKE 'b7439c28-0b54-448b-8f52-%'
BEGIN
  INSERT INTO equipment_wish_activity
    (mutation_id,wish_id,version,action,actor_id,receipt,recorded_at)
  VALUES ('starter-wish-' || NEW.id, NEW.id, 1, 'starter_draft', 'clubhouse-setup',
          'starter-wishes-0057-' || NEW.id, NEW.created_at);
  INSERT INTO audit_log (id,actor_id,actor_role,action,entity_id,occurred_at)
  VALUES ('starter-wish-' || NEW.id, 'clubhouse-setup', 'system',
          'equipment_wish_starter_draft', NEW.id, NEW.created_at);
END;

WITH proposals(position,name,purpose) AS (VALUES
  (1, 'Lockable bait freezer for the clubhouse',
   'Seek a chest freezer with labelled bait tubs, a thermometer and a power-loss alarm. Check floor space, key access and running costs with the host venue. Name a volunteer to rotate dated bait and keep it separate from food.'),
  (2, 'Heavy-duty eskies for bait, catch and drinking ice',
   'Start with three clearly labelled iceboxes with drain plugs. Keep bait, retained catch and drinking ice in separate eskies. Check what members can lend first, then quote replacement lids, seals and a trolley for moving them.'),
  (3, 'Ice supply and mobile cool-room hire for events',
   'Ask an island supplier for block and bagged ice prices, holiday delivery windows and backup supplies. Get a separate cool-room hire quote for a flagship event and confirm delivery, power and collection with the venue.'),
  (4, 'Fishwatch signs for reporting suspected illegal fishing',
   'Seek site approval for weatherproof signs with the Fishwatch number 1800 017 116 and a QR link to the official form. Invite Quandamooka review of wording about lawful traditional fishing. Ask people to report observations to Fisheries.' || char(10) || 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/reporting'),
  (5, 'Portable PA system and wireless microphone',
   'Borrow or hire a battery PA with a microphone for a holiday briefing or prize presentation. Try it at a local meet first. Check speech clarity at the back, battery life, venue sound limits and what nearby residents will hear.'),
  (6, 'Event radios, spare batteries and charging dock',
   'Price a small set of handheld radios for check-in, marshals and the first aid point. Trial reception at the venue, label each unit and keep a simple issue-and-return sheet so radios come back charged for the next crew.'),
  (7, 'Boat-launch tractor for club boats and trailers',
   'Explore a shared, leased or sponsored tractor suited to the boats and trailers members actually tow. Ask local operators for advice and compare storage, corrosion, servicing and recovery costs. Confirm approved launch sites, operator training and insurance before use.'),
  (8, 'Surf boat ramp and safer launching access at Point Lookout',
   'Document summer queues and access problems with local boaties and residents. Ask Quandamooka Traditional Owners and Redland City Council to compare a surf ramp with upgrades to existing island launches. Council can take a supported proposal to Maritime Safety Queensland.' || char(10) || 'https://www.msq.qld.gov.au/boating-facilities/proposal-processing'),
  (9, 'Boat and trailer wash-down bay',
   'Scope a shared freshwater wash bay with the land manager. Ask where trailers can turn, how runoff would be collected and what water and maintenance would cost. Compare a club facility with an agreement to use an existing bay.'),
  (10, 'Accessible rigging bench and catch-cleaning station',
   'Ask shore anglers and wheelchair users to trial a bench layout with clear access. Scope a separate washable catch-cleaning surface, water supply and waste collection with the site manager, and agree who will clean it after busy days.'),
  (11, 'Lockable club gear store with salt-resistant shelving',
   'Measure a space with the host venue for rods, radios, marquees and event supplies. Price ventilated lockable storage and raised shelves. Keep a shelf map and sign-out list so a new officer can find and return gear.'),
  (12, 'Enclosed trailer for club events and holiday clinics',
   'Seek a loan or quote for a lockable gear trailer with tie-down points, a ramp and a spare wheel. Pack the PA, shade and check-in kits together. Compare registration, insurance, secure parking and towing costs with hiring a trailer for each meet.'),
  (13, 'Custom merchandise batch of club fishing shirts',
   'Have the Treasurer check existing stock before ordering shirts for resale. Get fit samples for adult and junior styles, then collect pre-orders by style, colour and size. Compare minimum quantities, artwork setup, unit cost and freight to the island.'),
  (14, 'Small merchandise batches of caps, stubby coolers and stickers',
   'Request samples and small-run quotes for resale. Ask for mixed colours, minimum order per design, delivered cost and reorder time. The Treasurer can pick one affordable batch and count each product and colour into stock when it arrives.'),
  (15, 'Local artist merchandise run with licensed island artwork',
   'Invite an island artist to quote for a short run of tea towels or enamel mugs for resale. Agree their fee or royalty, print quantity, approval of the proof, credit and reprint rights. Any use of Indigenous cultural material needs permission from its custodians.'),
  (16, 'Custom brag mats for a competition merchandise batch',
   'Ask for a sample roll-up mat for resale and check its scale against a ruler before approving the print. Trial its readability in catch photos. Seek sponsor artwork approval and pre-orders before committing to a dated annual or biennial competition run.')
)
INSERT INTO equipment_wishes(id,name,purpose,goal_cents,total_cents,published,status,version,created_at)
SELECT 'b7439c28-0b54-448b-8f52-' || printf('%012x',p.position),p.name,p.purpose,
       0,0,0,'active',1,strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM proposals p
WHERE NOT EXISTS (SELECT 1 FROM equipment_wishes w WHERE lower(trim(w.name))=lower(trim(p.name)))
ON CONFLICT(id) DO NOTHING;

DROP TRIGGER practical_wish_history_0057;
