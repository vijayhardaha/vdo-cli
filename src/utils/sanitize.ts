const INVALID_CHARS_WINDOWS = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
const INVALID_CHARS_UNIX = [':'];

export function sanitizeFilename(name: string, maxLength = 200): string {
  const invalidChars = process.platform === 'win32' ? INVALID_CHARS_WINDOWS : INVALID_CHARS_UNIX;

  let safe = name.trim();

  for (const char of invalidChars) {
    safe = safe.replaceAll(char, '');
  }

  safe = Array.from(safe)
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('');

  if (process.platform === 'win32') {
    safe = safe.replace(/[. ]+$/, '');
  }

  safe = safe.replace(/\s+/g, ' ');

  safe = safe.slice(0, maxLength);

  const cutoffSymbols = /[.!?]/g;
  const matches = [...safe.matchAll(cutoffSymbols)]
    .map((m) => m.index)
    .filter((idx) => idx !== undefined && idx <= maxLength);

  if (matches.length > 0) {
    safe = safe.slice(0, matches[matches.length - 1]);
  }

  return safe.trim() || 'untitled';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
