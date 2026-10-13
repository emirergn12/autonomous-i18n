import { describe, it, expect } from 'vitest';
import { PromptBuilder } from '../src/prompt/index.js';
import type { TranslationTaskItem } from '../src/types/request.js';

describe('PromptBuilder Engine', () => {
  it('should generate software localization system instructions with role guidelines', () => {
    const systemPrompt = PromptBuilder.buildSystemPrompt('en', 'tr');

    expect(systemPrompt).toContain('Software Localization');
    expect(systemPrompt).toContain('from \'en\' to \'tr\'');
    expect(systemPrompt).toContain('button');
    expect(systemPrompt).toContain('placeholder');
    expect(systemPrompt).toContain('NEVER translate, modify, or drop any placeholders');
  });

  it('should format user batch prompts including UI roles and developer comments', () => {
    const tasks: TranslationTaskItem[] = [
      {
        key: 'checkout.submit',
        sourceText: 'Proceed to Payment',
        sourceLocale: 'en',
        targetLocale: 'tr',
        context: {
          key: 'checkout.submit',
          filePath: 'src/Checkout.tsx',
          line: 42,
          column: 10,
          componentName: 'CheckoutForm',
          parentElement: 'button',
          uiRole: 'button',
          inferredParameters: [],
          comment: 'Primary CTA button',
        },
      },
    ];

    const userPrompt = PromptBuilder.buildBatchUserPrompt(tasks);

    expect(userPrompt).toContain('checkout.submit');
    expect(userPrompt).toContain('Proceed to Payment');
    expect(userPrompt).toContain('CheckoutForm');
    expect(userPrompt).toContain('Primary CTA button');
  });
});
