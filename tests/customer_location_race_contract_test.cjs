const assert = require('assert');
const fs = require('fs');

const picker = fs.readFileSync('customer/customer-location-picker.js', 'utf8');
assert.match(picker, /const useGps = async \(\) => \{ const attempt = \+\+gpsAttempt; const user = await getUser\(\)/, 'GPS attempt ต้องถูกสร้างก่อนรอ session เพื่อให้ manual save ยกเลิกคำขอที่ค้างได้');
assert.match(picker, /if \(attempt !== gpsAttempt\) return;/, 'ผล GPS ที่ stale ต้องไม่เขียนทับสถานะ manual');
assert.match(picker, /const saveManual = async \(\) => \{ \+\+gpsAttempt;/, 'manual save ต้อง invalidate GPS attempt ที่กำลังรอ');
assert.match(picker, /const saveMap = async \(\) => \{ \+\+gpsAttempt;/, 'map save ต้อง invalidate GPS attempt ที่กำลังรอ');
console.log('customer location race contract: PASS');
