const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const patch = fs.readFileSync('customer/customer-gap-resilience-patch.js', 'utf8');
for (const route of ['store.html', 'order.html', 'marketplace-chat.html']) assert.match(fs.readFileSync(`customer/${route}`, 'utf8'), /customer-gap-resilience-patch\.js/, `${route} ต้องโหลด resilience patch`);

assert.match(patch, /ไม่พบรหัสร้านค้า[\s\S]*กลับไปร้านค้าทั้งหมด/, 'store fallback ต้องมีปุ่มกลับหน้าร้านทั้งหมด');
assert.match(patch, /location\.replace\(href\)[\s\S]*3000|3000[\s\S]*location\.replace\(href\)/, 'fallback ต้อง redirect ภายใน 3 วินาที');
assert.match(patch, /ไม่พบรหัสออร์เดอร์[\s\S]*ดูประวัติออร์เดอร์ของฉัน/, 'order fallback ต้องมีปุ่มกลับประวัติออร์เดอร์');
assert.match(patch, /query\.get\('listing'\) \|\| query\.get\('item_id'\)/, 'Marketplace Chat ต้องรองรับ listing และ compatibility item_id');
assert.match(patch, /select=id,title,price,image_url,seller_name,status/, 'Marketplace Chat ต้องโหลด price และ image ของสินค้าเพื่อคง context');
assert.match(patch, /marketplaceChatListingContext/, 'Marketplace Chat ต้องมี product context header');
assert.match(app, /function marketplaceChat\(\)/, 'runtime หลักต้องคง Marketplace Chat เดิมไว้');

console.log('customer fallback and marketplace chat contract: PASS');
