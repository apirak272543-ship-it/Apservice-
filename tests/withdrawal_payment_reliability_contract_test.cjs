const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const adminPatch = read('withdrawal_payment_reliability_patch.js');
const riderPatch = read('rider_payout_proof_patch.js');
const migration = read('supabase/migrations/20260817_withdrawal_proof_storage.sql');
const index = read('index.html');
const rider = read('rider.html');

assert.match(adminPatch, /withdrawal-proofs/, 'ต้องกำหนด bucket หลักฐานการจ่าย');
assert.match(adminPatch, /storage\/v1\/object\/\$\{BUCKET\}/, 'ต้องอัปโหลดรูปผ่าน Storage object endpoint');
assert.match(adminPatch, /p_proof_image_url: storagePath/, 'RPC ต้องรับ storage path แทน Base64');
assert.match(adminPatch, /createImageBitmap/, 'ต้องบีบอัดรูปด้วย ImageBitmap สำหรับ Android');
assert.match(adminPatch, /MAX_SOURCE_BYTES = 5 \* 1024 \* 1024/, 'ต้องจำกัดรูปต้นทางไม่เกิน 5 MB');
assert.match(adminPatch, /MAX_PROOF_BYTES = 420 \* 1024/, 'ต้องจำกัดรูปหลังบีบอัดสำหรับมือถือ');
assert.doesNotMatch(adminPatch, /clearSession\(\)/, 'เส้นทาง refresh session ใหม่ต้องไม่ล้าง session หรือบังคับ logout');
assert.match(adminPatch, /งานและหน้าปัจจุบันจะไม่ถูกปิด/, 'ต้องแจ้งชัดว่าหน้าปัจจุบันยังอยู่เมื่อ session หมดอายุ');
assert.match(adminPatch, /select=id,recipient_type,store_id,rider_id/, 'รายการคำขอฝั่ง Admin ต้องไม่ดึง Base64 ด้วย select=*');
assert.match(riderPatch, /proof_available/, 'Rider ต้องรับ metadata ว่าหลักฐานพร้อมดู');
assert.match(riderPatch, /viewRiderWithdrawalProof/, 'Rider ต้องมี action เปิดหลักฐานแบบ on-demand');
assert.match(riderPatch, /storage\/v1\/object/, 'Rider ต้องเปิดหลักฐานผ่าน Private Storage');
assert.doesNotMatch(riderPatch, /select=\*.*withdrawal_requests/, 'Rider ต้องไม่ดึง Base64 ทั้งรายการคำขอ');
assert.match(migration, /ADD COLUMN IF NOT EXISTS proof_available/, 'migration ต้องเพิ่ม metadata หลักฐาน');
assert.match(migration, /INSERT INTO storage\.buckets/, 'migration ต้องสร้าง Private Storage bucket');
assert.match(migration, /riders read own withdrawal proofs/, 'migration ต้องมี policy ให้ Rider อ่านเฉพาะสลิปตนเอง');
assert.match(migration, /private\.has_role\('admin'\)/, 'migration ต้องจำกัด upload หลักฐานให้ Admin');
assert.match(index, /withdrawal_payment_reliability_patch\.js/, 'หน้า Admin ต้องโหลดแพตช์ความเสถียร');
assert.match(rider, /rider_payout_proof_patch\.js/, 'Rider Console ต้องโหลดแพตช์หลักฐานการจ่าย');

console.log('withdrawal_payment_reliability_contract_test: PASS');
