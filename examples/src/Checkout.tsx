import React from 'react';

export function CheckoutView() {
  const t = (key: string, params?: Record<string, unknown>) => key;

  return (
    <div className="checkout-container">
      <h2>{t('checkout.title')}</h2>

      <div className="alert-box">
        {/* Important payment error */}
        <p className="error-text">
          {t('checkout.error_declined')}
        </p>
      </div>

      <p>{t('checkout.discount_applied', { percent: 20 })}</p>

      <button className="btn-pay">
        {t('checkout.submit_btn')}
      </button>
    </div>
  );
}
