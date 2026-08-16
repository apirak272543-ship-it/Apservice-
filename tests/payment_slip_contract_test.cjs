const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const compile = (source, filename) => new vm.Script(source, { filename });
const inlineScripts = (html, filename) => {
  const matcher = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(matcher)) compile(match[1], `${filename}:inline-script`);
};

const index = read('index.html');
const floatingCart = read('admin_floating_cart_patch.js');
const rider = read('rider.html');
const store = read('store.html');
const migration = read('supabase/migrations/20260817_secure_pending_payment_orders.sql');

compile(floatingCart, 'admin_floating_cart_patch.js');
inlineScripts(index, 'index.html');
inlineScripts(rider, 'rider.html');
inlineScripts(store, 'store.html');

assert.match(index, /รับคำสั่งซื้อแล้ว กำลังตรวจสอบการชำระเงิน/);
assert.match(floatingCart, /const PaymentSlipReview/);
assert.match(floatingCart, /installPaymentSlipOrderGuard/);
assert.match(floatingCart, /order\.status\s*=\s*'รอตรวจสอบการชำระเงิน'/);
assert.match(floatingCart, /payment_slip_reviews\?select=/);
assert.match(floatingCart, /status=eq\.pending/);
assert.match(floatingCart, /reviewPaymentSlip/);
assert.match(rider, /visibleRows=rows\.filter\(row=>row\.status!==['"]รอตรวจสอบการชำระเงิน['"]&&row\.status!==['"]ต้องแนบสลิปใหม่['"]\)/);
assert.match(store, /status','not\.in\.\(\"รอตรวจสอบการชำระเงิน\",\"ต้องแนบสลิปใหม่\"\)/);
assert.match(migration, /create policy orders_read_participant/);
assert.match(migration, /status not in \('รอตรวจสอบการชำระเงิน', 'ต้องแนบสลิปใหม่'\)/);
assert.match(migration, /or customer_id = auth\.uid\(\)/);
const updatePolicy = migration.split('create policy orders_participant_update')[1] || '';
assert.doesNotMatch(updatePolicy, /customer_id = auth\.uid\(\)/);

console.log('Payment-slip contract checks passed.');
