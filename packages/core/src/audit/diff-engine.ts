import type {
  I18nConfig,
  AuditReport,
  MissingKeyItem,
  DeadKeyItem,
  LocaleHealthDetail,
} from '../types/index.js';
import type { ScanResult } from '../scanner/scanner.js';
import { LocaleStore } from '../store/locale-store.js';

export class DiffEngine {
  private config: I18nConfig;
  private store: LocaleStore;

  constructor(config: I18nConfig, store?: LocaleStore, cwd = process.cwd()) {
    this.config = config;
    this.store = store ?? new LocaleStore(config, cwd);
  }

  /**
   * Generates a comprehensive audit report comparing codebase AST extractions with locale files.
   */
  async runAudit(scanResult: ScanResult): Promise<AuditReport> {
    const { sourceLocale, targetLocales } = this.config;
    const allLocales = this.store.readAllLocales();

    const sourceKeysMap = allLocales[sourceLocale] ?? {};
    const codeKeysMap = scanResult.keysMap;

    // Collect the union of all keys expected: (keys in code + keys in source locale)
    const allKnownKeys = new Set<string>([
      ...codeKeysMap.keys(),
      ...Object.keys(sourceKeysMap),
    ]);

    const missingKeys: MissingKeyItem[] = [];

    // 1. Check Missing Keys in Source Locale
    for (const codeKey of codeKeysMap.keys()) {
      if (!(codeKey in sourceKeysMap)) {
        missingKeys.push({
          key: codeKey,
          targetLocale: sourceLocale,
          sourceValue: undefined,
          contexts: codeKeysMap.get(codeKey) ?? [],
        });
      }
    }

    // 2. Check Missing Keys in Target Locales
    for (const targetLocale of targetLocales) {
      const targetMap = allLocales[targetLocale] ?? {};

      for (const expectedKey of allKnownKeys) {
        if (!(expectedKey in targetMap) || targetMap[expectedKey].trim() === '') {
          missingKeys.push({
            key: expectedKey,
            targetLocale,
            sourceValue: sourceKeysMap[expectedKey],
            contexts: codeKeysMap.get(expectedKey) ?? [],
          });
        }
      }
    }

    // 3. Check Dead Keys (Keys in source or target locale files that are never referenced in code)
    const deadKeys: DeadKeyItem[] = [];
    const allLocaleKeyNames = new Set<string>();

    for (const localeData of Object.values(allLocales)) {
      for (const key of Object.keys(localeData)) {
        allLocaleKeyNames.add(key);
      }
    }

    for (const key of allLocaleKeyNames) {
      if (!codeKeysMap.has(key)) {
        const localesPresent: string[] = [];
        for (const [locale, data] of Object.entries(allLocales)) {
          if (key in data) {
            localesPresent.push(locale);
          }
        }

        deadKeys.push({
          key,
          localesPresent,
          suggestedAction: 'remove',
        });
      }
    }

    // 4. Calculate Health Score and Coverage Metrics
    const totalExpectedKeys = allKnownKeys.size;
    const localeHealth: Record<string, LocaleHealthDetail> = {};
    let totalTargetCoverageSum = 0;

    for (const locale of targetLocales) {
      const missingCount = missingKeys.filter((m) => m.targetLocale === locale).length;
      const coveragePercentage =
        totalExpectedKeys === 0
          ? 100
          : Math.max(0, Math.round(((totalExpectedKeys - missingCount) / totalExpectedKeys) * 1000) / 10);

      localeHealth[locale] = {
        locale,
        totalKeys: totalExpectedKeys,
        missingCount,
        coveragePercentage,
      };

      totalTargetCoverageSum += coveragePercentage;
    }

    const overallHealthScore =
      targetLocales.length === 0
        ? 100
        : Math.round((totalTargetCoverageSum / targetLocales.length) * 10) / 10;

    return {
      timestamp: new Date().toISOString(),
      sourceLocale,
      targetLocales,
      totalSourceKeys: Object.keys(sourceKeysMap).length,
      totalCodeOccurrences: scanResult.totalOccurrences,
      missingKeys,
      deadKeys,
      localeHealth,
      overallHealthScore,
      isHealthy: missingKeys.length === 0,
    };
  }
}
