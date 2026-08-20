const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('supabase/migrations/20260820_store_operations_weekly_hours.sql', 'utf8');

assert.match(source, /CREATE TABLE IF NOT EXISTS public\.store_opening_hours/, 'ต้องมีตารางเวลารายสัปดาห์ของร้าน');
assert.match(source, /CREATE TABLE IF NOT EXISTS public\.store_operation_events/, 'ต้องมีประวัติการเปลี่ยนสถานะร้าน');
assert.match(source, /private\.owns_store\(store_id\)/, 'เจ้าของร้านต้องอ่านได้เฉพาะร้านของตน');
assert.match(source, /merchant_update_store_operations/, 'ต้องมี RPC สำหรับบันทึกสถานะร้าน');
assert.match(source, /WHERE owner_id = auth\.uid\(\) FOR UPDATE/, 'RPC ต้องล็อกและยืนยันความเป็นเจ้าของร้านบน server');
assert.match(source, /p_emergency_closed AND length\(trim/, 'การปิดฉุกเฉินต้องบังคับให้มีเหตุผล');
assert.match(source, /jsonb_array_length\(v_hours\) <> 7/, 'ตารางเวลาต้องครอบคลุมครบเจ็ดวัน');
assert.match(source, /v_open >= v_close/, 'server ต้องปฏิเสธเวลาเปิดปิดที่ไม่ถูกต้อง');
assert.match(source, /store_operation_events\(store_id, actor_id/, 'ต้องบันทึก audit snapshot ก่อนและหลังเปลี่ยนสถานะ');
assert.match(source, /REVOKE ALL ON FUNCTION public\.merchant_update_store_operations[^\n]+FROM PUBLIC, anon/, 'anon ต้องเรียก Store operations RPC ไม่ได้');
assert.match(source, /store_opening_hours WHERE store_id = target_store_id/, 'การรับออร์เดอร์ต้องอ่าน weekly hours จริงบน server');

console.log('store operations weekly hours contract: PASS');
