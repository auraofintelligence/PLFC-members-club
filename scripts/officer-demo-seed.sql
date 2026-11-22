-- All names, dates, amounts and meetings below are invented practice records.
INSERT INTO merch_products VALUES
 ('shirt','Club shirt','Example merchandise for trying the stock book.',1),
 ('cooler','Club stubby cooler','Example stock for a club day.',2),
 ('sticker','Round club sticker','Example packs and stickers.',3);
INSERT INTO merch_stock_items(id,product_id,label) VALUES
 ('demo-shirt','shirt','Practice member shirt'),('demo-cooler','cooler','Practice cooler'),('demo-sticker','sticker','Practice sticker');
INSERT INTO merch_movements VALUES
 ('demo-count-shirt','demo-shirt','count',18,NULL,18,1,'demo-stock',datetime('now','-6 days')),
 ('demo-count-cooler','demo-cooler','count',24,NULL,24,1,'demo-stock',datetime('now','-6 days')),
 ('demo-count-sticker','demo-sticker','count',50,NULL,50,1,'demo-stock',datetime('now','-6 days')),
 ('demo-sale-shirt','demo-shirt','sale',2,6000,16,2,'demo-stock',datetime('now','-4 days')),
 ('demo-sale-cooler','demo-cooler','sale',3,1500,21,2,'demo-stock',datetime('now','-3 days'));
INSERT INTO merch_source_records VALUES
 ('demo-delivery','cooler',date('now','-7 days'),'delivery','Example delivery of club coolers for a local meet.',24,NULL,'Fictional delivery note');
INSERT INTO meeting_register VALUES
 ('demo-upcoming','Practice family fishing meeting',date('now','+10 hours','+2 days'),'10:00','Example clubhouse','demo-chair',datetime('now','-1 day')),
 ('demo-last','Practice committee catch-up',date('now','+10 hours','-14 days'),'10:00','Example clubhouse','demo-chair',datetime('now','-18 days'));
INSERT INTO meeting_notes(id,notes,actions_json,version,updated_at,updated_by,last_mutation_id,decisions_json,status,approved_at,approved_by) VALUES
 ('demo-upcoming','We agreed to hold a family brag mat practice. The secretary will check the welcome table by '||date('now','+10 hours','+4 days')||'.','[]',1,datetime('now'),'Practice secretary','demo-draft','[]','draft',NULL,NULL),
 ('demo-last','The committee agreed to ask for help with the family welcome desk.','[]',1,datetime('now','-14 days'),'Practice chair','demo-approved','["Seek event support for the welcome desk at the practice family meet."]','approved',datetime('now','-14 days'),'Practice chair');
INSERT INTO meeting_agendas VALUES ('demo-upcoming','Welcome and apologies'||char(10)||'Plan the family catch-and-release meet'||char(10)||'Count shirts and coolers',1,datetime('now'),'demo-chair');
INSERT INTO member_minutes VALUES ('demo-last',1,'The practice committee agreed to organise a family welcome desk.',datetime('now','-12 days'),'Practice chair','demo-release');
INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES
 ('demo-fisher','Practice member Rowan','member','unused','no-password',1,date('now','+6 months')),
 ('demo-helper','Practice member Harper','member','unused','no-password',2,date('now','+5 days'));
UPDATE member_profiles SET membership_type='adult',contact_email='example@example.invalid',pack_method='collect' WHERE account_id='demo-fisher';
UPDATE member_profiles SET membership_type='social',pack_method='collect',pack_stage='ready' WHERE account_id='demo-helper';
INSERT INTO membership_applications(id,request_id,full_name,membership_type,contact_email,pack_method) VALUES
 ('ca000000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001','Practice applicant Banksia','adult','banksia@example.invalid','collect');
INSERT INTO membership_applications(id,request_id,full_name,membership_type,contact_email,pack_method,guardian_name,guardian_authorised,guardian_social) VALUES
 ('ca000000-0000-4000-8000-000000000002','da000000-0000-4000-8000-000000000002','Practice junior Wattle','junior','guardian@example.invalid','collect','Practice guardian',1,0);
INSERT INTO community_posts(id,author_id,author_name,message,created_at) VALUES
 ('cc000000-0000-4000-8000-000000000001','demo-fisher','Practice member Rowan','Who would like to help set up the brag mats at our practice meet?',datetime('now','-1 day'));
