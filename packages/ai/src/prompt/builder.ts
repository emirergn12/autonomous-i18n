import type { TranslationTaskItem } from '../types/request.js';

export class PromptBuilder {
  /**
   * Generates a context-aware system instruction for the LLM.
   */
  static buildSystemPrompt(sourceLocale: string, targetLocale: string, customAddition?: string): string {
    return [
      `You are an expert Software Localization (i18n/L10n) and Developer Tools Engine.`,
      `Your task is to translate software UI strings from '${sourceLocale}' to '${targetLocale}'.`,
      ``,
      `CRITICAL SOFTWARE LOCALIZATION RULES:`,
      `1. PRESERVE VARIABLES & PLACEHOLDERS:`,
      `   - NEVER translate, modify, or drop any placeholders like {count}, {{userName}}, %s, %d, or tokens like __SLOT_0__.`,
      `   - Keep HTML/JSX tags like <0>...</0> or <bold>...</bold> intact with exact numeric indices.`,
      `2. UI CONTEXT REGISTER:`,
      `   - For 'button': Use concise, imperative action verbs (e.g., 'Save' -> 'Kaydet', 'Checkout' -> 'Ödemeye Geç').`,
      `   - For 'heading': Use appropriate title capitalization for the target locale.`,
      `   - For 'error' or 'alert': Ensure natural, user-friendly phrasing without robotic literal translations.`,
      `   - For 'placeholder': Use guiding input hint conventions (e.g., 'Enter email...' -> 'E-posta adresinizi girin...').`,
      `3. CODE KEY CONVENTION:`,
      `   - Use the key name (e.g. 'auth.forgot_password') and surrounding component context to disambiguate homonyms.`,
      `4. STRICT OUTPUT:`,
      `   - You MUST output ONLY a valid JSON object matching the requested schema. Do not add markdown code fences or explanatory text.`,
      customAddition ? `\nADDITIONAL INSTRUCTIONS:\n${customAddition}` : '',
    ].filter(Boolean).join('\n');
  }

  /**
   * Formats a batch of translation tasks into a structured JSON input for the LLM.
   */
  static buildBatchUserPrompt(tasks: TranslationTaskItem[]): string {
    const payload = tasks.map((task) => ({
      key: task.key,
      source: task.sourceText,
      uiRole: task.context?.uiRole ?? 'unknown',
      component: task.context?.componentName,
      comment: task.context?.comment,
      parameters: task.detectedPlaceholders ?? [],
    }));

    return [
      `Translate the following batch of software strings into the target locale.`,
      `Return a JSON object where each key corresponds to the given key, and the value is the translated string.`,
      ``,
      `Example response format:`,
      `{`,
      `  "auth.login": "Giriş Yap",`,
      `  "user.welcome": "Hoş geldin, {userName}"`,
      `}`,
      ``,
      `STRINGS TO TRANSLATE:`,
      JSON.stringify(payload, null, 2),
    ].join('\n');
  }
}
