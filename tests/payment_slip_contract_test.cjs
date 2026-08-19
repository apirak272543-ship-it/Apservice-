const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const compileInlineScripts = (html, filename) => {
  const matcher = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(matcher)) new vm.Script(match[1], { filename: `${filename}:inline-script` });
};

const entry = read('customer/index.html');
const checkout = read('customer/checkout.html');
const customer = read('customer/customer-app.js');
const migration = read('supabase/migrations/20260817_secure_pending_payment_orders.sql');

compileInlineScripts(entry, 'customer/index.html');
compileInlineScripts(checkout, 'customer/checkout.html');
assert.match(entry, /shared\/ap-service-mpa\.js/, 'Customer entry ต้องใช้ Shared MPA runtime');
assert.match(checkout, /shared\/ap-service-mpa\.js/, 'Customer checkout ต้องใช้ Shared MPA runtime');
assert.match(customer, /create_food_order/, 'Customer checkout ต้องสร้าง order ผ่าน server RPC');
assert.match(migration, /create policy orders_read_participant/, 'ต้องมี policy อ่าน order สำหรับ participant');
assert.match(migration, /status not in \('รอตรวจสอบการชำระเงิน', 'ต้องแนบสลิปใหม่'\)/, 'ไรเดอร์และร้านต้องไม่เห็น order ที่รอตรวจสลิป');
assert.match(migration, /or customer_id = auth\.uid\(\)/, 'ลูกค้าต้องอ่าน order ของตนได้');
const updatePolicy = migration.split('create policy orders_participant_update')[1] || '';
assert.doesNotMatch(updatePolicy, /customer_id = auth\.uid\(\)/, 'ลูกค้าห้ามเปลี่ยน status order ผ่าน participant update policy');
for (const legacyFile of ['admin_floating_cart_patch.js', 'rider.html', 'store.html']) {
  assert.equal(fs.existsSync(path.join(root, legacyFile)), false, `Customer payment contract ห้ามพึ่ง ${legacyFile} ที่เลิกใช้`);
}

console.log('payment-slip contract: PASS');
