const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('supabase/functions/role-access/index.ts', 'utf8');

assert.match(source, /body\.action === 'update_store_section'/, 'ต้องมี server action สำหรับแก้ข้อมูลร้านรายหมวด');
assert.match(source, /\['general', 'appearance', 'operations'\]/, 'ต้อง allow-list เฉพาะหมวดร้านที่อนุญาต');
assert.match(source, /has\('settlement_gp_percent'\)/, 'ต้องรองรับ GP รายร้านผ่าน server action');
assert.match(source, /GP ร้านค้าต้องอยู่ระหว่าง 0 ถึง 100/, 'ต้องตรวจช่วง GP ฝั่ง server');
assert.match(source, /has\('image_url'\)/, 'ต้อง allow-list URL ไอคอนร้านใน appearance section');
assert.match(source, /has\('background_url'\)/, 'ต้อง allow-list URL ภาพพื้นหลังร้านใน appearance section');
assert.match(source, /has\('location'\)/, 'ต้อง allow-list พิกัดร้านใน operations section');
assert.doesNotMatch(source, /updates\s*=\s*input/, 'ห้ามส่ง input ทั้งก้อนไป update โดยไม่ allow-list');

console.log('role access store section contract: PASS');
