import React from 'react';

export function HeaderNav() {
  const t = (key: string) => key;

  return (
    <header className="main-header">
      <nav>
        <a href="/">{t('nav.home')}</a>
        <a href="/pricing">{t('nav.pricing')}</a>
        <button className="btn-login">{t('nav.login')}</button>
      </nav>
    </header>
  );
}
