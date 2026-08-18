const fs = require('fs');
const assert = require('assert');

const customer = fs.readFileSync('customer/customer-app.js', 'utf8');
const css = fs.readFileSync('customer/customer-legacy-media.css', 'utf8');

assert.match(customer, /legacyVisualImage/, 'Customer ต้องมี adapter สำหรับ legacy visual image');
assert.ok(customer.includes('data:image\\/(?:jpeg|png|webp);base64,'), 'adapter ต้องจำกัด MIME ของ Data URL');
assert.match(customer, /image\.length <= 1_400_000/, 'adapter ต้องจำกัดขนาด Data URL');
assert.match(customer, /customer-store-background/, 'store card ต้องแสดง background ผ่าน lazy image layer');
assert.match(customer, /loading="lazy" decoding="async"/, 'legacy media ต้อง lazy decode เพื่อลด page jank');
assert.match(customer, /normalizePromotion[\s\S]*publicImage/, 'AD banner ต้องยังรับเฉพาะ HTTPS source ที่ผู้ดูแลเผยแพร่');
assert.match(css, /customer-store-background/, 'ต้องมี style สำหรับ legacy visual image layer');

console.log('customer legacy visual media contract: PASS');
