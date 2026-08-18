const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const css = fs.readFileSync('customer/customer-legacy-parity.css', 'utf8');

assert.match(app, /customer-brand-mark/, 'Customer MPA ต้องมี legacy-style brand mark');
assert.match(app, /สมัครสมาชิก/, 'Customer MPA ต้องคง call-to-action สมัครสมาชิก');
assert.match(app, /customer-hero/, 'Customer MPA ต้องใช้ hero visual shell');
assert.match(app, /customer-services/, 'Customer MPA ต้องมี service discovery section');
assert.match(app, /storeSearch/, 'Customer MPA ต้องมี search ร้านค้า');
assert.match(app, /store_categories\?select=/, 'Customer MPA ต้องใช้ category data source จริง');
assert.match(app, /customer-cart-fab/, 'Customer MPA ต้องมี floating cart entry');
assert.match(app, /background_url/, 'Store card ต้องใช้ background media field เดิม');
assert.match(app, /key=eq\.brand_public/, 'Customer MPA ต้องอ่าน public brand key เดียวกับ legacy แบบ non-blocking');
assert.match(app, /data-brand-mark/, 'Customer MPA ต้องมี dynamic brand mark target');
assert.match(app, /Fallback shell remains usable/, 'Public brand failure ต้องไม่ block navigation/render');
assert.match(css, /@media\(max-width:760px\)/, 'Customer visual shell ต้องมี mobile breakpoint');

console.log('customer visual shell parity contract: PASS');
