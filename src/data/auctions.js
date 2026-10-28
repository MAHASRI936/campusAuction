/**
 * SAMPLE DATA (demo only).
 *
 * MODULE 3: the app no longer shows these listings. Listings come from Supabase.
 * This file is kept only for:
 *   - `FEATURED_COUNT` and `getDisplayPrice` (used by the UI),
 *   - recognising Module 2 sample records so the optional localStorage import never copies them
 *     (see services/legacyLocalListings.js),
 *   - the optional demo script `supabase/demo_seed.sql`, which contains the same listings.
 *
 * Notes:
 * - These are demo listings only. There is no real seller or real bidding.
 * - `currentBid: null` means nobody has bid yet.
 */

const HOUR = 60 * 60 * 1000;
const inHours = (hours) => new Date(Date.now() + hours * HOUR).toISOString();

const baseAuctions = [
  {
    id: 'engineering-mathematics-textbook',
    title: 'Engineering Mathematics Textbook',
    category: 'books',
    condition: 'Good',
    description:
      'Second-year engineering mathematics textbook covering calculus, linear algebra and differential equations. Light pencil underlining in a few chapters; no torn or missing pages.',
    startingPrice: 150,
    currentBid: 220,
    minIncrement: 10,
    endsAt: inHours(30),
    pickupLocation: 'Library entrance (to be confirmed with seller)',
    imageUrl: null,
  },
  {
    id: 'casio-fx-991ex-calculator',
    title: 'Casio fx-991EX Scientific Calculator',
    category: 'calculators',
    condition: 'Like New',
    description:
      'Scientific calculator used for two semesters. Display is clear, all keys work and the cover is included. Batteries are fine.',
    startingPrice: 400,
    currentBid: 550,
    minIncrement: 25,
    endsAt: inHours(6),
    pickupLocation: 'Main canteen (to be confirmed with seller)',
    imageUrl: null,
  },
  {
    id: 'used-laptop-i5',
    title: 'Used Laptop, Core i5 with 8 GB RAM',
    category: 'electronics',
    condition: 'Good',
    description:
      'Reliable student laptop with a 256 GB SSD and 8 GB RAM. Battery lasts around three hours. Minor scratches on the lid. Charger included; operating system freshly reinstalled.',
    startingPrice: 12000,
    currentBid: 14500,
    minIncrement: 250,
    endsAt: inHours(52),
    pickupLocation: 'Department block lobby (to be confirmed with seller)',
    imageUrl: null,
  },
  {
    id: 'wireless-over-ear-headphones',
    title: 'Wireless Over-Ear Headphones',
    category: 'electronics',
    condition: 'Fair',
    description:
      'Bluetooth over-ear headphones with good sound for study sessions. Ear cushions show some wear. Charging cable included.',
    startingPrice: 800,
    currentBid: null,
    minIncrement: 50,
    endsAt: inHours(20),
    pickupLocation: 'Hostel gate (to be confirmed with seller)',
    imageUrl: null,
  },
  {
    id: 'geared-bicycle-21-speed',
    title: '21-Speed Geared Bicycle',
    category: 'cycles',
    condition: 'Good',
    description:
      'Geared bicycle used for commuting between hostel and classes. Brakes recently adjusted and tyres in good shape. Chain needs oiling. Lock not included.',
    startingPrice: 1500,
    currentBid: 1900,
    minIncrement: 50,
    endsAt: inHours(3),
    pickupLocation: 'Cycle stand near hostel (to be confirmed with seller)',
    imageUrl: null,
  },
  {
    id: 'college-backpack-30l',
    title: 'College Backpack, 30 L',
    category: 'other',
    condition: 'Good',
    description:
      'Sturdy 30 litre backpack with a laptop compartment and two side pockets. Zips work smoothly. Small mark on the bottom corner.',
    startingPrice: 300,
    currentBid: 350,
    minIncrement: 20,
    endsAt: inHours(75),
    pickupLocation: 'Admin block steps (to be confirmed with seller)',
    imageUrl: null,
  },
  {
    id: 'study-table-lamp',
    title: 'LED Study Table Lamp',
    category: 'hostel',
    condition: 'Like New',
    description:
      'Rechargeable LED desk lamp with three brightness levels and a flexible neck. Perfect for late-night revision in the hostel. USB charging cable included.',
    startingPrice: 250,
    currentBid: null,
    minIncrement: 20,
    endsAt: inHours(44),
    pickupLocation: 'Hostel common room (to be confirmed with seller)',
    imageUrl: null,
  },
  {
    id: 'electric-kettle-1-5l',
    title: 'Electric Kettle, 1.5 L',
    category: 'hostel',
    condition: 'Good',
    description:
      'Stainless steel 1.5 litre electric kettle, ideal for tea, instant noodles and hot water. Works perfectly. Check your hostel rules on appliances before bidding.',
    startingPrice: 200,
    currentBid: 260,
    minIncrement: 10,
    endsAt: inHours(10),
    pickupLocation: 'Hostel gate (to be confirmed with seller)',
    imageUrl: null,
  },
  {
    id: 'engineering-drafter-set',
    title: 'Engineering Drafter and Drawing Set',
    category: 'other',
    condition: 'Fair',
    description:
      'Mini drafter with a set square, compass and divider kept in a hard case. Fine for first-year engineering graphics. A couple of pencils included.',
    startingPrice: 180,
    currentBid: 210,
    minIncrement: 10,
    endsAt: inHours(26),
    pickupLocation: 'Drawing hall entrance (to be confirmed with seller)',
    imageUrl: null,
  },
];

/**
 * Sample listings with the fields every stored listing has.
 * `createdAt` is a fixed past date (one hour apart, in array order) so that
 * "Newest listings" sorting puts listings created by users first.
 * `isSample` lets the UI label demo data.
 */
const SAMPLE_CREATED_BASE = Date.UTC(2025, 0, 1);

export const auctions = baseAuctions.map((auction, index) => {
  const createdAt = new Date(SAMPLE_CREATED_BASE + index * HOUR).toISOString();
  return { ...auction, createdAt, updatedAt: createdAt, isSample: true };
});

/** Number of listings shown in the homepage "Featured" section. */
export const FEATURED_COUNT = 6;

/** The price a bidder currently has to beat (or the starting price). */
export function getDisplayPrice(auction) {
  return auction.currentBid ?? auction.startingPrice;
}
