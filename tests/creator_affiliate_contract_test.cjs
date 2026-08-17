const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const patch = fs.readFileSync(path.join(root, 'creator_affiliate_patch.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'admin_contact_ui_patch.js'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'supabase/migrations/20260817_creator_affiliate_referral.sql'), 'utf8');
const workflow = fs.readFileSync(path.join(root, 'supabase/migrations/20260817_creator_affiliate_workflow.sql'), 'utf8');

assert.match(index, /creator_affiliate_patch\.js\?v=creator-affiliate-v1/, 'index must load the Creator Affiliate patch');
assert.match(navigation, /'creator-affiliates'/, 'Creator Affiliate must stay grouped in Admin navigation');
assert.match(patch, /id="admin-creator-affiliates"/, 'Admin Creator section must be injected');
assert.match(patch, /Creator Affiliate และ Referral/, 'Thai Admin menu label must exist');
assert.match(patch, /creatorProfileForm/, 'Creator management form must exist');
assert.match(patch, /creatorCampaignForm/, 'Campaign and referral-code form must exist');
assert.match(patch, /creatorRightForm/, 'Content-rights form must exist');
assert.match(patch, /creatorCommissionRows/, 'Commission queue must exist');
assert.match(patch, /creator_referral_sessions\?select=/, 'Creator dashboard must load referral-session data');
assert.match(patch, /creator_order_attributions\?select=/, 'Creator dashboard must load attributed-order data');
assert.match(patch, /creator-performance/, 'Creator dashboard must display real performance metrics');
assert.match(patch, /ยอดขายสุทธิ/, 'Creator dashboard must show net commissionable sales');
assert.match(patch, /creatorReferralCode/, 'Checkout must support a Creator referral code');
assert.match(patch, /rpc\/start_creator_referral/, 'Referral link/code must create a referral session');
assert.match(patch, /rpc\/attribute_creator_order/, 'Placed orders must be attributed through the secure RPC');
assert.match(patch, /order_total_excluding_delivery/, 'Commission basis excluding delivery must be supported');
assert.match(schema, /create table if not exists public\.creators/, 'Creator table migration must exist');
assert.match(schema, /create table if not exists public\.creator_commissions/, 'Commission table migration must exist');
assert.match(schema, /create table if not exists public\.creator_content_rights/, 'Content-rights table migration must exist');
assert.match(workflow, /create or replace function public\.attribute_creator_order/, 'Secure attribution workflow must exist');
assert.match(workflow, /after update of status, total, delivery_fee, completed_at/, 'Commission must update from real order status and amounts');

console.log('creator_affiliate_contract_test: PASS');
