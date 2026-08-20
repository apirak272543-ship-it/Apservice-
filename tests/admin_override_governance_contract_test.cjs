const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('supabase/migrations/20260820_admin_override_governance_audit.sql', 'utf8');
const financialEvidence = fs.readFileSync('supabase/migrations/20260820_admin_override_financial_evidence.sql', 'utf8');
const roleAccess = fs.readFileSync('supabase/functions/role-access/index.ts', 'utf8');
const contract = fs.readFileSync('docs/wave-p4-admin-override-governance-contract.md', 'utf8');

for (const token of [
  'admin-override-evidence',
  'file_size_limit, allowed_mime_types',
  'private.require_admin_override_reason',
  'char_length(v_reason) < 10',
  'private.validate_admin_override_evidence',
  "'admin-override-evidence/' || auth.uid()::text || '/override/'",
  'ADD COLUMN IF NOT EXISTS evidence_path text',
  'ADD COLUMN IF NOT EXISTS metadata jsonb',
  'admin_list_override_audit',
  "private.has_role('admin')",
  "'wallet_adjusted'",
  "'account_control_updated'",
  "'user_roles_updated'",
]) assert.ok(migration.includes(token), `missing governance token: ${token}`);

assert.ok(contract.includes('ไม่มี approval queue เพิ่ม'), 'contract must keep immediate Admin authority');
assert.ok(contract.includes('Daily role autonomy'), 'contract must protect normal role operations');
assert.ok(contract.includes('Force cancel/refund'), 'contract must make unsafe future mutations explicit');
assert.ok(!/merchant.*appeal/i.test(contract), 'appeal flow must not be reintroduced');
for (const token of ['p_evidence_path text DEFAULT NULL', 'admin_resolve_order_cancellation', 'admin_review_checkout_group_payment', "'order_cancellation_approved'", "'checkout_group_payment_reviewed'"]) assert.ok(financialEvidence.includes(token), `missing financial governance token: ${token}`);
for (const token of ['p_evidence_path: text(body.evidence_path) || null', 'reason.length < 10', 'admin-override-evidence/${caller.id}/override/', "target_type: 'order'", 'evidence_path: evidencePath || null']) assert.ok(roleAccess.includes(token), `missing Edge governance token: ${token}`);
console.log('Admin override governance contract passed');
