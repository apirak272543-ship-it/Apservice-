const fs = require('fs');
const assert = require('assert');

const media = fs.readFileSync('shared/ap-service-media.js', 'utf8');
const app = fs.readFileSync('customer/customer-app.js', 'utf8');

assert.match(media, /const DEFAULT_MAX_DIMENSION = 1200;/, 'Customer shared pipeline ต้องจำกัดภาพที่ 1200px');
assert.match(media, /const FIXED_JPEG_QUALITY = 0\.82;/, 'Customer shared pipeline ต้องใช้ JPEG quality 0.82');
assert.match(media, /canvasBlob\(canvas, 'image\/jpeg', FIXED_JPEG_QUALITY\)/, 'Customer shared pipeline ต้องส่งออกเป็น JPEG เท่านั้น');
assert.doesNotMatch(media, /preservePng/, 'Customer shared pipeline ต้องไม่มีข้อยกเว้น PNG');
assert.match(app, /id="slipLibrary"[^>]*type="file"/, 'Checkout ต้องรองรับเลือกสลิปจากคลัง');
assert.match(app, /id="slipCamera"[^>]*capture="environment"/, 'Checkout ต้องรองรับถ่ายสลิปจากกล้อง');
assert.match(app, /mediaType: 'PAYMENT_SLIP'/, 'สลิปต้องระบุ media contract ที่ถูกต้อง');
assert.match(app, /id="listingImageLibrary"[^>]*type="file"/, 'Marketplace ต้องรับภาพจากคลัง');
assert.match(app, /id="listingImageCamera"[^>]*capture="environment"/, 'Marketplace ต้องรองรับถ่ายภาพจากกล้อง');
assert.doesNotMatch(app, /type="url"/, 'Customer ต้องไม่มีช่อง URL สำหรับอัปโหลดรูปภาพ');

console.log('customer media golden rule contract: PASS');

