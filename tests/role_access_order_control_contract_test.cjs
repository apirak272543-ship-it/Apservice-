const assert = require('node:assert');
const fs = require('node:fs');

const source = fs.readFileSync('supabase/functions/role-access/index.ts', 'utf8');
assert.match(source, /body\.action === 'manage_delivery_order'/, 'role-access must provide a server-authorized Order Control Plane action');
assert.match(source, /ORDER_TRANSITIONS/, 'server must validate the shared order status lifecycle');
assert.match(source, /operation === 'assign_rider'/, 'server must own Rider assignment');
assert.match(source, /operation !== 'items'/, 'server must allow-list item reconciliation and reject unsupported order operations');
assert.match(source, /order_status_events/, 'server status changes must write a status history event');
assert.match(source, /admin_action_audit/, 'server order changes must write an admin audit record');
assert.match(source, /EDITABLE_ORDER_STATUSES/, 'server must lock item editing once fulfillment has progressed');
console.log('role_access_order_control_contract_test: PASS');
