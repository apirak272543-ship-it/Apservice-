const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('supabase/functions/role-access/index.ts', 'utf8');
assert.match(source, /body\.action === 'update_rider_presence'/, 'role-access must expose a Rider-owned presence action');
assert.match(source, /eq\('role', 'rider'\)/, 'Rider presence action must require the rider role');
assert.match(source, /eq\('user_id', caller\.id\)/, 'Rider presence action must resolve the profile from the authenticated caller');
assert.match(source, /operation === 'location'/, 'Rider presence action must handle live location');
assert.match(source, /operation === 'availability'/, 'Rider presence action must handle readiness');
assert.match(source, /operation === 'profile'/, 'Rider presence action must handle the allowed profile fields');
assert.match(source, /ride_available/, 'Rider readiness must be persisted server-side');
assert.match(source, /compliance_status !== 'approved'/, 'Unavailable or unapproved Rider cannot self-enable readiness');
assert.match(source, /riderLocation/, 'Rider live location must be coordinate-validated server-side');
console.log('role_access_rider_presence_contract_test: PASS');
