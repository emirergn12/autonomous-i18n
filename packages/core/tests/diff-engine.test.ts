import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DiffEngine } from '../src/audit/index.js';
import { LocaleStore } from '../src/store/index.js';
import type { ScanResult } from '../src/scanner/index.js';
import type { I18nConfig } from '../src/types/index.js';

describe('DiffEngine & Audit', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-diff-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should accurately detect missing keys, dead keys, and calculate health score', async () => {
    const config: I18nConfig = {
      sourceLocale: 'en',
      targetLocales: ['tr', 'de'],
      localesDir: './locales',
      format: 'nested-json',
      include: ['src/**/*.tsx'],
      exclude: [],
      translationFunctions: ['t'],
      rules: {
        preservePlaceholders: true,
        enforceICU: true,
        trimWhitespace: true,
        failOnMissingInCI: true,
      },
    };

    const store = new LocaleStore(config, tempDir);

    // en.json has:
    // 'auth.login' (used in code)
    // 'auth.forgot_password' (used in code)
    // 'legacy.deprecated_key' (DEAD: never used in code!)
    store.writeLocale('en', {
      'auth.login': 'Log In',
      'auth.forgot_password': 'Forgot Password?',
      'legacy.deprecated_key': 'Old feature',
    });

    // tr.json only has 'auth.login'
    store.writeLocale('tr', {
      'auth.login': 'Giriş Yap',
    });

    // de.json has 'auth.login' and 'auth.forgot_password'
    store.writeLocale('de', {
      'auth.login': 'Anmelden',
      'auth.forgot_password': 'Passwort vergessen?',
    });

    // Code references: 'auth.login', 'auth.forgot_password', AND 'checkout.pay' (MISSING everywhere!)
    const scanResult: ScanResult = {
      keysMap: new Map([
        [
          'auth.login',
          [
            {
              key: 'auth.login',
              filePath: 'src/Login.tsx',
              line: 5,
              column: 10,
              uiRole: 'button',
              inferredParameters: [],
            },
          ],
        ],
        [
          'auth.forgot_password',
          [
            {
              key: 'auth.forgot_password',
              filePath: 'src/Login.tsx',
              line: 12,
              column: 10,
              uiRole: 'label',
              inferredParameters: [],
            },
          ],
        ],
        [
          'checkout.pay',
          [
            {
              key: 'checkout.pay',
              filePath: 'src/Cart.tsx',
              line: 25,
              column: 10,
              uiRole: 'button',
              inferredParameters: [],
            },
          ],
        ],
      ]),
      totalOccurrences: 3,
      scannedFiles: ['src/Login.tsx', 'src/Cart.tsx'],
    };

    const engine = new DiffEngine(config, store, tempDir);
    const report = await engine.runAudit(scanResult);

    // 1. Missing keys:
    // - 'checkout.pay' missing in 'en'
    // - 'auth.forgot_password' and 'checkout.pay' missing in 'tr'
    // - 'checkout.pay' missing in 'de'
    expect(report.missingKeys.some((m) => m.key === 'checkout.pay' && m.targetLocale === 'en')).toBe(true);
    expect(report.missingKeys.some((m) => m.key === 'auth.forgot_password' && m.targetLocale === 'tr')).toBe(true);
    expect(report.missingKeys.some((m) => m.key === 'checkout.pay' && m.targetLocale === 'de')).toBe(true);

    // 2. Dead keys:
    // 'legacy.deprecated_key' is never in code
    expect(report.deadKeys).toHaveLength(1);
    expect(report.deadKeys[0].key).toBe('legacy.deprecated_key');
    expect(report.deadKeys[0].localesPresent).toContain('en');

    // 3. Health check:
    expect(report.isHealthy).toBe(false);
    expect(report.localeHealth['tr'].missingCount).toBeGreaterThan(0);
    expect(report.overallHealthScore).toBeLessThan(100);
  });
});
