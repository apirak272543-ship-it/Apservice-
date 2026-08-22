const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'shared', 'ap-service-mpa.js'), 'utf8');

function storage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear(),
  };
}

function boot(href, fetchImpl = async () => ({ ok: true, json: async () => ({}) })) {
  const local = storage();
  const session = storage();
  const replaced = [];
  const listeners = [];
  class Element {}
  class Document extends Element {}
  const document = new Document();
  Object.assign(document, { readyState: 'loading', addEventListener: (event, listener) => listeners.push([event, listener]), getElementById: () => null });
  const context = {
    console,
    URL,
    URLSearchParams,
    TextEncoder,
    Uint8Array,
    Date,
    Math,
    JSON,
    Promise,
    Map,
    Error,
    crypto: webcrypto,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    fetch: fetchImpl,
    localStorage: local,
    sessionStorage: session,
    location: { href, pathname: new URL(href).pathname, search: new URL(href).search, hash: new URL(href).hash },
    history: { replaceState: (_state, _title, value) => replaced.push(value) },
    Element,
    Document,
    document,
    AbortSignal,
    AbortController,
    CustomEvent: class CustomEvent { constructor(type) { this.type = type; } },
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'shared/ap-service-mpa.js' });
  return { api: context.APServiceMPA, local, replaced, listeners };
}

(async () => {
  let request;
  const app = boot('https://example.test/Apservice-/customer/profile.html', async (url, options) => {
    request = { url: String(url), options };
    return { ok: true, json: async () => ({}) };
  });
  await app.api.auth.sendMagicLink(' Test@Example.com ', 'https://example.test/Apservice-/customer/auth-callback.html');
  assert.match(request.url, /\/auth\/v1\/otp\?redirect_to=https%3A%2F%2Fexample\.test%2FApservice-%2Fcustomer%2Fauth-callback\.html/);
  assert.deepEqual(JSON.parse(request.options.body), { email: 'test@example.com', create_user: true });

  let exchangeRequest;
  const pkce = boot('https://example.test/Apservice-/customer/auth-callback.html?code=auth-code&next=index.html', async (url, options) => {
    exchangeRequest = { url: String(url), options };
    return { ok: true, json: async () => ({ access_token: 'pkce-access', refresh_token: 'pkce-refresh', expires_in: 3600, user: { id: 'user-pkce' } }) };
  });
  pkce.local.setItem('apservice_auth_code_verifier_v1', 'stored-verifier');
  const pkceSession = await pkce.api.auth.processCallback();
  assert.equal(pkceSession.access_token, 'pkce-access');
  assert.equal(pkce.local.getItem('apservice_mpa_session_v1'), JSON.stringify(pkceSession));
  assert.deepEqual(JSON.parse(exchangeRequest.options.body), { auth_code: 'auth-code', code_verifier: 'stored-verifier' });
  assert.equal(pkce.local.getItem('apservice_auth_code_verifier_v1'), null);
  assert.deepEqual(pkce.replaced, ['/Apservice-/customer/auth-callback.html?next=index.html']);

  const hash = boot('https://example.test/Apservice-/customer/auth-callback.html#access_token=hash-access%26part&refresh_token=hash-refresh&expires_in=3600');
  const hashSession = await hash.api.auth.processCallback();
  assert.equal(hashSession.access_token, 'hash-access&part');
  assert.equal(hash.local.getItem('apservice_mpa_session_v1'), JSON.stringify(hashSession));
  assert.deepEqual(hash.replaced, ['/Apservice-/customer/auth-callback.html']);

  let verifyRequest;
  const tokenHash = boot('https://example.test/Apservice-/customer/auth-callback.html?token_hash=one-time-hash&type=email', async (url, options) => {
    verifyRequest = { url: String(url), options };
    return { ok: true, json: async () => ({ access_token: 'verify-access', refresh_token: 'verify-refresh', expires_in: 3600, user: { id: 'user-verify' } }) };
  });
  const verifySession = await tokenHash.api.auth.processCallback();
  assert.equal(verifySession.access_token, 'verify-access');
  assert.equal(verifyRequest.url, 'https://abtsctwfkgzciseppach.supabase.co/auth/v1/verify');
  assert.deepEqual(JSON.parse(verifyRequest.options.body), { token_hash: 'one-time-hash', type: 'email' });
  assert.deepEqual(tokenHash.replaced, ['/Apservice-/customer/auth-callback.html']);

  const missingVerifier = boot('https://example.test/Apservice-/customer/auth-callback.html?code=auth-code');
  await assert.rejects(() => missingVerifier.api.auth.processCallback(), /ไม่พบข้อมูลยืนยันความปลอดภัย/);
  assert.deepEqual(missingVerifier.replaced, []);

  const error = boot('https://example.test/Apservice-/customer/auth-callback.html?error=access_denied&error_description=expired&next=index.html');
  await assert.rejects(() => error.api.auth.processCallback(), /expired/);
  assert.deepEqual(error.replaced, ['/Apservice-/customer/auth-callback.html?next=index.html']);

  console.log('customer auth runtime unit: PASS');
})();
