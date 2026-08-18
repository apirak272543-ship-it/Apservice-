const fs = require('fs');
const assert = require('assert');

const page = fs.readFileSync('customer/checkout.html', 'utf8');
const app = fs.readFileSync('customer/customer-app.js', 'utf8');

assert.match(page, /ap-service-media\.js/, 'Checkout ต้องโหลด Shared Media Service');
assert.match(app, /slipLibrary/, 'Customer ต้องเลือกสลิปจากคลังได้');
assert.match(app, /slipCamera/, 'Customer ต้องถ่ายสลิปจากกล้องได้');
assert.match(app, /bucket: 'payment-slips'/, 'สลิปต้องอยู่ใน private payment-slips bucket');
assert.match(app, /payment_slip_reviews/, 'Checkout ต้องสร้างงานตรวจสลิปของ Admin');
assert.match(app, /preliminary_status: 'file_valid'/, 'Checkout ต้องใช้ preliminary status ที่ schema รองรับ');
assert.match(app, /slip_path: uploadedSlip\.storageRef/, 'ต้องเก็บ storage reference ไม่ใช่ signed URL ที่หมดอายุ');
assert.match(app, /key=eq\.payment_public/, 'Customer checkout ต้องโหลด payment configuration จาก Admin source');
assert.match(app, /qrImageUrl/, 'Customer checkout ต้องใช้ QR image field ที่ Admin เผยแพร่');
assert.match(app, /payment\?\.cod === false/, 'Customer checkout ต้องเคารพสถานะ COD จาก Admin');
assert.match(app, /customer:checkout-payment/, 'Customer checkout payment config ต้องใช้ scoped lifecycle');

console.log('customer payment slip contract: PASS');
