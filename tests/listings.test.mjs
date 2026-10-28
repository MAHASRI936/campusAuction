// Dependency-free tests for the logic layer. Run with:  npm test   (uses Node's built-in test runner)
import test from 'node:test';
import assert from 'node:assert/strict';

import { validateListing, parsePrice, isValidImageUrl } from '../src/utils/validation.js';
import { filterAndSortListings, normalizeSort, getFeaturedListings } from '../src/utils/listingFilters.js';
import { toLocalInputValue, localInputToIso } from '../src/utils/dateTime.js';
import { createListingsService, StorageError, STORAGE_KEY } from '../src/services/listingsService.js';
import { auctions as SEEDS } from '../src/data/auctions.js';

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

/** Minimal in-memory stand-in for window.localStorage. */
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    failWrites: false,
    getItem(key) { return key in data ? data[key] : null; },
    setItem(key, value) {
      if (this.failWrites) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }
      data[key] = String(value);
    },
    removeItem(key) { delete data[key]; },
  };
}
const makeService = (storage, extra = {}) => createListingsService({ storage, listenToStorageEvents: false, ...extra });

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

// --------------------------------------------------------------------- service

const formData = (over = {}) => ({
  title: 'Hostel study chair', description: 'Sturdy plastic chair, used for one year.', category: 'hostel',
  condition: 'Good', startingPrice: 350, endsAt: new Date(NOW + 48 * 3600 * 1000).toISOString(), imageUrl: null, ...over,
});

test('service starts with all sample listings when storage is empty', () => {
  const service = makeService(fakeStorage());
  assert.equal(service.getAll().length, SEEDS.length);
  assert.equal(service.getById(SEEDS[0].id).title, SEEDS[0].title);
  assert.equal(service.getById('does-not-exist'), null);
});

test('created listing persists across a simulated refresh (new service instance, same storage)', () => {
  const storage = fakeStorage();
  const first = makeService(storage);
  const created = first.create(formData());
  assert.equal(first.getAll().length, SEEDS.length + 1);
  assert.equal(first.getAll().at(-1).id, created.id);

  const afterRefresh = makeService(storage);
  const found = afterRefresh.getById(created.id);
  assert.ok(found, 'listing survives the refresh');
  assert.equal(found.title, 'Hostel study chair');
  assert.equal(found.currentBid, null);
  assert.equal(afterRefresh.getAll().length, SEEDS.length + 1, 'samples are kept too');
  // storage holds only the user listing, not copies of the samples
  assert.equal(JSON.parse(storage.data[STORAGE_KEY]).listings.length, 1);
});

test('ids are unique, including across many creations', () => {
  const service = makeService(fakeStorage());
  const ids = new Set();
  for (let i = 0; i < 200; i += 1) ids.add(service.create(formData({ title: `Item ${i}` })).id);
  assert.equal(ids.size, 200);
  for (const seed of SEEDS) assert.ok(!ids.has(seed.id));
});

test('snapshot is stable between changes and changes after one; subscribers are notified', () => {
  const service = makeService(fakeStorage());
  const before = service.getSnapshot();
  assert.equal(service.getSnapshot(), before);
  let calls = 0;
  const unsubscribe = service.subscribe(() => { calls += 1; });
  service.create(formData());
  assert.equal(calls, 1);
  assert.notEqual(service.getSnapshot(), before);
  unsubscribe();
  service.create(formData());
  assert.equal(calls, 1);
});

test('update changes a user listing and persists it', () => {
  const storage = fakeStorage();
  const service = makeService(storage);
  const created = service.create(formData());
  const updated = service.update(created.id, formData({ title: 'Renamed chair', startingPrice: 800 }));
  assert.equal(updated.title, 'Renamed chair');
  assert.equal(updated.startingPrice, 800);
  assert.equal(updated.createdAt, created.createdAt);
  assert.equal(updated.minIncrement, 40, 'auto bid step follows the new price');
  assert.equal(makeService(storage).getById(created.id).title, 'Renamed chair');
  assert.equal(service.getAll().length, SEEDS.length + 1, 'no duplicate created by an edit');
  assert.equal(service.update('missing', formData()), null);
});

test('editing a sample listing stores an edited copy in the same position; samples are otherwise untouched', () => {
  const storage = fakeStorage();
  const service = makeService(storage);
  const seed = SEEDS[2];
  service.update(seed.id, formData({ title: 'Edited laptop', startingPrice: 9000 }));
  const afterRefresh = makeService(storage);
  assert.equal(afterRefresh.getAll()[2].id, seed.id);
  assert.equal(afterRefresh.getAll()[2].title, 'Edited laptop');
  assert.equal(afterRefresh.getAll()[2].isSample, true);
  assert.equal(afterRefresh.getAll().length, SEEDS.length);
  assert.equal(SEEDS[2].title, 'Used Laptop, Core i5 with 8 GB RAM', 'seed data in code is not mutated');
});

