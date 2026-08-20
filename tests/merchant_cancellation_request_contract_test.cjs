const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/20260820_merchant_cancellation_request.sql', 'utf8');
assert.match(migration, /request_merchant_order_cancellation/, 'ต้องมี RPC สำหรับ Merchant cancellation request');
assert.match(migration, /private\.has_role\('store_owner'\)/, 'RPC ต้องยืนยันบทบาทเจ้าของร้าน');
assert.match(migration, /s\.owner_id = v_merchant_id/, 'RPC ต้องยืนยันว่า order เป็นของร้านผู้เรียก');
assert.match(migration, /workflow_state NOT IN \('store_accepted','preparing'\)/, 'RPC ต้องจำกัดสถานะที่ร้านขอยกเลิกได้');
assert.match(migration, /order_cancellation_requests/, 'RPC ต้องใช้ cancellation workflow กลาง');
assert.match(migration, /order_financial_events/, 'RPC ต้องบันทึก financial event โดยไม่คืนเงินจาก client');
assert.match(migration, /REVOKE ALL[\s\S]*GRANT EXECUTE[\s\S]*authenticated/, 'RPC ต้องไม่เปิด public execution');
console.log('merchant cancellation request contract: PASS');
