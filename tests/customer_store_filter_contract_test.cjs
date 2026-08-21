const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('customer/customer-app.js', 'utf8');
assert.match(source, /catalog_menu_items\?select=store_id,category_id,category_name&limit=1000/, 'Store filter ต้องอ่าน category ของเมนูเพื่อรองรับ metadata ร้านที่คลาดเคลื่อน');
assert.match(source, /menuCategoriesByStore/, 'Store filter ต้องจัดกลุ่มหมวดหมู่เมนูตามร้าน');
assert.match(source, /const menuCategoryMatch/, 'Store filter ต้องใช้หมวดหมู่เมนูเป็น fallback');
assert.match(source, /categoryMatch = selected === 'all'.*menuCategoryMatch/, 'Store filter ต้องรวมผลจาก store category และ menu category');
console.log('customer store filter contract: PASS');
