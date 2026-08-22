const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('customer/customer-app.js', 'utf8');
const navLine = source.match(/const nav = active => ([^\n]+)/)?.[1] || '';

assert(navLine, 'ต้องมี Customer navigation factory');
assert(!navLine.includes('customer-topbar'), 'Customer MPA ต้องไม่สร้าง topbar ที่ซ้ำกับ navigation หลัก');
assert(navLine.includes('class="customer-nav-wrap"'), 'ต้องมี navigation wrapper หลัก');
assert.match(source, /currentCustomerWithSessionRestore/, 'Protected Customer routes ต้องมี customer-role guard');
assert.match(source, /roles\.includes\('customer'\) && !roles\.some\(role => \['admin', 'rider', 'store_owner'\]/, 'Customer ต้องมี role customer และไม่ใช่บัญชีงานประเภทอื่น');
for (const label of ['หน้าแรก', 'ร้านค้า', 'ออร์เดอร์', 'แจ้งเตือน', 'โปรไฟล์', 'ช่วยเหลือ']) {
  assert(navLine.includes(`>${label}</a>`), `navigation หลักต้องมี ${label}`);
}
assert.strictEqual((navLine.match(/href="(?:index|stores|orders|notifications|profile|support)\.html/g) || []).length, 6, 'ลิงก์ navigation หลักต้องไม่ซ้ำและมีจำนวน 6 จุด');
console.log('customer navigation contract: PASS');
