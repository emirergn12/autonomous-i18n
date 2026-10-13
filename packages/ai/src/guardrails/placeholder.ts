/**
 * Comprehensive regex patterns for software localization variables & placeholders:
 * 1. Double curly: {{userName}}, {{ count }}
 * 2. Single curly: {name}, {count, plural, ...}
 * 3. Printf style: %s, %d, %1$s, %.2f
 * 4. Tag markers: <0>, </0>, <bold>, </bold>
 */
const PLACEHOLDER_PATTERNS = [
  /\{\{\s*[\p{L}\p{N}_.-]+\s*\}\}/gu, // {{userName}} or {{kullanıcı_adı}}
  /\{[\p{L}\p{N}_.-]+(?:\s*,\s*[^}]+)?\}/gu, // {name} or {kullanıcıAdı} or {count, plural, ...}
  /%(?:\d+\$)?[+-]?(?:[ 0]|'.)?-?\d*(?:\.\d+)?[bcdeEfgGosuxX]/g, // %s, %d, %1$s
  /<\/?\w+(?:\s+[^>]*)?>/g, // <0>, </0>, <link>
];

/**
 * Extracts all localization variables/placeholders from a string.
 */
export function extractPlaceholders(text: string): string[] {
  const placeholders = new Set<string>();

  for (const pattern of PLACEHOLDER_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        placeholders.add(match);
      }
    }
  }

  return Array.from(placeholders);
}

/**
 * Masks placeholders with neutral token delimiters (e.g., __SLOT_0__)
 * so that LLMs will never attempt to translate the internal token names.
 */
export function maskPlaceholders(text: string): {
  maskedText: string;
  tokenMap: Map<string, string>;
} {
  const placeholders = extractPlaceholders(text);
  const tokenMap = new Map<string, string>();
  let maskedText = text;

  // Sort placeholders by length descending to prevent substring collisions
  placeholders.sort((a, b) => b.length - a.length);

  placeholders.forEach((placeholder, index) => {
    const slot = `__SLOT_${index}__`;
    tokenMap.set(slot, placeholder);
    // Global replace
    maskedText = maskedText.split(placeholder).join(slot);
  });

  return { maskedText, tokenMap };
}

/**
 * Restores original placeholder tokens back into the translated string.
 */
export function unmaskPlaceholders(
  maskedText: string,
  tokenMap: Map<string, string>
): string {
  let result = maskedText;
  for (const [slot, original] of tokenMap.entries()) {
    result = result.split(slot).join(original);
  }
  return result;
}

export interface PlaceholderValidationResult {
  isValid: boolean;
  sourcePlaceholders: string[];
  translatedPlaceholders: string[];
  missingPlaceholders: string[];
  extraPlaceholders: string[];
}

/**
 * Validates that all placeholders present in the source text are strictly preserved in the translated text.
 */
export function validatePlaceholders(
  sourceText: string,
  translatedText: string
): PlaceholderValidationResult {
  const sourcePlaceholders = extractPlaceholders(sourceText);
  const translatedPlaceholders = extractPlaceholders(translatedText);

  const missingPlaceholders = sourcePlaceholders.filter(
    (p) => !translatedText.includes(p)
  );

  const sourceSet = new Set(sourcePlaceholders);
  const extraPlaceholders = translatedPlaceholders.filter((p) => !sourceSet.has(p));

  return {
    isValid: missingPlaceholders.length === 0,
    sourcePlaceholders,
    translatedPlaceholders,
    missingPlaceholders,
    extraPlaceholders,
  };
}

/**
 * Attempts automated heuristic repair if an LLM translated or dropped placeholders.
 */
export function autoRepairPlaceholders(
  sourceText: string,
  translatedText: string
): { repairedText: string; repaired: boolean } {
  const validation = validatePlaceholders(sourceText, translatedText);
  if (validation.isValid) {
    return { repairedText: translatedText, repaired: false };
  }

  let repaired = translatedText;

  // If a single placeholder is missing and there is an extra translated placeholder, replace it
  if (
    validation.missingPlaceholders.length === 1 &&
    validation.extraPlaceholders.length === 1
  ) {
    repaired = repaired.replace(
      validation.extraPlaceholders[0],
      validation.missingPlaceholders[0]
    );
    return { repairedText: repaired, repaired: true };
  }

  // If missing placeholders were completely dropped, append them safely to prevent runtime runtime errors
  for (const missing of validation.missingPlaceholders) {
    if (!repaired.includes(missing)) {
      repaired = `${repaired} ${missing}`;
    }
  }

  return { repairedText: repaired, repaired: true };
}
