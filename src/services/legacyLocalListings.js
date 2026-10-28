/**
 * Read-only access to the listings that Module 2 saved in this browser's localStorage.
 *
 * Module 3 stores listings in Supabase, so these old listings are NOT shown in the app any
 * more. They are never deleted or changed by this code. The only thing offered is an
 * explicit, optional import (button on "My Listings") that copies the listings YOU created
 * into your account. Sample listings and edited copies of samples are never imported.
 *
 * The ids of listings already imported are remembered in a separate key, so the import
 * button disappears afterwards. The database also ignores a listing whose id already
 * exists, so a repeated import cannot create duplicates.
 */
import { auctions as sampleListings } from '../data/auctions.js';
import { isValidCondition } from '../data/conditions.js';
import { CATEGORY_IDS } from '../data/categoryIds.js';
import { isValidImageUrl, LIMITS } from '../utils/validation.js';

export const LEGACY_STORAGE_KEY = 'campusauction.listings.v1';
export const IMPORTED_IDS_KEY = 'campusauction.imported.v1';

const SAMPLE_IDS = new Set(sampleListings.map((sample) => sample.id));
const CATEGORY_SET = new Set(CATEGORY_IDS);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Convert one old record to import-ready data, or return null when the database would reject it. */
export function toImportable(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || !UUID_PATTERN.test(raw.id) || SAMPLE_IDS.has(raw.id) || raw.isSample === true) return null;

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  const startingPrice = Number(raw.startingPrice);
  const endsAt = typeof raw.endsAt === 'string' && !Number.isNaN(new Date(raw.endsAt).getTime()) ? new Date(raw.endsAt).toISOString() : null;

  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) return null;
  if (description.length > LIMITS.descriptionMax) return null;
  if (!CATEGORY_SET.has(raw.category) || !isValidCondition(raw.condition)) return null;
  if (!Number.isFinite(startingPrice) || startingPrice <= 0 || startingPrice > LIMITS.priceMax) return null;
  if (!endsAt) return null;

  return {
    id: raw.id,
    title,
    description,
    category: raw.category,
    condition: raw.condition,
    startingPrice,
    endsAt,
    imageUrl: typeof raw.imageUrl === 'string' && isValidImageUrl(raw.imageUrl) ? raw.imageUrl : null,
    pickupLocation: typeof raw.pickupLocation === 'string' ? raw.pickupLocation : '',
  };
}

/** Ids already imported from this browser. */
export function getImportedIds(storage = getStorage()) {
  const ids = storage ? readJson(storage, IMPORTED_IDS_KEY) : null;
  return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
}

/**
 * Listings in this browser that could still be imported.
 * Returns { importable: [...], skipped: number } (skipped = saved records that cannot be imported).
 */
export function findImportableListings(storage = getStorage()) {
  const empty = { importable: [], skipped: 0 };
  if (!storage) return empty;

  const parsed = readJson(storage, LEGACY_STORAGE_KEY);
  const records = Array.isArray(parsed?.listings) ? parsed.listings : [];
  const imported = getImportedIds(storage);

  const importable = [];
  let skipped = 0;
  const seen = new Set();
  for (const record of records) {
    if (record && typeof record === 'object' && (SAMPLE_IDS.has(record.id) || record.isSample === true)) continue; // never offered
    if (imported.has(record?.id) || seen.has(record?.id)) continue;
    const listing = toImportable(record);
    if (listing) {
      seen.add(listing.id);
      importable.push(listing);
    } else {
      skipped += 1;
    }
  }
  return { importable, skipped };
}

/** Remember that these ids were imported (does not touch the old listing data). */
export function markImported(ids, storage = getStorage()) {
  if (!storage) return;
  try {
    const all = new Set([...getImportedIds(storage), ...ids]);
    storage.setItem(IMPORTED_IDS_KEY, JSON.stringify([...all]));
  } catch (error) {
    console.warn('CampusAuction: could not remember which listings were imported.', error);
  }
}
