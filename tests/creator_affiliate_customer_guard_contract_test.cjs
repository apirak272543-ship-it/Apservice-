const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const creator = fs.readFileSync(path.join(root, 'creator_affiliate_patch.js'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'admin_contact_ui_patch.js'), 'utf8');

assert.match(creator, /isAdminView\(\)/, 'Creator Affiliate must know whether the Admin page is active');
assert.match(creator, /!this\.isAdminView\(\)/, 'Creator Affiliate load must not run on customer pages');
assert.match(creator, /!this\.session\(\)\?\.access_token/, 'Creator Affiliate load must not start without an active Admin session');
assert.match(creator, /activate\(\)/, 'Creator Affiliate must expose an explicit Admin activation hook');
assert.match(creator, /init\(\) \{ this\.ensureSection\(\); \}/, 'Initial page boot must only install the hidden Admin section');
assert.match(navigation, /name === 'creator-affiliates'.*CreatorAffiliate\?\.activate/, 'Admin next-page navigation must activate Creator Affiliate only when opened');

console.log('creator_affiliate_customer_guard_contract_test: PASS');
