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

export function persistAppState(state, localStore = globalThis.localStorage) {
  localStore.setItem('apcx_user', JSON.stringify(state.user));
  localStore.setItem('apcx_cart', JSON.stringify(state.cart));
  localStore.setItem('apcx_stores', JSON.stringify(state.stores));
  localStore.setItem('apcx_orders', JSON.stringify(state.orders));
  localStore.setItem('apcx_config', JSON.stringify(state.config));
  localStore.setItem('apcx_target', JSON.stringify(state.storageTarget));
  localStore.setItem('apcx_mappings', JSON.stringify(state.mappings));
  localStore.setItem('apcx_admins', JSON.stringify(state.admins));
  localStore.setItem('apcx_riders', JSON.stringify(state.riders));
  localStore.setItem('apcx_customers', JSON.stringify(state.customers));
  localStore.setItem('apcx_transactions', JSON.stringify(state.transactions));
  localStore.setItem('apcx_cash_ledger', JSON.stringify(state.cashLedger));
  localStore.setItem('apcx_draft_locations', JSON.stringify(state.draftLocations));
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
