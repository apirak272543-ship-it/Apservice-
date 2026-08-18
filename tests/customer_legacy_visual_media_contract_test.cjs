const fs = require('fs');
const assert = require('assert');

const customer = fs.readFileSync('customer/customer-app.js', 'utf8');
const css = fs.readFileSync('customer/customer-legacy-media.css', 'utf8');

assert.match(customer, /legacyVisualImage/, 'Customer ต้องมี adapter สำหรับ legacy visual image');
assert.ok(customer.includes('data:image\\/(?:jpeg|png|webp);base64,'), 'adapter ต้องจำกัด MIME ของ Data URL');
assert.match(customer, /image\.length <= 1_400_000/, 'adapter ต้องจำกัดขนาด Data URL');
assert.match(customer, /customer-store-background/, 'store card ต้องแสดง background ผ่าน lazy image layer');
assert.match(customer, /const loading = eager \? 'eager' : 'lazy'/, 'legacy media ต้องเลือก eager เฉพาะหน้าแรกและ lazy สำหรับรายการ');
assert.match(customer, /decoding="async"/, 'legacy media ต้อง decode แบบ asynchronous เพื่อลด page jank');
assert.match(customer, /emojiImage/, 'Data URL ที่เคยถูกเก็บใน emoji ต้องถูกแปลงเป็น source image ไม่ใช่ข้อความ');
assert.match(customer, /fallbackEmoji/, 'icon ที่ decode ไม่ได้ต้องมี fallback ที่ไม่แสดง Data URL');
assert.match(customer, /eager: index < 4/, 'หน้า Home ต้องโหลดสื่อเฉพาะ card ที่เห็นทันทีแบบ eager');
assert.match(customer, /rows\.map\(store => storeCard\(store\)\)/, 'หน้า list ต้องคง lazy media ไม่ส่ง map index เป็น option ผิดชนิด');
assert.match(customer, /normalizePromotion[\s\S]*publicImage/, 'AD banner ต้องยังรับเฉพาะ HTTPS source ที่ผู้ดูแลเผยแพร่');
assert.match(css, /customer-store-background/, 'ต้องมี style สำหรับ legacy visual image layer');

console.log('customer legacy visual media contract: PASS');
