import isUnicodeSupported from 'is-unicode-supported';
import { blue, green, yellow, red, cyan, gray } from 'yoctocolors';

const _isUnicodeSupported = isUnicodeSupported();

export const info = blue(_isUnicodeSupported ? 'ℹ' : 'i');
export const success = green(_isUnicodeSupported ? '✔' : '√');
export const warning = yellow(_isUnicodeSupported ? '⚠' : '‼');
export const error = red(_isUnicodeSupported ? '✖' : '×');
export const loading = gray(_isUnicodeSupported ? '' : '');
export const text = cyan(_isUnicodeSupported ? '' : '');
