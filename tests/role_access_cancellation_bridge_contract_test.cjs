const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('supabase/functions/role-access/index.ts', 'utf8');

assert.match(source, /body\.action === 'resolve_order_cancellation'/, 'Edge Function ต้อง expose action สำหรับ Admin review');
assert.match(source, /callerDb\.rpc\('admin_resolve_order_cancellation'/, 'Edge Function ต้องใช้ caller session เรียก RPC ที่ตรวจ role บน server');
assert.match(source, /refund_decision/, 'Edge Function ต้องส่งผล refund decision ไปยัง server');
assert.match(source, /idempotency_key/, 'Edge Function ต้องรับ idempotency key');
assert.doesNotMatch(source, /admin\.from\('order_refunds'\)\.insert/, 'Edge Function ไม่ควรสร้าง refund โดยข้าม financial RPC');

console.log('role access cancellation bridge contract: PASS');
