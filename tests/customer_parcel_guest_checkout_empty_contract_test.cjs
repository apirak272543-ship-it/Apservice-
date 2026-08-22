const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const parcel = fs.readFileSync(path.join(root, 'customer', 'customer-parcel.js'), 'utf8');
const parcelCss = fs.readFileSync(path.join(root, 'customer', 'customer-parcel.css'), 'utf8');
const parcelEntry = fs.readFileSync(path.join(root, 'customer', 'parcel.html'), 'utf8');
const native = fs.readFileSync(path.join(root, 'customer', 'customer-mobile-native.js'), 'utf8');
const checkoutCss = fs.readFileSync(path.join(root, 'customer', 'customer-checkout-mobile.css'), 'utf8');
const checkoutEntry = fs.readFileSync(path.join(root, 'customer', 'checkout.html'), 'utf8');

assert.match(parcel, /customer-parcel-guest__steps/, 'Guest parcel state must explain the real A-to-B flow');
assert.match(parcel, /profile\.html\?next=parcel\.html/, 'Guest parcel state must route to Login before a delivery request');
assert.match(parcelCss, /customer-parcel-guest__actions/, 'Guest parcel state must have a mobile layout');
assert.match(parcelEntry, /parcel-a2b-v4-guest/, 'Parcel entrypoint must request the guest explainer revision');
assert.match(native, /const syncEmptyCart = \(\) =>/, 'Checkout must synchronize a true empty cart state');
assert.match(native, /ตะกร้าสินค้ายังว่าง/, 'Checkout must explain an empty cart with user copy');
assert.match(native, /submit\.disabled = isEmpty/, 'Checkout submit must be disabled when the cart is empty');
assert.match(native, /summary\.hidden = isEmpty/, 'Checkout summary form must not compete with the empty-cart guidance');
assert.match(native, /context\.hidden = isEmpty/, 'Checkout context card must not duplicate the empty-cart guidance');
assert.match(checkoutCss, /customer-native-cart-empty/, 'Checkout empty state must have dedicated mobile styling');
assert.match(checkoutEntry, /checkout-mobile-v2-empty/, 'Checkout must request the empty-state stylesheet revision');
assert.match(checkoutEntry, /customer-native-v8-empty-checkout-summary/, 'Checkout must request the empty-state runtime revision');

console.log('customer parcel guest and checkout empty contract: PASS');
