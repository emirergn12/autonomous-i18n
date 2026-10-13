import { describe, it, expect } from 'vitest';
import {
  extractPlaceholders,
  maskPlaceholders,
  unmaskPlaceholders,
  validatePlaceholders,
  autoRepairPlaceholders,
} from '../src/guardrails/index.js';

describe('AI Guardrails - Placeholder Engine', () => {
  it('should extract various software placeholders accurately', () => {
    const text = 'Welcome {{userName}}, you have {count} items. Download %s from <0>here</0>.';
    const placeholders = extractPlaceholders(text);

    expect(placeholders).toContain('{{userName}}');
    expect(placeholders).toContain('{count}');
    expect(placeholders).toContain('%s');
    expect(placeholders).toContain('<0>');
    expect(placeholders).toContain('</0>');
  });

  it('should mask and unmask placeholders cleanly without data loss', () => {
    const text = 'Hello {name}, your balance is {balance} USD (%d).';
    const { maskedText, tokenMap } = maskPlaceholders(text);

    expect(maskedText).not.toContain('{name}');
    expect(maskedText).not.toContain('{balance}');
    expect(maskedText).toContain('__SLOT_');

    // Simulate translation preserving slot tokens
    const simulatedTranslation = maskedText
      .replace('Hello', 'Merhaba')
      .replace('your balance is', 'bakiyeniz')
      .replace('USD', 'TL');

    const restored = unmaskPlaceholders(simulatedTranslation, tokenMap);
    expect(restored).toContain('{name}');
    expect(restored).toContain('{balance}');
    expect(restored).toContain('Merhaba {name}');
  });

  it('should detect when placeholders are missing or corrupted', () => {
    const source = 'Welcome back, {userName}!';
    const faultyTranslation = 'Tekrar hoş geldiniz, {kullanıcıAdı}!'; // LLM mistakenly translated variable

    const validation = validatePlaceholders(source, faultyTranslation);
    expect(validation.isValid).toBe(false);
    expect(validation.missingPlaceholders).toEqual(['{userName}']);
    expect(validation.extraPlaceholders).toEqual(['{kullanıcıAdı}']);
  });

  it('should auto-repair translated placeholders', () => {
    const source = 'Welcome {userName}!';
    const corrupted = 'Hoş geldiniz {kullanıcıAdı}!';

    const { repairedText, repaired } = autoRepairPlaceholders(source, corrupted);
    expect(repaired).toBe(true);
    expect(repairedText).toBe('Hoş geldiniz {userName}!');
  });

  it('should auto-repair dropped placeholders', () => {
    const source = 'Total items: {count}';
    const dropped = 'Toplam öğeler:';

    const { repairedText, repaired } = autoRepairPlaceholders(source, dropped);
    expect(repaired).toBe(true);
    expect(repairedText).toContain('{count}');
  });
});
