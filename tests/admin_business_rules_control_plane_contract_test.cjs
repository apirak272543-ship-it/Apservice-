const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('admin/admin-app.js', 'utf8');

assert.match(app, /id="businessRules"/, 'Admin ต้องมี structured business rules form');
assert.match(app, /data-rule="base_fee"/, 'Admin ต้องกำหนดค่าส่งเริ่มต้นได้');
assert.match(app, /data-rule="gp_rate_percent"/, 'Admin ต้องกำหนด GP ได้');
assert.match(app, /data-rule="service_fee"/, 'Admin ต้องกำหนดค่าบริการได้');
assert.match(app, /key: 'business_rules'/, 'กติกากลางต้องบันทึกที่ central platform_configs');
assert.match(app, /number > 100/, 'GP ต้องมี client validation ขั้นพื้นฐาน');
assert.match(app, /window\.confirm\('ยืนยันบันทึกกติกาธุรกิจกลาง/, 'ต้องขอยืนยันก่อนเปลี่ยน business rules');

console.log('admin business rules control-plane contract: PASS');
