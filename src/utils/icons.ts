import isUnicodeSupported from 'is-unicode-supported';
import { blue, green, yellow, red, white } from 'yoctocolors';

/* Check terminal unicode support for icon display */
const _isUnicodeSupported = isUnicodeSupported();

/* Info icon - blue colored */
export const info = blue(_isUnicodeSupported ? 'ℹ' : 'i');
/* Success icon - green colored with checkmark */
export const success = green(_isUnicodeSupported ? '✔' : '√');
/* Warning icon - yellow colored with warning symbol */
export const warning = yellow(_isUnicodeSupported ? '⚠' : '‼');
/* Error icon - red colored with X */
export const error = red(_isUnicodeSupported ? '✖' : '×');
/* Loading icon - white colored spinner */
export const loading = white(_isUnicodeSupported ? '' : '');
