import { describe, it, expect } from 'vitest';
import { extractKeysFromSource } from '../src/extractor/index.js';

describe('AST Extractor Engine', () => {
  it('should extract t("key") inside a React button and infer uiRole as button', () => {
    const code = `
      import React from 'react';
      import { useTranslation } from 'react-i18next';

      export function CheckoutButton() {
        const { t } = useTranslation();
        return (
          <button className="btn-primary" onClick={() => {}}>
            {t('checkout.proceed_payment')}
          </button>
        );
      }
    `;

    const results = extractKeysFromSource(code, { filePath: 'src/components/CheckoutButton.tsx' });
    expect(results).toHaveLength(1);

    const item = results[0];
    expect(item.key).toBe('checkout.proceed_payment');
    expect(item.componentName).toBe('CheckoutButton');
    expect(item.uiRole).toBe('button');
    expect(item.parentElement).toBe('button');
    expect(item.line).toBe(9);
  });

  it('should extract dynamic interpolation parameters', () => {
    const code = `
      export const GreetingBanner = () => {
        return (
          <div className="banner">
            <h1>{t('user.welcome_message', { userName: 'Alice', daysRemaining: 7 })}</h1>
          </div>
        );
      };
    `;

    const results = extractKeysFromSource(code, { filePath: 'src/components/Greeting.tsx' });
    expect(results).toHaveLength(1);

    const item = results[0];
    expect(item.key).toBe('user.welcome_message');
    expect(item.uiRole).toBe('heading');
    expect(item.inferredParameters).toEqual(['userName', 'daysRemaining']);
  });

  it('should infer placeholder role from JSX attribute', () => {
    const code = `
      export function SearchBar() {
        return (
          <input
            type="search"
            placeholder={t('search.input_placeholder')}
          />
        );
      }
    `;

    const results = extractKeysFromSource(code);
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('search.input_placeholder');
    expect(results[0].uiRole).toBe('placeholder');
  });

  it('should extract formatMessage calls with object parameter', () => {
    const code = `
      export function ErrorAlert() {
        return (
          <Alert variant="danger">
            {formatMessage({ id: 'errors.payment_declined' })}
          </Alert>
        );
      }
    `;

    const results = extractKeysFromSource(code);
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('errors.payment_declined');
    expect(results[0].uiRole).toBe('alert');
  });

  it('should extract JSX <Trans i18nKey="..." /> components', () => {
    const code = `
      export function LegalFooter() {
        return (
          <footer>
            <Trans i18nKey="footer.terms_and_conditions" />
          </footer>
        );
      }
    `;

    const results = extractKeysFromSource(code);
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('footer.terms_and_conditions');
    expect(results[0].parentElement).toBe('footer');
  });

  it('should extract developer comments preceding the translation', () => {
    const code = `
      export function Notification() {
        // Critical: Do not translate VIP tag literally
        return <span>{t('notification.vip_user')}</span>;
      }
    `;

    const results = extractKeysFromSource(code);
    expect(results).toHaveLength(1);
    expect(results[0].comment).toContain('Critical: Do not translate VIP tag literally');
  });
});
