import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const mediaRuntime = read('shared/ap-login-media.js');
const adminMedia = read('../apservicebeta-publish/admin/login-media.html');
const adminMediaRuntime = read('../apservicebeta-publish/admin/login-media.js');
const checkout = read('customer/customer-retail-patch.js');

assert.match(mediaRuntime, /login_resolve_background_media/);
assert.match(mediaRuntime, /login_resolve_background_media/);
assert.match(mediaRuntime, /isLoginContext/);
assert.match(adminMedia, /type="file" accept="image\/\*"/);
assert.doesNotMatch(adminMedia, /type="url"/);
assert.match(adminMediaRuntime, /createImageBitmap/);
assert.match(adminMediaRuntime, /1200/);
assert.match(adminMediaRuntime, /0\.82/);
assert.match(adminMediaRuntime, /image\/gif/);
assert.match(checkout, /retail_create_customer_delivery_order/);
assert.match(checkout, /navigator\.geolocation/);
assert.match(checkout, /พิกัดจัดส่ง/);
assert.match(checkout, /retailUseLocation/);
for (const file of [
  '../apservicebeta-publish/admin/login.html',
  '../apservicebeta-publish/admin/index.html',
  '../ap-store-mobile/merchant/login.html',
  '../ap-rider-mobile/rider/login.html',
  '../ap-retail-pos-publish/index.html',
  'admin.html',
]) assert.match(read(file), /ap-login-media\.js/);
console.log('login-media-cart-contract: PASS');
