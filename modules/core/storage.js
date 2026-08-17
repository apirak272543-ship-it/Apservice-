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

export function isQuotaError(error) {
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  return name.includes('quota') || message.includes('quota') || message.includes('exceeded the quota');
}

export function safeSetItem(key, value, localStore = globalThis.localStorage) {
  const shouldSanitize = key === 'apcx_stores' || key === 'apcx_config';
  const cacheValue = shouldSanitize ? stripInlineImages(value) : value;
  const serialized = JSON.stringify(cacheValue);
  try {
    localStore.setItem(key, serialized);
    return { ok: true, sanitized: shouldSanitize };
  } catch (error) {
    if (!isQuotaError(error)) {
      console.warn(`AP Service storage skipped ${key}`, error);
      return { ok: false, sanitized: false, error };
    }
    const previous = (() => {
      try { return localStore.getItem(key); } catch { return null; }
    })();
    try {
      localStore.removeItem(key);
      localStore.setItem(key, JSON.stringify(stripInlineImages(value)));
      console.warn(`AP Service storage sanitized inline images for ${key}`);
      return { ok: true, sanitized: true };
    } catch (fallbackError) {
      try {
        if (previous !== null) localStore.setItem(key, previous);
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
  entries.forEach(([key, value]) => { report[key] = safeSetItem(key, value, localStore); });
  return report;
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
