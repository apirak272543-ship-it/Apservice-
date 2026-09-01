const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../customer/customer-app.js'), 'utf8');
const orderStart = source.indexOf('async function orderDetail');
const orderEnd = source.indexOf('\n  async function notifications', orderStart);
assert.ok(orderStart >= 0 && orderEnd > orderStart, 'orderDetail function must exist');
const order = source.slice(orderStart, orderEnd);
assert.match(order, /pageDeadline\(currentCustomerWithSessionRestore/);
assert.match(order, /ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ/);
assert.match(order, /pageDeadline\(scope\.request\(`delivery_orders\?/);
assert.match(order, /โหลดรายละเอียดออร์เดอร์ไม่สำเร็จ/);
assert.match(order, /Promise\.allSettled/);
console.log('customer_order_detail_resilience_contract_test: PASS');
