const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const clientSource = fs.readFileSync(path.join(root, 'shared', 'ap-supabase-client.js'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'shared', 'ap-service-mpa.js'), 'utf8');

function storage() { const values = new Map(); return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key), clear: () => values.clear() }; }
function boot(href) {
  const local = storage(); const session = storage(); const replaced = []; let state = { access_token: 'stored-access', refresh_token: 'stored-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'user-1', email: 'test@example.com' } }; let authListener; let options;
  const client = { auth: {
    signInWithOtp: async args => ({ data: { user: null, session: null, args }, error: null }),
    signInWithPassword: async () => ({ data: { user: state.user, session: state }, error: null }),
    signInWithOAuth: async args => ({ data: { url: `https://accounts.google.com/o/oauth2/v2/auth?state=${args.provider}` }, error: null }),
    signUp: async () => ({ data: { user: state.user, session: state }, error: null }),
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    exchangeCodeForSession: async () => ({ data: { session: { ...state, access_token: 'code-access', refresh_token: 'code-refresh', user: { id: 'code-user' } } }, error: null }),
    verifyOtp: async () => ({ data: { session: { ...state, access_token: 'verify-access', refresh_token: 'verify-refresh', user: { id: 'verify-user' } } }, error: null }),
    setSession: async session => { state = { ...state, ...session, user: state.user }; authListener?.('SIGNED_IN', state); return { data: { session: state }, error: null }; },
    getSession: async () => ({ data: { session: state }, error: null }),
    getUser: async () => state?.user ? ({ data: { user: state.user }, error: null }) : ({ data: { user: null }, error: new Error('Auth session missing') }),
    refreshSession: async () => ({ data: { session: { ...state, access_token: 'refreshed-access' } }, error: null }),
    updateUser: async () => ({ data: { user: state.user }, error: null }),
    signOut: async () => { state = null; authListener?.('SIGNED_OUT', null); return { error: null }; },
    onAuthStateChange: listener => { authListener = listener; queueMicrotask(() => listener('INITIAL_SESSION', state)); return { data: { subscription: { unsubscribe() {} } } }; },
  } };
  const listeners = []; class Element {} class Document extends Element {}
  const document = new Document(); Object.assign(document, { readyState: 'loading', addEventListener: (event, listener) => listeners.push([event, listener]), getElementById: () => null, querySelectorAll: () => [] });
  const context = { console, URL, URLSearchParams, TextEncoder, Uint8Array, Date, Math, JSON, Promise, Map, Error, crypto: webcrypto, btoa: value => Buffer.from(value, 'binary').toString('base64'), setTimeout, clearTimeout, setInterval, fetch: async () => ({ ok: true, json: async () => ({}) }), localStorage: local, sessionStorage: session, location: { href, pathname: new URL(href).pathname, search: new URL(href).search, hash: new URL(href).hash, assign: value => replaced.push(value), replace: value => replaced.push(value) }, history: { replaceState: (_state, _title, value) => replaced.push(value) }, Element, Document, document, AbortSignal, AbortController, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } }, addEventListener: () => {}, dispatchEvent: () => {}, supabase: { createClient: (_url, _key, suppliedOptions) => { options = suppliedOptions; return client; } } };
  context.window = context;
  vm.runInNewContext(clientSource, context, { filename: 'shared/ap-supabase-client.js' });
  vm.runInNewContext(runtimeSource, context, { filename: 'shared/ap-service-mpa.js' });
  return { api: context.APServiceMPA, local, replaced, options, client };
}

(async () => {
  const app = boot('https://example.test/Apservice-/customer/profile.html');
  assert.equal(app.options.auth.persistSession, true);
  assert.equal(app.options.auth.autoRefreshToken, true);
  assert.equal(app.options.auth.detectSessionInUrl, false);
  const magic = await app.api.auth.sendMagicLink(' Test@Example.com ', 'https://example.test/Apservice-/customer/auth-callback.html');
  assert.equal(magic.args.email, 'test@example.com');
  assert.equal(magic.args.options.emailRedirectTo, 'https://example.test/Apservice-/customer/auth-callback.html');
  assert.equal((await app.api.auth.currentUser()).id, 'user-1');
  await app.api.auth.signInWithOAuth('google', 'https://example.test/Apservice-/customer/auth-callback.html');
  assert.equal(app.replaced.at(-1), 'https://accounts.google.com/o/oauth2/v2/auth?state=google');

  const callback = boot('https://example.test/Apservice-/customer/auth-callback.html?code=auth-code&next=index.html');
  const codeSession = await callback.api.auth.processCallback();
  assert.equal(codeSession.access_token, 'code-access');
  assert.deepEqual(callback.replaced, ['/Apservice-/customer/auth-callback.html?next=index.html']);

  const tokenHash = boot('https://example.test/Apservice-/customer/auth-callback.html?token_hash=one-time-hash&type=email');
  const verifySession = await tokenHash.api.auth.processCallback();
  assert.equal(verifySession.access_token, 'verify-access');
  assert.deepEqual(tokenHash.replaced, ['/Apservice-/customer/auth-callback.html']);

  const direct = boot('https://example.test/Apservice-/customer/auth-callback.html#access_token=hash-access&refresh_token=hash-refresh&expires_in=3600');
  const directSession = await direct.api.auth.processCallback();
  assert.equal(directSession.access_token, 'hash-access');
  assert.deepEqual(direct.replaced, ['/Apservice-/customer/auth-callback.html']);

  await app.api.auth.signOut('profile.html');
  assert.equal(await app.api.auth.currentUser(), null);
  console.log('customer auth runtime supabase-client contract: PASS');
})();
