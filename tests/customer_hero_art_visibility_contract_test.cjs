const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('customer/index.html', 'utf8');
const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const runtime = fs.readFileSync('customer/customer-content-runtime.js', 'utf8');
const mobileCss = fs.readFileSync('customer/customer-home-mobile.css', 'utf8');
const designCss = fs.readFileSync('customer/customer-design-system.css', 'utf8');
const legacyCss = fs.readFileSync('customer/customer-legacy-parity.css', 'utf8');

assert.match(index, /customer-content-runtime\.js\?v=content-runtime-v7-hero-art/, 'Customer home must load the cache-busted canonical content consumer');
assert.match(index, /customer-home-mobile\.css\?v=home-mobile-v9-hero-art&revision=home-mobile-v9-hero-art/, 'Customer home must load the cache-busted mobile layout');
assert.match(index, /customer-design-system\.css\?v=customer-design-v6-hero-art/, 'Customer home must load the cache-busted native layout');
assert.match(index, /customer-app\.js\?v=.*&hero=customer-hero-art-v1/, 'Customer home must load the cache-busted app owner');
assert.match(app, /customer-legacy-parity\.css\?v=customer-parity-v2-hero-art/, 'Injected legacy parity CSS must use the Hero-art cache-bust');
assert.match(app, /class="customer-hero-art" aria-hidden="true"/, 'Hero must retain an accessible empty/fallback state');
assert.match(runtime, /art\.setAttribute\('data-admin-art', 'true'\)/, 'Configured Hero art must mark the rendered consumer slot');
assert.match(runtime, /art\.setAttribute\('aria-hidden', 'false'\)/, 'Configured Hero art must not remain aria-hidden');
assert.match(runtime, /art\.removeAttribute\('data-admin-art'\)/, 'Missing Hero art must clear the configured marker');
assert.match(runtime, /art\.setAttribute\('aria-hidden', 'true'\)/, 'Missing Hero art must restore the hidden fallback state');

for (const [name, css] of [['customer-home-mobile.css', mobileCss], ['customer-design-system.css', designCss], ['customer-legacy-parity.css', legacyCss]]) {
  assert.doesNotMatch(css, /\.customer-hero-art\{display:none\}/, `${name} must not unconditionally hide an Admin-configured Hero art slot`);
  assert.match(css, /customer-hero-art:not\(\[data-admin-art="true"\]\)\{display:none\}/, `${name} must only hide the Hero art slot when no Admin art is configured`);
}

console.log('customer_hero_art_visibility_contract_test: PASS');
