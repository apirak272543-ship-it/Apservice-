const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const css = fs.readFileSync('customer/customer-unified-theme.css', 'utf8');

assert.match(app, /customer-unified-theme-style/);
assert.match(app, /customer-unified-theme\.css\?v=customer-unified-v1/);
assert.match(css, /--customer-radius-xl:28px/);
assert.match(css, /--customer-radius-lg:23px/);
assert.match(css, /--customer-shadow:/);
assert.match(css, /\.mpa-card,body\[data-page\] \.customer-store-card/);
assert.match(css, /border-radius:var\(--customer-radius-lg\)!important/);
assert.match(css, /\.mpa-button\{min-height:42px;border-radius:var\(--customer-radius-md\)!important/);
assert.match(css, /\.mpa-field input/);
assert.match(css, /\.mpa-modal/);
assert.match(css, /@media\(max-width:760px\)/);

console.log('customer_unified_theme_contract_test: PASS');
