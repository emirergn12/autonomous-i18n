import { describe, it, expect } from 'vitest';
import { TranslationPipeline } from '../src/pipeline/index.js';
import { MockProvider } from '../src/providers/index.js';
import type { TranslationTaskItem } from '../src/types/request.js';

describe('TranslationPipeline', () => {
  it('should process batch translations with variable masking and validation', async () => {
    const pipeline = new TranslationPipeline(undefined, {
      provider: new MockProvider(),
      batchSize: 10,
    });

    const tasks: TranslationTaskItem[] = [
      {
        key: 'common.welcome',
        sourceText: 'Welcome, {name}!',
        sourceLocale: 'en',
        targetLocale: 'tr',
      },
      {
        key: 'billing.upgrade',
        sourceText: 'Upgrade Plan',
        sourceLocale: 'en',
        targetLocale: 'tr',
      },
      {
        key: 'common.save',
        sourceText: 'Save',
        sourceLocale: 'en',
        targetLocale: 'de',
      },
    ];

    const result = await pipeline.processBatch(tasks);

    expect(result.totalTasks).toBe(3);
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);

    const welcomeResult = result.results.find((r) => r.key === 'common.welcome');
    expect(welcomeResult).toBeDefined();
    expect(welcomeResult?.translatedText).toContain('{name}');
    expect(welcomeResult?.isValid).toBe(true);

    const deResult = result.results.find((r) => r.key === 'common.save' && r.targetLocale === 'de');
    expect(deResult?.translatedText).toBe('Speichern');
  });
});
