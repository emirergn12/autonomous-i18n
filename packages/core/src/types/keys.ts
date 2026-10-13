import type { ExtractedKeyContext } from './context.js';

export type TranslationFormat = 'nested-json' | 'flat-json';

/**
 * Normalized key-value pair for a specific locale.
 * Keys are always stored in dot-notation internally (e.g. 'auth.login.submit').
 */
export type LocaleKeyMap = Record<string, string>;

/**
 * Representation of a key's global status across all monitored locales.
 */
export type TranslationStatus = 'synced' | 'missing' | 'untranslated' | 'stale';

/**
 * Metadata record for a single translation key.
 */
export interface TranslationKeyMetadata {
  key: string;
  sourceValue?: string;
  translations: Record<string, string | undefined>;
  contexts: ExtractedKeyContext[];
  status: TranslationStatus;
  isDead: boolean;
}
