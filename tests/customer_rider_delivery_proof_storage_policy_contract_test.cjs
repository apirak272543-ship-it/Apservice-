const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('supabase/migrations/20260821_fix_rider_delivery_proof_storage_policy_v3.sql', 'utf8');

assert.match(migration, /DROP POLICY IF EXISTS ["']riders upload own delivery proof["']/i, 'ต้อง replace policy upload proof เดิมอย่างชัดเจน');
assert.match(migration, /storage\.foldername\(storage\.objects\.name\)\)\[2\]/, 'ต้องตรวจ order ID จาก object path จริงและ qualify storage object');
assert.match(migration, /storage\.extension\(storage\.objects\.name\)/, 'ต้อง qualify object name ใน extension check');
assert.match(migration, /r\.user_id\s*=\s*auth\.uid\(\)/, 'ต้องผูก order กับ Rider ที่ login อยู่');
assert.doesNotMatch(migration, /storage\.foldername\(r\.name\)/, 'ห้ามใช้ชื่อ Rider เป็น storage path เพื่อเทียบ order ID');
assert.match(migration, /DROP POLICY IF EXISTS ["']riders upload own delivery proof by path["']/i, 'ต้องล้าง policy เสริมที่มี expression ผิด');
assert.match(migration, /bucket_id\s*=\s*'delivery-proofs'/, 'ต้องจำกัด policy อยู่ที่ delivery-proofs bucket');
assert.match(migration, /storage\.extension\(storage\.objects\.name\)/, 'ต้องจำกัดชนิดไฟล์หลักฐาน');

console.log('customer rider delivery proof storage policy contract: PASS');
