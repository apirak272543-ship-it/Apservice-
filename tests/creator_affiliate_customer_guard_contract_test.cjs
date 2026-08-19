const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sharedMpa = fs.readFileSync(path.join(root, 'shared/ap-service-mpa.js'), 'utf8');
const customer = fs.readFileSync(path.join(root, 'customer/customer-app.js'), 'utf8');
const entry = fs.readFileSync(path.join(root, 'customer/index.html'), 'utf8');

assert.match(sharedMpa, /function currentUser\(\)/, 'Customer MPA ต้องอ่าน authenticated user ผ่าน shared auth');
assert.match(sharedMpa, /function requireRole\(/, 'Customer MPA ต้องมี role guard กลาง');
assert.match(entry, /shared\/ap-service-mpa\.js/, 'Customer entry ต้องโหลด shared MPA runtime');
assert.match(customer, /APServiceMPA/, 'Customer runtime ต้องใช้ shared auth/runtime ไม่ใช่ patch แบบ monolith');
assert.equal(fs.existsSync(path.join(root, 'admin_contact_ui_patch.js')), false, 'Customer guard ไม่ควรเรียก Admin-only UI หลังแยก repository');

console.log('creator affiliate customer guard contract: PASS');
