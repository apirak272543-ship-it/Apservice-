const fs = require('fs');
const assert = require('assert');

const sharedRuntime = fs.readFileSync('shared/ap-service-mpa.js', 'utf8');
const loginRuntime = fs.readFileSync('customer/customer-app.js', 'utf8');
const recoverRuntime = fs.readFileSync('customer/customer-recover.js', 'utf8');
const updateRuntime = fs.readFileSync('customer/customer-update-password.js', 'utf8');
const updatePage = fs.readFileSync('customer/update-password.html', 'utf8');
const profilePage = fs.readFileSync('customer/profile.html', 'utf8');

assert.match(sharedRuntime, /async function sendPasswordRecovery\(email, redirectTo\)/, 'Shared runtime must request a standard Supabase recovery email');
assert.match(sharedRuntime, /payload\.redirect_to = redirectTo/, 'Recovery request must honor the dedicated password-update redirect');
assert.match(sharedRuntime, /async function acceptRecoveryFromHash\(\)/, 'Password page must accept the one-time session returned by the email link');
assert.match(sharedRuntime, /async function updatePassword\(password\)/, 'Password page must submit the replacement password only with a recovery session');
assert.match(recoverRuntime, /function recoveryRedirectUrl\(\)/, 'Recovery flow must centralize its redirect URL');
assert.match(fs.readFileSync('customer/recover.html', 'utf8'), /https:\/\/apirak272543-ship-it\.github\.io\/Apservice-\/customer\/update-password\.html/, 'GitHub Pages recovery email must include the repository base path');
assert.match(updateRuntime, /submit\.disabled = true/, 'Password submission must remain blocked until the email-link session is verified');
assert.match(updateRuntime, /acceptRecoveryFromHash\(\)/, 'Password page must validate the email-link handoff before enabling the form');
assert.match(updateRuntime, /M\.auth\.signOut\('profile\.html\?password_reset=1'\)/, 'After saving, the Customer must return to the Login page rather than stay signed in');
assert.match(loginRuntime, /data-password-recovery-link/, 'Login must expose a recovery entry point');
assert.match(loginRuntime, /password_reset/, 'Login must confirm that the password was changed successfully');
assert.match(updatePage, /recovery-v3-direct-flow/, 'Customer WebView must reload the direct-recovery runtime after deployment');
assert.match(fs.readFileSync('customer/recover.html', 'utf8'), /recovery-v4-canonical-url/, 'Customer recovery page must reload the canonical redirect runtime after deployment');
assert.match(profilePage, /login-v3-password-recovery/, 'Customer WebView must reload the post-recovery Login runtime after deployment');

console.log('customer direct password-recovery journey contract: PASS');
