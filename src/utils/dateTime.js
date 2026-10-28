const pad = (value) => String(value).padStart(2, '0');

/**
 * Convert a Date / ISO string to the value format used by
 * <input type="datetime-local">, in the user's LOCAL time zone,
 * e.g. "2026-11-02T18:30". Returns '' for invalid input.
 */
export function toLocalInputValue(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Convert a datetime-local value (local time) to a UTC ISO string.
 * Returns null when the value is empty or not a valid date.
 */
export function localInputToIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
