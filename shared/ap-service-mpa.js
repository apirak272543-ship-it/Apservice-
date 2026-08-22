(() => {
  'use strict';

  const root = window;
  const SUPABASE_URL = 'https://abtsctwfkgzciseppach.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_TyJWnKkbS8vKcQKKAzoqSg_BOguwKRv';
  const SESSION_KEY = 'apservice_mpa_session_v1';
  const STALE_RESPONSE = 'AP_SERVICE_STALE_RESPONSE';
  const DEFAULT_REQUEST_TIMEOUT_MS = 12_000;
  const withTimeoutSignal = (signal, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) => {
    const duration = Math.max(1_000, Number(timeoutMs) || DEFAULT_REQUEST_TIMEOUT_MS);
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      const timeout = AbortSignal.timeout(duration);
      if (!signal) return timeout;
      if (typeof AbortSignal.any === 'function') return AbortSignal.any([signal, timeout]);
    }
    if (typeof AbortController === 'undefined') return signal || undefined;
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort(); else signal?.addEventListener?.('abort', abort, { once: true });
    setTimeout(abort, duration);
    return controller.signal;
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&gt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const baht = value => Number(value || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
  const nowIso = () => new Date().toISOString();
  const normalizePath = path => String(path || '').replace(/^\/+/, '');

  function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }
  function saveSession(session) { if (session?.access_token) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY); }
  function token() { return getSession()?.access_token || ''; }
  function actorCacheKey() { return getSession()?.user?.id || 'anon'; }

  async function refreshSession(force = false) {
    const current = getSession();
    if (!current?.refresh_token) return current;
    const expiresAt = Number(current.expires_at || 0);
    const expiresSoon = !expiresAt || expiresAt <= Math.floor(Date.now() / 1000) + 90;
    if (!force && !expiresSoon) return current;
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Authorization: `Bearer ${current.refresh_token}` }, body: JSON.stringify({ refresh_token: current.refresh_token }), signal: withTimeoutSignal() });
    const next = await response.json().catch(() => null);
    if (!response.ok || !next?.access_token) { saveSession(null); throw new Error(next?.error_description || 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); }
    const normalized = { ...current, ...next, user: next?.user || current.user || null, expires_at: Number(next?.expires_at || (Math.floor(Date.now() / 1000) + Number(next?.expires_in || 3600))) };
    saveSession(normalized); return normalized;
  }

  const lifecycle = (() => {
    const cache = new Map();
    const inFlight = new Map();
    const syncJobs = new Map();
    const metrics = { requests: 0, cacheHits: 0, deduped: 0, failures: 0, aborted: 0, backgroundRuns: 0 };
    const keyFor = (method, path, options) => options.cacheKey || `${method}:${path}:${options.private ? actorCacheKey() : 'public'}:${options.forceSession ? 'session' : 'anon'}`;
    const isAbort = error => error?.name === 'AbortError' || error?.code === STALE_RESPONSE;
    function cached(key, ttl) {
      const entry = cache.get(key);
      if (!entry || !ttl || Date.now() - entry.at > ttl) return null;
      return entry.value;
    }
    function makeStaleError() { const error = new Error('ข้อมูลที่โหลดมาช้ากว่าหน้าปัจจุบันจึงไม่ถูกนำมาแสดง'); error.code = STALE_RESPONSE; return error; }
    function createScope(name = 'page') {
      const controller = new AbortController(); let active = true;
      return Object.freeze({
        name, signal: controller.signal,
        isActive: () => active && !controller.signal.aborted,
        dispose: () => { active = false; controller.abort(); },
        request: (path, options = {}) => request(path, { ...options, signal: controller.signal }).then(value => { if (!active) throw makeStaleError(); return value; }),
        requestCount: (path, options = {}) => requestCount(path, { ...options, signal: controller.signal }).then(value => { if (!active) throw makeStaleError(); return value; }),
      });
    }
    function startBackgroundSync({ key, task, onData, onError, intervalMs = 15_000, runImmediately = false } = {}) {
      if (!key || typeof task !== 'function') throw new Error('background sync ต้องกำหนด key และ task');
      syncJobs.get(key)?.stop();
      let stopped = false; let timer = null; const cadence = Math.max(15_000, Number(intervalMs) || 15_000);
      const schedule = () => { if (!stopped) timer = setTimeout(tick, cadence); };
      const tick = async () => {
        if (stopped) return;
        if (!document.hidden) {
          try { metrics.backgroundRuns += 1; const result = await task(); if (result?.changed !== false) onData?.(result?.data ?? result); }
          catch (error) { if (!isAbort(error)) onError?.(error); }
        }
        schedule();
      };
      const visibility = () => { if (!document.hidden && !stopped && !timer) void tick(); };
      document.addEventListener('visibilitychange', visibility);
      const stop = () => { stopped = true; clearTimeout(timer); timer = null; document.removeEventListener('visibilitychange', visibility); syncJobs.delete(key); };
      syncJobs.set(key, { stop });
      if (runImmediately) void tick(); else schedule();
      return stop;
    }
    function snapshotMetrics() { return Object.freeze({ ...metrics, cacheEntries: cache.size, inFlight: inFlight.size, backgroundJobs: syncJobs.size }); }
    function clearCache(prefix = '') { [...cache.keys()].filter(key => !prefix || key.startsWith(prefix)).forEach(key => cache.delete(key)); }

    async function request(path, rawOptions = {}) {
      const { cacheTtlMs = 0, cacheKey, forceFresh = false, signal, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, private: privateRequest = false, forceSession = false, skipRefreshRetry = false, ...fetchOptions } = rawOptions;
      const method = String(fetchOptions.method || 'GET').toUpperCase();
      const publicRead = method === 'GET' && !privateRequest;
      const key = keyFor(method, path, { cacheKey, private: privateRequest, forceSession });
      const ttl = method === 'GET' ? Math.max(0, Number(cacheTtlMs) || 0) : 0;
      if (!forceFresh) {
        const cachedValue = cached(key, ttl);
        if (cachedValue !== null) { metrics.cacheHits += 1; return cachedValue; }
      }
      if (method === 'GET' && inFlight.has(key)) { metrics.deduped += 1; return inFlight.get(key); }
      const promise = (async () => {
        metrics.requests += 1;
        const run = () => {
          const headers = { apikey: SUPABASE_KEY, ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}), ...(fetchOptions.headers || {}) };
          if (token() && (!publicRead || forceSession)) headers.Authorization = `Bearer ${token()}`;
          return fetch(`${SUPABASE_URL}/rest/v1/${normalizePath(path)}`, { ...fetchOptions, method, headers, signal: withTimeoutSignal(signal, timeoutMs) });
        };
        let response;
        try { response = await run(); } catch (error) { if (isAbort(error)) metrics.aborted += 1; else metrics.failures += 1; throw error; }
        if (response.status === 401 && token() && !skipRefreshRetry) { await refreshSession(true); response = await run(); }
        const text = await response.text(); let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }
        if (!response.ok) { metrics.failures += 1; throw new Error(data?.message || data?.hint || `ไม่สามารถโหลดข้อมูลได้ (${response.status})`); }
        if (ttl) cache.set(key, { at: Date.now(), value: data });
        return data;
      })();
      if (method === 'GET') inFlight.set(key, promise);
      try { return await promise; } finally { if (inFlight.get(key) === promise) inFlight.delete(key); }
    }
    async function requestCount(path, rawOptions = {}) {
      const { cacheTtlMs = 0, cacheKey, forceFresh = false, signal, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, private: privateRequest = false, forceSession = false, skipRefreshRetry = false, ...fetchOptions } = rawOptions;
      const method = 'HEAD'; const publicRead = !privateRequest; const key = keyFor(method, path, { cacheKey, private: privateRequest, forceSession }); const ttl = Math.max(0, Number(cacheTtlMs) || 0);
      if (!forceFresh) { const cachedValue = cached(key, ttl); if (cachedValue !== null) { metrics.cacheHits += 1; return cachedValue; } }
      if (inFlight.has(key)) { metrics.deduped += 1; return inFlight.get(key); }
      const promise = (async () => {
        metrics.requests += 1;
        const run = () => { const headers = { apikey: SUPABASE_KEY, Prefer: 'count=exact', ...(fetchOptions.headers || {}) }; if (token() && (!publicRead || forceSession)) headers.Authorization = `Bearer ${token()}`; return fetch(`${SUPABASE_URL}/rest/v1/${normalizePath(path)}`, { ...fetchOptions, method, headers, signal: withTimeoutSignal(signal, timeoutMs) }); };
        let response;
        try { response = await run(); } catch (error) { if (isAbort(error)) metrics.aborted += 1; else metrics.failures += 1; throw error; }
        if (response.status === 401 && token() && !skipRefreshRetry) { await refreshSession(true); response = await run(); }
        const text = await response.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
        if (!response.ok) { metrics.failures += 1; throw new Error(data?.message || data?.hint || `ไม่สามารถนับข้อมูลได้ (${response.status})`); }
        const match = String(response.headers.get('content-range') || '').match(/\/(\d+)$/); if (!match) throw new Error('ไม่พบจำนวนข้อมูลจากเซิร์ฟเวอร์'); const total = Number(match[1]);
        if (ttl) cache.set(key, { at: Date.now(), value: total }); return total;
      })();
      inFlight.set(key, promise); try { return await promise; } finally { if (inFlight.get(key) === promise) inFlight.delete(key); }
    }
    return Object.freeze({ request, requestCount, createScope, startBackgroundSync, snapshotMetrics, clearCache, STALE_RESPONSE });
  })();

  async function authRequest(path, options = {}) {
    const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, signal, ...fetchOptions } = options;
    const response = await fetch(`${SUPABASE_URL}/auth/v1/${normalizePath(path)}`, { ...fetchOptions, headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(options.headers || {}) }, signal: withTimeoutSignal(signal, timeoutMs) });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.msg || body?.message || 'ไม่สามารถยืนยันตัวตนได้');
    return body;
  }
  async function signIn(email, password) { const session = await authRequest('token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }); saveSession(session); return session; }
  async function sendMagicLink(email, redirectTo) { const payload = { email: String(email || '').trim().toLowerCase(), create_user: true }; if (redirectTo) payload.redirect_to = redirectTo; return authRequest('otp', { method: 'POST', body: JSON.stringify(payload) }); }
  async function sendEmailOtp(email) { return sendMagicLink(email); }
  async function verifyEmailOtp(email, token) { const normalizedEmail = String(email || '').trim().toLowerCase(); const normalizedToken = String(token || '').replace(/\D/g, ''); if (!normalizedEmail || normalizedToken.length !== 6) throw new Error('รหัสยืนยันต้องเป็นตัวเลข 6 หลัก'); const session = await authRequest('verify', { method: 'POST', body: JSON.stringify({ email: normalizedEmail, token: normalizedToken, type: 'email' }) }); if (!session?.access_token) throw new Error('ยืนยันรหัสไม่สำเร็จ กรุณาขอรหัสใหม่'); saveSession(session); return session; }
  async function signUp({ email, password, data = {} } = {}) { const result = await authRequest('signup', { method: 'POST', body: JSON.stringify({ email, password, data }) }); const normalized = { ...result, user: result?.user || (result?.id ? result : null), access_token: result?.access_token || result?.session?.access_token || '', refresh_token: result?.refresh_token || result?.session?.refresh_token || '' }; if (normalized.access_token) saveSession(normalized); return normalized; }
  async function sendPasswordRecovery(email, redirectTo) { const payload = { email: String(email || '').trim().toLowerCase() }; if (redirectTo) payload.redirect_to = redirectTo; return authRequest('recover', { method: 'POST', body: JSON.stringify(payload) }); }
  async function acceptRecoveryFromHash() { const hash = new URLSearchParams(String(location.hash || '').replace(/^#/, '')); const accessToken = hash.get('access_token'); const refreshToken = hash.get('refresh_token'); if (!accessToken) return null; const session = { access_token: accessToken, refresh_token: refreshToken || '', expires_in: Number(hash.get('expires_in') || 3600), expires_at: Math.floor(Date.now() / 1000) + Number(hash.get('expires_in') || 3600), token_type: hash.get('token_type') || 'bearer', user: {} }; saveSession(session); history.replaceState(null, '', `${location.pathname}${location.search}`); return session; }
  async function acceptMagicLinkFromHash() { const hash = new URLSearchParams(String(location.hash || '').replace(/^#/, '')); const query = new URLSearchParams(String(location.search || '').replace(/^\?/, '')); const errorCode = hash.get('error') || query.get('error'); const errorDescription = hash.get('error_description') || query.get('error_description'); if (errorCode) throw new Error(errorDescription || errorCode); const accessToken = hash.get('access_token'); if (!accessToken) return null; const expiresIn = Number(hash.get('expires_in') || 3600); const session = { access_token: accessToken, refresh_token: hash.get('refresh_token') || '', expires_in: expiresIn, expires_at: Math.floor(Date.now() / 1000) + expiresIn, token_type: hash.get('token_type') || 'bearer', user: {} }; saveSession(session); history.replaceState(null, '', `${location.pathname}${location.search}`); return session; }
  async function updatePassword(password) { if (String(password || '').length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); if (!token()) throw new Error('ลิงก์ตั้งรหัสผ่านหมดอายุหรือไม่สมบูรณ์'); return authRequest('user', { method: 'PUT', headers: { Authorization: `Bearer ${token()}` }, body: JSON.stringify({ password }) }); }
  async function currentUser() { let current = getSession(); if (!current?.access_token) return null; try { current = await refreshSession(false); if (!current?.access_token) return null; return await authRequest('user', { headers: { Authorization: `Bearer ${current.access_token}` } }); } catch { saveSession(null); return null; } }
  async function rolesFor(userId, { forceFresh = false } = {}) { if (!userId || !token()) return []; const rows = await lifecycle.request(`user_roles?select=role&user_id=eq.${encodeURIComponent(userId)}`, { private: true, forceFresh, cacheTtlMs: 10_000, cacheKey: `customer-roles:${userId}` }); return (rows || []).map(row => row.role).filter(Boolean); }
  async function customerRolesFor(userId) { let roles = []; for (let attempt = 0; attempt < 8; attempt += 1) { roles = await rolesFor(userId, { forceFresh: attempt > 0 }); if (roles.includes('customer') || attempt === 7) return roles; await new Promise(resolve => setTimeout(resolve, 250)); } return roles; }
  async function requireRole(role, { loginUrl = 'index.html', container = document.querySelector('[data-page-content]'), renderLoading = true } = {}) { if (container && renderLoading) container.innerHTML = loading('กำลังตรวจสอบสิทธิ์การใช้งาน…'); const user = await currentUser(); if (!user) { location.replace(loginUrl); return null; } const roles = await rolesFor(user.id); if (!roles.includes(role)) { lifecycle.clearCache(); saveSession(null); location.replace(loginUrl); return null; } return { user, roles }; }
  function signOut(next = 'index.html') { lifecycle.clearCache(); saveSession(null); location.assign(next); }
  function defaultLoginUrl() { const path = String(location.pathname || '').toLowerCase(); return path.includes('/merchant/') || path.includes('/rider/') ? 'login.html' : 'index.html'; }
  function confirmSignOut(next = defaultLoginUrl()) { return new Promise(resolve => { document.getElementById('mpa-signout-confirm')?.remove(); const modal = document.createElement('div'); modal.id = 'mpa-signout-confirm'; modal.setAttribute('role', 'presentation'); modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:grid;place-items:end center;padding:16px;background:rgba(11,46,37,.45)'; modal.innerHTML = '<section role="dialog" aria-modal="true" aria-labelledby="mpa-signout-title" style="width:min(100%,440px);background:#fff;border-radius:22px;padding:22px;box-shadow:0 20px 55px rgba(0,0,0,.24)"><h2 id="mpa-signout-title" style="margin:0;color:#143B31;font-size:20px">ยืนยันการออกจากระบบ</h2><p style="margin:10px 0 20px;color:#61766F;line-height:1.55">คุณต้องการออกจากระบบในอุปกรณ์นี้ใช่หรือไม่</p><div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="mpa-button mpa-button-secondary" data-cancel>ยกเลิก</button><button type="button" class="mpa-button" data-confirm data-logout-bypass="true">ออกจากระบบ</button></div></section>'; document.body.append(modal); const close = value => { modal.remove(); resolve(value); }; modal.addEventListener('click', event => { if (event.target === modal) close(false); }); modal.querySelector('[data-cancel]').onclick = () => close(false); modal.querySelector('[data-confirm]').onclick = () => { close(true); signOut(next); }; }); }
  function installLogoutConfirmation() { document.addEventListener('click', event => { const control = event.target?.closest?.('button,a,[role="button"]'); const label = String(control?.textContent || '').replace(/\s+/g, ' ').trim(); if (!control || control.closest?.('#mpa-signout-confirm') || control.dataset.logoutBypass === 'true' || !/^ออกจากระบบ$/.test(label)) return; event.preventDefault(); event.stopImmediatePropagation(); void confirmSignOut(defaultLoginUrl()); }, true); }
  if (typeof document !== 'undefined') installLogoutConfirmation();
  function loading(label = 'กำลังโหลดข้อมูล…') { return `<div class="mpa-state mpa-loading"><span class="mpa-spinner" aria-hidden="true"></span><p>${escapeHtml(label)}</p></div>`; }
  function error(title, detail = '') { return `<div class="mpa-state mpa-error"><strong>${escapeHtml(title)}</strong>${detail ? `<p>${escapeHtml(detail)}</p>` : ''}<button class="mpa-button mpa-button-secondary" type="button" onclick="location.reload()">ลองใหม่</button></div>`; }
  function empty(label = 'ยังไม่มีข้อมูลในขณะนี้') { return `<div class="mpa-state"><p>${escapeHtml(label)}</p></div>`; }
  function setNotice(message, kind = 'success') { let host = document.getElementById('mpa-toast'); if (!host) { host = document.createElement('div'); host.id = 'mpa-toast'; host.className = 'mpa-toast'; document.body.append(host); } host.className = `mpa-toast ${kind}`; host.textContent = message; host.hidden = false; clearTimeout(setNotice.timer); setNotice.timer = setTimeout(() => { host.hidden = true; }, 4200); }
  const cart = { key: 'apservice_mpa_cart_v1', read() { try { return JSON.parse(sessionStorage.getItem(this.key) || '[]'); } catch { return []; } }, write(items) { sessionStorage.setItem(this.key, JSON.stringify(items)); root.dispatchEvent(new CustomEvent('apservice:cart')); }, add(item) { const items = this.read(); const index = items.findIndex(row => row.id === item.id && row.storeId === item.storeId); if (index >= 0) items[index].qty += 1; else items.push({ ...item, qty: 1 }); this.write(items); }, clear() { this.write([]); }, total() { return this.read().reduce((sum, row) => sum + Number(row.price || 0) * Number(row.qty || 0), 0); } };

  root.APServiceMPA = Object.freeze({ version: 'mpa-runtime-v4', config: { url: SUPABASE_URL, publishableKey: SUPABASE_KEY }, request: lifecycle.request, requestCount: lifecycle.requestCount, network: lifecycle, auth: { getSession, refreshSession, signIn, signUp, sendMagicLink, sendEmailOtp, verifyEmailOtp, sendPasswordRecovery, acceptMagicLinkFromHash, acceptRecoveryFromHash, updatePassword, signOut, confirmSignOut, currentUser, rolesFor, customerRolesFor, requireRole }, ui: { escapeHtml, baht, nowIso, loading, error, empty, setNotice }, cart });
  function installImageSourceChoices() {
    const isImageInput = input => input?.matches?.('input[type="file"]') && /image\//i.test(String(input.getAttribute('accept') || ''));
    const existingSourceControl = input => /^(เลือกจากคลัง|ถ่ายรูป|เปลี่ยนจากคลัง|ถ่ายรูปใหม่)/.test(String(input.closest('label')?.textContent || '').replace(/\s+/g, ' ').trim()) || Boolean(input.closest('[data-image-source-choices]'));
    const enhance = input => {
      if (!isImageInput(input) || input.dataset.imageSourceChoices === 'true' || existingSourceControl(input)) return;
      input.dataset.imageSourceChoices = 'true'; input.hidden = true; input.tabIndex = -1;
      const controls = document.createElement('span'); controls.dataset.imageSourceChoices = 'true'; controls.style.cssText = 'display:inline-flex;gap:8px;flex-wrap:wrap;vertical-align:middle';
      const choose = (label, camera) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'mpa-button mpa-button-secondary'; button.textContent = label; button.addEventListener('click', () => { if (camera) input.setAttribute('capture', 'environment'); else input.removeAttribute('capture'); input.click(); }); return button; };
      controls.append(choose('เลือกจากคลังภาพ', false), choose('ถ่ายรูปด้วยกล้อง', true));
      const anchor = input.closest('label') || input; anchor.insertAdjacentElement('afterend', controls);
    };
    const scan = node => { if (!(node instanceof Element || node instanceof Document)) return; if (node instanceof Element && isImageInput(node)) enhance(node); node.querySelectorAll?.('input[type="file"][accept*="image/"]').forEach(enhance); };
    const start = () => { scan(document); new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(scan))).observe(document.documentElement, { childList: true, subtree: true }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  }
  if (typeof document !== 'undefined') installImageSourceChoices();
})();
