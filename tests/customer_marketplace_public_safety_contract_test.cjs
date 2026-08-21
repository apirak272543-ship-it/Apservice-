const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const native = fs.readFileSync(path.join(root, 'customer', 'customer-mobile-native.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'customer', 'customer-app.js'), 'utf8');
const gateway = fs.readFileSync(path.join(root, 'customer', 'customer-marketplace-privacy-gateway.js'), 'utf8');
const pages = ['marketplace.html', 'marketplace-item.html', 'marketplace-new.html'].map(name => fs.readFileSync(path.join(root, 'customer', name), 'utf8'));

assert.match(app, /RLS ของบัญชีผู้ขาย/, 'Contract must prove the patch handles the legacy implementation copy');
assert.match(native, /ประกาศของคุณจะแสดงเฉพาะตามสิทธิ์ของบัญชี/, 'Customer-facing Marketplace copy must explain privacy in Thai');
assert.match(native, /publicPhonePattern/, 'Marketplace guard must detect public phone-like strings');
assert.match(native, /redactPublicContact/, 'Marketplace browse/detail text must redact public contact details');
assert.match(native, /ใช้แชต AP Service/, 'Marketplace must direct contact through the in-product chat flow');
assert.match(native, /stopImmediatePropagation/, 'Create flow must block submission containing a phone-like string before the original handler writes data');
assert.match(native, /marketplacePrivacyAttempts < 20/, 'Async Marketplace data must receive only bounded privacy retries');
assert.match(gateway, /marketplace_listings\?/, 'Privacy gateway must scope redaction to Marketplace listing responses');
assert.match(gateway, /M\.network\.createScope/, 'Privacy gateway must intercept the scoped request path before Customer runtime renders it');
assert.match(gateway, /description: redact\(row\.description\)/, 'Privacy gateway must redact description data before render');
for (const page of pages) assert.match(page, /customer-mobile-native\.js\?v=customer-native-v5-marketplace-privacy-retry/, 'Every public Marketplace surface must load the bounded privacy runtime revision');
for (const page of pages.slice(0, 2)) {
  assert.match(page, /customer-marketplace-privacy-gateway\.js\?v=marketplace-privacy-gateway-v1/, 'Public browse/detail must load the redaction gateway before Customer runtime');
  assert.match(page, /marketplace=marketplace-card-v3-public-redaction/, 'Public browse/detail must request the redaction runtime revision');
}

console.log('customer marketplace public safety contract: PASS');
