import { useEffect, useState } from 'react';
import { ImageOff, ImagePlus, Link2, Trash2, Upload } from 'lucide-react';
import FormField, { describeField } from './FormField.jsx';
import Notice from './Notice.jsx';
import { isValidImageUrl } from '../utils/validation.js';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Image part of the listing form: paste an image URL (saved permanently) or choose a
 * file (preview + shown only until refresh, see services/sessionImages.js).
 *
 * value:    { mode: 'url' | 'upload', url, file, keepSession }
 * onChange: receives the next value object
 * error:    validation message for the URL field
 * sessionImageUrl: an image uploaded earlier in this tab for the listing being edited
 */
export default function ListingImageField({ value, onChange, error, sessionImageUrl }) {
  const [fileError, setFileError] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [filePreview, setFilePreview] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);

  // Preview of a newly chosen file; the object URL is released when the file changes.
  useEffect(() => {
    if (!value.file) {
      setFilePreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(value.file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value.file]);

  const trimmedUrl = value.url.trim();
  const previewSrc =
    value.mode === 'url'
      ? trimmedUrl && isValidImageUrl(trimmedUrl)
        ? trimmedUrl
        : null
      : filePreview || (value.keepSession ? sessionImageUrl || null : null);
  const previewBroken = previewSrc !== null && failedSrc === previewSrc;

  function switchMode(mode) {
    setFileError('');
    onChange({ ...value, mode });
  }

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Choose a JPG, PNG, WebP or GIF image.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Choose an image under 5 MB.`);
      event.target.value = '';
      return;
    }
    setFileError('');
    onChange({ ...value, file, keepSession: false });
  }

  function removeImage() {
    setFileError('');
    setFileInputKey((key) => key + 1);
    onChange({ ...value, url: value.mode === 'url' ? '' : value.url, file: null, keepSession: false });
  }

  const canRemove = value.mode === 'url' ? trimmedUrl !== '' : Boolean(value.file) || (value.keepSession && sessionImageUrl);

  return (
    <fieldset>
      <legend className="field-label">Item image (optional)</legend>

      <div role="group" aria-label="Image source" className="inline-flex rounded-xl border border-ink-200 bg-white p-1">
        <ModeButton active={value.mode === 'url'} onClick={() => switchMode('url')} icon={Link2}>
          Image URL
        </ModeButton>
        <ModeButton active={value.mode === 'upload'} onClick={() => switchMode('upload')} icon={Upload}>
          Upload a file
        </ModeButton>
      </div>

      <div className="mt-3">
        {value.mode === 'url' ? (
          <FormField
            id="listing-imageUrl"
            label="Image link"
            error={error}
            hint="Paste a link to a photo, starting with https://. This is saved with the listing."
          >
            <input
              {...describeField('listing-imageUrl', { error, hint: true })}
              type="url"
              inputMode="url"
              autoComplete="off"
              value={value.url}
              onChange={(event) => onChange({ ...value, url: event.target.value })}
              placeholder="https://example.com/photo.jpg"
              className={`field-input ${error ? 'border-rose-400 focus:border-rose-500' : ''}`}
            />
          </FormField>
        ) : (
          <div className="space-y-3">
            <FormField
              id="listing-imageFile"
              label="Image file"
              error={fileError}
              hint="JPG, PNG, WebP or GIF, up to 5 MB."
            >
              <input
                key={fileInputKey}
                {...describeField('listing-imageFile', { error: fileError, hint: true })}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleFile}
                className="field-input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-800 hover:file:bg-brand-100"
              />
            </FormField>
            <Notice type="info">
              Uploaded images are not saved yet: this one is shown only to you, in this tab, until you refresh or
              close it. For a permanent image that everyone can see, use an image URL. Permanent uploads arrive
              with cloud storage in a later module.
            </Notice>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="mt-4">
        <p className="mb-1.5 text-sm font-medium text-ink-700">Preview</p>
        <div className="flex h-48 items-center justify-center overflow-hidden rounded-xl border border-dashed border-ink-200 bg-ink-50">
          {previewSrc && !previewBroken ? (
            <img
              key={previewSrc}
              src={previewSrc}
              alt="Selected item preview"
              referrerPolicy="no-referrer"
              onError={() => setFailedSrc(previewSrc)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="px-4 text-center text-sm text-ink-500">
              {previewBroken ? (
                <>
                  <ImageOff className="mx-auto mb-2 h-7 w-7" aria-hidden="true" />
                  This image could not be loaded. Check the link, or the listing will use a category
                  illustration instead.
                </>
              ) : (
                <>
                  <ImagePlus className="mx-auto mb-2 h-7 w-7" aria-hidden="true" />
                  No image selected. A category illustration will be shown instead.
                </>
              )}
            </div>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={removeImage}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-rose-700 hover:text-rose-800"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove image
          </button>
        )}
      </div>
    </fieldset>
  );
}

function ModeButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-brand-700 text-white' : 'text-ink-700 hover:bg-brand-50'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}
