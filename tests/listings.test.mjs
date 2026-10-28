// Dependency-free tests for the logic layer. Run with:  npm test   (uses Node's built-in test runner)
import test from 'node:test';
import assert from 'node:assert/strict';

import { validateListing, parsePrice, isValidImageUrl } from '../src/utils/validation.js';
import { filterAndSortListings, normalizeSort, getFeaturedListings } from '../src/utils/listingFilters.js';
import { toLocalInputValue, localInputToIso } from '../src/utils/dateTime.js';

const CATEGORY_IDS = ['books', 'electronics', 'calculators', 'cycles', 'hostel', 'other'];
const NOW = new Date('2026-10-28T10:00:00').getTime();
const future = (hours) => toLocalInputValue(new Date(NOW + hours * 3600 * 1000));

const validValues = () => ({
  title: 'Hostel study chair',
  description: 'Sturdy plastic chair, used for one year. No cracks and the legs are intact.',
  category: 'hostel',
  condition: 'Good',
  startingPrice: '350',
  endsAt: future(48),
  imageUrl: '',
});
const validate = (overrides = {}, options = {}) =>
  validateListing({ ...validValues(), ...overrides }, { categoryIds: CATEGORY_IDS, now: NOW, ...options });

// ---------------------------------------------------------------- validation

test('valid form passes and returns clean data', () => {
  const result = validate({ title: '  Hostel study chair  ', startingPrice: '1,500' });
  assert.equal(result.ok, true);
  assert.equal(result.data.title, 'Hostel study chair');
  assert.equal(result.data.startingPrice, 1500);
  assert.equal(result.data.imageUrl, null);
  assert.ok(result.data.endsAt.endsWith('Z'));
});

test('every required field reports its own message when empty', () => {
  const result = validateListing(
    { title: '', description: '', category: '', condition: '', startingPrice: '', endsAt: '', imageUrl: '' },
    { categoryIds: CATEGORY_IDS, now: NOW },
  );
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['category', 'condition', 'description', 'endsAt', 'startingPrice', 'title']);
});

test('price must be a valid positive whole-rupee amount', () => {
  for (const bad of ['0', '-5', 'abc', '12.5', '1e3', '₹', '  ']) {
    assert.ok(validate({ startingPrice: bad }).errors.startingPrice, `"${bad}" should be rejected`);
  }
  assert.match(validate({ startingPrice: '0' }).errors.startingPrice, /greater than/);
  assert.ok(validate({ startingPrice: '10000001' }).errors.startingPrice);
  for (const good of ['1', '500', '1,500', '₹ 2500', '10000000']) {
    assert.equal(validate({ startingPrice: good }).errors.startingPrice, undefined, `"${good}" should pass`);
  }
  assert.ok(Number.isNaN(parsePrice('x')));
});

test('end time must be in the future and not absurdly far away', () => {
  assert.match(validate({ endsAt: future(-2) }).errors.endsAt, /future/);
  assert.match(validate({ endsAt: toLocalInputValue(new Date(NOW)) }).errors.endsAt, /future/);
  assert.match(validate({ endsAt: 'not a date' }).errors.endsAt, /valid/);
  assert.ok(validate({ endsAt: future(24 * 400) }).errors.endsAt);
  assert.equal(validate({ endsAt: future(1) }).errors.endsAt, undefined);
});

test('title, description, category, condition rules', () => {
  assert.ok(validate({ title: 'ab' }).errors.title);
  assert.ok(validate({ title: 'x'.repeat(101) }).errors.title);
  assert.ok(validate({ description: 'too short' }).errors.description);
  assert.ok(validate({ category: 'cars' }).errors.category);
  assert.ok(validate({ condition: 'Broken' }).errors.condition);
  for (const c of ['New', 'Like New', 'Good', 'Fair']) assert.equal(validate({ condition: c }).errors.condition, undefined);
});

