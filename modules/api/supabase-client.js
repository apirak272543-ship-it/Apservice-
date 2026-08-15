import { requireLegacyValue } from '../core/runtime.js';

export function getSupabaseSync(root = globalThis) {
  return requireLegacyValue('SupabaseSync', root);
}

export function getSupabaseAdminSync(root = globalThis) {
  return requireLegacyValue('SupabaseAdminSync', root);
}

export async function performSupabaseRequest(path, options = {}, root = globalThis) {
  const client = getSupabaseSync(root);
  const config = client.config();
  if (!config.url || !config.publishableKey) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const send = () => root.fetch(config.url + '/rest/v1/' + path, {
    ...options,
    headers: { ...client.headers(options.body !== undefined), ...(options.headers || {}) },
  });
  let response = await send();
  if (response.status === 401) {
    try {
      await client.refreshSession(true);
      response = await send();
    } catch (error) {
      throw error;
    }
  }
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.hint || 'Supabase HTTP ' + response.status);
  return data;
}

export function requestSupabase(path, options, root = globalThis) {
  return performSupabaseRequest(path, options, root);
}
