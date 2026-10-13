import type { TranslationProvider, AIProviderOptions } from '../types/provider.js';
import type { TranslationTaskItem } from '../types/request.js';
import { PromptBuilder } from '../prompt/builder.js';

export class OpenAIProvider implements TranslationProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI / Compatible';

  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private temperature: number;

  constructor(options: AIProviderOptions = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = options.model || 'gpt-4o-mini';
    this.baseUrl = (options.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    this.temperature = options.temperature ?? 0.2;
  }

  async translateBatch(tasks: TranslationTaskItem[]): Promise<Map<string, string>> {
    if (!this.apiKey && !this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1')) {
      throw new Error(
        'OpenAI API key is required. Set it in i18n.config.json or define OPENAI_API_KEY environment variable.'
      );
    }

    if (tasks.length === 0) {
      return new Map();
    }

    const { sourceLocale, targetLocale } = tasks[0];
    const systemInstruction = PromptBuilder.buildSystemPrompt(sourceLocale, targetLocale);
    const userPrompt = PromptBuilder.buildBatchUserPrompt(tasks);

    const url = `${this.baseUrl}/chat/completions`;

    const requestBody = {
      model: this.model,
      temperature: this.temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
      }>;
    };

    const rawContent = json.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('OpenAI returned an empty response.');
    }

    const parsedMap = JSON.parse(rawContent) as Record<string, string>;
    const resultMap = new Map<string, string>();
    for (const [k, v] of Object.entries(parsedMap)) {
      resultMap.set(k, String(v));
    }

    return resultMap;
  }
}
