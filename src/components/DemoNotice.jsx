import Notice from './Notice.jsx';
import { listingsService } from '../services/listingsService.js';

/**
 * Reminder shown wherever listings can be created, edited or deleted.
 * There is no login yet, so this must never be presented as secure ownership.
 */
export default function DemoNotice({ className = '' }) {
  const persistent = listingsService.isPersistent();

  return (
    <div className={`space-y-3 ${className}`}>
      <Notice type="warning" title="Demo listing management">
        Listings are saved only in this browser, and there is no login yet. Anyone using this browser can
        create, edit or delete any listing. Real seller accounts and ownership checks arrive with
        authentication in a later module.
      </Notice>
      {!persistent && (
        <Notice type="error" title="Browser storage is unavailable">
          Your changes will be lost when you refresh or close this tab. Allow site storage (and leave private
          browsing) to keep your listings.
        </Notice>
      )}
    </div>
  );
}
