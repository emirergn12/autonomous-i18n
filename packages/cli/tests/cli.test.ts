import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanCommand } from '../src/commands/scan.js';
import { cleanCommand } from '../src/commands/clean.js';
import { translateCommand } from '../src/commands/translate.js';
import { checkCommand } from '../src/commands/check.js';

describe('CLI Command Suite', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-cli-test-'));

    // Write test configuration
    fs.writeFileSync(
      path.join(tempDir, 'i18n.config.json'),
      JSON.stringify({
        sourceLocale: 'en',
        targetLocales: ['tr'],
        localesDir: './locales',
        format: 'nested-json',
        include: ['src/**/*.tsx'],
        ai: { provider: 'mock' },
        rules: { failOnMissingInCI: false },
      })
    );

    // Create src directory and component
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'App.tsx'),
      `
      export function App() {
        return <button>{t('auth.login_btn')}</button>;
      }
      `
    );

    // Create locales directory and files
    fs.mkdirSync(path.join(tempDir, 'locales'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'locales', 'en.json'),
      JSON.stringify({
        auth: { login_btn: 'Log In' },
        obsolete: { dead_key: 'Old key' },
      })
    );
    fs.writeFileSync(path.join(tempDir, 'locales', 'tr.json'), JSON.stringify({}));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('scanCommand should return audit report with missing and dead keys', async () => {
    const audit = await scanCommand({ cwd: tempDir });
    expect(audit.missingKeys.some((m) => m.key === 'auth.login_btn' && m.targetLocale === 'tr')).toBe(true);
    expect(audit.deadKeys.some((d) => d.key === 'obsolete.dead_key')).toBe(true);
  });

  it('translateCommand should translate missing keys and save to locale JSON', async () => {
    await translateCommand({ cwd: tempDir, autoApprove: true });

    const trContent = JSON.parse(
      fs.readFileSync(path.join(tempDir, 'locales', 'tr.json'), 'utf-8')
    );
    expect(trContent.auth?.login_btn).toBe('[TR] Log In');
  });

  it('cleanCommand should remove dead keys when forced', async () => {
    await cleanCommand({ cwd: tempDir, force: true });

    const enContent = JSON.parse(
      fs.readFileSync(path.join(tempDir, 'locales', 'en.json'), 'utf-8')
    );
    expect(enContent.obsolete?.dead_key).toBeUndefined();
    expect(enContent.auth?.login_btn).toBe('Log In');
  });

  it('checkCommand should generate Markdown report file when requested', async () => {
    const reportPath = path.join(tempDir, 'report.md');
    await checkCommand({ cwd: tempDir, format: 'markdown', outputFile: reportPath });

    expect(fs.existsSync(reportPath)).toBe(true);
    const content = fs.readFileSync(reportPath, 'utf-8');
    expect(content).toContain('## 🌐 i18n Localization Check Report');
    expect(content).toContain('auth.login_btn');
  });
});