test('delete removes user and sample listings and stays deleted after refresh', () => {
  const storage = fakeStorage();
  const service = makeService(storage);
  const created = service.create(formData());
  assert.equal(service.remove(created.id), true);
  assert.equal(service.getById(created.id), null);
  assert.equal(service.remove(created.id), false, 'deleting twice reports not found');

  assert.equal(service.remove(SEEDS[0].id), true);
  const afterRefresh = makeService(storage);
  assert.equal(afterRefresh.getById(SEEDS[0].id), null);
  assert.equal(afterRefresh.getAll().length, SEEDS.length - 1);
});

test('reset restores the original samples', () => {
  const storage = fakeStorage();
  const service = makeService(storage);
  service.create(formData());
  service.remove(SEEDS[0].id);
  service.reset();
  assert.equal(service.getAll().length, SEEDS.length);
  assert.equal(makeService(storage).getAll().length, SEEDS.length);
});

test('corrupted or invalid saved data is handled safely', () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    for (const raw of ['{not json', 'null', '[]', '"text"', '42', '{"listings":"nope"}', '{"version":1}']) {
      const service = makeService(fakeStorage({ [STORAGE_KEY]: raw }));
      assert.equal(service.getAll().length, SEEDS.length, `survives: ${raw}`);
    }
    // a write after corruption works and replaces the bad data
    const storage = fakeStorage({ [STORAGE_KEY]: '{broken' });
    const service = makeService(storage);
    service.create(formData());
    assert.equal(makeService(storage).getAll().length, SEEDS.length + 1);
  } finally {
    console.warn = originalWarn;
  }
});

test('invalid entries inside otherwise valid saved data are dropped; good ones kept', () => {
  const good = { ...formData(), id: 'good-1', createdAt: '2026-10-01T00:00:00.000Z' };
  const saved = {
    version: 1,
    listings: [
      good,
      { id: 'no-title', startingPrice: 5, endsAt: good.endsAt },
      { ...good, id: 'bad-price', startingPrice: -3 },
      { ...good, id: 'bad-date', endsAt: 'tomorrow-ish' },
      { ...good, id: 'good-1' },                       // duplicate id
      { ...good, id: 'huge-image', imageUrl: 'data:image/png;base64,' + 'A'.repeat(5000) },
      { ...good, id: 'bad-condition', condition: 'Mint' },
      'a string', null, 7,
    ],
    deletedSeedIds: [SEEDS[1].id, 'not-a-seed', 5],
  };
  const service = makeService(fakeStorage({ [STORAGE_KEY]: JSON.stringify(saved) }));
  const ids = service.getAll().map((l) => l.id);
  assert.ok(ids.includes('good-1'));
  assert.equal(ids.filter((id) => id === 'good-1').length, 1);
  assert.ok(!ids.includes('no-title') && !ids.includes('bad-price') && !ids.includes('bad-date'));
  assert.equal(service.getById('huge-image').imageUrl, null, 'base64 image strings are never kept');
  assert.equal(service.getById('bad-condition').condition, 'Good');
  assert.equal(service.getById(SEEDS[1].id), null, 'valid deletedSeedIds entry is honoured');
  assert.equal(service.getAll().length, SEEDS.length - 1 + 3);
});

test('a failed write throws StorageError and leaves the visible data unchanged', () => {
  const storage = fakeStorage();
  const service = makeService(storage);
  const created = service.create(formData());
  storage.failWrites = true;
  const before = service.getSnapshot();
  assert.throws(() => service.create(formData({ title: 'Will not save' })), StorageError);
  assert.throws(() => service.update(created.id, formData({ title: 'Nope' })), /full/i);
  assert.throws(() => service.remove(created.id), StorageError);
  assert.equal(service.getSnapshot(), before);
  assert.equal(service.getById(created.id).title, 'Hostel study chair');
});

test('without localStorage the service still works in memory and reports it', () => {
  const service = makeService(null);
  assert.equal(service.isPersistent(), false);
  const created = service.create(formData());
  assert.ok(service.getById(created.id));
  assert.equal(makeService(fakeStorage()).isPersistent(), true);
});

test('a throwing localStorage.getItem does not crash startup', () => {
  const storage = fakeStorage();
  storage.getItem = () => { throw new Error('SecurityError'); };
  assert.equal(makeService(storage).getAll().length, SEEDS.length);
});
