const fs = require('fs');
const assert = require('assert');

const runtime = fs.readFileSync('shared/ap-service-mpa.js', 'utf8');
const stylesheet = fs.readFileSync('shared/ap-service-mpa.css', 'utf8');
assert.match(runtime, /requireRole/, 'Shared MPA runtime ต้องมี role guard');
assert.match(runtime, /auth\/v1\/\$\{normalizePath\(path\)\}/, 'Shared MPA runtime ต้องเชื่อม Supabase Auth');
assert.match(runtime, /token\?grant_type=password/, 'Shared MPA runtime ต้องรองรับการเข้าสู่ระบบด้วย Supabase Auth');
assert.match(runtime, /rest\/v1/, 'Shared MPA runtime ต้องเชื่อม Supabase REST endpoint');
assert.match(runtime, /refreshSession/, 'Shared MPA runtime ต้องต่ออายุ session ก่อนงานที่ต้องมีสิทธิ์');
assert.match(stylesheet, /mpa-loading/, 'Shared MPA shell ต้องมี loading state');
assert.match(stylesheet, /mpa-error/, 'Shared MPA shell ต้องมี error state');

const customerRoutes = ['index.html', 'stores.html', 'store.html', 'checkout.html', 'orders.html', 'order.html', 'notifications.html', 'support.html', 'marketplace.html', 'marketplace-item.html', 'marketplace-new.html', 'marketplace-profile.html', 'marketplace-chat.html', 'profile.html', 'privacy.html'];
for (const file of customerRoutes) {
  const path = `customer/${file}`;
  assert.ok(fs.existsSync(path), `${path} ต้องมีอยู่จริง`);
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /shared\/ap-service-mpa\.js/, `${path} ต้องโหลด Shared MPA runtime`);
  assert.match(source, /shared\/ap-service-core\.js/, `${path} ต้องโหลด Shared Core`);
  assert.doesNotMatch(source, /<script[^>]+src="\.\.\/(?:index|admin|store|rider)\.html/i, `${path} ห้ามโหลด Monolith เป็น runtime`);
}

const customerRuntime = fs.readFileSync('customer/customer-app.js', 'utf8');
assert.match(customerRuntime, /APServiceMPA/, 'Customer ต้องใช้ Shared MPA runtime');
assert.match(customerRuntime, /APServiceCore/, 'Customer ต้องใช้ Shared Core');
assert.match(customerRuntime, /customer_promotions/, 'Customer home ต้องอ่านเฉพาะ promotion configuration ที่เปิดเผยได้');
assert.match(customerRuntime, /setInterval/, 'Customer promotion carousel ต้องเลื่อนตามเวลาโดยไม่ block navigation');
assert.doesNotMatch(fs.readFileSync(__filename, 'utf8'), /const routes = \{[\s\S]*admin:/, 'Customer repository ต้องไม่ตรวจ Admin/Merchant/Rider local files หลัง separation');

console.log('customer live MPA routes contract: PASS');
