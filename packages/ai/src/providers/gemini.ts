import type { TranslationProvider, AIProviderOptions } from '../types/provider.js';
import type { TranslationTaskItem } from '../types/request.js';
import { PromptBuilder } from '../prompt/builder.js';

export class GeminiProvider implements TranslationProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';

  private apiKey: string;
  private model: string;
  private temperature: number;

  constructor(options: AIProviderOptions = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = options.model || 'gemini-1.5-flash';
    this.temperature = options.temperature ?? 0.2;
  }

  async translateBatch(tasks: TranslationTaskItem[]): Promise<Map<string, string>> {
    if (!this.apiKey) {
      throw new Error(
        'Gemini API key is required. Set it in i18n.config.json or define GEMINI_API_KEY environment variable.'
      );
    }

    if (tasks.length === 0) {
      return new Map();
    }

    const { sourceLocale, targetLocale } = tasks[0];
    const systemInstruction = PromptBuilder.buildSystemPrompt(sourceLocale, targetLocale);
    const userPrompt = PromptBuilder.buildBatchUserPrompt(tasks);

    // Security Best Practice: Use x-goog-api-key header rather than exposing API key in URL query parameter
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: this.temperature,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const json = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const rawContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      throw new Error('Gemini API returned an empty response.');
    }

    let parsedMap: Record<string, string>;
    try {
      parsedMap = JSON.parse(rawContent);
    } catch {
      // Fallback: clean any code fences
      const cleaned = rawContent.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      parsedMap = JSON.parse(cleaned);
    }

    const resultMap = new Map<string, string>();
    for (const [k, v] of Object.entries(parsedMap)) {
      resultMap.set(k, String(v));
    }

    return resultMap;
  }
}
