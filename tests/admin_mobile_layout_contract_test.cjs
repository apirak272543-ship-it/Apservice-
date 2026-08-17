const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const patch = fs.readFileSync('admin_mobile_layout_patch.js', 'utf8');

assert.match(html, /admin_mobile_layout_patch\.js\?v=admin-mobile-layout-v1/, 'ต้องโหลดแพตช์เลย์เอาต์ Admin บนมือถือ');
assert.match(patch, /table\.admin-mobile-cards thead\{display:none/, 'ตาราง Admin ต้องเปลี่ยนเป็นการ์ดบนจอมือถือ');
assert.match(patch, /cell\.dataset\.adminLabel/, 'แต่ละข้อมูลในตารางต้องมีหัวข้อกำกับบนมือถือ');
assert.match(patch, /admin-mobile-empty-note/, 'ต้องแสดงข้อความชัดเจนเมื่อไม่มีรายการ');
assert.match(patch, /MutationObserver/, 'ตารางที่รีเฟรชข้อมูลต้องได้รับการจัดรูปแบบใหม่');
assert.match(patch, /admin-page-back\{position:sticky/, 'ปุ่มกลับเมนูต้องคงอยู่ระหว่างเลื่อนหน้า');

console.log('admin mobile layout contract: PASS');
