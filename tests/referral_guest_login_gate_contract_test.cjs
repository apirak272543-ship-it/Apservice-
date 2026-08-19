const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const entry = fs.readFileSync(path.join(root, 'customer/index.html'), 'utf8');
const customer = fs.readFileSync(path.join(root, 'customer/customer-app.js'), 'utf8');
const sharedMpa = fs.readFileSync(path.join(root, 'shared/ap-service-mpa.js'), 'utf8');

assert.match(entry, /shared\/ap-service-mpa\.js/, 'Customer MPA entry ต้องโหลด auth runtime กลาง');
assert.match(sharedMpa, /function currentUser\(\)/, 'Customer auth runtime ต้องอ่าน session ปัจจุบันได้');
assert.match(sharedMpa, /function signIn\(email, password\)/, 'Customer auth runtime ต้องมี login flow');
assert.match(customer, /M\.auth\.currentUser\(\)/, 'Customer actions ที่ต้องมีสิทธิ์ต้องตรวจ user จาก shared runtime');
assert.match(customer, /M\.auth\.signIn/, 'Customer ต้องพา guest ไปยัง login flow เมื่อจำเป็น');
assert.doesNotMatch(fs.readFileSync(__filename, 'utf8'), /referral_guest_login_gate_patch\.js/, 'Customer MPA ไม่ควรพึ่ง legacy guest-login patch');

console.log('referral guest login guard contract: PASS');
