const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const repo of [path.resolve(__dirname, '..'), path.resolve(__dirname, '../../apservice-admin-app')]) {
  const client = fs.readFileSync(path.join(repo, 'shared/ap-supabase-client.js'), 'utf8');
  assert.match(client, /persistSession: true/);
  assert.match(client, /autoRefreshToken: true/);
  assert.match(client, /storageKey: STORAGE_KEY/);
  assert.doesNotMatch(client, /clearLegacy\(\)/, `${repo} must not delete legacy sessions during cross-app migration`);
  assert.doesNotMatch(client, /clearSharedLegacy\(\)/, `${repo} must not delete shared sessions during cross-app migration`);
  assert.match(client, /Keep legacy tokens during the cross-app migration window/);
}
console.log('customer_auth_cross_app_persistence_contract_test: PASS');
