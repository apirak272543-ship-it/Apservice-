const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const patch = fs.readFileSync(path.join(root, 'creator_affiliate_patch.js'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'supabase/migrations/20260817_creator_affiliate_referral.sql'), 'utf8');
const workflow = fs.readFileSync(path.join(root, 'supabase/migrations/20260817_creator_affiliate_workflow.sql'), 'utf8');

assert.match(patch, /creatorReferralCode/, 'Creator referral code contract ต้องยังมีอยู่');
assert.match(patch, /getReferralUrl\(code\)/, 'Referral URL ต้องถูกสร้างจาก campaign code');
assert.match(patch, /rpc\/start_creator_referral/, 'Referral link/code ต้องสร้าง referral session ผ่าน RPC');
assert.match(patch, /rpc\/attribute_creator_order/, 'Placed orders ต้อง attribute ผ่าน secure RPC');
assert.match(patch, /order_total_excluding_delivery/, 'Commission basis ต้องแยกค่าส่งออก');
assert.match(schema, /create table if not exists public\.creators/, 'Creator table migration ต้องมีอยู่');
assert.match(schema, /create table if not exists public\.creator_commissions/, 'Commission table migration ต้องมีอยู่');
assert.match(schema, /create table if not exists public\.creator_content_rights/, 'Content-rights table migration ต้องมีอยู่');
assert.match(workflow, /create or replace function public\.attribute_creator_order/, 'Secure attribution workflow ต้องมีอยู่');
assert.match(workflow, /after update of status, total, delivery_fee, completed_at/, 'Commission ต้องอัปเดตจาก order status และจำนวนเงินจริง');
assert.equal(fs.existsSync(path.join(root, 'admin_contact_ui_patch.js')), false, 'Customer backend contract ห้ามพึ่ง Admin monolith ที่แยก repository แล้ว');

console.log('creator affiliate data contract: PASS');
