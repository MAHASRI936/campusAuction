/**
 * LISTINGS SERVICE (Module 2)
 *
 * The only place that reads or writes listing data. UI components talk to this
 * service (through the hooks in `hooks/useListings.js`) and never touch
 * localStorage directly. In a later module this file is replaced by Supabase
 * queries while the pages stay the same: keep the method names below.
 *
 * HOW DATA IS STORED
 * - Built-in sample listings live in code (`data/auctions.js`).
 * - localStorage (key `campusauction.listings.v1`) holds ONLY:
 *     { version, listings: [...], deletedSeedIds: [...] }
 *   `listings` contains listings created by users AND edited copies of sample
 *   listings. `deletedSeedIds` remembers which sample listings were deleted.
 * - The list the UI sees is: samples (minus deleted, with edited copies
 *   substituted in place) followed by user-created listings.
 *
 * Why not copy the samples into storage? Sample closing times are relative to
 * "now" so the demo never looks expired. Storing them would freeze those times.
 *
 * LISTING SHAPE (maps 1:1 to a future `listings` table; camelCase here,
 * snake_case in SQL):
 *   id, title, description, category, condition, startingPrice, currentBid,
 *   minIncrement, endsAt (ISO), pickupLocation, imageUrl (http/https URL or
 *   null), createdAt (ISO), updatedAt (ISO), isSample (optional)
 *
 * IMAGES: image FILES are never stored in localStorage (base64 would exhaust
 * the ~5 MB quota quickly). Only an image URL is persisted. An uploaded file
 * is kept as an in-memory object URL (`sessionImageUrl`) that lasts until the
 * tab is refreshed or closed.
 */
import { auctions as sampleListings } from '../data/auctions.js';
import { isValidCondition } from '../data/conditions.js';
import { generateId } from '../utils/id.js';
import { isValidImageUrl } from '../utils/validation.js';

export const STORAGE_KEY = 'campusauction.listings.v1';
export const STORAGE_VERSION = 1;

/** Thrown when listing data cannot be written to browser storage. */
export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

/** A sensible default bid step for a given starting price (INR). */
export function suggestMinIncrement(price) {
  return Math.max(10, Math.round((price * 0.05) / 10) * 10);
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isValidDate = (value) => typeof value === 'string' && !Number.isNaN(new Date(value).getTime());

/**
 * Turn untrusted data (parsed from localStorage) into a safe listing,
 * or return null if it cannot be used. Never throws.
 */
export function normalizeListing(raw) {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== 'string' || raw.id.trim() === '') return null;
  if (typeof raw.title !== 'string' || raw.title.trim() === '') return null;

  const startingPrice = Number(raw.startingPrice);
  if (!Number.isFinite(startingPrice) || startingPrice <= 0) return null;
  if (!isValidDate(raw.endsAt)) return null;

  const currentBid =
    raw.currentBid !== null && raw.currentBid !== undefined && Number.isFinite(Number(raw.currentBid)) && Number(raw.currentBid) >= 0
      ? Number(raw.currentBid)
      : null;
  const minIncrement =
    Number.isFinite(Number(raw.minIncrement)) && Number(raw.minIncrement) > 0
      ? Number(raw.minIncrement)
      : suggestMinIncrement(startingPrice);
  const createdAt = isValidDate(raw.createdAt) ? raw.createdAt : new Date(0).toISOString();

  const listing = {
    id: raw.id,
    title: raw.title.trim(),
    description: typeof raw.description === 'string' ? raw.description : '',
    category: typeof raw.category === 'string' && raw.category ? raw.category : 'other',
    condition: isValidCondition(raw.condition) ? raw.condition : 'Good',
    startingPrice,
    currentBid,
    minIncrement,
    endsAt: raw.endsAt,
    pickupLocation: typeof raw.pickupLocation === 'string' ? raw.pickupLocation : '',
    // Only plain http(s) links are kept; this also drops any accidental base64 or blob: values.
    imageUrl: typeof raw.imageUrl === 'string' && isValidImageUrl(raw.imageUrl) ? raw.imageUrl : null,
    createdAt,
    updatedAt: isValidDate(raw.updatedAt) ? raw.updatedAt : createdAt,
  };
  if (raw.isSample === true) listing.isSample = true;
  return listing;
}

