const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('customer/customer-app.js', 'utf8');
assert.match(source, /id="loginForm"/, 'Customer ต้องมีฟอร์มเข้าสู่ระบบ');
assert.match(source, /aria-label="อีเมล"/, 'Customer login ต้องคง label สำหรับ accessibility');
assert.match(source, /aria-label="รหัสผ่าน"/, 'Customer login ต้องคง label สำหรับ accessibility');
assert.doesNotMatch(source, /<h2>เข้าสู่ระบบ<\/h2>/, 'Customer login ต้องไม่มีข้อความหัวฟอร์มที่ไม่จำเป็น');
console.log('customer login minimal shell contract: PASS');
