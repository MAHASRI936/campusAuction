/**
 * One consistent error type for every database / auth call, so the UI can show a
 * clear message without knowing anything about Supabase error shapes.
 * Errors are never swallowed: the original error is kept in `cause` and logged
 * once for developers.
 */
export class ServiceError extends Error {
  constructor(message, { code = 'unknown', cause } = {}) {
    super(message);
    this.name = 'ServiceError';
    this.code = code; // 'network' | 'auth' | 'permission' | 'not_found' | 'invalid' | 'config' | 'unknown'
    this.cause = cause;
  }
}

const isNetworkProblem = (error) => {
  const text = `${error?.name ?? ''} ${error?.message ?? ''}`.toLowerCase();
  return (
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('network request failed') ||
    text.includes('load failed') ||
    text.includes('retryablefetch')
  );
};

/** Turn a Supabase / PostgREST error into a ServiceError with a friendly message. */
export function toServiceError(error, fallbackMessage = 'Something went wrong. Please try again.') {
  if (error instanceof ServiceError) return error;

  if (isNetworkProblem(error)) {
    return new ServiceError('Could not reach the server. Check your internet connection and try again.', {
      code: 'network',
      cause: error,
    });
  }

  const dbCode = error?.code;
  if (dbCode === '42501' || dbCode === 'PGRST301' || error?.status === 401 || error?.status === 403) {
    return new ServiceError('You do not have permission to do that. Log in again and make sure the listing is yours.', {
      code: 'permission',
      cause: error,
    });
  }
  if (dbCode === 'PGRST116') {
    return new ServiceError('That listing could not be found.', { code: 'not_found', cause: error });
  }
  // Module 4: raised by the database when the seller edits price/deadline after bids exist.
  if (dbCode === 'CA001') {
    return new ServiceError(
      'The starting price, minimum increment and closing time cannot be changed after bids have been placed.',
      { code: 'locked', cause: error },
    );
  }
  // Lock wait timed out: many bids on the same auction at once.
  if (dbCode === '55P03') {
    return new ServiceError('This auction is very busy right now. Please try again in a moment.', {
      code: 'busy',
      cause: error,
    });
  }
  // A bidding function is missing: migration 004 has not been run.
  if (dbCode === '42883' || dbCode === 'PGRST202') {
    return new ServiceError(
      'Bidding is not set up in the database yet. Run supabase/migrations/004_bidding.sql in the Supabase SQL Editor (see the README).',
      { code: 'config', cause: error },
    );
  }
  if (dbCode === '23514' || dbCode === '23502' || dbCode === '22P02' || dbCode === '22007') {
    return new ServiceError('Some of the listing details were not accepted by the database. Check the values and try again.', {
      code: 'invalid',
      cause: error,
    });
  }
  if (dbCode === '23503') {
    return new ServiceError('Your account profile was not found. Log out, log in again and retry.', {
      code: 'invalid',
      cause: error,
    });
  }
  if (dbCode === '42P01' || dbCode === 'PGRST205') {
    return new ServiceError(
      'The database tables are missing. Run supabase/schema.sql in the Supabase SQL Editor (see the README).',
      { code: 'config', cause: error },
    );
  }

  return new ServiceError(fallbackMessage, { code: 'unknown', cause: error });
}

/** Log the underlying error once (for developers) and return the friendly ServiceError. */
export function failWith(error, fallbackMessage) {
  const serviceError = toServiceError(error, fallbackMessage);
  if (serviceError.cause) console.error('CampusAuction:', serviceError.cause);
  return serviceError;
}
