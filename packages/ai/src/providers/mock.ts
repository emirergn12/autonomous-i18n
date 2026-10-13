import type { TranslationProvider, AIProviderOptions } from '../types/provider.js';
import type { TranslationTaskItem } from '../types/request.js';

export class MockProvider implements TranslationProvider {
  readonly id = 'mock';
  readonly name = 'Mock Offline Provider';

  constructor(private options: AIProviderOptions = {}) {}

  async translateBatch(tasks: TranslationTaskItem[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const task of tasks) {
      // Predictable mock translations for testing
      const target = task.targetLocale.toLowerCase();
      let translated = task.sourceText;

      if (target === 'tr') {
        if (task.sourceText.includes('Welcome')) {
          translated = task.sourceText.replace('Welcome', 'Hoş geldiniz');
        } else if (task.sourceText.includes('Upgrade Plan')) {
          translated = 'Planı Yükselt';
        } else if (task.sourceText.includes('Tax Notice')) {
          translated = 'Vergi Bildirimi';
        } else if (task.sourceText.includes('Save')) {
          translated = 'Kaydet';
        } else {
          translated = `[TR] ${task.sourceText}`;
        }
      } else if (target === 'de') {
        if (task.sourceText.includes('Save')) {
          translated = 'Speichern';
        } else {
          translated = `[DE] ${task.sourceText}`;
        }
      } else {
        translated = `[${target.toUpperCase()}] ${task.sourceText}`;
      }

      results.set(task.key, translated);
    }

    return results;
  }
}
