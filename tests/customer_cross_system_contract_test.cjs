const fs = require('fs');
const assert = require('assert');

const native = fs.readFileSync('customer/customer-mobile-native.js', 'utf8');
const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const featured = fs.readFileSync('customer/featured-stores-carousel.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260821_customer_public_store_recognition.sql', 'utf8');
const migrationSql = migration.replace(/^\s*--.*$/gm, '');

assert.match(native, /rpc\/customer_public_store_recognition/, 'Customer ต้องอ่าน Tier ผ่าน public projection function');
assert.match(native, /campaigns\?select=id,name,description,campaign_type,active,starts_at,ends_at,min_order_amount,discount_amount,metadata/, 'Customer ต้องอ่าน campaign fields จาก public contract');
assert.match(native, /campaign_stores\?select=campaign_id,store_id,active/, 'Customer ต้องผูก campaign กับร้านผ่าน campaign_stores');
assert.match(native, /customer-native-tier-badge/, 'Customer ต้องมี presentation ของ public Tier badge');
assert.match(native, /customer-native-campaign-strip/, 'Customer ต้องมี presentation ของ campaign strip');
assert.doesNotMatch(native, /private_total|subject_user_id|recognition_events/, 'Customer ห้ามอ่านข้อมูล recognition private หรือ event payload');
assert.match(app, /data-store-id/, 'Store card ต้อง expose identifier สำหรับ public metadata เท่านั้น');
assert.match(featured, /data-store-id/, 'Featured store card ต้อง expose identifier สำหรับ public metadata เท่านั้น');
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.customer_public_store_recognition/, 'ต้องมี public projection function สำหรับ Tier');
assert.match(migration, /REVOKE ALL ON FUNCTION public\.customer_public_store_recognition\(text\[\]\) FROM PUBLIC/, 'ต้อง revoke สิทธิ์ function ก่อน grant เฉพาะ role');
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.customer_public_store_recognition\(text\[\]\) TO anon, authenticated/, 'Customer public projection ต้องอ่านได้เฉพาะ anon/authenticated ตาม contract');
assert.doesNotMatch(migrationSql, /private_total|subject_user_id|ranking_position/, 'public projection ห้าม return private recognition fields');
console.log('customer cross-system contract: PASS');
