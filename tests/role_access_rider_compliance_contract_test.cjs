const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('supabase/functions/role-access/index.ts', 'utf8');

assert.match(source, /body\.action === 'review_rider_compliance'/, 'ต้องมี server action ตรวจ Rider compliance');
assert.match(source, /\['approved', 'rejected'\]/, 'ผล compliance ต้องถูกจำกัดเป็นสถานะที่อนุญาต');
assert.match(source, /identity_verified/, 'การอนุมัติต้องตรวจเอกสารยืนยันตัวตน');
assert.match(source, /license_image_url/, 'การอนุมัติต้องตรวจใบขับขี่');
assert.match(source, /vehicle_registration_image_url/, 'การอนุมัติต้องตรวจทะเบียนรถ');
assert.match(source, /insurance_image_url/, 'การอนุมัติต้องตรวจประกันรถ');
assert.match(source, /updates\.ride_available = false/, 'ผลไม่อนุมัติต้องปิดรับงาน Rider');
assert.match(source, /rider_compliance_reviewed/, 'ต้องสร้าง admin audit trail ของผลพิจารณา');
console.log('role access rider compliance contract: PASS');
