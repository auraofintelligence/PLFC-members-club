-- Club records through March 2026. Amounts are Australian cents.
-- These are historical observations. They do not initialise the live shelf balance.
INSERT INTO merch_products (id, name, public_note, display_order) VALUES
  ('shirt', 'Club shirt', 'Members bought PLFC shirts. Club records also describe a separate promotional print.', 1),
  ('cooler', 'Club stubby cooler', 'The club bought branded drink coolers. A cooler sale was reported at the June 2025 meeting.', 2),
  ('sticker', 'Round club sticker', 'The club received its green and blue logo stickers and used them in event packs and giveaways.', 3);

INSERT INTO merch_stock_items (id, product_id, label) VALUES
  ('shirt-member', 'shirt', 'Member shirt'),
  ('shirt-promo', 'shirt', 'Promotional shirt'),
  ('cooler', 'cooler', 'Club stubby cooler'),
  ('sticker', 'sticker', 'Round club sticker');
