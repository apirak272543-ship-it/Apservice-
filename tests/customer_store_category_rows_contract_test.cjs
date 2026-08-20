const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('customer/stores.html', 'utf8');
const rows = fs.readFileSync('customer/store-category-rows.js', 'utf8');
const css = fs.readFileSync('customer/store-category-rows.css', 'utf8');

assert.match(html, /store-category-rows\.css\?v=category-rows-v1/, 'หน้าร้านต้องโหลด stylesheet แถวร้านตามหมวด');
assert.match(html, /store-category-rows\.js\?v=category-rows-v1/, 'หน้าร้านต้องโหลด runtime แถวร้านตามหมวด');
assert.match(rows, /catalog_stores\?select=\$\{storeFields\}&order=rating\.desc&limit=300/, 'แถวหมวดต้องโหลดร้านจาก catalog จริง');
assert.match(rows, /store_categories\?select=\*&limit=100/, 'แถวหมวดต้องอ่านรายการหมวดจริงเพื่อรองรับหมวดที่ยังไม่มีร้าน');
assert.match(rows, /category_id \|\| store\.category_name/, 'โมดูลต้องจัดกลุ่มจากหมวดหมู่จริงของร้าน');
assert.match(rows, /isStoreReady\(right\).*isStoreReady\(left\)/, 'การจัดอันดับต้องให้ร้านพร้อมให้บริการมาก่อน');
assert.match(rows, /numeric\(right\.rating\) - numeric\(left\.rating\)/, 'การจัดอันดับต้องใช้คะแนนรีวิว');
assert.match(rows, /numeric\(right\.review_count\) - numeric\(left\.review_count\)/, 'การจัดอันดับต้องใช้จำนวนรีวิว');
assert.match(rows, /numeric\(right\.order_count\) - numeric\(left\.order_count\)/, 'การจัดอันดับต้องใช้จำนวนออร์เดอร์ที่ระบบเผยแพร่');
assert.match(rows, /const tierForIndex = index => index < MAX_TIER \? index \+ 1 : 0/, 'Tier 1–5 ต้องคำนวณสดจากอันดับในหน้า Customer');
assert.doesNotMatch(rows, /M\.request\([^\n]*(?:platform_configs|campaigns|campaign_stores)/, 'Tier ต้องไม่บันทึกหรือผูกกับข้อมูลถาวร/แคมเปญ');
assert.match(rows, /href = `store\.html\?id=\$\{encodeURIComponent\(store\.id\)\}`/, 'ทั้งการ์ดต้องเชื่อมไปหน้าเมนูร้านเดิม');
assert.match(rows, /ยังไม่มีร้านค้าที่พร้อมแสดงในหมวดนี้/, 'หมวดที่ยังไม่มีร้านต้องมี empty state ชัดเจน');
assert.match(rows, /IntersectionObserver/, 'Tier ต้องเริ่มเอฟเฟกต์เมื่อเห็นการ์ดครั้งแรก');
assert.match(rows, /TIER_REMINDER_MS = 30_000/, 'Tier ต้องเตือนเอฟเฟกต์ซ้ำตามรอบ 30 วินาที');
assert.match(rows, /prefers-reduced-motion/, 'Tier ต้องเคารพการลดการเคลื่อนไหวของอุปกรณ์');
assert.match(css, /\.store-category-row__rail \{\s*display: flex/, 'แต่ละหมวดต้องเป็นแถวเลื่อนแนวนอน');
assert.match(css, /flex: 0 0 144px/, 'การ์ดในหมวดต้องคงขนาดเพื่อเลื่อนแนวนอน');
assert.match(css, /aspect-ratio: 1 \/ 1/, 'การ์ดในหมวดต้องเป็นสี่เหลี่ยมจัตุรัส');
assert.match(css, /store-category-row-card--tier-1/, 'ต้องมีสไตล์เฉพาะสำหรับ Tier 1');
assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/, 'เอฟเฟกต์ประกายต้องเล่นเฉพาะเมื่อผู้ใช้ไม่ลดการเคลื่อนไหว');

console.log('customer store category rows contract: PASS');
