-- Credit the starter list to the demo. Officers can edit and publish each draft
-- through the normal wish register. Only a newly inserted wish gets a history entry.
CREATE TRIGGER starter_wish_history_0056 AFTER INSERT ON equipment_wishes
WHEN NEW.id LIKE 'd059c912-72ad-41e1-9ca2-%'
BEGIN
  INSERT INTO equipment_wish_activity
    (mutation_id,wish_id,version,action,actor_id,receipt,recorded_at)
  VALUES ('starter-wish-' || NEW.id, NEW.id, 1, 'starter_draft', 'clubhouse-setup',
          'starter-wishes-0056-' || NEW.id, NEW.created_at);
  INSERT INTO audit_log (id,actor_id,actor_role,action,entity_id,occurred_at)
  VALUES ('starter-wish-' || NEW.id, 'clubhouse-setup', 'system',
          'equipment_wish_starter_draft', NEW.id, NEW.created_at);
END;

WITH proposals(position, name, purpose) AS (VALUES
  (1, 'Loan rods and reels for local fishing mornings',
   'Start with four sturdy shore outfits, a carry bag and a sign-out card. Locals can bring a mate or a junior to a regular meet without buying gear. Use the loan record to see what needs repair before adding more.'),
  (2, 'Brag mats and catch-and-release kits',
   'Lend washable measuring mats, long-nose pliers and line snips at local meets. Show families how to wet the mat and have the camera ready. Fish that need to go straight back can swim away without a photo. Use the same kits at invitationals.'),
  (3, 'Adaptive rod holders and easy-grip tackle',
   'Try a rod holder and a reel handle that is easier to grip with junior and adult anglers who ask for support. Let them try the loan gear at an accessible shore spot and tell us what works before buying a full set.'),
  (4, 'Fishing line collection and shore clean-up kit',
   'Take lidded line bins, litter tongs and a rigid container for hooks to each meet. Give one volunteer the pack-down job. Record what comes back, arrange safe disposal and keep the wildlife rescue contact with the kit.'),
  (5, 'Portable first aid kit for shore sessions',
   'Ask a qualified first aider to review a portable kit for club outings. Keep a waterproof location card with it so a volunteer can tell an ambulance which access point to use. Give someone the job of checking supplies before each meet.'),
  (6, 'Portable shade and a drinking water station',
   'Borrow a weighted marquee and refillable water station for one school-holiday clinic. Keep paths and jetty access clear, run small booked sessions and count refills and attendance before deciding whether to buy.'),
  (7, 'Illustrated island welcome cards for visiting anglers',
   'Seek a local artist and a print sponsor for pocket cards showing shared jetty space, line disposal, catch care and where to check current zones. Trial the cards with locals and visiting families. Agree on payment, credit and permission before printing artwork.'),
  (8, 'Sponsor a Quandamooka-led Sea Country session',
   'Seek a sponsor to cover a Quandamooka educator’s agreed fee for a small school-holiday session if they wish to lead it. The educator chooses the place, topics, group size and what can be photographed or shared.' || char(10) || 'https://mmeicac.com.au/index.php/services/'),
  (9, 'Portable check-in and photo judging kit',
   'Borrow a folding table, numbered entry cards, a power bank and a weatherproof clipboard. Trial photo-on-mat judging at a small interclub meet, including paper check-in if reception drops. Keep fishing locations off the results board.'),
  (10, 'Local access and waste plan for the flagship competition',
   'Seek event-planning help for a competition held annually or every second year. Ask residents, Traditional Owners, local operators and land managers about entry limits, ferry arrivals, toilets, parking and clean-up. Use their input before setting a date or opening entries.'),
  (11, 'Shellfish reef photo survey kit',
   'Borrow a phone, waterproof case and scale card. Ask Moreton Bay Oyster Hunter how families can help record shellfish habitat from shore. Agree where volunteers can go and how location records will be shared.' || char(10) || 'https://www.natureaustralia.org.au/what-we-do/our-priorities/oceans/ocean-stories/oyster-hunter-moreton-bay/'),
  (12, 'Hatchery visit and fish nursery habitat brief',
   'Arrange a hatchery learning visit. Ask Quandamooka partners and fisheries scientists how volunteers could help local fish nurseries. Queensland excludes recreational fish stocking in tidal waters, including Moreton Bay.' || char(10) || 'https://www.dpi.qld.gov.au/_shared-content/policy-register/policy-register-pdf?getdoc=5500&name=fish-stocking-in-qld-policy.pdf'),
  (13, 'Artificial reef and habitat restoration options study',
   'Ask Traditional Owners, marine park managers and reef scientists whether restoring existing habitat or studying an artificial reef would help fish locally. Seek a short brief on ecological benefit, approvals, costs and who would monitor it over time.' || char(10) || 'https://parks.qld.gov.au/parks/moreton-bay/zoning/trial_artificial_reef_program')
)
INSERT INTO equipment_wishes(id,name,purpose,goal_cents,total_cents,published,status,version,created_at)
SELECT 'd059c912-72ad-41e1-9ca2-' || printf('%012x',p.position), p.name, p.purpose,
       0, 0, 0, 'active', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM proposals p
WHERE NOT EXISTS (SELECT 1 FROM equipment_wishes w WHERE lower(trim(w.name))=lower(trim(p.name)))
ON CONFLICT(id) DO NOTHING;

DROP TRIGGER starter_wish_history_0056;
