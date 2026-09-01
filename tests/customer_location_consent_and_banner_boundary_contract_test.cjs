const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const consent = fs.readFileSync('customer/customer-location-consent.js', 'utf8');
const modernTheme = fs.readFileSync('customer/customer-modern-theme.css', 'utf8');
const homeTheme = fs.readFileSync('customer/customer-home-mobile.css', 'utf8');
const promotions = app.slice(app.indexOf('async function promotions('), app.indexOf('function renderPromotions('));
const adminCandidates = [path.resolve(__dirname, '..', '..', 'apservice-admin-app', 'admin', 'admin-app.js'), path.resolve(__dirname, '..', 'apservice-admin-contract-parity', 'admin', 'admin-app.js'), path.resolve(__dirname, '..', '..', 'Apservicebeta', 'admin', 'admin-app.js')];
const adminPath = adminCandidates.find(candidate => fs.existsSync(candidate));
const admin = adminPath ? fs.readFileSync(adminPath, 'utf8') : '';

assert.match(app, /customer-location-consent-script/);
assert.match(app, /const user = await M\.auth\.currentUser\(\);/);
assert.match(app, /profile\.html\?next=/);
assert.match(consent, /showBenefits/);
assert.match(consent, /location_prompt_declined/);
assert.match(consent, /navigator\.geolocation/);
assert.match(consent, /customer-consent-modal/);
assert.match(consent, /Consent history must never prevent the customer from continuing/);
assert.doesNotMatch(promotions, /method: 'POST'|method: 'PATCH'|on_conflict/);
assert.match(app, /customer_home_sponsored/);
if (adminPath) {
  assert.match(admin, /platform_configs\?on_conflict=key/);
  assert.match(admin, /approval_status/);
  assert.match(admin, /starts_at/);
  assert.match(admin, /ends_at/);
} else {
  console.log('customer location boundary contract: Admin sibling source check SKIPPED (standalone clone)');
}
assert.match(app, /page\.dataset\.adminBackground = 'true'/);
assert.match(app, /data-admin-banner/);
assert.doesNotMatch(modernTheme, /background-image:\s*none!important/);
assert.match(homeTheme, /customer-hero\[data-admin-banner="true"\]/);

console.log('customer_location_consent_and_banner_boundary_contract_test: PASS');
