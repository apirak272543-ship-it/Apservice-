const assert = require('node:assert/strict');
const fs = require('node:fs');

const customer = fs.readFileSync('customer/customer-app.js', 'utf8');
const content = fs.readFileSync('customer/customer-content-runtime.js', 'utf8');
const home = customer.slice(customer.indexOf('async function home()'), customer.indexOf('async function storesPage()'));

assert.match(home, /ข้อเสนอจากร้านสปอนเซอร์/);
assert.match(home, /id="sponsoredList"/);
assert.match(home, /พื้นที่สปอนเซอร์หน้าแรก/);
assert.doesNotMatch(home, /ร้านค้ายอดนิยม/);
assert.doesNotMatch(home, /id="storeList"/);
assert.doesNotMatch(customer, /legacyDefaultPromotions/);
assert.match(customer, /item\?\.placement === 'customer_home_sponsored'/);
assert.match(customer, /item\?\.active !== false/);
assert.match(customer, /Number\.isFinite\(starts\) && starts <= now/);
assert.match(customer, /Number\.isFinite\(ends\) && now <= ends/);
assert.match(customer, /#sponsoredList/);
assert.match(content, /document\.querySelector\('#sponsoredList'\)/);
assert.match(content, /item\?\.placement === 'customer_home_sponsored'/);
assert.match(content, /item\?\.active !== false/);

console.log('customer_home_sponsored_placement_contract_test: PASS');
