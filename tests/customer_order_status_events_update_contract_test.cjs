const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('supabase/migrations/20260821_order_status_events_for_update_transitions.sql', 'utf8');

assert.match(migration, /CREATE OR REPLACE FUNCTION public\.record_order_status_event_on_update/, 'ต้องมี trigger function สำหรับ status update');
assert.match(migration, /OLD\.status IS NOT DISTINCT FROM NEW\.status/, 'สถานะเดิมต้องไม่ถูกบันทึกซ้ำ');
assert.match(migration, /INSERT INTO public\.order_status_events/, 'status transition ต้องบันทึกลง event table');
assert.match(migration, /NEW\.id, NEW\.status, v_actor, v_actor_label/, 'event ต้องผูก order/status/actor');
assert.match(migration, /private\.has_role\('admin'\)/, 'ต้องระบุ actor label สำหรับ Admin');
assert.match(migration, /r\.user_id = v_actor/, 'ต้องระบุ actor label สำหรับ Rider ที่ผูกกับ order');
assert.match(migration, /private\.owns_store\(NEW\.store_id\)/, 'ต้องระบุ actor label สำหรับ Merchant เจ้าของร้าน');
assert.match(migration, /CREATE TRIGGER delivery_orders_record_status_event/, 'ต้องติดตั้ง trigger หลัง update status');

console.log('customer order status events update contract: PASS');
