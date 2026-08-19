const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('supabase/migrations/20260819_menu_item_soft_archive.sql', 'utf8');

assert.match(migration, /ADD COLUMN IF NOT EXISTS archived_at/, 'ต้องมีเวลาจัดเก็บเมนู');
assert.match(migration, /ADD COLUMN IF NOT EXISTS archived_by/, 'ต้องเก็บผู้ดำเนินการ');
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.archive_menu_item/, 'ต้องมี RPC เก็บเมนูแบบไม่ลบ');
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.restore_menu_item/, 'ต้องมี RPC นำเมนูกลับ');
assert.match(migration, /private\.has_role\('admin'\)/, 'ต้องอนุญาตแอดมินผ่าน backend');
assert.match(migration, /private\.owns_store\(v_menu\.store_id\)/, 'ต้องอนุญาต Merchant เฉพาะร้านของตน');
assert.match(migration, /available = false/, 'เก็บเมนูต้องปิดขายก่อน');
assert.match(migration, /archived_at = NULL/, 'นำกลับต้องล้างสถานะเก็บออกจากรายการ');
assert.doesNotMatch(migration, /DELETE FROM public\.menu_items/, 'soft archive ห้ามลบเมนูจากฐานข้อมูล');

console.log('menu item soft archive contract: PASS');
