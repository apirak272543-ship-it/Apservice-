import { requireLegacyValue } from './runtime.js';

export const WEB_STORAGE_KEYS = Object.freeze([
  'apcx_user', 'apcx_cart', 'apcx_stores', 'apcx_orders', 'apcx_config',
  'apcx_target', 'apcx_mappings', 'apcx_admins', 'apcx_riders',
  'apcx_customers', 'apcx_transactions', 'apcx_cash_ledger',
  'apcx_draft_locations', 'apcx_supabase_session', 'apcx_oauth_after',
  'apcx_customer_form_drafts_v1', 'apcx_location_notice_',
  'apcx_rider_session', 'apcx_rider_supabase_session', 'apcx_rider_wallet',
  'apcx_rider_earnings', 'apcx_rider_payouts', 'apcx_rider_withdrawals',
  'apcx_rider_form_drafts_v1', 'apcx_store_session',
  'apcx_store_supabase_session', 'apcx_store_wallet',
  'apcx_store_settlements', 'apcx_store_withdrawals', 'apcx_store_form_drafts_v1',
]);

const INLINE_IMAGE_RE = /^data:image\//i;
const cacheByStorage = new WeakMap();

export function isInlineImage(value) {
  return typeof value === 'string' && INLINE_IMAGE_RE.test(value.trim());
}

/**
 * Remove only inline image payloads from a cache copy. The live state object is
 * never mutated, and Supabase remains the source of truth for uploaded media.
 */
export function stripInlineImages(value, seen = new WeakSet()) {
  if (isInlineImage(value)) return '';
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => stripInlineImages(item, seen));
  const copy = {};
  Object.entries(value).forEach(([key, item]) => {
    copy[key] = stripInlineImages(item, seen);
  });
  return copy;
}

/**
 * Build a small, media-safe revision key. It walks object metadata but never
 * copies or stringifies an inline image. This lets repeated Storage.save calls
 * skip both JSON.stringify and localStorage.setItem when the cached slice did
 * not change.
 */
export function cacheRevision(value, seen = new WeakSet()) {
  if (isInlineImage(value)) return 'inline-image';
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value !== 'object') return `${typeof value}:${String(value)}`;
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  if (Array.isArray(value)) return `[${value.map(item => cacheRevision(item, seen)).join('|')}]`;
  return `{${Object.keys(value).sort().map(key => `${key}:${cacheRevision(value[key], seen)}`).join('|')}}`;
}

export function isQuotaError(error) {
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  return name.includes('quota') || message.includes('quota') || message.includes('exceeded the quota');
}

function getCache(localStore) {
  if (!localStore || (typeof localStore !== 'object' && typeof localStore !== 'function')) return null;
  let cache = cacheByStorage.get(localStore);
  if (!cache) {
    cache = new Map();
    cacheByStorage.set(localStore, cache);
  }
  return cache;
}

export function safeSetItem(key, value, localStore = globalThis.localStorage, options = {}) {
  const shouldSanitize = key === 'apcx_stores' || key === 'apcx_config';
  const cache = options.cache ? getCache(localStore) : null;
  const revision = cache ? cacheRevision(value) : null;
  const previous = cache?.get(key);
  if (cache && previous?.revision === revision) return { ok: true, sanitized: shouldSanitize, skipped: true };

  const cacheValue = shouldSanitize ? stripInlineImages(value) : value;
  const serialized = JSON.stringify(cacheValue);
  try {
    localStore.setItem(key, serialized);
    if (cache) cache.set(key, { revision, serialized });
    return { ok: true, sanitized: shouldSanitize, skipped: false };
  } catch (error) {
    if (!isQuotaError(error)) {
      console.warn(`AP Service storage skipped ${key}`, error);
      return { ok: false, sanitized: false, error };
    }
    const oldValue = (() => {
      try { return localStore.getItem(key); } catch { return null; }
    })();
    try {
      localStore.removeItem(key);
      const sanitizedSerialized = JSON.stringify(stripInlineImages(value));
      localStore.setItem(key, sanitizedSerialized);
      if (cache) cache.set(key, { revision, serialized: sanitizedSerialized });
      console.warn(`AP Service storage sanitized inline images for ${key}`);
      return { ok: true, sanitized: true, skipped: false };
    } catch (fallbackError) {
      try {
        if (oldValue !== null) localStore.setItem(key, oldValue);
      } catch (restoreError) {
        console.warn(`AP Service could not restore ${key} after quota fallback`, restoreError);
      }
      console.warn(`AP Service storage skipped ${key} after quota fallback`, fallbackError);
      return { ok: false, sanitized: true, error: fallbackError };
    }
  }
}

export function persistAppState(state, localStore = globalThis.localStorage) {
  const entries = [
    ['apcx_user', state.user],
    ['apcx_cart', state.cart],
    ['apcx_stores', state.stores],
    ['apcx_orders', state.orders],
    ['apcx_config', state.config],
    ['apcx_target', state.storageTarget],
    ['apcx_mappings', state.mappings],
    ['apcx_admins', state.admins],
    ['apcx_riders', state.riders],
    ['apcx_customers', state.customers],
    ['apcx_transactions', state.transactions],
    ['apcx_cash_ledger', state.cashLedger],
    ['apcx_draft_locations', state.draftLocations],
  ];
  const report = {};
  entries.forEach(([key, value]) => { report[key] = safeSetItem(key, value, localStore, { cache: true }); });
  return report;
}

export function clearPersistCache(localStore = globalThis.localStorage) {
  getCache(localStore)?.clear();
}

export function isAdminState(state) {
  return state.admins.includes(state.user?.email?.toLowerCase());
}

export function getStorage(root = globalThis) {
  return requireLegacyValue('Storage', root);
}

export function saveLegacyState(root = globalThis) {
  return getStorage(root).save();
}

export function isLegacyAdmin(root = globalThis) {
  return getStorage(root).isAdmin();
}
