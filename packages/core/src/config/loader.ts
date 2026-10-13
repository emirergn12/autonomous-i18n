import fs from 'node:fs';
import path from 'node:path';
import { I18nConfigSchema, type I18nConfig, type I18nConfigInput } from '../types/config.js';
import { DEFAULT_CONFIG } from './defaults.js';

export const CONFIG_FILENAMES = [
  'i18n.config.json',
  '.i18nrc.json',
  '.i18nrc',
];

export interface LoadConfigOptions {
  cwd?: string;
  configPath?: string;
  overrides?: Partial<I18nConfigInput>;
}

/**
 * Searches and loads configuration from the project directory, validating against Zod schema.
 */
export function loadConfig(options: LoadConfigOptions = {}): I18nConfig {
  const cwd = options.cwd ?? process.cwd();

  let rawConfig: Record<string, unknown> = {};

  if (options.configPath) {
    const fullPath = path.isAbsolute(options.configPath)
      ? options.configPath
      : path.resolve(cwd, options.configPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Config file not found at specified path: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    rawConfig = JSON.parse(content);
  } else {
    for (const filename of CONFIG_FILENAMES) {
      const fullPath = path.resolve(cwd, filename);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          rawConfig = JSON.parse(content);
          break;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`Failed to parse config file at ${fullPath}: ${message}`);
        }
      }
    }
  }

  // Merge with overrides
  const merged = {
    ...DEFAULT_CONFIG,
    ...rawConfig,
    ...options.overrides,
    rules: {
      ...DEFAULT_CONFIG.rules,
      ...((rawConfig.rules as Record<string, unknown>) ?? {}),
      ...(options.overrides?.rules ?? {}),
    },
    ai: {
      ...DEFAULT_CONFIG.ai,
      ...((rawConfig.ai as Record<string, unknown>) ?? {}),
      ...(options.overrides?.ai ?? {}),
    },
  };

  const parsed = I18nConfigSchema.safeParse(merged);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `[${issue.path.join('.')}] ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid i18n configuration: ${errorDetails}`);
  }

  return parsed.data;
}
