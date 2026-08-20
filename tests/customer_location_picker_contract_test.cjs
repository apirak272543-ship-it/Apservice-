const fs = require('fs');
const assert = require('assert');

const checkout = fs.readFileSync('customer/checkout.html', 'utf8');
const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const picker = fs.readFileSync('customer/customer-location-picker.js', 'utf8');

assert.match(checkout, /customer-location-picker\.js/, 'Checkout ต้องโหลด Customer location picker');
assert.match(checkout, /customer-location-picker\.css/, 'Checkout ต้องโหลด Customer location picker styles');
assert.match(picker, /OpenStreetMap/, 'ต้องมี tile provider หลัก');
assert.match(picker, /Carto Voyager/, 'ต้องมี tile provider fallback');
assert.match(picker, /Esri World Street Map/, 'ต้องมี tile provider fallback ชุดสุดท้าย');
assert.match(picker, /map\?\.invalidateSize/, 'เมื่อเปิด modal ต้องคำนวณขนาดแผนที่อีกครั้งหลัง layout พร้อม');
assert.match(picker, /checkoutLocationMapRetry'\)\.onclick = \(\) => mountTiles\(true\)/, 'ปุ่มลองใหม่ต้องสลับไปยังแหล่งภาพสำรองจริง');
assert.match(picker, /checkoutLocationManual/, 'ต้องมี manual Latitude/Longitude fallback');
assert.match(picker, /navigator\.geolocation/, 'ต้องมี GPS flow');
assert.match(picker, /user_profiles\?on_conflict=user_id/, 'ต้อง persist location เข้า profile');
assert.match(app, /mountCheckout/, 'Checkout runtime ต้อง mount location card');
assert.match(app, /ensureForCheckout/, 'Checkout ต้อง block การสร้าง order เมื่อไม่มีพิกัด');
assert.match(app, /rpc\/create_food_order/, 'ยังต้องสร้าง order ผ่าน server RPC');
assert.doesNotMatch(picker, /delivery_fee\s*:/, 'Location picker ห้ามคำนวณหรือ hardcode ค่าส่งฝั่ง client');

console.log('customer location picker contract: PASS');
