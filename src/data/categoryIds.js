/**
 * The allowed category ids, without any icon imports so plain Node code and tests can use them.
 * KEEP IN SYNC with: `categories` in data/categories.js and the `auctions_category_valid`
 * check constraint in supabase/schema.sql.
 */
export const CATEGORY_IDS = ['books', 'electronics', 'calculators', 'cycles', 'hostel', 'other'];
