const fs = require('fs');
const assert = require('assert');

const merchantRoot = '../ap-store-mobile/merchant';
const riderRoot = '../ap-rider-mobile/rider';
const merchantRecognition = fs.readFileSync(`${merchantRoot}/merchant-recognition.js`, 'utf8');
const riderRecognition = fs.readFileSync(`${riderRoot}/rider-recognition.js`, 'utf8');
const merchantRuntime = fs.readFileSync(`${merchantRoot}/merchant-app.js`, 'utf8');
const riderRuntime = fs.readFileSync(`${riderRoot}/rider-app.js`, 'utf8');
const merchantCss = fs.readFileSync(`${merchantRoot}/merchant-recognition.css`, 'utf8');
const riderCss = fs.readFileSync(`${riderRoot}/rider-recognition.css`, 'utf8');
const merchantSettings = fs.readFileSync(`${merchantRoot}/settings.html`, 'utf8');
const riderProfile = fs.readFileSync(`${riderRoot}/profile.html`, 'utf8');
const merchantApk = fs.readFileSync('../apk-merchant/App.tsx', 'utf8');
const riderApk = fs.readFileSync('../apk-rider/App.tsx', 'utf8');

for (const [role, source, css] of [
  ['merchant', merchantRecognition, merchantCss],
  ['rider', riderRecognition, riderCss],
]) {
  assert.match(source, /recognition_snapshots\?select=/, `${role} ต้องอ่าน snapshot จากข้อมูลจริง`);
  assert.match(source, /subject_user_id=eq\.\$\{encodeURIComponent\(userId\)\}/, `${role} ต้องกรองข้อมูลตามเจ้าของ`);
  assert.match(source, /recognition_events\?select=.*seen_at=is\.null/, `${role} ต้องเลือกเฉพาะเหตุการณ์ใหม่`);
  assert.match(source, /rpc\/recognition_mark_event_seen/, `${role} ต้องยืนยันเหตุการณ์ที่เห็นแล้วผ่าน RPC`);
  assert.match(source, /sessionStorage/, `${role} ต้องจำกัด popup ไม่เกินหนึ่งครั้งต่อ session`);
  assert.match(source, /recognition-special-badge/, `${role} ต้องรองรับป้ายผู้ให้บริการคุณภาพสูง 1 ใน 50`);
  assert.match(source, /recognition-card--empty/, `${role} ต้องมี empty state เมื่อยังไม่มีข้อมูลจริง`);
  assert.match(source, /role=\"dialog\"/, `${role} popup ต้องประกาศ dialog ให้เทคโนโลยีช่วยการเข้าถึง`);
  assert.match(css, /prefers-reduced-motion\s*:\s*reduce/, `${role} ต้องเคารพ reduced-motion`);
}

assert.match(merchantRecognition, /const privateLabel = 'ยอดขาย'/, 'ร้านค้าต้องแสดงเฉพาะยอดขายของเจ้าของ');
assert.match(riderRecognition, /const privateLabel = 'รายได้'/, 'ไรเดอร์ต้องแสดงเฉพาะรายได้ของเจ้าของ');
assert.match(merchantRuntime, /APServiceMerchantRecognition\?\.notify\(access\)/, 'Merchant ต้องตรวจเหตุการณ์หลัง login');
assert.match(merchantRuntime, /merchant-recognition-host/, 'Merchant ต้องมีตำแหน่งการ์ด Recognition ใน settings');
assert.match(riderRuntime, /APServiceRiderRecognition\?\.notify\(access\)/, 'Rider ต้องตรวจเหตุการณ์หลัง login');
assert.match(riderRuntime, /rider-recognition-host/, 'Rider ต้องมีตำแหน่งการ์ด Recognition ใน profile');
assert.match(merchantSettings, /merchant-recognition\.js\?v=recognition-v1/, 'Merchant ต้องโหลด Recognition ก่อน runtime');
assert.match(riderProfile, /rider-recognition\.js\?v=recognition-v1/, 'Rider ต้องโหลด Recognition ก่อน runtime');
assert.match(merchantApk, /recognition-ui-v1/, 'APK Merchant ต้องชี้หน้าเว็บรุ่น Recognition');
assert.match(riderApk, /recognition-ui-v1/, 'APK Rider ต้องชี้หน้าเว็บรุ่น Recognition');

console.log('recognition UI contract: PASS');
