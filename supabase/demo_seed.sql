-- =============================================================================
-- OPTIONAL demo listings for CampusAuction (Module 3)
--
-- Run this ONLY if you want sample listings in an empty database. It is NOT part
-- of schema.sql and the app never inserts demo data by itself.
--
-- 1. Sign up in the app first, then find your user id in Supabase:
--    Authentication -> Users -> copy the "UID".
-- 2. Paste that UID below in place of PASTE-YOUR-USER-UID-HERE.
-- 3. Run in SQL Editor. Running it twice does NOT create duplicates (fixed ids).
--
-- The listings are owned by that user, show no bids (current_price is NULL) and
-- close at fixed times counted from the moment you run this script.
-- To remove them: delete from public.auctions where description like '%[demo]';
-- =============================================================================
with me as (select 'PASTE-YOUR-USER-UID-HERE'::uuid as seller)
insert into public.auctions
  (id, seller_id, title, description, category, condition, starting_price, min_increment, pickup_location, ends_at)
select v.id::uuid, me.seller, v.title, v.description || ' [demo]', v.category, v.condition, v.starting_price, v.min_increment, v.pickup_location, v.ends_at
from me,
(values
  ('248a1e3d-3f52-5cec-952e-d16774199de3', 'Engineering Mathematics Textbook', 'Second-year engineering mathematics textbook covering calculus, linear algebra and differential equations. Light pencil underlining in a few chapters; no torn or missing pages.', 'books', 'Good', 150, 10, 'Library entrance (to be confirmed with seller)', now() + interval '30 hours'),
  ('bab963e2-a83a-5767-b3b0-cbb6de9b76be', 'Casio fx-991EX Scientific Calculator', 'Scientific calculator used for two semesters. Display is clear, all keys work and the cover is included. Batteries are fine.', 'calculators', 'Like New', 400, 25, 'Main canteen (to be confirmed with seller)', now() + interval '6 hours'),
  ('122974fe-be6f-578d-8aca-b23a399652b6', 'Used Laptop, Core i5 with 8 GB RAM', 'Reliable student laptop with a 256 GB SSD and 8 GB RAM. Battery lasts around three hours. Minor scratches on the lid. Charger included; operating system freshly reinstalled.', 'electronics', 'Good', 12000, 250, 'Department block lobby (to be confirmed with seller)', now() + interval '52 hours'),
  ('645d5d0d-8e0a-51bf-91e7-ad9e6a084f6f', 'Wireless Over-Ear Headphones', 'Bluetooth over-ear headphones with good sound for study sessions. Ear cushions show some wear. Charging cable included.', 'electronics', 'Fair', 800, 50, 'Hostel gate (to be confirmed with seller)', now() + interval '20 hours'),
  ('757e843c-ff16-5b8e-928c-7696122187e4', '21-Speed Geared Bicycle', 'Geared bicycle used for commuting between hostel and classes. Brakes recently adjusted and tyres in good shape. Chain needs oiling. Lock not included.', 'cycles', 'Good', 1500, 50, 'Cycle stand near hostel (to be confirmed with seller)', now() + interval '3 hours'),
  ('3d7e8875-2f1a-560c-9b96-77a0565b7fa6', 'College Backpack, 30 L', 'Sturdy 30 litre backpack with a laptop compartment and two side pockets. Zips work smoothly. Small mark on the bottom corner.', 'other', 'Good', 300, 20, 'Admin block steps (to be confirmed with seller)', now() + interval '75 hours'),
  ('b17c51e4-59c8-58a6-96ee-6f2b54854afb', 'LED Study Table Lamp', 'Rechargeable LED desk lamp with three brightness levels and a flexible neck. Perfect for late-night revision in the hostel. USB charging cable included.', 'hostel', 'Like New', 250, 20, 'Hostel common room (to be confirmed with seller)', now() + interval '44 hours'),
  ('21fc6609-f0ba-5a44-8830-eaf9379e3d1f', 'Electric Kettle, 1.5 L', 'Stainless steel 1.5 litre electric kettle, ideal for tea, instant noodles and hot water. Works perfectly. Check your hostel rules on appliances before bidding.', 'hostel', 'Good', 200, 10, 'Hostel gate (to be confirmed with seller)', now() + interval '10 hours'),
  ('f94072a8-7d36-582a-9a97-e64cc9b9a688', 'Engineering Drafter and Drawing Set', 'Mini drafter with a set square, compass and divider kept in a hard case. Fine for first-year engineering graphics. A couple of pencils included.', 'other', 'Fair', 180, 10, 'Drawing hall entrance (to be confirmed with seller)', now() + interval '26 hours')
) as v(id, title, description, category, condition, starting_price, min_increment, pickup_location, ends_at)
on conflict (id) do nothing;
