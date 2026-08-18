const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('supabase/migrations/20260818_admin_account_control_plane.sql', 'utf8');
const edge = fs.readFileSync('supabase/functions/role-access/index.ts', 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.account_controls/, 'ต้องมี table สำหรับสถานะบัญชีและ feature overrides');
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.admin_action_audit/, 'ต้องมี immutable audit trail สำหรับ privileged actions');
assert.match(migration, /admin_set_account_control/, 'การจัดการสถานะและสิทธิ์ต้องเป็น server RPC');
assert.match(migration, /admin_set_user_roles/, 'การแก้บทบาทต้องเป็น server RPC');
assert.match(migration, /admin_adjust_customer_wallet/, 'การปรับยอดต้องใช้ wallet ledger RPC');
assert.match(migration, /INSERT INTO public\.wallet_transactions/, 'RPC ปรับยอดต้องเพิ่ม ledger row ไม่แก้ยอดลอย');
assert.match(migration, /account_feature_enabled/, 'ต้องมี helper บังคับ feature controls ฝั่ง server');
assert.match(migration, /cash_on_delivery/, 'ต้องตรวจสิทธิ์ COD ใน create_food_order server RPC');
assert.match(edge, /body\.action === 'list_user_control_plane'/, 'role-access ต้องส่งข้อมูล Account Control Plane ให้ Admin');
assert.match(edge, /body\.action === 'update_user_profile_section'/, 'role-access ต้องรองรับ profile patch เป็นรายหมวด');
assert.match(edge, /body\.action === 'set_account_control'/, 'role-access ต้องเรียก server RPC สำหรับ feature controls');
assert.match(edge, /body\.action === 'set_user_roles'/, 'role-access ต้องเรียก server RPC สำหรับบทบาท');
assert.match(edge, /body\.action === 'adjust_customer_wallet'/, 'role-access ต้องเรียก server RPC สำหรับ wallet');
assert.match(edge, /body\.action === 'create_managed_account'/, 'role-access ต้องสร้างบัญชี Admin/Customer ได้');
assert.match(edge, /body\.action === 'update_store_account_section'/, 'role-access ต้องแก้บัญชี Merchant แบบแยก field ได้');
assert.match(edge, /accountControl\?\.status === 'suspended'/, 'Merchant/Rider login ต้องถูกบล็อกเมื่อถูกระงับ');

console.log('admin account control plane contract: PASS');
