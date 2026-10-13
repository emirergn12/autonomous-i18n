import fs from 'node:fs';
import path from 'node:path';
import type { I18nConfig, LocaleKeyMap } from '../types/index.js';
import { flattenObject, unflattenObject } from './json-utils.js';

export class LocaleStore {
  private config: I18nConfig;
  private basePath: string;

  constructor(config: I18nConfig, cwd = process.cwd()) {
    this.config = config;
    this.basePath = path.isAbsolute(config.localesDir)
      ? config.localesDir
      : path.resolve(cwd, config.localesDir);
  }

  /**
   * Resolves the full path to a locale file (e.g., './locales/en.json').
   * Enforces strict validation against Path Traversal vulnerabilities.
   */
  getLocaleFilePath(locale: string): string {
    const trimmed = (locale || '').trim();
    if (!trimmed || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      throw new Error(`Security Exception: Invalid locale identifier "${locale}". Only alphanumeric characters, hyphens, and underscores are permitted.`);
    }

    const resolved = path.resolve(this.basePath, `${trimmed}.json`);
    const resolvedBase = path.resolve(this.basePath);

    // Guard against directory traversal escaping basePath
    if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
      throw new Error(`Security Exception: Path traversal attempt detected for locale "${locale}".`);
    }

    return resolved;
  }

  /**
   * Checks whether a locale file exists on disk.
   */
  hasLocaleFile(locale: string): boolean {
    return fs.existsSync(this.getLocaleFilePath(locale));
  }

  /**
   * Reads and normalizes a locale's keys into a flat dot-notation map.
   */
  readLocale(locale: string): LocaleKeyMap {
    const filePath = this.getLocaleFilePath(locale);
    if (!fs.existsSync(filePath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content.trim()) return {};
      const parsed = JSON.parse(content);
      return flattenObject(parsed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to read locale file for "${locale}" at ${filePath}: ${message}`);
    }
  }

  /**
   * Reads all configured locales (source + targets) and returns a map of locale -> flat keys.
   */
  readAllLocales(): Record<string, LocaleKeyMap> {
    const locales = Array.from(
      new Set([this.config.sourceLocale, ...this.config.targetLocales])
    );

    const result: Record<string, LocaleKeyMap> = {};
    for (const locale of locales) {
      result[locale] = this.readLocale(locale);
    }
    return result;
  }

  /**
   * Writes the provided flat dot-notation keys to the locale file.
   * Serializes as nested JSON or flat JSON according to config.
   */
  writeLocale(locale: string, flatKeys: LocaleKeyMap): void {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }

    const filePath = this.getLocaleFilePath(locale);

    let outputObject: Record<string, unknown>;
    if (this.config.format === 'nested-json') {
      outputObject = unflattenObject(flatKeys);
    } else {
      // flat-json: sort keys alphabetically
      const sortedKeys = Object.keys(flatKeys).sort((a, b) => a.localeCompare(b));
      outputObject = {};
      for (const key of sortedKeys) {
        outputObject[key] = flatKeys[key];
      }
    }

    const serialized = JSON.stringify(outputObject, null, 2) + '\n';
    fs.writeFileSync(filePath, serialized, 'utf-8');
  }

  /**
   * Updates or inserts a single key in the specified locale.
   */
  updateKey(locale: string, key: string, value: string): void {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('Key identifier cannot be empty.');
    }
    if (key.includes('__proto__') || key.includes('constructor') || key.includes('prototype')) {
      throw new Error(`Security Exception: Prohibited key identifier containing prototype properties.`);
    }

    const current = this.readLocale(locale);
    current[key] = value;
    this.writeLocale(locale, current);
  }

  /**
   * Removes a key from the specified locale file if it exists.
   */
  deleteKey(locale: string, key: string): boolean {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('Key identifier cannot be empty.');
    }
    if (key.includes('__proto__') || key.includes('constructor') || key.includes('prototype')) {
      throw new Error(`Security Exception: Prohibited key identifier containing prototype properties.`);
    }

    const current = this.readLocale(locale);
    if (key in current) {
      delete current[key];
      this.writeLocale(locale, current);
      return true;
    }
    return false;
  }
}
