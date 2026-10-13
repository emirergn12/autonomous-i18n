import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { LocaleStore, flattenObject, unflattenObject } from '../src/store/index.js';
import { DEFAULT_CONFIG } from '../src/config/index.js';

describe('Store & JSON Utils', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-store-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should flatten and unflatten deep nested objects correctly', () => {
    const original = {
      auth: {
        login: {
          title: 'Sign In',
          subtitle: 'Welcome back',
        },
        register: 'Sign Up',
      },
      common: {
        save: 'Save',
      },
    };

    const flat = flattenObject(original);
    expect(flat).toEqual({
      'auth.login.title': 'Sign In',
      'auth.login.subtitle': 'Welcome back',
      'auth.register': 'Sign Up',
      'common.save': 'Save',
    });

    const unflattened = unflattenObject(flat);
    expect(unflattened).toEqual(original);
  });

  it('should read existing nested JSON locale file', () => {
    const localesDir = path.join(tempDir, 'locales');
    fs.mkdirSync(localesDir);
    fs.writeFileSync(
      path.join(localesDir, 'en.json'),
      JSON.stringify({ button: { submit: 'Submit' } }, null, 2)
    );

    const store = new LocaleStore({ ...DEFAULT_CONFIG, localesDir: './locales' }, tempDir);
    const keys = store.readLocale('en');

    expect(keys).toEqual({ 'button.submit': 'Submit' });
  });

  it('should write keys formatted as nested JSON when configured', () => {
    const store = new LocaleStore(
      { ...DEFAULT_CONFIG, localesDir: './locales', format: 'nested-json' },
      tempDir
    );

    store.writeLocale('tr', {
      'auth.login': 'Giriş Yap',
      'auth.logout': 'Çıkış Yap',
    });

    const filePath = path.join(tempDir, 'locales', 'tr.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content).toEqual({
      auth: {
        login: 'Giriş Yap',
        logout: 'Çıkış Yap',
      },
    });
  });

  it('should update and delete individual keys atomically', () => {
    const store = new LocaleStore(
      { ...DEFAULT_CONFIG, localesDir: './locales', format: 'nested-json' },
      tempDir
    );

    store.writeLocale('de', { 'app.title': 'Willkommen' });
    store.updateKey('de', 'app.subtitle', 'Hallo');

    let keys = store.readLocale('de');
    expect(keys['app.title']).toBe('Willkommen');
    expect(keys['app.subtitle']).toBe('Hallo');

    const deleted = store.deleteKey('de', 'app.title');
    expect(deleted).toBe(true);

    keys = store.readLocale('de');
    expect(keys['app.title']).toBeUndefined();
    expect(keys['app.subtitle']).toBe('Hallo');
  });

  it('should prevent Prototype Pollution in unflattenObject and flattenObject', () => {
    const maliciousFlat = {
      '__proto__.polluted': 'yes',
      'constructor.prototype.polluted': 'yes',
      'safe.key': 'valid',
    };

    const unflattened = unflattenObject(maliciousFlat);
    // Ensure Object.prototype was NOT polluted
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(unflattened.safe).toEqual({ key: 'valid' });

    // Test flattenObject ignores dangerous properties
    const maliciousObj = JSON.parse('{"__proto__": {"isAdmin": true}, "normal": "hello"}');
    const flat = flattenObject(maliciousObj);
    expect(flat['__proto__.isAdmin']).toBeUndefined();
    expect(flat['normal']).toBe('hello');
  });

  it('should prevent Path Traversal attacks in LocaleStore', () => {
    const store = new LocaleStore({ ...DEFAULT_CONFIG, localesDir: './locales' }, tempDir);

    expect(() => store.getLocaleFilePath('../../../etc/passwd')).toThrow(/Security Exception/);
    expect(() => store.getLocaleFilePath('..\\..\\windows')).toThrow(/Security Exception/);
    expect(() => store.getLocaleFilePath('en/evil')).toThrow(/Security Exception/);

    // Safe locales should succeed
    expect(store.getLocaleFilePath('en')).toContain(path.join(tempDir, 'locales', 'en.json'));
    expect(store.getLocaleFilePath('zh-CN')).toContain(path.join(tempDir, 'locales', 'zh-CN.json'));
  });

  it('should block dangerous prototype keys in updateKey and deleteKey', () => {
    const store = new LocaleStore({ ...DEFAULT_CONFIG, localesDir: './locales' }, tempDir);
    store.writeLocale('en', {});

    expect(() => store.updateKey('en', '__proto__.isAdmin', 'true')).toThrow(/Security Exception/);
    expect(() => store.deleteKey('en', 'constructor.prototype.polluted')).toThrow(/Security Exception/);
  });
});