test('image URL is optional but must be http(s) when given', () => {
  assert.equal(validate({ imageUrl: '' }).ok, true);
  assert.equal(validate({ imageUrl: 'https://example.com/a.jpg' }).ok, true);
  for (const bad of ['example.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'ftp://x.com/a.png']) {
    assert.ok(validate({ imageUrl: bad }).errors.imageUrl, `${bad} should be rejected`);
  }
  assert.equal(isValidImageUrl('http://a.b/c'), true);
});

test('editing: unchanged past end time is allowed, a changed past time is not; price cannot exceed current bid', () => {
  const original = { endsAt: new Date(NOW - 3600 * 1000).toISOString(), currentBid: 200 };
  const unchanged = validate({ endsAt: toLocalInputValue(original.endsAt), startingPrice: '150' }, { original });
  assert.equal(unchanged.ok, true);
  assert.equal(unchanged.data.endsAt, original.endsAt, 'original timestamp is preserved exactly');
  assert.ok(validate({ endsAt: future(-5), startingPrice: '150' }, { original }).errors.endsAt);
  assert.match(validate({ endsAt: future(5), startingPrice: '500' }, { original }).errors.startingPrice, /current bid/);
});

// ----------------------------------------------------------------- date utils

test('datetime-local helpers round-trip', () => {
  const iso = '2026-11-02T13:30:00.000Z';
  assert.equal(localInputToIso(toLocalInputValue(iso)), iso);
  assert.equal(localInputToIso(''), null);
  assert.equal(localInputToIso('garbage'), null);
  assert.equal(toLocalInputValue('garbage'), '');
});

// ------------------------------------------------------------------- filtering

const L = (id, title, description, category, condition, startingPrice, createdAt, endsAt = '2030-01-01T00:00:00Z') => ({
  id, title, description, category, condition, startingPrice, createdAt, endsAt,
});
const SAMPLE = [
  L('a', 'Casio Calculator', 'scientific, like new', 'calculators', 'Like New', 400, '2026-01-01T00:00:00Z', '2030-03-01T00:00:00Z'),
  L('b', 'Bicycle', 'geared cycle for campus', 'cycles', 'Good', 1500, '2026-01-02T00:00:00Z', '2030-02-01T00:00:00Z'),
  L('c', 'Study Lamp', 'LED lamp, works with calculator-free late night study', 'hostel', 'Good', 250, '2026-01-03T00:00:00Z', '2030-01-01T00:00:00Z'),
  L('d', 'Old Textbook', 'Mathematics, cover worn', 'books', 'Fair', 150, '2026-01-04T00:00:00Z', '2029-01-01T00:00:00Z'),
];

test('search matches title and description, case-insensitively, all words required', () => {
  const ids = (q) => filterAndSortListings(SAMPLE, { query: q }).map((l) => l.id).sort();
  assert.deepEqual(ids('CALCULATOR'), ['a', 'c']);        // title of a, description of c
  assert.deepEqual(ids('geared campus'), ['b']);          // two words, both in description
  assert.deepEqual(ids('   '), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids('nothing-matches'), []);
});

test('search, category, condition and sort work together', () => {
  const run = (o) => filterAndSortListings(SAMPLE, o).map((l) => l.id);
  assert.deepEqual(run({ condition: 'Good', sort: 'price-low' }), ['c', 'b']);
  assert.deepEqual(run({ condition: 'Good', sort: 'price-high' }), ['b', 'c']);
  assert.deepEqual(run({ query: 'calculator', condition: 'Good' }), ['c']);
  assert.deepEqual(run({ query: 'calculator', category: 'calculators', condition: 'Like New' }), ['a']);
  assert.deepEqual(run({ category: 'books', condition: 'Good' }), []);
  assert.deepEqual(run({ sort: 'newest' }), ['d', 'c', 'b', 'a']);
  assert.deepEqual(run({ sort: 'ending-soon' }), ['d', 'c', 'b', 'a']);
  assert.deepEqual(run({ sort: 'price-low' }), ['d', 'c', 'a', 'b']);
  assert.deepEqual(run({ sort: 'price-high' }), ['b', 'a', 'c', 'd']);
});

test('filtering and sorting never modify the original array or its items', () => {
  const copy = JSON.parse(JSON.stringify(SAMPLE));
  filterAndSortListings(SAMPLE, { query: 'a', sort: 'price-high', condition: 'Good' });
  assert.deepEqual(SAMPLE, copy);
});

test('sort names: legacy Module 1 values map, unknown values fall back to newest', () => {
  assert.equal(normalizeSort('bid-low'), 'price-low');
  assert.equal(normalizeSort('bid-high'), 'price-high');
  assert.equal(normalizeSort('zzz'), 'newest');
  assert.equal(normalizeSort('ending-soon'), 'ending-soon');
});

test('featured listings skip closed auctions', () => {
  const list = [L('x', 'x', '', 'other', 'Good', 1, 'c', '2000-01-01T00:00:00Z'), L('y', 'y', '', 'other', 'Good', 1, 'c', '2999-01-01T00:00:00Z')];
  assert.deepEqual(getFeaturedListings(list, Date.now(), 6).map((l) => l.id), ['y']);
});
