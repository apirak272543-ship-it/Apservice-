const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const patch = fs.readFileSync(path.join(root, 'login_brand_logo_dynamic_patch.js'), 'utf8');

assert.match(index, /id="loginBrandMark"/, 'Login screen must expose a dedicated dynamic brand mark');
assert.match(index, /login_brand_logo_dynamic_patch\.js\?v=login-brand-dynamic-v1/, 'Index must load the dynamic login logo patch');
assert.doesNotMatch(index, /header_brand_logo_patch\.js/, 'Header must not be forced by a static logo patch');
assert.match(patch, /config\.content\?\.brandMark \|\| config\.brand\?\.logoUrl/, 'Login logo must use the same Admin brand source as the header');
assert.match(patch, /MutationObserver/, 'Login logo must update when navigating to the login view');
assert.doesNotMatch(patch, /ap-service-header-logo\.png/, 'Login logo must not force the uploaded static image');

console.log('login_brand_logo_dynamic_contract_test: PASS');
