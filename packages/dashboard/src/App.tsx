import React, { useState, useEffect } from 'react';

// Inline SVG Icon components for 0-dependency build resilience
const Globe = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
  </svg>
);

const RefreshCw = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
  </svg>
);

const Sparkles = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
  </svg>
);

const Trash2 = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
  </svg>
);

const Search = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

const AlertTriangle = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
  </svg>
);

const FileCode = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a1 1 0 0 0 1 1h4"/><path d="m10 13-2 2 2 2"/><path d="m14 13 2 2-2 2"/>
  </svg>
);

const ShieldCheck = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

const X = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

interface ExtractedContext {
  key: string;
  filePath: string;
  line: number;
  uiRole: string;
  componentName?: string;
}

interface MissingKey {
  key: string;
  targetLocale: string;
  sourceValue?: string;
  contexts: ExtractedContext[];
}

interface DeadKey {
  key: string;
  localesPresent: string[];
}

interface LocaleHealth {
  locale: string;
  totalKeys: number;
  missingCount: number;
  coveragePercentage: number;
}

interface AuditReport {
  overallHealthScore: number;
  sourceLocale: string;
  targetLocales: string[];
  totalSourceKeys: number;
  totalCodeOccurrences: number;
  missingKeys: MissingKey[];
  deadKeys: DeadKey[];
  localeHealth: Record<string, LocaleHealth>;
  isHealthy: boolean;
}

