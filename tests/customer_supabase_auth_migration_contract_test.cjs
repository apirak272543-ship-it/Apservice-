const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'shared', 'ap-supabase-client.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'shared', 'ap-service-mpa.js'), 'utf8');
const loginMedia = fs.readFileSync(path.join(root, 'shared', 'ap-login-media.js'), 'utf8');
const pages = fs.readdirSync(path.join(root, 'customer')).filter(name => name.endsWith('.html'));
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, 'customer', page), 'utf8');
  assert.match(html, /https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/, `${page} must load Supabase JS`);
  assert.match(html, /ap-supabase-client\.js\?v=supabase-auth-client-v1/, `${page} must load the shared Supabase client`);
  assert.match(html, /ap-service-mpa\.js\?v=mpa-v13-supabase-auth-client/, `${page} must load the migrated auth runtime`);
}
assert.match(client, /persistSession: true/);
assert.match(client, /autoRefreshToken: true/);
assert.match(client, /onAuthStateChange/);
assert.match(client, /auth\.getSession\(\)/);
assert.match(client, /auth\.setSession/);
assert.doesNotMatch(runtime, /auth\/v1/);
assert.doesNotMatch(loginMedia, /apservice_mpa_session_v1/);
assert.match(runtime, /auth\.signInWithOtp/);
assert.match(runtime, /auth\.exchangeCodeForSession/);
assert.match(runtime, /auth\.verifyOtp/);
assert.match(runtime, /auth\.signOut/);
assert.match(runtime, /const sessionRestoreReady = authReady/);
console.log(`customer Supabase Auth migration contract: PASS (${pages.length} pages)`);
