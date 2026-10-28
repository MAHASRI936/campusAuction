import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Save } from 'lucide-react';
import FormField, { describeField } from './FormField.jsx';
import ListingImageField from './ListingImageField.jsx';
import Notice from './Notice.jsx';
import { categories } from '../data/categories.js';
import { CONDITIONS } from '../data/conditions.js';
import { LIMITS, validateListing } from '../utils/validation.js';
import { toLocalInputValue } from '../utils/dateTime.js';

const CATEGORY_IDS = categories.map((category) => category.id);

function initialValues(listing) {
  if (!listing) {
    return { title: '', description: '', category: '', condition: '', startingPrice: '', endsAt: '' };
  }
  return {
    title: listing.title,
    description: listing.description,
    category: listing.category,
    condition: listing.condition,
    startingPrice: String(listing.startingPrice),
    endsAt: toLocalInputValue(listing.endsAt),
  };
}

function initialImage(listing) {
  const sessionOnly = Boolean(listing?.sessionImageUrl) && !listing?.imageUrl;
  return { mode: sessionOnly ? 'upload' : 'url', url: listing?.imageUrl ?? '', file: null, keepSession: sessionOnly };
}

function imageActionFor(image) {
  if (image.mode === 'upload') {
    if (image.file) return { type: 'attach', file: image.file };
    if (image.keepSession) return { type: 'keep' };
  }
  return { type: 'remove' };
}

/**
 * Create / edit form for a listing.
 *
 * listing:  the listing being edited, or null/undefined when creating
 * onSubmit: ({ data, imageAction }) => void. Throw an Error to show a message above the buttons.
 * cancelTo: where the Cancel button goes (nothing is saved)
 */
export default function ListingForm({ listing = null, onSubmit, cancelTo, submitLabel = 'Create listing' }) {
  const isEdit = Boolean(listing);
  const [values, setValues] = useState(() => initialValues(listing));
  const [image, setImage] = useState(() => initialImage(listing));
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function runValidation(nextValues, nextImage) {
    return validateListing(
      { ...nextValues, imageUrl: nextImage.mode === 'url' ? nextImage.url : '' },
      { categoryIds: CATEGORY_IDS, original: listing },
    );
  }

  function setField(name, value) {
    const next = { ...values, [name]: value };
    setValues(next);
    // Once a field has shown an error (or the form was submitted), re-check it while typing.
    if (submitted || errors[name]) {
      setErrors((current) => ({ ...current, [name]: runValidation(next, image).errors[name] }));
    }
  }

  function handleImageChange(nextImage) {
    setImage(nextImage);
    if (submitted || errors.imageUrl) {
      setErrors((current) => ({ ...current, imageUrl: runValidation(values, nextImage).errors.imageUrl }));
    }
  }

  function handleBlur(name) {
    if (!submitted && String(values[name] ?? '').trim() === '') return; // don't nag on empty fields before submit
    setErrors((current) => ({ ...current, [name]: runValidation(values, image).errors[name] }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitted(true);
    setSubmitError('');
    const result = runValidation(values, image);
    setErrors(result.errors);

    if (!result.ok) {
      const firstInvalid = Object.keys(result.errors)[0];
      document.getElementById(`listing-${firstInvalid}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      onSubmit({ data: result.data, imageAction: imageActionFor(image) });
    } catch (error) {
      setSubmitError(error?.message || 'Something went wrong while saving. Please try again.');
      setSubmitting(false);
    }
  }

  const errorCount = Object.keys(errors).filter((key) => errors[key]).length;
  const inputClass = (name) => `field-input ${errors[name] ? 'border-rose-400 focus:border-rose-500' : ''}`;
  const minEnd = isEdit ? undefined : toLocalInputValue(Date.now());

  return (
    <form onSubmit={handleSubmit} noValidate className="card space-y-6 p-5 sm:p-8">
      {submitted && errorCount > 0 && (
        <Notice type="error" title={`Please fix ${errorCount === 1 ? '1 field' : `${errorCount} fields`} and try again.`}>
          The fields that need attention are marked below.
        </Notice>
      )}

      <FormField
        id="listing-title"
        label="Item title"
        required
        error={errors.title}
        hint={`${values.title.trim().length}/${LIMITS.titleMax} characters`}
      >
        <input
          {...describeField('listing-title', { error: errors.title, hint: true })}
          type="text"
          value={values.title}
          onChange={(event) => setField('title', event.target.value)}
          onBlur={() => handleBlur('title')}
          maxLength={LIMITS.titleMax + 20}
          autoComplete="off"
          placeholder="e.g. Casio fx-991EX scientific calculator"
          className={inputClass('title')}
        />
      </FormField>

      <FormField
        id="listing-description"
        label="Detailed description"
        required
        error={errors.description}
        hint={`Condition, what is included, any defects. ${values.description.trim().length}/${LIMITS.descriptionMax} characters`}
      >
        <textarea
          {...describeField('listing-description', { error: errors.description, hint: true })}
          rows={6}
          value={values.description}
          onChange={(event) => setField('description', event.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder="Describe the item: how long you used it, what works, anything buyers should know."
          className={inputClass('description')}
        />
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="listing-category" label="Category" required error={errors.category}>
          <select
            {...describeField('listing-category', { error: errors.category })}
            value={values.category}
            onChange={(event) => setField('category', event.target.value)}
            className={inputClass('category')}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="listing-condition" label="Item condition" required error={errors.condition}>
          <select
            {...describeField('listing-condition', { error: errors.condition })}
            value={values.condition}
            onChange={(event) => setField('condition', event.target.value)}
            className={inputClass('condition')}
          >
            <option value="">Select the condition</option>
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          id="listing-startingPrice"
          label="Starting price (INR)"
          required
          error={errors.startingPrice}
          hint="Whole rupees, for example 500."
        >
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500"
              aria-hidden="true"
            >
              ₹
            </span>
            <input
              {...describeField('listing-startingPrice', { error: errors.startingPrice, hint: true })}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={values.startingPrice}
              onChange={(event) => setField('startingPrice', event.target.value)}
              onBlur={() => handleBlur('startingPrice')}
              placeholder="500"
              className={`${inputClass('startingPrice')} pl-8`}
            />
          </div>
        </FormField>

        <FormField
          id="listing-endsAt"
          label="Auction end date and time"
          required
          error={errors.endsAt}
          hint="Must be in the future. Uses your device’s time zone."
        >
          <input
            {...describeField('listing-endsAt', { error: errors.endsAt, hint: true })}
            type="datetime-local"
            value={values.endsAt}
            min={minEnd}
            onChange={(event) => setField('endsAt', event.target.value)}
            onBlur={() => handleBlur('endsAt')}
            className={inputClass('endsAt')}
          />
        </FormField>
      </div>

      <ListingImageField
        value={image}
        onChange={handleImageChange}
        error={errors.imageUrl}
        sessionImageUrl={listing?.sessionImageUrl}
      />

      {submitError && (
        <Notice type="error" title="Your listing was not saved">
          {submitError}
        </Notice>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:justify-end">
        <Link to={cancelTo} className="btn-secondary">
          Cancel
        </Link>
        <button type="submit" disabled={submitting} className="btn-primary">
          <Save className="h-4 w-4" aria-hidden="true" />
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
