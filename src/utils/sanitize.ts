/* Invalid filename characters for Windows */
const INVALID_CHARS_WINDOWS = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
/* Invalid filename characters for Unix */
const INVALID_CHARS_UNIX = [':'];

/**
 * Sanitize filename by removing invalid characters.
 *
 * @param {string} name - Original filename.
 * @param {number} [maxLength] - Maximum filename length.
 *
 * @returns {string} Sanitized filename.
 */
export function sanitizeFilename(name: string, maxLength = 200): string {
  /* check: if Windows platform, use Windows invalid chars */
  const invalidChars = process.platform === 'win32' ? INVALID_CHARS_WINDOWS : INVALID_CHARS_UNIX;

  let safe = name.trim();

  for (const char of invalidChars) {
    safe = safe.replaceAll(char, '');
  }

  safe = Array.from(safe)
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('');

  /* check: if Windows, remove trailing dots/spaces */
  if (process.platform === 'win32') {
    safe = safe.replace(/[. ]+$/, '');
  }

  safe = safe.replace(/[\s_]+/g, '-');

  /* check: if filename exceeds max length, truncate at punctuation */
  if (safe.length > maxLength) {
    const cutoffSymbols = /[.!?-]/g;
    const matches = [...safe.matchAll(cutoffSymbols)]
      .map((m) => m.index)
      .filter((idx) => idx !== undefined && idx <= maxLength);

    if (matches.length > 0) {
      safe = safe.slice(0, matches[matches.length - 1]);
    } else {
      safe = safe.slice(0, maxLength);
    }
  }

  return safe.trim() || 'untitled';
}

/**
 * Convert text to URL-friendly slug.
 *
 * @param {string} text - Text to slugify.
 *
 * @returns {string} Slugified text.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
