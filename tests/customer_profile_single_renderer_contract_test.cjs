const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const account = fs.readFileSync('customer/profile-account-center.js', 'utf8');
const css = fs.readFileSync('customer/customer-profile-account.css', 'utf8');

assert.match(app, /window\.__APCustomerProfileUser = user/, 'Profile ต้องส่ง session ที่ตรวจแล้วให้ account center ใช้ร่วมกัน');
assert.match(account, /window\.__APCustomerProfileUser \|\| await M\.auth\.currentUser\(\)/, 'account center ต้องใช้ session เดิมก่อนเรียก auth ซ้ำ');
assert.match(account, /append\(root, editorWrap\)/, 'account center ต้องย้าย form เดิมเข้าหน้าเดียว ไม่สร้าง form ใหม่ทับ');
assert.match(account, /account-center-pending/, 'ต้องมี state สำหรับช่วงรวม renderer');
assert.doesNotMatch(account, /setTimeout\(mount, 850\)/, 'ห้ามหน่วง mount account center หลายรอบ');
assert.doesNotMatch(account, /setTimeout\(\(\) => \{ if \(\$\('#profileForm'\)\) mount\(\); \}, 1400\)/, 'ห้ามรอ 1.4 วินาทีจนเกิดภาพหน้าเก่าก่อนหน้าใหม่');
assert.match(css, /#profile\.account-center-pending>#profileForm\{display:none!important\}/, 'ต้องซ่อน legacy form เฉพาะระหว่าง account center กำลังรวมข้อมูล');
console.log('customer_profile_single_renderer_contract_test: PASS');
