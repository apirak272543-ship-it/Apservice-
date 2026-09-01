const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const orderPage = fs.readFileSync('customer/order.html', 'utf8');
const actions = fs.readFileSync('customer/customer-order-financial-actions.js', 'utf8');

assert.match(app, /window\.__APServiceOrderDetailCore = true/, 'Order Detail ต้องประกาศ core renderer เพื่อกัน module mount ซ้ำ');
assert.match(app, /customer-order-stepper/, 'Order Detail ต้องแสดง stepper ความคืบหน้า');
assert.match(app, /customer-order-items/, 'Order Detail ต้องแสดงรายการสินค้า');
assert.match(app, /customer-order-route/, 'Order Detail ต้องแสดงผู้ส่งและผู้รับ');
assert.match(app, /delivery_recipient_name/, 'Order Detail ต้องอ่านชื่อผู้รับจาก snapshot ของออร์เดอร์');
assert.match(app, /estimated_arrival_at/, 'Order Detail ต้องแสดง ETA เมื่อมีข้อมูล');
assert.match(app, /delivery_dispatch_events\?select=dispatch_status,note,created_at/, 'Order Detail ต้องอ่านประวัติ Dispatch');
assert.match(app, /pageDeadline\(scope\.request\(`delivery_orders\?/, 'Order Detail ต้องมี timeout สำหรับ request หลัก');
assert.match(app, /customer-order-back/, 'Order Detail ต้องมีปุ่มกลับรายการออร์เดอร์');
assert.match(actions, /window\.__APServiceOrderDetailCore/, 'หน้า read-only ต้องไม่ mount cancellation action ซ้ำ');
assert.match(orderPage, /customer-order-dispatch-state\.js/, 'ต้องคง script dispatch compatibility ไว้');
console.log('customer_order_tracking_readonly_contract_test: PASS');
