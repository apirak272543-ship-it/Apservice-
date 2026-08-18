const fs = require('fs');
const assert = require('assert');

const rpcMigration = fs.readFileSync('supabase/migrations/20260818_server_enforced_delivery_pricing.sql', 'utf8');
const idMigration = fs.readFileSync('supabase/migrations/20260818_delivery_order_id_default.sql', 'utf8');

assert.match(rpcMigration, /INSERT INTO public\.delivery_orders\(/, 'secure checkout ต้องสร้าง delivery order บน server');
assert.doesNotMatch(rpcMigration, /INSERT INTO public\.delivery_orders\(id,/, 'RPC ใช้ database-owned default identifier แทน client id');
assert.match(idMigration, /ALTER COLUMN id SET DEFAULT/, 'delivery_orders.id ต้องมี default สำหรับ server checkout');
assert.match(idMigration, /gen_random_uuid/, 'identifier ต้องใช้ UUID randomness ไม่ใช้ลำดับเวลาที่เดาง่าย');

console.log('delivery order id default contract: PASS');
