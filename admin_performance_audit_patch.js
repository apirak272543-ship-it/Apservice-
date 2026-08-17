/* AP Service Admin performance audit: render the cached shell first, then load only the opened workspace. */
(() => {
  'use strict';
  const root = window;
  if (root.__apAdminPerformanceAuditInstalled) return;
  root.__apAdminPerformanceAuditInstalled = true;

  const inflight = new Map();
  const run = (key, task) => {
    const active = inflight.get(key);
    if (active) return active;
    const pending = Promise.resolve().then(task).finally(() => inflight.delete(key));
    inflight.set(key, pending);
    return pending;
  };
  const call = (key, task) => run(key, task).catch(error => {
    console.warn(`Admin performance loader ${key} failed`, error);
    return null;
  });

  const loadFor = name => {
    const page = String(name || 'overview');
    if (!root.Storage?.isAdmin?.()) return Promise.resolve(null);
    if (page === 'overview' || page === 'orders' || page === 'new-orders' || page === 'active-orders' || page === 'completed-orders' || page === 'payment-slips') {
      return call('orders', async () => {
        await (typeof AdminOrderSync !== 'undefined' ? AdminOrderSync.pull() : null);
        if (page !== 'overview' && typeof AdminOrderItems !== 'undefined') await AdminOrderItems.load();
        if (page === 'payment-slips') await root.refreshPaymentSlipQueue?.();
      });
    }
    if (page === 'customers') return call('customers', () => typeof CustomerDirectory !== 'undefined' ? CustomerDirectory.load({ quiet: true }) : null);
    if (page === 'stores' || page === 'inventory') {
      return call('store-data', async () => {
        await Promise.all([
          typeof CategoryAdmin !== 'undefined' ? CategoryAdmin.load() : null,
          typeof ContactDirectory !== 'undefined' ? ContactDirectory.refresh() : null,
          typeof StoreModeration !== 'undefined' ? StoreModeration.refresh() : null,
        ]);
        root.renderAdminStores?.();
      });
    }
    if (page === 'riders') return Promise.resolve(null);
    if (page === 'rider-applications') return call('rider-applications', () => typeof RiderApplicationsAdmin !== 'undefined' ? RiderApplicationsAdmin.load() : null);
    if (page === 'settlements' || page === 'withdrawals') return Promise.resolve(null);
    if (page === 'content' || page === 'settings') return call('campaigns', () => typeof CampaignAdmin !== 'undefined' ? CampaignAdmin.load() : null);
    if (page === 'support') return Promise.resolve(null);
    if (page === 'errors') return call('errors', () => root.ErrorMonitor?.renderAdmin?.());
    if (page === 'ai-workspace') return call('ai-workspace', () => root.Workspace?.load?.());
    return Promise.resolve(null);
  };

  root.AdminPerformance = Object.freeze({
    loadFor,
    snapshot() { return { inflight: inflight.size, keys: [...inflight.keys()] }; },
  });
  root.APPerformanceCatalog = root.APPerformanceCatalog || null;
})();
