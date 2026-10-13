import type { ExtractedKeyContext } from './context.js';

export interface MissingKeyItem {
  key: string;
  targetLocale: string;
  sourceValue?: string;
  contexts: ExtractedKeyContext[];
}

export interface DeadKeyItem {
  key: string;
  localesPresent: string[];
  suggestedAction: 'remove' | 'keep';
}

export interface IncompleteKeyItem {
  key: string;
  sourceValue: string;
  missingInLocales: string[];
}

export interface LocaleHealthDetail {
  locale: string;
  totalKeys: number;
  missingCount: number;
  coveragePercentage: number;
}

export interface AuditReport {
  timestamp: string;
  sourceLocale: string;
  targetLocales: string[];
  totalSourceKeys: number;
  totalCodeOccurrences: number;
  missingKeys: MissingKeyItem[];
  deadKeys: DeadKeyItem[];
  localeHealth: Record<string, LocaleHealthDetail>;
  overallHealthScore: number; // 0 to 100
  isHealthy: boolean;
}
