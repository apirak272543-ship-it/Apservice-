const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const page = fs.readFileSync('customer/privacy.html', 'utf8');

assert.match(app, /function enhanceProfileLocation/, 'Profile ต้องมี location enhancement');
assert.match(app, /navigator\.geolocation\.getCurrentPosition/, 'Location ต้องเกิดจาก explicit user action ใน browser');
assert.match(app, /confirm\('ยืนยันให้ AP Service ใช้ตำแหน่งปัจจุบัน/, 'ต้องขอ consent ก่อน request position');
assert.match(app, /consent_type: 'location_access'/, 'ต้องบันทึก consent type ของ location');
assert.match(app, /location: locationValue/, 'ต้องบันทึก location ใน user profile');
assert.match(app, /function privacy\(\)/, 'ต้องมี privacy route');
assert.match(page, /data-page="privacy"/, 'Privacy ต้องเป็น MPA document แยก');
console.log('customer location consent parity contract: PASS');
