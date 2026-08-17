const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const patch = fs.readFileSync(path.join(root, 'unified_admin_brand_logo_patch.js'), 'utf8');

assert.match(index, /unified_admin_brand_logo_patch\.js\?v=admin-brand-v1/, 'Index must load unified admin brand logo logic');
assert.match(index, /id="loginBrandMark"/, 'Login logo needs a dedicated target');
assert.match(patch, /brand_public/, 'Brand must publish and load through the public configuration row');
assert.match(patch, /publishPublicBrand/, 'Admin must publish the brand configuration');
assert.match(patch, /loadPublicBrand/, 'Customers must load the published brand configuration');
assert.match(patch, /brandMark/, 'Header logo must be controlled by the unified handler');
assert.match(patch, /loginBrandMark/, 'Login logo must be controlled by the unified handler');
assert.match(patch, /image\.onerror/, 'Broken brand image URLs must fall back without a blank card');
assert.match(index, /publishPublicBrand\?\.\(\)/, 'Admin save paths must publish the public brand');

console.log('unified_admin_brand_logo_contract_test: PASS');
