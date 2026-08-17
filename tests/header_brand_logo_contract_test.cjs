const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const patch = fs.readFileSync(path.join(root, 'header_brand_logo_patch.js'), 'utf8');

assert.match(index, /header_brand_logo_patch\.js\?v=ap-logo-v1/, 'Header logo patch must load');
assert.ok(fs.existsSync(path.join(root, 'ap-service-header-logo.png')), 'User-provided AP Service logo must be in the repository');
assert.match(patch, /ap-service-header-logo\.png/, 'Header patch must use the supplied AP Service logo');
assert.match(patch, /brandMark/, 'Header patch must target the existing brand mark');
assert.match(patch, /MutationObserver/, 'Header logo must survive later UI rerenders');
assert.match(patch, /object-fit:contain/, 'Full logo must remain uncropped in the compact header');

console.log('header_brand_logo_contract_test: PASS');
