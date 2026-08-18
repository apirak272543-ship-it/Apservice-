const fs = require('fs');
const assert = require('assert');

const runtime = fs.readFileSync('shared/ap-service-mpa.js', 'utf8');
const app = fs.readFileSync('customer/customer-app.js', 'utf8');

assert.match(runtime, /async function signUp/, 'Shared MPA runtime ต้องมี Supabase signUp');
assert.match(runtime, /auth: \{ getSession, refreshSession, signIn, signUp/, 'Shared MPA runtime ต้องเผย signUp ผ่าน auth API');
assert.match(app, /customerRegisterForm/, 'Customer MPA ต้องมี register form');
assert.match(app, /registerTerms/, 'Customer register ต้องเก็บ consent terms/privacy');
assert.match(app, /registerLocationNotice/, 'Customer register ต้องแสดง location notice');
assert.match(app, /user_profiles\?on_conflict=user_id/, 'Register ที่มี session ต้องบันทึก profile เดิมผ่าน RLS');
assert.match(app, /user_consents\?on_conflict=user_id,consent_type,policy_version/, 'Register ที่มี session ต้องบันทึก consent ผ่าน RLS');
assert.match(app, /source: 'customer_mpa_register'/, 'Register consent ต้องส่ง source ที่ schema บังคับ');
assert.match(app, /evidence: \{ route: location\.pathname \}/, 'Register consent ต้องส่ง evidence ที่ schema บังคับ');
assert.match(app, /select=display_name,phone,email,address/, 'Customer profile ต้องอ่านที่อยู่เดิม');
assert.match(app, /id="address"/, 'Customer profile ต้องแก้ไขที่อยู่จัดส่งได้');
assert.match(app, /mode=register/, 'Signup CTA ต้องพาไป register route');

console.log('customer register parity contract: PASS');
