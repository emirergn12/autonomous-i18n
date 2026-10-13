import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { DEFAULT_CONFIG } from '@i18n-manager/core';

export async function initCommand(options: { cwd?: string } = {}) {
  const cwd = options.cwd ?? process.cwd();
  const configPath = path.join(cwd, 'i18n.config.json');

  if (fs.existsSync(configPath)) {
    const overwrite = await p.confirm({
      message: `${pc.yellow('i18n.config.json')} already exists. Do you want to overwrite it?`,
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Initialization cancelled.');
      return;
    }
  }

  p.intro(pc.bgCyan(pc.black(' 🌐 Autonomous i18n Manager - Setup Wizard ')));

  const sourceLocale = await p.text({
    message: 'What is your primary source language code?',
    placeholder: 'en',
    defaultValue: DEFAULT_CONFIG.sourceLocale,
    validate: (val) => {
      if (!val || val.trim().length < 2) return 'Locale code must be at least 2 characters (e.g. en, tr)';
    },
  });
  if (p.isCancel(sourceLocale)) {
    p.cancel('Initialization cancelled.');
    return;
  }

  const targetLocalesInput = await p.text({
    message: 'Enter target language codes (comma separated):',
    placeholder: 'tr, de, es, fr',
    defaultValue: DEFAULT_CONFIG.targetLocales.join(', '),
  });
  if (p.isCancel(targetLocalesInput)) {
    p.cancel('Initialization cancelled.');
    return;
  }

  const targetLocales = targetLocalesInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const localesDir = await p.text({
    message: 'Where are your locale JSON files stored?',
    placeholder: './locales',
    defaultValue: DEFAULT_CONFIG.localesDir,
  });
  if (p.isCancel(localesDir)) {
    p.cancel('Initialization cancelled.');
    return;
  }

  const format = await p.select({
    message: 'Select JSON structure format:',
    options: [
      { value: 'nested-json', label: 'Nested JSON (e.g. { "auth": { "login": "Log In" } })' },
      { value: 'flat-json', label: 'Flat JSON (e.g. { "auth.login": "Log In" })' },
    ],
    initialValue: 'nested-json',
  });
  if (p.isCancel(format)) {
    p.cancel('Initialization cancelled.');
    return;
  }

  const provider = await p.select({
    message: 'Select default AI Provider for translation:',
    options: [
      { value: 'gemini', label: 'Google Gemini (Recommended - Fast & Structured)' },
      { value: 'openai', label: 'OpenAI (GPT-4o-mini)' },
      { value: 'ollama', label: 'Ollama (Local LLM)' },
      { value: 'mock', label: 'Mock Provider (Offline Testing)' },
    ],
    initialValue: 'gemini',
  });
  if (p.isCancel(provider)) {
    p.cancel('Initialization cancelled.');
    return;
  }

  const configContent = {
    sourceLocale,
    targetLocales,
    localesDir,
    format,
    include: DEFAULT_CONFIG.include,
    exclude: DEFAULT_CONFIG.exclude,
    ai: {
      provider,
    },
    rules: DEFAULT_CONFIG.rules,
  };

  fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2) + '\n', 'utf-8');

  p.outro(pc.green(`✔ Created ${pc.bold('i18n.config.json')} successfully!`));
}
