const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/20260820_rider_delivery_issue_queue.sql', 'utf8');
const edge = fs.readFileSync('supabase/functions/role-access/index.ts', 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.rider_delivery_issues/, 'ต้องมี queue ที่เก็บ issue ของ Rider');
assert.match(migration, /private\.owns_rider\(rider_id\)/, 'Rider อ่านได้เฉพาะ issue ของตนเอง');
assert.match(migration, /private\.has_role\('admin'\)/, 'Admin ต้องเข้าถึง queue เพื่อ dispatch ได้');
assert.match(edge, /body\.action === 'report_rider_delivery_issue'/, 'Edge function ต้องรองรับรายงานปัญหา Rider');
assert.match(edge, /eq\('user_id', caller\.id\)/, 'Edge function ต้อง resolve Rider จากผู้เรียกที่ยืนยันตัวตน');
assert.match(edge, /order\.rider_id !== rider\.id/, 'Edge function ต้องห้าม Rider รายงานงานของผู้อื่น');
assert.match(edge, /delivery-proofs\/\$\{caller\.id\}\/\$\{orderId\}-issue\//, 'Evidence ต้องถูก guard ตาม user และ order');
assert.match(edge, /\['สำเร็จแล้ว', 'ยกเลิก'\]/, 'งานปิดแล้วต้องไม่รับ issue report ใหม่');

console.log('rider issue report governance contract: PASS');
