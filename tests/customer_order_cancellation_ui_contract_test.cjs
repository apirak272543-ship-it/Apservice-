const fs = require('fs');
const assert = require('assert');

const orderHtml = fs.readFileSync('customer/order.html', 'utf8');
const actions = fs.readFileSync('customer/customer-order-financial-actions.js', 'utf8');

assert.match(orderHtml, /customer-order-financial-actions\.js/, 'หน้า order ต้องโหลด Customer financial action module');
assert.match(actions, /awaiting_payment/, 'UI ต้องรู้สถานะรอชำระเงินที่ลูกค้าขอยกเลิกได้');
assert.match(actions, /payment_review/, 'UI ต้องรู้สถานะรอตรวจสอบการชำระเงิน');
assert.match(actions, /store_accepted/, 'UI ต้องรู้สถานะร้านรับออร์เดอร์');
assert.match(actions, /rpc\/request_customer_order_cancellation/, 'คำขอยกเลิกต้องส่งผ่าน server RPC');
assert.match(actions, /p_idempotency_key/, 'คำขอยกเลิกต้องมี idempotency key');
assert.match(actions, /sessionStorage/, 'retry คำขอยกเลิกใน session เดิมต้องใช้ key เดิม');
assert.match(actions, /การคืนเงินจะไม่เกิดขึ้นอัตโนมัติ/, 'UI ต้องไม่สื่อว่าการยกเลิกคือการคืนเงินอัตโนมัติ');
assert.match(actions, /mpa-loading/, 'enhancer ต้องรอ order renderer หลักเพื่อลด race condition');

console.log('customer order cancellation UI contract: PASS');
