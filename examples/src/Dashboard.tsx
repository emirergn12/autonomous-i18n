import React from 'react';

export function DashboardView() {
  const t = (key: string, params?: Record<string, unknown>) => key;

  return (
    <div className="dashboard-container">
      <h1>{t('common.welcome', { name: 'Dev' })}</h1>

      <section className="billing-box">
        {/* User can upgrade tier */}
        <button className="btn-primary">
          {t('billing.upgrade_plan')}
        </button>

        <p className="notice">
          {t('billing.tax_notice')}
        </p>
      </section>
    </div>
  );
}
