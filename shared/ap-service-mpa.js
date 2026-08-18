(() => {
  'use strict';

  const root = window;
  const SUPABASE_URL = 'https://abtsctwfkgzciseppach.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_TyJWnKkbS8vKcQKKAzoqSg_BOguwKRv';
  const SESSION_KEY = 'apservice_mpa_session_v1';

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const baht = value => Number(value || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
  const nowIso = () => new Date().toISOString();
  const normalizePath = path => String(path || '').replace(/^\/+/, '');

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  }

  function saveSession(session) {
    if (session?.access_token) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  function token() { return getSession()?.access_token || ''; }

  async function request(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const publicRead = method === 'GET' && !options.private;
    const headers = {
      apikey: SUPABASE_KEY,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    };
    if (token() && (!publicRead || options.forceSession)) headers.Authorization = `Bearer ${token()}`;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${normalizePath(path)}`, { ...options, method, headers });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error(data?.message || data?.hint || `ไม่สามารถโหลดข้อมูลได้ (${response.status})`);
    return data;
  }

  async function authRequest(path, options = {}) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/${normalizePath(path)}`, {
      ...options,
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.msg || body?.message || 'ไม่สามารถยืนยันตัวตนได้');
    return body;
  }

  async function signIn(email, password) {
    const session = await authRequest('token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
    saveSession(session);
    return session;
  }

  async function currentUser() {
    const current = getSession();
    if (!current?.access_token) return null;
    try {
      const user = await authRequest('user', { headers: { Authorization: `Bearer ${current.access_token}` } });
      return user;
    } catch {
      saveSession(null);
      return null;
    }
  }

  async function rolesFor(userId) {
    if (!userId || !token()) return [];
    const rows = await request(`user_roles?select=role&user_id=eq.${encodeURIComponent(userId)}`, { private: true });
    return (rows || []).map(row => row.role).filter(Boolean);
  }

  async function requireRole(role, { loginUrl = 'index.html', container = document.querySelector('[data-page-content]') } = {}) {
    if (container) container.innerHTML = loading('กำลังตรวจสอบสิทธิ์การใช้งาน…');
    const user = await currentUser();
    if (!user) { location.replace(loginUrl); return null; }
    const roles = await rolesFor(user.id);
    if (!roles.includes(role)) {
      if (container) container.innerHTML = error('บัญชีนี้ไม่มีสิทธิ์เข้าสู่หน้านี้', 'กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์ถูกต้อง');
      return null;
    }
    return { user, roles };
  }

  function signOut(next = 'index.html') { saveSession(null); location.assign(next); }
  function loading(label = 'กำลังโหลดข้อมูล…') { return `<div class="mpa-state mpa-loading"><span class="mpa-spinner" aria-hidden="true"></span><p>${escapeHtml(label)}</p></div>`; }
  function error(title, detail = '') { return `<div class="mpa-state mpa-error"><strong>${escapeHtml(title)}</strong>${detail ? `<p>${escapeHtml(detail)}</p>` : ''}<button class="mpa-button mpa-button-secondary" type="button" onclick="location.reload()">ลองใหม่</button></div>`; }
  function empty(label = 'ยังไม่มีข้อมูลในขณะนี้') { return `<div class="mpa-state"><p>${escapeHtml(label)}</p></div>`; }
  function setNotice(message, kind = 'success') {
    let host = document.getElementById('mpa-toast');
    if (!host) { host = document.createElement('div'); host.id = 'mpa-toast'; host.className = 'mpa-toast'; document.body.append(host); }
    host.className = `mpa-toast ${kind}`; host.textContent = message; host.hidden = false;
    clearTimeout(setNotice.timer); setNotice.timer = setTimeout(() => { host.hidden = true; }, 4200);
  }

  const cart = {
    key: 'apservice_mpa_cart_v1',
    read() { try { return JSON.parse(sessionStorage.getItem(this.key) || '[]'); } catch { return []; } },
    write(items) { sessionStorage.setItem(this.key, JSON.stringify(items)); root.dispatchEvent(new CustomEvent('apservice:cart')); },
    add(item) {
      const items = this.read();
      const index = items.findIndex(row => row.id === item.id && row.storeId === item.storeId);
      if (index >= 0) items[index].qty += 1;
      else items.push({ ...item, qty: 1 });
      this.write(items);
    },
    clear() { this.write([]); },
    total() { return this.read().reduce((sum, row) => sum + Number(row.price || 0) * Number(row.qty || 0), 0); },
  };

  root.APServiceMPA = Object.freeze({
    version: 'mpa-runtime-v1', config: { url: SUPABASE_URL, publishableKey: SUPABASE_KEY }, request,
    auth: { getSession, signIn, signOut, currentUser, rolesFor, requireRole },
    ui: { escapeHtml, baht, nowIso, loading, error, empty, setNotice }, cart,
  });
})();
