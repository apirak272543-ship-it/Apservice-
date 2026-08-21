const fs = require('fs');
const assert = require('assert');

const sharedRuntime = fs.readFileSync('shared/ap-service-mpa.js', 'utf8');
const loginRuntime = fs.readFileSync('customer/customer-app.js', 'utf8');
const recoverRuntime = fs.readFileSync('customer/customer-recover.js', 'utf8');
const updateRuntime = fs.readFileSync('customer/customer-update-password.js', 'utf8');

assert.match(sharedRuntime, /async function sendPasswordRecovery\(email, redirectTo\)/, 'Shared runtime must request a standard Supabase recovery email');
assert.match(sharedRuntime, /payload\.redirect_to = redirectTo/, 'Recovery request must honor the dedicated password-update redirect');
assert.match(sharedRuntime, /async function acceptRecoveryFromHash\(\)/, 'Password page must accept the one-time session returned by the email link');
assert.match(sharedRuntime, /async function updatePassword\(password\)/, 'Password page must submit the replacement password only with a recovery session');
assert.match(recoverRuntime, /new URL\('update-password\.html', location\.href\)\.href/, 'Recovery email must lead directly to the Customer update-password page');
assert.match(updateRuntime, /submit\.disabled = true/, 'Password submission must remain blocked until the email-link session is verified');
assert.match(updateRuntime, /acceptRecoveryFromHash\(\)/, 'Password page must validate the email-link handoff before enabling the form');
assert.match(updateRuntime, /M\.auth\.signOut\('profile\.html\?password_reset=1'\)/, 'After saving, the Customer must return to the Login page rather than stay signed in');
assert.match(loginRuntime, /data-password-recovery-link/, 'Login must expose a recovery entry point');
assert.match(loginRuntime, /password_reset/, 'Login must confirm that the password was changed successfully');

console.log('customer direct password-recovery journey contract: PASS');