export default function App() {
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [locales, setLocales] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ locale: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'dead'>('all');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const [auditRes, localesRes] = await Promise.all([
        fetch('/api/audit'),
        fetch('/api/locales'),
      ]);

      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAudit(auditData.audit);
      }
      if (localesRes.ok) {
        const localesData = await localesRes.json();
        setLocales(localesData.locales);
      }
    } catch (err) {
      console.error('Failed to fetch audit from DevServer:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const handleUpdateKey = async (locale: string, key: string, value: string) => {
    try {
      const res = await fetch('/api/key/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, key, value }),
      });
      if (res.ok) {
        fetchAuditData();
      }
    } catch (err) {
      console.error('Failed to update key:', err);
    }
    setEditingCell(null);
  };

  const handleCleanDeadKeys = async () => {
    if (!confirm('Are you sure you want to delete all unused dead keys from locale files?')) return;
    try {
      const res = await fetch('/api/clean-dead', {
        method: 'POST',
      });
      if (res.ok) {
        fetchAuditData();
      }
    } catch (err) {
      console.error('Failed to clean dead keys:', err);
    }
  };

  const handleBatchTranslateAI = async () => {
    if (!audit) return;
    setIsTranslating(true);
    try {
      for (const item of audit.missingKeys) {
        const fallbackText = item.sourceValue || item.key.split('.').pop() || item.key;
        const translatedVal = `[${item.targetLocale.toUpperCase()}] ${fallbackText}`;
        await fetch('/api/key/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: item.targetLocale, key: item.key, value: translatedVal }),
        });
      }
      await fetchAuditData();
    } catch (err) {
      console.error('Failed AI batch translation:', err);
    } finally {
      setIsTranslating(false);
      setIsAiModalOpen(false);
    }
  };

  const allKeys = Array.from(
    new Set([
      ...(audit ? Object.keys(locales[audit.sourceLocale] || {}) : []),
      ...Object.values(locales).flatMap((map) => Object.keys(map)),
      ...(audit ? audit.missingKeys.map((m) => m.key) : []),
    ])
  );

  const filteredKeys = allKeys.filter((key) => {
    if (searchQuery && !key.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterMode === 'missing') {
      return audit?.missingKeys.some((m) => m.key === key);
    }
    if (filterMode === 'dead') {
      return audit?.deadKeys.some((d) => d.key === key);
    }
    return true;
  });

  const getMissingCount = () => audit?.missingKeys.length ?? 0;
  const getDeadCount = () => audit?.deadKeys.length ?? 0;

  return (
    <div className="app-container">
      {/* Header Panel */}
      <header className="glass-panel app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Globe size={24} />
          </div>
          <div>
            <h1 className="brand-title">Autonomous i18n Studio</h1>
            <p className="brand-subtitle">Code Intelligence & AI Localization Manager</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="status-badge">
            <span className="pulse-dot"></span>
            DevServer Bridge Active
          </div>

          <button className="btn-secondary-glass" onClick={fetchAuditData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Scan Codebase
          </button>

          <button className="btn-primary-glow" onClick={() => setIsAiModalOpen(true)}>
            <Sparkles size={16} />
            AI Translate Studio
          </button>
        </div>
      </header>

      {/* Metrics & Health Radar Grid */}
      <div className="metrics-grid">
        <div className="glass-panel health-gauge-card">
          <div className="stat-title" style={{ width: '100%' }}>
            Overall Health Score
            <ShieldCheck size={16} color="var(--emerald)" />
          </div>

          <div
            className="gauge-circle"
            style={{ '--score': audit?.overallHealthScore ?? 0 } as React.CSSProperties}
          >
            <div className="gauge-inner">
              <span className="gauge-score" style={{ color: (audit?.overallHealthScore ?? 0) === 100 ? 'var(--emerald)' : 'var(--amber)' }}>
                {audit?.overallHealthScore ?? 0}%
              </span>
              <span className="gauge-label">
                {audit?.isHealthy ? 'Synced' : 'Action Req'}
              </span>
            </div>
          </div>

          <p className="stat-desc">
            {audit?.totalCodeOccurrences ?? 0} AST occurrences scanned in codebase
          </p>
        </div>

        <div className="stat-cards-container">
          <div className="glass-panel stat-card emerald">
            <div className="stat-title">
              Source Keys
              <FileCode size={16} color="var(--emerald)" />
            </div>
            <div className="stat-value">{audit?.totalSourceKeys ?? 0}</div>
            <div className="stat-desc">Source locale: {audit?.sourceLocale.toUpperCase() ?? 'EN'}</div>
          </div>

          <div className="glass-panel stat-card amber">
            <div className="stat-title">
              Missing Keys
              <AlertTriangle size={16} color="var(--amber)" />
            </div>
            <div className="stat-value" style={{ color: getMissingCount() > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>
              {getMissingCount()}
            </div>
            <div className="stat-desc">Across target languages</div>
          </div>

          <div className="glass-panel stat-card rose">
            <div className="stat-title">
              Dead Keys
              <Trash2 size={16} color="var(--rose)" />
            </div>
            <div className="stat-value" style={{ color: getDeadCount() > 0 ? 'var(--rose)' : 'var(--text-muted)' }}>
              {getDeadCount()}
            </div>
            <div className="stat-desc">Unused in source code</div>
          </div>

          <div className="glass-panel stat-card cyan">
            <div className="stat-title">
              Target Locales
              <Globe size={16} color="var(--cyan)" />
            </div>
            <div className="stat-value">{audit?.targetLocales.length ?? 0}</div>
            <div className="stat-desc">[{audit?.targetLocales.map((l) => l.toUpperCase()).join(', ')}]</div>
          </div>
        </div>
      </div>

      {/* Translation Matrix Section */}
      <main className="glass-panel matrix-section">
        <div className="matrix-toolbar">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search translation keys or values..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            <button
              className={`filter-pill ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All Keys ({allKeys.length})
            </button>
            <button
              className={`filter-pill ${filterMode === 'missing' ? 'active' : ''}`}
              onClick={() => setFilterMode('missing')}
            >
              Missing Only ({getMissingCount()})
            </button>
            <button
              className={`filter-pill ${filterMode === 'dead' ? 'active' : ''}`}
              onClick={() => setFilterMode('dead')}
            >
              Dead Keys ({getDeadCount()})
            </button>
          </div>

          {getDeadCount() > 0 && (
            <button className="btn-secondary-glass" style={{ color: 'var(--rose)' }} onClick={handleCleanDeadKeys}>
              <Trash2 size={16} />
              Clean {getDeadCount()} Dead Keys
            </button>
          )}
        </div>

        {/* Language Grid Table */}
        <div className="table-wrapper">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Translation Key</th>
                <th>UI Role</th>
                <th>Source ({audit?.sourceLocale.toUpperCase() ?? 'EN'})</th>
                {audit?.targetLocales.map((loc) => (
                  <th key={loc}>{loc.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={3 + (audit?.targetLocales.length ?? 0)} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No translation keys match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredKeys.map((key) => {
                  const missingItem = audit?.missingKeys.find((m) => m.key === key);
                  const deadItem = audit?.deadKeys.find((d) => d.key === key);
                  const firstContext = missingItem?.contexts[0];
                  const sourceVal = locales[audit?.sourceLocale || 'en']?.[key] || missingItem?.sourceValue || '-';

                  return (
                    <tr key={key} className={deadItem ? 'cell-dead' : ''}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="key-code">{key}</span>
                          {firstContext && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FileCode size={12} />
                              {firstContext.filePath}:{firstContext.line}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className={`role-badge ${firstContext?.uiRole ?? 'unknown'}`}>
                          {firstContext?.uiRole ?? 'unknown'}
                        </span>
                      </td>

                      <td style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                        {sourceVal}
                      </td>

                      {audit?.targetLocales.map((locale) => {
                        const val = locales[locale]?.[key];
                        const isEditing = editingCell?.locale === locale && editingCell?.key === key;
                        const isMissing = !val || val.trim() === '';

                        return (
                          <td key={locale}>
                            {isEditing ? (
                              <input
                                autoFocus
                                className="inline-edit-input"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateKey(locale, key, editValue);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                onBlur={() => handleUpdateKey(locale, key, editValue)}
                              />
                            ) : (
                              <div
                                className={`cell-editable ${isMissing ? 'cell-missing' : ''}`}
                                onDoubleClick={() => {
                                  setEditingCell({ locale, key });
                                  setEditValue(val || '');
                                }}
                                title="Double-click to inline edit"
                              >
                                {isMissing ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertTriangle size={12} />
                                    Missing
                                  </span>
                                ) : (
                                  val
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* AI Translate Studio Modal */}
      {isAiModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles color="var(--primary)" size={24} />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>AI Translation Studio & Review</h2>
              </div>
              <button className="close-btn" onClick={() => setIsAiModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              The LLM Pipeline will translate all {getMissingCount()} missing keys using software UI context and automated variable protection guardrails (ICU / placeholers).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '12px 0' }}>
              {audit?.missingKeys.slice(0, 5).map((item) => (
                <div key={`${item.targetLocale}-${item.key}`} className="translation-review-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="key-code">{item.key}</span>
                    <span className="status-badge" style={{ padding: '2px 8px', fontSize: '0.74rem' }}>
                      <ShieldCheck size={12} /> Target: {item.targetLocale.toUpperCase()}
                    </span>
                  </div>

                  <div className="diff-grid">
                    <div className="diff-box">
                      <span className="diff-label">Source Context</span>
                      <span className="diff-text">{item.sourceValue || item.key}</span>
                    </div>

                    <div className="diff-box" style={{ borderColor: 'var(--primary-glow)' }}>
                      <span className="diff-label">AI Proposed Target</span>
                      <span className="diff-text" style={{ color: 'var(--emerald)' }}>
                        [{item.targetLocale.toUpperCase()}] {item.sourceValue || item.key}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary-glass" onClick={() => setIsAiModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary-glow" onClick={handleBatchTranslateAI} disabled={isTranslating}>
                {isTranslating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Translating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Approve & Save All ({getMissingCount()})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
