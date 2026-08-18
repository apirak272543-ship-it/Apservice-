const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260818_server_enforced_delivery_pricing.sql', 'utf8');

assert.match(app, /rpc\/create_food_order/, 'Customer ต้องสร้าง order ผ่าน server RPC');
assert.match(app, /p_items: group\.map\(item => \(\{ item_id: item\.id, quantity: item\.qty \}\)\)/, 'Customer ต้องส่งเฉพาะ item id และจำนวน ไม่ส่ง unit price/total ให้ server เชื่อ');
assert.match(app, /expected_amount: order\.payable/, 'สลิปโอนต้องตรวจยอด payable ที่ server คำนวณ');
assert.doesNotMatch(app, /delivery_fee:\s*0/, 'Customer checkout ห้าม hard-code delivery fee เป็นศูนย์');
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.create_food_order/, 'Server ต้องมี atomic order RPC');
assert.match(migration, /business_rules/, 'Server ต้องอ่าน business rules ก่อนยอมรับ food order');
assert.match(migration, /'food', jsonb_build_object/, 'กติกา Food ต้องอยู่ใน config แยกตาม service type');
assert.match(migration, /'parcel', jsonb_build_object/, 'กติกา Parcel ต้องอยู่ใน config แยกตาม service type');
assert.match(migration, /'errand', jsonb_build_object/, 'กติกา Errand ต้องอยู่ใน config แยกตาม service type');
assert.match(migration, /value -> 'food'/, 'Food checkout ต้องอ่านเฉพาะ food pricing rules');
assert.match(migration, /NEW\.delivery_fee :=/, 'Server ต้อง override delivery fee จากกติกากลาง');
assert.match(migration, /NEW\.payable :=/, 'Server ต้อง override payable จากกติกากลาง');
assert.match(migration, /orders_customer_insert/, 'Server ต้องยกเลิก direct customer insert เพื่อบังคับใช้ RPC');

console.log('customer delivery pricing contract: PASS');
