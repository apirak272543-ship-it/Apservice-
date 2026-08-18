const fs = require('fs');
const assert = require('assert');

const media = fs.readFileSync('shared/ap-service-media.js', 'utf8');
const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const page = fs.readFileSync('customer/marketplace-new.html', 'utf8');

assert.match(media, /async function uploadPublicImage/, 'Shared Media Service ต้องมี generic public uploader');
assert.match(media, /encodeURIComponent\(bucket\)/, 'Public uploader ต้องใช้ bucket ที่ระบุอย่างปลอดภัย');
assert.match(app, /listingImageLibrary/, 'Marketplace ต้องเลือกรูปจากคลังได้');
assert.match(app, /listingImageCamera/, 'Marketplace ต้องถ่ายรูปจากกล้องได้');
assert.match(app, /bucket: 'marketplace-media'/, 'Marketplace ต้องบันทึก media ลง bucket แยก');
assert.match(app, /pathPrefix: 'marketplace'/, 'Marketplace upload ต้องมี RLS path prefix');
assert.match(app, /uploadPublicImage\(listingImage/, 'Marketplace ต้องใช้ Shared Media Service');
assert.match(page, /ap-service-media\.js/, 'Marketplace form route ต้องโหลด Shared Media Service เท่านั้น');

console.log('customer marketplace media contract: PASS');
