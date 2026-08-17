const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const patch = fs.readFileSync(path.join(root, 'referral_guest_login_gate_patch.js'), 'utf8');

assert.match(index, /referral_guest_login_gate_patch\.js\?v=guest-login-gate-v1/, 'Index must load the referral guest login gate');
assert.match(patch, /requireCustomerOrderLogin/, 'Guest order-login guard must exist');
assert.match(patch, /guardAction\('addCart'/, 'Add-to-cart must require login');
assert.match(patch, /guardAction\('adjustCart'/, 'Cart quantity changes must require login');
assert.match(patch, /guardAction\('toggleCartPopup'/, 'Opening the cart must require login');
assert.match(patch, /guardAction\('proceedToCheckoutSummary'/, 'Checkout summary must require login');
assert.match(patch, /guardAction\('confirmCheckoutSummary'/, 'Checkout confirmation must require login');
assert.match(patch, /menuOptionsForm/, 'Menu option form must require login before submitting');
assert.match(patch, /Browsing store fronts remains public/, 'Store browsing must remain public for referral visitors');
assert.doesNotMatch(patch, /guardAction\('openStore'/, 'Store browsing must never be blocked');

console.log('referral_guest_login_gate_contract_test: PASS');
