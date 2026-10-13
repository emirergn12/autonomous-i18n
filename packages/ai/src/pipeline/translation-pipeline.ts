import type { I18nConfig } from '@i18n-manager/core';
import type { TranslationProvider } from '../types/provider.js';
import type {
  TranslationTaskItem,
  TranslationItemResult,
  BatchTranslationResult,
} from '../types/request.js';
import {
  extractPlaceholders,
  maskPlaceholders,
  unmaskPlaceholders,
  validatePlaceholders,
  autoRepairPlaceholders,
} from '../guardrails/placeholder.js';
import { createProvider } from '../providers/index.js';

export interface PipelineOptions {
  batchSize?: number;
  provider?: TranslationProvider;
}

export class TranslationPipeline {
  private provider: TranslationProvider;
  private batchSize: number;

  constructor(config?: I18nConfig, options: PipelineOptions = {}) {
    this.provider = options.provider ?? createProvider(config?.ai);
    this.batchSize = options.batchSize ?? 25;
  }

  /**
   * Executes the full translation pipeline with batching, variable masking, and guardrails.
   */
  async processBatch(tasks: TranslationTaskItem[]): Promise<BatchTranslationResult> {
    if (tasks.length === 0) {
      return {
        results: [],
        totalTasks: 0,
        successful: 0,
        failed: 0,
        repairedCount: 0,
      };
    }

    // 1. Group tasks by target locale
    const tasksByLocale = new Map<string, TranslationTaskItem[]>();
    for (const task of tasks) {
      const group = tasksByLocale.get(task.targetLocale) ?? [];
      group.push(task);
      tasksByLocale.set(task.targetLocale, group);
    }

    const allResults: TranslationItemResult[] = [];
    let repairedCount = 0;

    for (const [, localeTasks] of tasksByLocale.entries()) {
      // Chunk into batch size
      for (let i = 0; i < localeTasks.length; i += this.batchSize) {
        const chunk = localeTasks.slice(i, i + this.batchSize);

        // 2. Pre-process: detect and mask placeholders
        const maskMaps = new Map<string, Map<string, string>>();
        const maskedTasks: TranslationTaskItem[] = chunk.map((task) => {
          const detected = extractPlaceholders(task.sourceText);
          const { maskedText, tokenMap } = maskPlaceholders(task.sourceText);
          maskMaps.set(task.key, tokenMap);

          return {
            ...task,
            sourceText: maskedText,
            detectedPlaceholders: detected,
          };
        });

        // 3. Dispatch to LLM Provider
        let rawTranslations = new Map<string, string>();
        let batchError: string | undefined;

        try {
          rawTranslations = await this.provider.translateBatch(maskedTasks);
        } catch (err: unknown) {
          batchError = err instanceof Error ? err.message : String(err);
        }

        // 4. Post-process: unmask, validate and auto-repair
        for (const originalTask of chunk) {
          if (batchError || !rawTranslations.has(originalTask.key)) {
            allResults.push({
              key: originalTask.key,
              targetLocale: originalTask.targetLocale,
              sourceText: originalTask.sourceText,
              translatedText: '',
              isValid: false,
              missingPlaceholders: [],
              repaired: false,
              error: batchError ?? `No translation received for key ${originalTask.key}`,
            });
            continue;
          }

          const rawTranslated = rawTranslations.get(originalTask.key)!;
          const tokenMap = maskMaps.get(originalTask.key) ?? new Map();
          const unmasked = unmaskPlaceholders(rawTranslated, tokenMap);

          // Guardrail validation
          const validation = validatePlaceholders(originalTask.sourceText, unmasked);
          let finalText = unmasked;
          let wasRepaired = false;

          if (!validation.isValid) {
            const repairResult = autoRepairPlaceholders(originalTask.sourceText, unmasked);
            finalText = repairResult.repairedText;
            wasRepaired = repairResult.repaired;
            if (wasRepaired) repairedCount++;
          }

          allResults.push({
            key: originalTask.key,
            targetLocale: originalTask.targetLocale,
            sourceText: originalTask.sourceText,
            translatedText: finalText,
            isValid: validatePlaceholders(originalTask.sourceText, finalText).isValid,
            missingPlaceholders: validation.missingPlaceholders,
            repaired: wasRepaired,
          });
        }
      }
    }

    const successful = allResults.filter((r) => r.isValid && !r.error).length;
    const failed = allResults.length - successful;

    return {
      results: allResults,
      totalTasks: allResults.length,
      successful,
      failed,
      repairedCount,
    };
  }
}
