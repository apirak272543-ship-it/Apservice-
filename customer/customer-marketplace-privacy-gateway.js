(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M?.network?.createScope || window.__customerMarketplacePrivacyGateway) return;
  window.__customerMarketplacePrivacyGateway = true;

  const phonePattern = /(?:\+66|0)(?:[\s-]?\d){8,9}\b/g;
  const redact = value => String(value || '').replace(phonePattern, '••• ••• ••••');
  const redactMarketplaceRows = (requestPath, payload) => {
    if (!String(requestPath || '').startsWith('marketplace_listings?')) return payload;
    const redactRow = row => row && typeof row === 'object' && 'description' in row ? { ...row, description: redact(row.description) } : row;
    return Array.isArray(payload) ? payload.map(redactRow) : redactRow(payload);
  };

  const originalCreateScope = M.network.createScope.bind(M.network);
  M.network.createScope = (...args) => {
    const scope = originalCreateScope(...args);
    if (!scope?.request || scope.__marketplacePrivacyGateway) return scope;
    scope.__marketplacePrivacyGateway = true;
    const originalRequest = scope.request.bind(scope);
    scope.request = async (requestPath, options) => redactMarketplaceRows(requestPath, await originalRequest(requestPath, options));
    return scope;
  };
})();
