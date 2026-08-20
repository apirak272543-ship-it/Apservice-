const fs = require('fs');
const assert = require('assert');
const migration = fs.readFileSync('supabase/migrations/20260820_rider_private_documents.sql', 'utf8');
const edge = fs.readFileSync('supabase/functions/role-access/index.ts', 'utf8');

assert.match(migration, /'rider-documents'/, 'ต้องมี private storage bucket เอกสาร Rider');
assert.match(migration, /public, file_size_limit/, 'bucket ต้องกำหนด public และ size limit');
assert.match(migration, /false, 1048576/, 'เอกสาร Rider ต้องเป็น private และไม่เกิน 1 MB');
assert.match(migration, /riders upload own documents/, 'Rider ต้องอัปโหลดได้เฉพาะเอกสารของตน');
assert.match(migration, /riders or admins read documents/, 'เอกสาร Rider ต้องอ่านได้เฉพาะเจ้าของหรือ Admin');
assert.match(edge, /operation === 'documents'/, 'role-access ต้องรองรับการส่งเอกสาร Rider');
assert.ok(edge.includes('ref.startsWith(`rider-${rider.id}/`)'), 'server ต้องยืนยัน document path ของ Rider');
assert.match(edge, /updates\.ride_available = false/, 'ส่งเอกสารใหม่ต้องปิดรับงานระหว่างรอตรวจ');
console.log('rider private documents contract: PASS');
