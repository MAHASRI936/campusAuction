import { isValidCondition } from '../data/conditions.js';
import { formatINR } from './format.js';
import { localInputToIso, toLocalInputValue } from './dateTime.js';

export const LIMITS = {
  titleMin: 3,
  titleMax: 100,
  descriptionMin: 20,
  descriptionMax: 2000,
  priceMax: 10000000, // INR 1 crore
  maxDaysAhead: 365,
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Parse a price typed by the user into a whole number of rupees.
 * Accepts digits with optional commas, spaces or a leading rupee sign
 * ("1,500", "₹ 1500"). Returns NaN for anything else (decimals, negatives,
 * letters, empty text).
 */
export function parsePrice(raw) {
  const cleaned = String(raw ?? '').replace(/[,\s₹]/g, '');
  if (!/^\d+$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

/** True for absolute http(s) URLs only (blocks javascript:, data:, file: ...). */
export function isValidImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate the listing form.
 *
 * values:  { title, description, category, condition, startingPrice, endsAt, imageUrl }
 *          (all strings exactly as typed; `endsAt` is a datetime-local value)
 * options: { categoryIds, now, original }
 *          `original` is the listing being edited (null when creating).
 *
 * Returns { ok, errors, data }. `errors` maps a field name to ONE message.
 * `data` (only when ok) holds clean values ready for the storage service.
 */
export function validateListing(values, { categoryIds = [], now = Date.now(), original = null } = {}) {
  const errors = {};

  // Title
  const title = String(values.title ?? '').trim();
  if (!title) {
    errors.title = 'Enter an item title.';
  } else if (title.length < LIMITS.titleMin) {
    errors.title = `Title must be at least ${LIMITS.titleMin} characters.`;
  } else if (title.length > LIMITS.titleMax) {
    errors.title = `Title must be ${LIMITS.titleMax} characters or fewer (currently ${title.length}).`;
  }

  // Description
  const description = String(values.description ?? '').trim();
  if (!description) {
    errors.description = 'Describe the item so buyers know what they are bidding on.';
  } else if (description.length < LIMITS.descriptionMin) {
    errors.description = `Add a few more details: at least ${LIMITS.descriptionMin} characters (currently ${description.length}).`;
  } else if (description.length > LIMITS.descriptionMax) {
    errors.description = `Description must be ${LIMITS.descriptionMax} characters or fewer (currently ${description.length}).`;
  }

  // Category
  const category = String(values.category ?? '');
  if (!category) {
    errors.category = 'Choose a category.';
  } else if (categoryIds.length > 0 && !categoryIds.includes(category)) {
    errors.category = 'Choose one of the listed categories.';
  }

  // Condition
  const condition = String(values.condition ?? '');
  if (!condition) {
    errors.condition = 'Choose the item condition.';
  } else if (!isValidCondition(condition)) {
    errors.condition = 'Choose New, Like New, Good or Fair.';
  }

  // Starting price
  const rawPrice = String(values.startingPrice ?? '').trim();
  const startingPrice = parsePrice(rawPrice);
  if (!rawPrice) {
    errors.startingPrice = 'Enter a starting price in rupees.';
  } else if (Number.isNaN(startingPrice)) {
    errors.startingPrice = 'Enter a whole-rupee amount using digits only, for example 500.';
  } else if (startingPrice <= 0) {
    errors.startingPrice = 'Starting price must be greater than ₹0.';
  } else if (startingPrice > LIMITS.priceMax) {
    errors.startingPrice = 'Starting price can’t be more than ₹1,00,00,000.';
  } else if (original && original.currentBid !== null && original.currentBid !== undefined && startingPrice > original.currentBid) {
    errors.startingPrice = `Starting price can’t be higher than the current bid (${formatINR(original.currentBid)}).`;
  }

  // Auction end date and time
  const rawEnd = String(values.endsAt ?? '').trim();
  const endIso = localInputToIso(rawEnd);
  // When editing, leaving the end time untouched is always allowed, even if it has passed.
  const endUnchanged = Boolean(original) && rawEnd !== '' && rawEnd === toLocalInputValue(original.endsAt);
  if (!rawEnd) {
    errors.endsAt = 'Choose when the auction ends.';
  } else if (!endIso) {
    errors.endsAt = 'Enter a valid date and time.';
  } else if (!endUnchanged) {
    const endTime = new Date(endIso).getTime();
    if (endTime <= now) {
      errors.endsAt = 'The end time must be in the future.';
    } else if (endTime > now + LIMITS.maxDaysAhead * DAY) {
      errors.endsAt = `The end time can’t be more than ${LIMITS.maxDaysAhead} days from now.`;
    }
  }

  // Image URL (optional)
  const imageUrl = String(values.imageUrl ?? '').trim();
  if (imageUrl && !isValidImageUrl(imageUrl)) {
    errors.imageUrl = 'Enter a full image link starting with http:// or https://.';
  }

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    data: ok
      ? {
          title,
          description,
          category,
          condition,
          startingPrice,
          endsAt: endUnchanged ? original.endsAt : endIso,
          imageUrl: imageUrl || null,
        }
      : null,
  };
}
