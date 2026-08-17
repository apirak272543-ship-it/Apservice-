/* AP Service performance optimization: keep user-visible data fresh while avoiding duplicate network and storage work. */
(() => {
  'use strict';
  const root = window;
  if (root.__apPerformanceOptimizationInstalled) return;
  root.__apPerformanceOptimizationInstalled = true;

  const requestCache = new Map();
  const requestInflight = new Map();
  const CACHE_TTL_MS = 8000;
  const catalogState = { lastSuccess: 0, inflight: null };
  const marketplaceState = { lastSuccess: 0, inflight: null };

  const methodOf = options => String(options?.method || 'GET').toUpperCase();
  const requestKey = (path, sessionId) => `${sessionId || 'public'}|${String(path)}`;
  const invalidate = path => {
    const text = String(path || '');
    requestCache.clear();
    if (/catalog_|store_categories|menu_categories|menu_option_|\/stores\b|\/menu_items\b/.test(text)) catalogState.lastSuccess = 0;
    if (/marketplace_/.test(text)) marketplaceState.lastSuccess = 0;
  };

  const sync = root.SupabaseSync;
  const originalRequest = sync?.request?.bind(sync);
  if (sync && originalRequest && !sync.__apPerformanceRequestWrapped) {
    sync.__apPerformanceRequestWrapped = true;
    sync.request = async (path, options = {}) => {
      const method = methodOf(options);
      const cacheable = method === 'GET' && options?.body === undefined;
      const sessionId = sync.session?.()?.user?.id || 'public';
      const key = requestKey(path, sessionId);
      if (!cacheable) {
        invalidate(path);
        return originalRequest(path, options);
      }
      const cached = requestCache.get(key);
      if (cached && cached.expiresAt > Date.now()) return cached.value;
      const active = requestInflight.get(key);
      if (active) return active;
      const pending = Promise.resolve(originalRequest(path, options)).then(value => {
        requestCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
        return value;
      }).finally(() => requestInflight.delete(key));
      requestInflight.set(key, pending);
      return pending;
    };
  }

  if (sync?.refreshCatalog && !sync.__apPerformanceCatalogWrapped) {
    sync.__apPerformanceCatalogWrapped = true;
    const originalCatalog = sync.refreshCatalog.bind(sync);
    sync.refreshCatalog = (options = {}) => {
      const force = options === true || options?.force === true;
      if (!force && catalogState.inflight) return catalogState.inflight;
      if (!force && catalogState.lastSuccess && Date.now() - catalogState.lastSuccess < CACHE_TTL_MS) return Promise.resolve(true);
      catalogState.inflight = Promise.resolve(originalCatalog(options)).then(result => {
        catalogState.lastSuccess = Date.now();
        return result;
      }).finally(() => { catalogState.inflight = null; });
      return catalogState.inflight;
    };
  }

  const marketplace = root.Marketplace;
  if (marketplace?.refresh && !marketplace.__apPerformanceRefreshWrapped) {
    marketplace.__apPerformanceRefreshWrapped = true;
    const originalMarketplaceRefresh = marketplace.refresh.bind(marketplace);
    marketplace.refresh = (options = {}) => {
      const force = options === true || options?.force === true;
      if (!force && marketplaceState.inflight) return marketplaceState.inflight;
      if (!force && marketplaceState.lastSuccess && Date.now() - marketplaceState.lastSuccess < CACHE_TTL_MS) return Promise.resolve();
      marketplaceState.inflight = Promise.resolve(originalMarketplaceRefresh(options)).then(result => {
        marketplaceState.lastSuccess = Date.now();
        return result;
      }).finally(() => { marketplaceState.inflight = null; });
      return marketplaceState.inflight;
    };
  }

  const storage = root.APServiceStorage || root.Storage;
  const originalSave = storage?.save?.bind(storage);
  if (storage && originalSave && !storage.__apPerformanceSaveWrapped) {
    storage.__apPerformanceSaveWrapped = true;
    let timer = null;
    let queued = false;
    const flush = () => {
      timer = null;
      queued = false;
      try { originalSave(); } catch (error) { console.warn('บันทึกข้อมูลในเครื่องไม่สำเร็จ', error); }
    };
    storage.save = () => {
      if (queued) return { queued: true };
      queued = true;
      timer = root.setTimeout(flush, 140);
      return { queued: true };
    };
    root.addEventListener('pagehide', () => {
      if (queued) {
        if (timer) root.clearTimeout(timer);
        flush();
      }
    }, { passive: true });
    storage.save();
  }

  root.__apPerformance = {
    cacheTtlMs: CACHE_TTL_MS,
    clearCache() { requestCache.clear(); catalogState.lastSuccess = 0; marketplaceState.lastSuccess = 0; },
    flushStorage() { if (storage?.save) storage.save(); },
    snapshot() { return { cacheEntries: requestCache.size, inflight: requestInflight.size, catalogInflight: !!catalogState.inflight, marketplaceInflight: !!marketplaceState.inflight }; }
  };
})();