/** Return window.localStorage if it really works (it can throw or be disabled), otherwise null. */
function resolveStorage() {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const probeKey = '__campusauction_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

/**
 * Create a listings service. The app uses the default instance exported at the
 * bottom; tests create their own with a fake `storage`.
 */
export function createListingsService({
  storage = resolveStorage(),
  seeds = sampleListings,
  storageKey = STORAGE_KEY,
  now = () => Date.now(),
  listenToStorageEvents = typeof window !== 'undefined',
} = {}) {
  const seedIds = new Set(seeds.map((seed) => seed.id));
  const listeners = new Set();
  const sessionImages = new Map(); // listing id -> object URL (this tab only)

  let state = readState();
  let snapshot = buildSnapshot();

  // ---------- storage ----------

  function readState() {
    const empty = { listings: [], deletedSeedIds: [] };
    if (!storage) return empty;

    let raw;
    try {
      raw = storage.getItem(storageKey);
    } catch {
      return empty;
    }
    if (raw === null || raw === undefined) return empty;

    try {
      const parsed = JSON.parse(raw);
      if (!isObject(parsed)) throw new Error('Saved data is not an object');

      const seen = new Set();
      const listings = [];
      for (const item of Array.isArray(parsed.listings) ? parsed.listings : []) {
        const listing = normalizeListing(item);
        if (listing && !seen.has(listing.id)) {
          seen.add(listing.id);
          listings.push(listing);
        }
      }
      const deletedSeedIds = (Array.isArray(parsed.deletedSeedIds) ? parsed.deletedSeedIds : []).filter(
        (id) => typeof id === 'string' && seedIds.has(id),
      );
      return { listings, deletedSeedIds: [...new Set(deletedSeedIds)] };
    } catch (error) {
      console.warn('CampusAuction: saved listings are unreadable and were ignored.', error);
      return empty;
    }
  }

  function writeState(next) {
    if (!storage) return; // storage unavailable: keep changes in memory for this session only
    try {
      storage.setItem(
        storageKey,
        JSON.stringify({ version: STORAGE_VERSION, listings: next.listings, deletedSeedIds: next.deletedSeedIds }),
      );
    } catch (error) {
      const full = error?.name === 'QuotaExceededError' || error?.code === 22;
      throw new StorageError(
        full
          ? 'Your browser storage is full, so this change was not saved.'
          : 'Your browser blocked saving this change. Check that storage is allowed for this site.',
        error,
      );
    }
  }

  // ---------- snapshot (what the UI reads) ----------

  function buildSnapshot() {
    const stored = new Map(state.listings.map((listing) => [listing.id, listing]));
    const deleted = new Set(state.deletedSeedIds);

    const merged = [];
    for (const seed of seeds) {
      if (!deleted.has(seed.id)) merged.push(stored.get(seed.id) ?? seed);
    }
    const userListings = state.listings
      .filter((listing) => !seedIds.has(listing.id))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    merged.push(...userListings);

    return merged.map((listing) => {
      const sessionImageUrl = sessionImages.get(listing.id);
      return sessionImageUrl ? { ...listing, sessionImageUrl } : listing;
    });
  }

  function refresh() {
    snapshot = buildSnapshot();
    listeners.forEach((listener) => listener());
  }

  function commit(next) {
    writeState(next); // throws StorageError first, so memory never gets ahead of storage
    state = next;
    refresh();
  }

  /** The stored or built-in listing, without the in-memory image field. */
  function findBase(id) {
    if (deletedSetHas(id)) return null;
    return state.listings.find((listing) => listing.id === id) ?? seeds.find((seed) => seed.id === id) ?? null;
  }

  function deletedSetHas(id) {
    return state.deletedSeedIds.includes(id);
  }

  function revokeSessionImage(id) {
    const url = sessionImages.get(id);
    if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url);
    }
    sessionImages.delete(id);
  }

  // ---------- public API ----------

  /** All listings the UI should show. The same array is returned until something changes. */
  function getSnapshot() {
    return snapshot;
  }

  function getAll() {
    return snapshot;
  }

  function getById(id) {
    return snapshot.find((listing) => listing.id === id) ?? null;
  }

  /**
   * Create a listing. `input` is the validated form data
   * ({ title, description, category, condition, startingPrice, endsAt, imageUrl }).
   * Returns the new listing. Throws StorageError if it could not be saved.
   */
  function create(input) {
    const knownIds = new Set([...seedIds, ...state.listings.map((listing) => listing.id)]);
    const timestamp = new Date(now()).toISOString();
    const listing = normalizeListing({
      ...input,
      id: generateId(knownIds),
      currentBid: null,
      minIncrement: suggestMinIncrement(Number(input.startingPrice)),
      pickupLocation: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    if (!listing) throw new Error('The listing data is not valid.');

    commit({ listings: [...state.listings, listing], deletedSeedIds: state.deletedSeedIds });
    return getById(listing.id);
  }

  /**
   * Update a listing with validated form data. Returns the updated listing,
   * or null if it no longer exists. Throws StorageError if it could not be saved.
   */
  function update(id, changes) {
    const base = findBase(id);
    if (!base) return null;

    const priceChanged = changes.startingPrice !== undefined && Number(changes.startingPrice) !== base.startingPrice;
    // Keep a bid step that was auto-suggested in step with the price; leave custom steps alone.
    const followsSuggestion = base.minIncrement === suggestMinIncrement(base.startingPrice);

    const listing = normalizeListing({
      ...base,
      title: changes.title ?? base.title,
      description: changes.description ?? base.description,
      category: changes.category ?? base.category,
      condition: changes.condition ?? base.condition,
      startingPrice: changes.startingPrice ?? base.startingPrice,
      endsAt: changes.endsAt ?? base.endsAt,
      imageUrl: changes.imageUrl === undefined ? base.imageUrl : changes.imageUrl,
      minIncrement: priceChanged && followsSuggestion ? suggestMinIncrement(Number(changes.startingPrice)) : base.minIncrement,
      updatedAt: new Date(now()).toISOString(),
    });
    if (!listing) throw new Error('The listing data is not valid.');

    commit({
      listings: [...state.listings.filter((item) => item.id !== id), listing],
      deletedSeedIds: state.deletedSeedIds,
    });
    return getById(id);
  }

  /** Delete a listing. Returns false if it does not exist. Throws StorageError if it could not be saved. */
  function remove(id) {
    if (!findBase(id)) return false;
    commit({
      listings: state.listings.filter((listing) => listing.id !== id),
      deletedSeedIds: seedIds.has(id) ? [...new Set([...state.deletedSeedIds, id])] : state.deletedSeedIds,
    });
    revokeSessionImage(id);
    return true;
  }

  /** Remove every saved change and bring the original sample listings back. */
  function reset() {
    if (storage) {
      try {
        storage.removeItem(storageKey);
      } catch (error) {
        throw new StorageError('Your browser blocked clearing the saved listings.', error);
      }
    }
    [...sessionImages.keys()].forEach(revokeSessionImage);
    state = { listings: [], deletedSeedIds: [] };
    refresh();
  }

  /** Show an uploaded image file for this listing until the tab is refreshed (never persisted). */
  function setSessionImage(id, file) {
    revokeSessionImage(id);
    if (file && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      sessionImages.set(id, URL.createObjectURL(file));
    }
    refresh();
  }

  function clearSessionImage(id) {
    if (!sessionImages.has(id)) return;
    revokeSessionImage(id);
    refresh();
  }

  /** Apply the image choice made in the form: { type: 'attach' | 'keep' | 'remove', file? }. */
  function applyImageAction(id, action) {
    if (!action) return;
    if (action.type === 'attach') setSessionImage(id, action.file);
    else if (action.type === 'remove') clearSessionImage(id);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /** False when localStorage is unavailable, so changes only last until refresh. */
  function isPersistent() {
    return storage !== null;
  }

  // Keep several open tabs in sync.
  if (listenToStorageEvents && storage && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (event) => {
      if (event.key === storageKey || event.key === null) {
        state = readState();
        refresh();
      }
    });
  }

  return {
    getSnapshot,
    getAll,
    getById,
    create,
    update,
    remove,
    reset,
    setSessionImage,
    clearSessionImage,
    applyImageAction,
    subscribe,
    isPersistent,
  };
}

/** The instance used by the app. */
export const listingsService = createListingsService();
