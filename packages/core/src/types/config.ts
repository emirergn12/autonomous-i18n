import { z } from 'zod';

export const AIProviderSchema = z.enum(['gemini', 'openai', 'anthropic', 'ollama', 'mock']);
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const AIConfigSchema = z.object({
  provider: AIProviderSchema.default('gemini'),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.2),
  systemPromptAddition: z.string().optional(),
});
export type AIConfig = z.infer<typeof AIConfigSchema>;

export const FormatSchema = z.enum(['nested-json', 'flat-json']).default('nested-json');
export type Format = z.infer<typeof FormatSchema>;

export const RulesSchema = z.object({
  preservePlaceholders: z.boolean().default(true),
  enforceICU: z.boolean().default(true),
  trimWhitespace: z.boolean().default(true),
  failOnMissingInCI: z.boolean().default(true),
});
export type RulesConfig = z.infer<typeof RulesSchema>;

export const I18nConfigSchema = z.object({
  /** Source/master language code (e.g., 'en') */
  sourceLocale: z.string().min(2).default('en'),
  /** Target language codes to sync translations to */
  targetLocales: z.array(z.string().min(2)).default(['tr', 'de', 'es', 'fr']),
  /** Directory containing locale JSON/YAML files */
  localesDir: z.string().default('./locales'),
  /** Storage layout for locale files */
  format: FormatSchema,
  /** Glob patterns for source code files to scan */
  include: z.array(z.string()).default(['src/**/*.{ts,tsx,js,jsx,vue}']),
  /** Glob patterns to exclude from scanning */
  exclude: z.array(z.string()).default([
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/*.test.*',
    '**/*.spec.*',
  ]),
  /** Function names recognized in AST as translation calls (e.g. t, $t, formatMessage) */
  translationFunctions: z.array(z.string()).default(['t', '$t', 'formatMessage']),
  /** AI translation options */
  ai: AIConfigSchema.optional(),
  /** Quality and validation rules */
  rules: RulesSchema.default({
    preservePlaceholders: true,
    enforceICU: true,
    trimWhitespace: true,
    failOnMissingInCI: true,
  }),
});

export type I18nConfig = z.infer<typeof I18nConfigSchema>;
export type I18nConfigInput = z.input<typeof I18nConfigSchema>;
