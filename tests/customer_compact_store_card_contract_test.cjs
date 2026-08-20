const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const css = fs.readFileSync('customer/customer-modern-theme.css', 'utf8');

assert.match(app, /customer-modern-theme\.css\?v=customer-soft-art-v3/, 'Customer runtime ต้องใช้ stylesheet รุ่นใหม่หลังปรับ layout');
assert.match(app, /<a class="mpa-card customer-store-card"(?: data-store-id="\$\{h\(store\.id\)\}")? href="\$\{h\(href\)\}" aria-label="ดูเมนูร้าน \$\{h\(store\.name\)\}">/, 'การ์ดร้านค้าต้องเป็นลิงก์เต็มใบที่เข้าถึงได้และระบุ store id สำหรับ public metadata');
assert.match(app, /const href = `store\.html\?id=\$\{encodeURIComponent\(store\.id\)\}`/, 'การ์ดร้านค้าต้องคง URL ปลายทางเมนูเดิม');
assert.match(css, /\.customer-store-visual \{\s*height: 82px;\s*place-items: center start;/, 'รูปปกต้องย่อและจัดไอคอนไปฝั่งซ้าย');
assert.match(css, /\.customer-store-card:focus-visible \{\s*outline: 3px solid/, 'การ์ดร้านค้าที่เป็นลิงก์ต้องมี focus state สำหรับคีย์บอร์ด');
assert.match(css, /\.customer-store-copy p \{[\s\S]*?-webkit-line-clamp: 1;/, 'คำอธิบายร้านต้องจำกัดหนึ่งบรรทัดเพื่อประหยัดพื้นที่');
assert.match(css, /@media \(max-width: 760px\) \{\s*\.customer-store-card \{ border-radius: 17px; \}\s*\.customer-store-visual \{ height: 76px;/, 'มือถือต้องใช้การ์ดรุ่นกะทัดรัดยิ่งขึ้น');

console.log('customer compact store card contract: PASS');
