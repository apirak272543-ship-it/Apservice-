import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const patch = fs.readFileSync(new URL('../admin_floating_cart_patch.js', import.meta.url), 'utf8');

assert.match(index, /admin_floating_cart_patch\.js\?v=floating-cart-v2/);
assert.match(patch, /id = 'apFloatingCart'/);
assert.match(patch, /display:block!important/);
assert.match(patch, /style\.setProperty\('display', 'block', 'important'\)/);
assert.match(patch, /cart\.length \? cart\.map/);
assert.match(patch, /ตะกร้าสินค้าว่างเปล่า/);
assert.match(patch, /\.table-wrap\{[^}]*overflow-x:auto/);
assert.match(patch, /\.section-head\{flex-wrap:wrap/);
assert.match(patch, /\.form-grid\{grid-template-columns:repeat\(auto-fit/);
assert.match(patch, /@media\(max-width:768px\)/);
assert.match(patch, /\.store-detail-media-picker \.media-source-actions\{grid-template-columns:1fr\}/);

console.log('PASS: Floating Cart is globally visible with an empty-cart state');
console.log('PASS: Detail, tables, action rows, forms and media controls have mobile overflow safeguards');
console.log('PASS: Cache-busting query is updated to floating-cart-v2');
