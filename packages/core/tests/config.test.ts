import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadConfig, DEFAULT_CONFIG } from '../src/config/index.js';
import { I18nConfigSchema } from '../src/types/config.js';

describe('Config System', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should load default configuration when no config file is present', () => {
    const config = loadConfig({ cwd: tempDir });
    expect(config.sourceLocale).toBe('en');
    expect(config.targetLocales).toEqual(['tr', 'de', 'es', 'fr']);
    expect(config.format).toBe('nested-json');
    expect(config.rules.preservePlaceholders).toBe(true);
    expect(config.rules.failOnMissingInCI).toBe(true);
  });

  it('should correctly load and merge i18n.config.json from project directory', () => {
    const customConfig = {
      sourceLocale: 'tr',
      targetLocales: ['en', 'de'],
      localesDir: './src/i18n',
      format: 'flat-json',
      rules: {
        preservePlaceholders: false,
      },
    };

    fs.writeFileSync(
      path.join(tempDir, 'i18n.config.json'),
      JSON.stringify(customConfig, null, 2)
    );

    const config = loadConfig({ cwd: tempDir });
    expect(config.sourceLocale).toBe('tr');
    expect(config.targetLocales).toEqual(['en', 'de']);
    expect(config.localesDir).toBe('./src/i18n');
    expect(config.format).toBe('flat-json');
    // Overridden rule
    expect(config.rules.preservePlaceholders).toBe(false);
    // Preserved default rule
    expect(config.rules.failOnMissingInCI).toBe(true);
  });

  it('should apply runtime overrides cleanly', () => {
    const config = loadConfig({
      cwd: tempDir,
      overrides: {
        sourceLocale: 'es',
        targetLocales: ['pt', 'it'],
      },
    });

    expect(config.sourceLocale).toBe('es');
    expect(config.targetLocales).toEqual(['pt', 'it']);
  });

  it('should throw an error on invalid configuration schema', () => {
    const invalidConfig = {
      sourceLocale: 'e', // too short (< 2 chars)
      format: 'invalid-format',
    };

    fs.writeFileSync(
      path.join(tempDir, 'i18n.config.json'),
      JSON.stringify(invalidConfig, null, 2)
    );

    expect(() => loadConfig({ cwd: tempDir })).toThrow(/Invalid i18n configuration/);
  });
});
