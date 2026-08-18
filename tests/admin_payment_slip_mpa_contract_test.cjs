const fs = require('fs');
const assert = require('assert');

const page = fs.readFileSync('admin/finance.html', 'utf8');
const app = fs.readFileSync('admin/admin-app.js', 'utf8');

assert.match(page, /ap-service-media\.js/, 'Admin finance ต้องโหลด Shared Media Service');
assert.match(app, /payment_slip_reviews\?select=/, 'Admin finance ต้องอ่านคิวตรวจสลิป');
assert.match(app, /createSignedImageUrl/, 'Admin ต้องเปิด private slip ด้วย signed URL');
assert.match(app, /mpa-modal-backdrop/, 'Admin ต้องแสดงหลักฐานในหน้าเว็บ ไม่เปิดหน้าต่างใหม่');
assert.match(app, /status: approved \? 'approved' : 'needs_reupload'/, 'Admin ต้องบันทึกผลตรวจที่ schema รองรับ');
assert.match(app, /C\.contracts\.orderStatus\.STORE_ACCEPTED/, 'อนุมัติสลิปต้องใช้ shared order status');
assert.match(app, /C\.contracts\.orderStatus\.PAYMENT_RETRY/, 'ขอแนบใหม่ต้องใช้ shared order status');
assert.match(app, /order_status_events/, 'ต้องบันทึก order status event หลังผลตรวจ');

console.log('admin payment slip MPA contract: PASS');
