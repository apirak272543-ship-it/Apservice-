const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'admin_contact_ui_patch.js'), 'utf8');
const slipSource = fs.readFileSync(path.join(__dirname, '..', 'admin_floating_cart_patch.js'), 'utf8');

[
  'const AdminPendingBadges',
  'admin-pending-badge',
  "payment_slip_reviews?select=id&status=eq.pending",
  "support_conversations?select=id&status=eq.open&admin_seen_at=is.null",
  "rider_applications?select=id&status=in.(pending,under_review)",
  "settlements?select=id&status=eq.pending",
  "withdrawal_requests?select=id&status=in.(requested,approved)",
  "error_reports?select=id&status=in.(new,triaged)",
  "ai_workspace_tasks?select=id&status=in.(queued,blocked,review)",
  "setInterval(() => this.refresh({ quiet: true }), 20000)",
  'AdminPendingBadges.start()',
  'window.refreshAdminPendingBadges'
].forEach(fragment => assert.ok(source.includes(fragment), `missing pending-badge implementation: ${fragment}`));

assert.ok(source.includes("if (filter === 'new')"), 'order status classification must support incoming-work badges');
assert.ok(source.includes("if (filter === 'active')"), 'order status classification must support active-work badges');
assert.ok(source.includes("event.target.closest('button')"), 'admin action watcher must schedule badge refresh');
assert.ok(slipSource.includes('window.refreshAdminPendingBadges?.();'), 'slip approval/rejection must refresh its badge immediately');

console.log('Admin pending-badge contract checks passed.');
