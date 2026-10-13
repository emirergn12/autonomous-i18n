import type { ExtractedKeyContext } from '@i18n-manager/core';

export interface TranslationTaskItem {
  key: string;
  sourceText: string;
  sourceLocale: string;
  targetLocale: string;
  context?: ExtractedKeyContext;
  detectedPlaceholders?: string[];
}

export interface TranslationItemResult {
  key: string;
  targetLocale: string;
  sourceText: string;
  translatedText: string;
  isValid: boolean;
  missingPlaceholders: string[];
  repaired: boolean;
  error?: string;
}

export interface BatchTranslationResult {
  results: TranslationItemResult[];
  totalTasks: number;
  successful: number;
  failed: number;
  repairedCount: number;
}
