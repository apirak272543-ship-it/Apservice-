const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'customer/customer-app.js'), 'utf8');
const categoryRows = fs.readFileSync(path.join(root, 'customer/store-category-rows.js'), 'utf8');

assert.ok(app.includes('จัดการข้อมูลบัญชี ที่อยู่ และการตั้งค่าการจัดส่งของคุณได้ที่นี่'), 'Customer profile ต้องอธิบายประโยชน์ให้ผู้ใช้เข้าใจ');
assert.ok(!app.includes('ข้อมูลนี้เชื่อมกับบัญชี Supabase ของคุณ'), 'Customer profile ต้องไม่แสดงศัพท์ implementation');
assert.ok(app.includes("const foodOnly = q.get('service') === 'food';"), 'Food route ต้องกำหนด service context ก่อน render');
assert.ok(app.includes("foodOnly ? 'ร้านอาหาร' : 'ร้านค้าทั้งหมด'"), 'Food route ต้องมี heading ร้านอาหารเฉพาะหมวด');
assert.ok(app.includes("foodOnly ? 'ค้นหาร้านอาหาร เมนู หรือหมวดหมู่'"), 'Food route ต้องมี search copy ที่ตรงกับบริการ');
assert.ok(categoryRows.includes('เลือกร้านที่เปิดให้บริการและดูเมนูที่เหมาะกับคุณได้ง่ายขึ้น'), 'Category rows ต้องใช้คำอธิบายผู้ใช้เป็นศูนย์กลาง');
assert.ok(!categoryRows.includes('Tier คำนวณสดจากสถานะเปิดบริการ'), 'Category rows ต้องไม่แสดงเกณฑ์ implementation แก่ลูกค้า');

console.log('Customer release-readiness copy contract: PASS');
