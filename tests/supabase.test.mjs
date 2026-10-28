// Tests for the Module 3 logic that does not need a live Supabase project:
// config checks, column mapping, auth validation/errors, the optional localStorage import, error mapping.
// Run with:  npm test   (Node's built-in runner, no extra packages)
import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateSupabaseConfig, isSecretKey } from '../src/lib/supabaseConfig.js';
import { rowToListing, listingToInsertRow, listingToUpdateRow, suggestMinIncrement } from '../src/utils/listingMapper.js';
import { validateLogin, validateRegister, safeRedirectPath } from '../src/utils/authValidation.js';
import { friendlyAuthError, isObfuscatedExistingUser } from '../src/utils/authErrors.js';
import { toServiceError, ServiceError } from '../src/services/serviceError.js';
import { findImportableListings, markImported, toImportable, LEGACY_STORAGE_KEY, IMPORTED_IDS_KEY } from '../src/services/legacyLocalListings.js';
import { auctions as SAMPLES } from '../src/data/auctions.js';

const b64url = (object) => Buffer.from(JSON.stringify(object)).toString('base64url');
const jwt = (role) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ role })}.signature`;

// ------------------------------------------------------------------ config

test('config: missing values are reported with clear messages', () => {
  const result = evaluateSupabaseConfig({});
  assert.equal(result.ok, false);
  assert.equal(result.problems.length, 2);
  assert.match(result.problems[0], /VITE_SUPABASE_URL/);
  assert.match(result.problems[1], /VITE_SUPABASE_ANON_KEY/);
});

test('config: placeholder text from .env.example is rejected', () => {
  const result = evaluateSupabaseConfig({ url: 'https://your-project-ref.supabase.co', key: 'your-anon-key-here' });
  assert.equal(result.ok, false);
  assert.equal(result.problems.length, 2);
});

test('config: valid https url + anon key passes; plain http only for localhost', () => {
  assert.equal(evaluateSupabaseConfig({ url: 'https://abcdxyz.supabase.co', key: jwt('anon') }).ok, true);
  assert.equal(evaluateSupabaseConfig({ url: 'https://abcdxyz.supabase.co', key: 'sb_publishable_abc123' }).ok, true);
  assert.equal(evaluateSupabaseConfig({ url: 'http://127.0.0.1:54321', key: jwt('anon') }).ok, true);
  assert.equal(evaluateSupabaseConfig({ url: 'http://abcdxyz.supabase.co', key: jwt('anon') }).ok, false);
  assert.equal(evaluateSupabaseConfig({ url: 'not a url', key: jwt('anon') }).ok, false);
});

test('config: secret / service-role keys are refused', () => {
  assert.equal(isSecretKey('sb_secret_abcdef'), true);
  assert.equal(isSecretKey(jwt('service_role')), true);
  assert.equal(isSecretKey(jwt('anon')), false);
  assert.equal(isSecretKey('sb_publishable_abc'), false);
  const result = evaluateSupabaseConfig({ url: 'https://abcdxyz.supabase.co', key: jwt('service_role') });
  assert.equal(result.ok, false);
  assert.match(result.problems[0], /SECRET/);
});

// ------------------------------------------------------------------ mapping

const row = (over = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  seller_id: '22222222-2222-4222-8222-222222222222',
  title: 'Casio calculator',
  description: 'Works fine.',
  category: 'calculators',
  condition: 'Like New',
  starting_price: '400.00', // PostgREST can return numerics as strings
  current_price: null,
  min_increment: 25,
  pickup_location: '',
  image_url: null,
  status: 'active',
  ends_at: '2026-11-02T10:00:00+00:00',
  created_at: '2026-10-28T10:00:00+00:00',
  updated_at: '2026-10-28T10:00:00+00:00',
  ...over,
});

test('mapper: database row becomes the frontend listing shape', () => {
  const listing = rowToListing(row());
  assert.deepEqual(Object.keys(listing).sort(), [
    'category', 'condition', 'createdAt', 'currentBid', 'description', 'endsAt', 'id', 'imageUrl',
    'minIncrement', 'pickupLocation', 'sellerId', 'startingPrice', 'status', 'title', 'updatedAt',
  ]);
  assert.equal(listing.startingPrice, 400);
  assert.equal(listing.currentBid, null, 'NULL current_price means no bids yet');
  assert.equal(listing.sellerId, '22222222-2222-4222-8222-222222222222');
  assert.equal(rowToListing(row({ current_price: '550.00' })).currentBid, 550);
});

test('mapper: unusable rows and bad values are handled', () => {
  assert.equal(rowToListing(null), null);
  assert.equal(rowToListing({}), null);
  assert.equal(rowToListing(row({ starting_price: null })), null);
  assert.equal(rowToListing(row({ image_url: 'javascript:alert(1)' })).imageUrl, null);
  assert.equal(rowToListing(row({ condition: 'Mint' })).condition, 'Good');
});

test('mapper: insert row never contains seller_id, current_price, status or timestamps', () => {
  const insert = listingToInsertRow({
    title: 'Chair', description: 'A sturdy chair, one year old.', category: 'hostel', condition: 'Good',
    startingPrice: 350, endsAt: '2026-11-01T00:00:00.000Z', imageUrl: null,
  });
  for (const forbidden of ['seller_id', 'current_price', 'status', 'created_at', 'updated_at', 'id']) {
    assert.ok(!(forbidden in insert), `${forbidden} must not be sent`);
  }
  assert.equal(insert.starting_price, 350);
  assert.equal(insert.min_increment, suggestMinIncrement(350));
  assert.equal(insert.image_url, null);
  assert.equal(listingToInsertRow({ ...insert, startingPrice: 1, title: 't', description: '', category: 'other', condition: 'New', endsAt: 'x' }, { id: 'abc' }).id, 'abc');
});

test('mapper: update row only has editable columns and keeps the bid step in sync', () => {
  const base = rowToListing(row({ starting_price: 400, min_increment: suggestMinIncrement(400) }));
  const update = listingToUpdateRow({ title: 'New title', startingPrice: 800 }, base);
  assert.deepEqual(Object.keys(update).sort(), [
    'category', 'condition', 'description', 'ends_at', 'image_url', 'min_increment', 'starting_price', 'title',
  ]);
  assert.equal(update.min_increment, suggestMinIncrement(800));
  const custom = rowToListing(row({ starting_price: 400, min_increment: 77 }));
  assert.equal(listingToUpdateRow({ startingPrice: 800 }, custom).min_increment, 77, 'custom steps are left alone');
  assert.equal(listingToUpdateRow({ imageUrl: null }, rowToListing(row({ image_url: 'https://a.b/c.jpg' }))).image_url, null);
});

// ------------------------------------------------------------------ auth validation

test('login validation', () => {
  assert.deepEqual(Object.keys(validateLogin({ email: '', password: '' }).errors).sort(), ['email', 'password']);
  assert.ok(validateLogin({ email: 'nope', password: 'x' }).errors.email);
  const ok = validateLogin({ email: '  Me@Example.EDU ', password: 'secret' });
  assert.equal(ok.ok, true);
  assert.equal(ok.data.email, 'me@example.edu');
});

test('registration validation', () => {
  const good = { fullName: '  Asha   K ', email: 'asha@example.edu', password: 'longenough1', confirmPassword: 'longenough1' };
  const ok = validateRegister(good);
  assert.equal(ok.ok, true);
  assert.equal(ok.data.fullName, 'Asha K');
  assert.ok(validateRegister({ ...good, fullName: '' }).errors.fullName);
  assert.ok(validateRegister({ ...good, email: 'asha@' }).errors.email);
  assert.match(validateRegister({ ...good, password: 'short', confirmPassword: 'short' }).errors.password, /at least 8/);
  assert.match(validateRegister({ ...good, confirmPassword: 'different1' }).errors.confirmPassword, /do not match/);
  assert.ok(validateRegister({ ...good, password: 'x'.repeat(73), confirmPassword: 'x'.repeat(73) }).errors.password);
});

test('redirect paths stay inside the app', () => {
  assert.equal(safeRedirectPath('/sell'), '/sell');
  assert.equal(safeRedirectPath('/auctions?q=lamp', '/'), '/auctions?q=lamp');
  for (const bad of ['//evil.com', 'https://evil.com', 'javascript:alert(1)', '/\\evil', undefined, 5, '/login', '/register']) {
    assert.equal(safeRedirectPath(bad, '/home'), '/home', String(bad));
  }
});

// ------------------------------------------------------------------ error messages

test('auth errors become friendly messages', () => {
  assert.match(friendlyAuthError({ code: 'invalid_credentials' }), /Incorrect email or password/);
  assert.match(friendlyAuthError({ message: 'Invalid login credentials' }), /Incorrect email or password/);
  assert.match(friendlyAuthError({ code: 'email_not_confirmed' }), /confirm your email/i);
  assert.match(friendlyAuthError({ code: 'user_already_exists' }, 'register'), /already exists/);
  assert.match(friendlyAuthError({ message: 'User already registered' }, 'register'), /already exists/);
  assert.match(friendlyAuthError({ code: 'weak_password' }, 'register'), /too weak/);
  assert.match(friendlyAuthError({ status: 429 }), /Too many attempts/);
  assert.match(friendlyAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }), /Could not reach the server/);
  assert.match(friendlyAuthError({}, 'register'), /Could not create your account/);
});

test('an existing email with confirmation ON is detected (empty identities)', () => {
  assert.equal(isObfuscatedExistingUser({ identities: [] }), true);
  assert.equal(isObfuscatedExistingUser({ identities: [{ id: 1 }] }), false);
  assert.equal(isObfuscatedExistingUser(null), false);
});

test('database errors become ServiceErrors with safe messages', () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal(toServiceError({ message: 'TypeError: Failed to fetch' }).code, 'network');
    assert.equal(toServiceError({ code: '42501', message: 'row-level security' }).code, 'permission');
    assert.equal(toServiceError({ code: 'PGRST116' }).code, 'not_found');
    assert.equal(toServiceError({ code: '23514' }).code, 'invalid');
    assert.equal(toServiceError({ code: '42P01' }).code, 'config');
    const unknown = toServiceError({ code: 'XX000', message: 'internal details' }, 'Fallback text');
    assert.equal(unknown.message, 'Fallback text', 'raw database text is not shown to users');
    const same = new ServiceError('x');
    assert.equal(toServiceError(same), same);
  } finally {
    console.error = originalError;
  }
});

// ------------------------------------------------------------------ optional localStorage import

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: (key) => { delete data[key]; },
  };
}
const legacy = (over = {}) => ({
  id: '33333333-3333-4333-8333-333333333333', title: 'My old chair', description: 'Sturdy chair for sale.', category: 'hostel',
  condition: 'Good', startingPrice: 350, currentBid: null, minIncrement: 20, endsAt: '2030-01-01T00:00:00.000Z',
  pickupLocation: '', imageUrl: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', ...over,
});
const store = (listings) => fakeStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify({ version: 1, listings, deletedSeedIds: [] }) });

test('import: nothing is offered when there is no saved data or storage', () => {
  assert.deepEqual(findImportableListings(fakeStorage()), { importable: [], skipped: 0 });
  assert.deepEqual(findImportableListings(null), { importable: [], skipped: 0 });
  assert.deepEqual(findImportableListings(fakeStorage({ [LEGACY_STORAGE_KEY]: '{broken' })), { importable: [], skipped: 0 });
});

test('import: user listings are offered, samples and edited samples never are', () => {
  const edited = { ...legacy({ id: SAMPLES[0].id, title: 'Edited sample' }), isSample: true };
  const found = findImportableListings(store([legacy(), edited]));
  assert.equal(found.importable.length, 1);
  assert.equal(found.importable[0].id, '33333333-3333-4333-8333-333333333333');
  assert.equal(found.skipped, 0, 'samples are ignored, not counted as skipped');
});

test('import: records the database would reject are skipped and counted', () => {
  const found = findImportableListings(store([
    legacy(),
    legacy({ id: '44444444-4444-4444-8444-444444444444', title: 'ab' }),
    legacy({ id: '55555555-5555-4555-8555-555555555555', category: 'cars' }),
    legacy({ id: '66666666-6666-4666-8666-666666666666', startingPrice: -4 }),
    legacy({ id: 'not-a-uuid' }),
    'junk', null,
  ]));
  assert.equal(found.importable.length, 1);
  assert.equal(found.skipped, 6);
  assert.equal(toImportable(legacy({ imageUrl: 'data:image/png;base64,AAAA' })).imageUrl, null);
});

test('import: marking ids as imported hides them and never touches the old data', () => {
  const storage = store([legacy()]);
  const before = storage.data[LEGACY_STORAGE_KEY];
  markImported(['33333333-3333-4333-8333-333333333333'], storage);
  assert.deepEqual(findImportableListings(storage), { importable: [], skipped: 0 });
  assert.equal(storage.data[LEGACY_STORAGE_KEY], before, 'old listing data is left exactly as it was');
  assert.ok(storage.data[IMPORTED_IDS_KEY]);
});
