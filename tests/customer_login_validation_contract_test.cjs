const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'customer', 'customer-app.js'), 'utf8');
const profile = fs.readFileSync(path.join(__dirname, '..', 'customer', 'profile.html'), 'utf8');

assert.match(source, /const otpErrorMessage = error/, 'Customer Login must map OTP errors before they reach the user');
assert.match(source, /กรุณากรอกอีเมล/, 'Customer Login must explain missing email fields in Thai');
assert.match(source, /if \(!email\).*return;/, 'Customer Login must return before calling Auth for an empty email');
assert.match(source, /M\.auth\.sendEmailOtp\(email\)/, 'Customer Login must request an OTP only with a validated email');
assert.match(source, /M\.auth\.verifyEmailOtp\(email, token\)/, 'Customer Login must verify the entered OTP');
assert.match(source, /ยืนยันรหัสไม่สำเร็จ/, 'Customer Login must map OTP errors to Thai');
assert.doesNotMatch(source, /showError\(loginForm, err\.message/, 'Customer Login must not expose raw provider messages directly');
assert.match(profile, /customer-auth-v5-email-otp-fallback/, 'Customer Profile must request the email OTP Login runtime revision');

console.log('customer login validation contract: PASS');
