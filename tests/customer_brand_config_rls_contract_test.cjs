const fs = require('fs');
const assert = require('assert');

const customer = fs.readFileSync('customer/customer-app.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260818_allow_public_brand_config.sql', 'utf8');

assert.match(customer, /platform_configs\?select=value&key=eq\.brand_public/, 'Customer ต้องอ่าน brand_public ที่ Admin ตั้งค่า');
assert.match(migration, /platform_configs_read_brand_public/, 'ต้องมี RLS policy สำหรับ branding public');
assert.match(migration, /FOR SELECT TO anon, authenticated/, 'โลโก้ต้องอ่านได้ก่อน login และหลัง login');
assert.match(migration, /key = 'brand_public'/, 'policy ต้องเปิดเฉพาะ brand_public ไม่เปิด config อื่น');

console.log('customer brand config RLS contract: PASS');
