const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../customer/checkout.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../customer/customer-checkout-mobile.css'), 'utf8');

assert.match(html, /customer-checkout-mobile\.css\?v=checkout-mobile-v1/);
assert.match(css, /@media\(max-width:760px\)/);
assert.match(css, /grid-template-columns:minmax\(0,1fr\)!important/);
assert.match(css, /@media\(max-width:480px\)/);
assert.match(css, /customer-address-book \.mpa-grid\[style\*="minmax\(180px"\]\{grid-template-columns:minmax\(0,1fr\)!important/);
assert.match(css, /customer-top-actions>\.mpa-button\{width:76px/);
assert.match(css, /white-space:nowrap/);
assert.match(css, /overflow-x:clip/);
console.log('customer_checkout_mobile_layout_contract_test: PASS');
