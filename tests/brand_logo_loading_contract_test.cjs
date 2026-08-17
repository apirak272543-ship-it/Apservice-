const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const patch = fs.readFileSync(path.join(root, 'unified_admin_brand_logo_patch.js'), 'utf8');

assert.match(patch, /Public branding must never use SupabaseSync\.request/,
  'Public branding must document that it cannot use the session-aware request wrapper');
assert.match(patch, /fetch\(`\$\{cfg\.url\}\/rest\/v1\/platform_configs/,
  'Public branding must use a direct public REST fetch');
assert.match(patch, /AbortController/,
  'Public branding fetch must have a timeout/cancellation guard');
assert.match(patch, /Do not observe these nodes/,
  'Brand nodes must not be observed by a MutationObserver that can loop on self-updates');
assert.doesNotMatch(patch, /new MutationObserver\(\(\) => applyLogo\(target, localBrand\(\)\.logoUrl\)\)/,
  'Brand logo patch must not install a self-triggering MutationObserver');

console.log('brand_logo_loading_contract_test: PASS');
