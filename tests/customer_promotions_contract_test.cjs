const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('supabase/migrations/20260818_customer_promotions_public_read.sql', 'utf8');
const admin = fs.readFileSync('admin/admin-app.js', 'utf8');
const customer = fs.readFileSync('customer/customer-app.js', 'utf8');
const route = fs.readFileSync('admin/promotions.html', 'utf8');

assert.match(migration, /TO anon, authenticated/, 'promotion public-read policy ต้องรองรับ Customer ที่ยังไม่ login');
assert.match(migration, /key = 'customer_promotions'/, 'policy ต้องเปิดเผยเฉพาะ customer promotions');
assert.match(admin, /uploadPublicCatalogImage/, 'Admin promotion editor ต้องใช้ Shared Media Service');
assert.match(admin, /platform_configs\?on_conflict=key/, 'Admin promotion editor ต้อง persist ผ่าน central configuration');
assert.match(route, /shared\/ap-service-media\.js/, 'promotion route ต้องโหลด Shared Media Service');
assert.match(customer, /platform_configs\?select=value&key=eq.customer_promotions/, 'Customer home ต้องอ่าน promotion configuration ที่ Admin MPA บันทึกเป็น source หลัก');
assert.match(customer, /campaigns\?select=id,name,description,campaign_type,active,starts_at,ends_at,metadata/, 'Customer home ต้องมี legacy campaign fallback เมื่อ config หลักว่าง');
assert.match(customer, /customer-promotion-empty/, 'Customer home ต้องคงพื้นที่ AD พร้อม empty state เมื่อยังไม่มีรายการ');
assert.match(customer, /promotionLink/, 'Customer home ต้องตรวจปลายทาง banner ก่อน render ลิงก์');
assert.match(customer, /void promotions\(scope.request\)/, 'การโหลด AD ต้องไม่ block การแสดงรายการร้านค้า');
assert.match(customer, /scrollIntoView/, 'Customer carousel ต้องเลื่อนไปยังรายการจริงโดยไม่รอ network navigation');

console.log('customer promotions contract: PASS');
