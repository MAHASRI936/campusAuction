/**
 * Allowed item conditions, in display order.
 * Stored on each listing as `condition`. Kept free of imports so it can be
 * shared by the form, the browse filters, the storage service and the tests.
 */
export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

export function isValidCondition(value) {
  return CONDITIONS.includes(value);
}
