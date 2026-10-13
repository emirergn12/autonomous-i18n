import type { I18nConfig } from '../types/config.js';

export const DEFAULT_CONFIG: I18nConfig = {
  sourceLocale: 'en',
  targetLocales: ['tr', 'de', 'es', 'fr'],
  localesDir: './locales',
  format: 'nested-json',
  include: ['src/**/*.{ts,tsx,js,jsx,vue}'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/*.test.*',
    '**/*.spec.*',
  ],
  translationFunctions: ['t', '$t', 'formatMessage'],
  rules: {
    preservePlaceholders: true,
    enforceICU: true,
    trimWhitespace: true,
    failOnMissingInCI: true,
  },
  ai: {
    provider: 'gemini',
    temperature: 0.2,
  },
};
