import type { TranslationTaskItem } from './request.js';

export interface AIProviderOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  systemPromptAddition?: string;
}

export interface TranslationProvider {
  readonly id: string;
  readonly name: string;
  translateBatch(tasks: TranslationTaskItem[]): Promise<Map<string, string>>;
}
