const fs = require('fs');
const assert = require('assert');

const runtime = fs.readFileSync('shared/ap-service-mpa.js', 'utf8');
const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const admin = fs.readFileSync('../Apservicebeta/admin/admin-app.js', 'utf8');

assert.match(runtime, /async function signUp/, 'Shared runtime may retain signUp internally for Admin-provisioned workflows');
assert.doesNotMatch(app, /customerRegisterForm|auth\.signUp|mode=register/, 'Customer app must not expose public registration');
assert.match(app, /APLoginUI\?\.enhance/, 'Customer Login must use shared Login UI motion helper');
assert.match(app, /ให้ Admin สร้างบัญชี Customer ให้ก่อน/, 'Customer Login must explain Admin-only account creation');
assert.match(app, /rolesFor\(session\.user\.id\)/, 'Customer Login must check role after sign-in');
assert.match(admin, /create_managed_account/, 'Admin must keep managed account creation');
assert.match(admin, /role: 'store_owner'/, 'Merchant provisioning must remain Admin-owned');
assert.match(admin, /rider-applications|riders\.html/, 'Rider account workflow must remain Admin-owned');
assert.match(app, /select=display_name,phone,email,address/, 'Customer profile must still read saved address');
assert.match(app, /id="address"/, 'Customer profile must still edit delivery address');

console.log('customer admin-only auth contract: PASS');
