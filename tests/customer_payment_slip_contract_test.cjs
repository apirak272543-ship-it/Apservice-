const fs = require('fs');
const assert = require('assert');

const page = fs.readFileSync('customer/checkout.html', 'utf8');
const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const pricingMigration = fs.readFileSync('supabase/migrations/20260818_server_enforced_delivery_pricing.sql', 'utf8');
const groupMigration = fs.readFileSync('supabase/migrations/20260820_multi_store_checkout_group.sql', 'utf8');

assert.match(page, /ap-service-media\.js/, 'Checkout ต้องโหลด Shared Media Service');
assert.match(app, /slipLibrary/, 'Customer ต้องเลือกสลิปจากคลังได้');
assert.match(app, /slipCamera/, 'Customer ต้องถ่ายสลิปจากกล้องได้');
assert.match(app, /bucket: 'payment-slips'/, 'สลิปต้องอยู่ใน private payment-slips bucket');
assert.match(app, /p_slip_path: uploadedSlip\?\.storageRef \|\| null/, 'Checkout ต้องส่ง storage reference ให้ server group payment ไม่ใช่ signed URL ที่หมดอายุ');
assert.doesNotMatch(app, /payment_slip_reviews/, 'Customer ต้องไม่สร้าง review แยกต่อ order หลังเปลี่ยนเป็น group payment');
assert.match(app, /key=eq\.payment_public/, 'Customer checkout ต้องโหลด payment configuration จาก Admin source');
assert.match(app, /qrImageUrl/, 'Customer checkout ต้องใช้ QR image field ที่ Admin เผยแพร่');
assert.match(app, /payment\?\.cod === false/, 'Customer checkout ต้องเคารพสถานะ COD จาก Admin');
assert.match(app, /customer:checkout-payment/, 'Customer checkout payment config ต้องใช้ scoped lifecycle');
assert.match(app, /rpc\/create_food_checkout_group_v3/, 'Customer ต้องส่งช่องทางชำระเข้า server group RPC');
assert.match(pricingMigration, /CASE WHEN p_payment_method = 'โอนผ่าน QR \/ แนบสลิป' THEN 'รอตรวจสอบการชำระเงิน' ELSE 'ร้านค้ารับออร์เดอร์' END/, 'COD ต้องไม่ติด payment review ที่ไม่มีสลิปให้ตรวจ');
assert.match(groupMigration, /CREATE TABLE IF NOT EXISTS public\.checkout_group_payments/, 'ต้องมี payment record ระดับ group');
assert.match(groupMigration, /slip_path text/, 'group payment ต้องเก็บ private storage reference');
assert.match(groupMigration, /admin_review_checkout_group_payment/, 'Admin ต้องพิจารณาการชำระเงินผ่าน server action');
assert.match(app, /รอการตรวจสอบสลิป/, 'Customer ต้องสื่อสารสถานะ payment ให้ตรงช่องทางที่เลือกและยอดที่ server คำนวณ');

console.log('customer payment slip contract: PASS');
