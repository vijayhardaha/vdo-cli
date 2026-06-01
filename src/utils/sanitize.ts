/**
 * Sanitize filename to safe characters.
 *
 * @param {string} name - Original filename.
 * @param {number} [maxLength] - Maximum filename length.
 *
 * @returns {string} Sanitized filename.
 */
export function sanitizeFilename(name: string, maxLength = 200): string {
  let safe = name.trim();

  // Replace anything not A-Z, a-z, 0-9, dash, or underscore with dash
  safe = safe.replace(/[^A-Za-z0-9_-]/g, '-');

  // Collapse multiple consecutive dashes
  safe = safe.replace(/-+/g, '-');

  // Trim leading/trailing dashes
  safe = safe.replace(/^-+|-+$/g, '');

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
