const fs = require('fs');
const assert = require('assert');

const media = fs.readFileSync('shared/ap-service-media.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260818_central_media_assets.sql', 'utf8');
const customer = fs.readFileSync('customer/customer-app.js', 'utf8');

assert.match(media, /const DEFAULT_MAX_DIMENSION = 1200;/, 'Customer ต้องจำกัดขนาดภาพจาก runtime กลางไม่เกิน 1200px');
assert.match(media, /const FIXED_JPEG_QUALITY = 0\.82;/, 'Customer ต้องบีบอัดภาพจาก runtime กลางเป็น JPEG quality 0.82');
assert.match(media, /MEDIA_PROFILES/, 'ต้องมี media profile กลาง');
assert.match(media, /STORE_LOGO:[\s\S]*maxDimension: 200[\s\S]*square: true/, 'Store logo ต้องใช้ profile 200×200 crop');
assert.match(media, /RIDER_AVATAR:[\s\S]*maxDimension: 200[\s\S]*square: true/, 'Rider avatar ต้องใช้ profile 200×200 crop');
assert.match(media, /registerMediaAsset/, 'ต้องลงทะเบียน metadata กลางหลัง upload');
assert.match(media, /getMediaMetadata/, 'ต้องอ่าน media จาก metadata registry');
assert.match(media, /createSignedImageUrl/, 'private media ต้องใช้ signed URL');
assert.match(media, /publicMediaUrl/, 'public media ต้องมี versioned URL');
assert.match(migration, /create table if not exists public\.media_assets/, 'ต้องมี Central Media registry แบบ additive');
assert.match(migration, /enable row level security/, 'Media registry ต้องเปิด RLS');
assert.doesNotMatch(migration, /\b(drop|delete|truncate)\b/i, 'migration registry ห้ามลบ legacy media หรือ reference');
assert.match(customer, /mediaType: 'PRODUCT_IMAGE', ownerType: 'customer'/, 'Customer Marketplace ต้องจำแนก media type กลาง');
assert.doesNotMatch(fs.readFileSync(__filename, 'utf8'), /merchant\/merchant-app|rider\/rider-app/, 'Customer repository ห้ามตรวจ source ของ application อื่นผ่าน path legacy');

console.log('central media contract: PASS');
