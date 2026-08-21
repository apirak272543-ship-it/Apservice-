const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('customer/index.html', 'utf8');
const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const shared = fs.readFileSync('shared/ap-service-mpa.js', 'utf8');
const runtime = fs.readFileSync('customer/customer-home-mobile.js', 'utf8');
const css = fs.readFileSync('customer/customer-home-mobile.css', 'utf8');
const home = app.slice(app.indexOf('async function home()'), app.indexOf('async function storesPage()'));

assert.match(index, /customer-app\.js\?v=customer-flow-v6-self-signup-loading/);
assert.match(index, /customer-home-mobile\.css\?v=home-mobile-v8-self-signup/);
assert.match(index, /customer-home-mobile\.js\?v=home-mobile-v8-self-signup/);
assert.match(runtime, /homeDeliveryLabel/);
assert.match(runtime, /homeStoreSearch/);
assert.match(runtime, /customer-home-tracker/);
assert.match(runtime, /customer_home_sponsored/);
assert.match(runtime, /cart\.hidden = !count/);
assert.match(runtime, /cart\.style\.display = count \? 'flex' : 'none'/);
assert.match(runtime, /#storeList'\)\?\.closest\('section'\)\?\.remove/);
assert.match(runtime, /customer-home-register/);
assert.doesNotMatch(css, /customer-top-actions>a\[href\*="mode=register"\]\{display:none/);
assert.match(css, /customer-bottom-cart/);
assert.match(css, /customer-bottom-cart\[hidden\]\{display:none!important\}/);
assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.doesNotMatch(home, /ร้านค้ายอดนิยม/);
assert.doesNotMatch(home, /id="storeList"/);
assert.match(app, /q\.get\('search'\)/);
assert.match(shared, /DEFAULT_REQUEST_TIMEOUT_MS|withTimeoutSignal/);
assert.match(shared, /typeof AbortSignal !== 'undefined'/, 'Runtime must support WebViews without AbortSignal.timeout');
assert.match(shared, /setTimeout\(abort, duration\)/, 'Fallback timeout must actively abort hung requests');
assert.match(shared, /requestCount[\s\S]*signal: withTimeoutSignal\(signal, timeoutMs\)/, 'Count requests must not bypass the timeout guard');

console.log('customer_mobile_home_redesign_contract_test: PASS');
