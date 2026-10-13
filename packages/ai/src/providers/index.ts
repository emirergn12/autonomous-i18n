import type { AIConfig } from '@i18n-manager/core';
import type { TranslationProvider } from '../types/provider.js';
import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import { MockProvider } from './mock.js';

export * from './gemini.js';
export * from './openai.js';
export * from './mock.js';

export function createProvider(config?: AIConfig): TranslationProvider {
  const providerType = config?.provider ?? 'gemini';

  switch (providerType) {
    case 'gemini':
      return new GeminiProvider({
        apiKey: config?.apiKey,
        model: config?.model,
        temperature: config?.temperature,
        systemPromptAddition: config?.systemPromptAddition,
      });

    case 'openai':
      return new OpenAIProvider({
        apiKey: config?.apiKey,
        model: config?.model,
        baseUrl: config?.baseUrl,
        temperature: config?.temperature,
        systemPromptAddition: config?.systemPromptAddition,
      });

    case 'ollama':
      return new OpenAIProvider({
        baseUrl: config?.baseUrl ?? 'http://localhost:11434/v1',
        model: config?.model ?? 'llama3',
        temperature: config?.temperature,
      });

    default:
      return new MockProvider();
  }
}
