const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const page = fs.readFileSync('customer/support.html', 'utf8');

assert.match(app, /function support\(\)/, 'Customer MPA ต้องมี support route');
assert.match(app, /support_conversations\?select=id,status,last_message_at,created_at/, 'Support ต้องอ่าน conversation ของ customer ผ่าน data source จริง');
assert.match(app, /status: 'open'/, 'Support ต้องใช้ค่า conversation status ที่ schema อนุญาต');
assert.match(app, /support_messages\?select=id,sender_id,sender_role,body,created_at/, 'Support ต้องอ่านข้อความตาม schema จริง');
assert.match(app, /sender_role: 'customer'/, 'Support mutation ต้องระบุ sender role ที่ schema อนุญาต');
assert.match(app, /customer-support-messages:/, 'Support ต้องใช้ scoped cache/sync key');
assert.match(page, /data-page="support"/, 'Support ต้องเป็น MPA document แยก');

console.log('customer support parity contract: PASS');
