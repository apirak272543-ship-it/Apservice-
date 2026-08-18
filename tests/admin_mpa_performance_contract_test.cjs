const assert = require('assert');
const fs = require('fs');

const runtime = fs.readFileSync('shared/ap-service-mpa.js', 'utf8');
const admin = fs.readFileSync('admin/admin-app.js', 'utf8');

assert.match(runtime, /async function requestCount\(/, 'Shared MPA runtime ต้องมี requestCount แบบ HEAD');
assert.match(runtime, /method = 'HEAD'/, 'requestCount ต้องไม่ดึง body ของทุก row เพื่อหาจำนวน');
assert.match(runtime, /Prefer: 'count=exact'/, 'requestCount ต้องขอจำนวนจาก PostgREST metadata');
assert.match(runtime, /requestCount, createScope/, 'requestCount ต้อง expose ผ่าน lifecycle ร่วม');
assert.match(runtime, /requestCount: lifecycle\.requestCount/, 'Admin ต้องเข้าถึง count ผ่าน Shared MPA contract');
assert.match(runtime, /requestCount: \(path, options = \{\}\) => requestCount/, 'Request scope ต้อง abort/stale-protect count query ได้');
assert.match(runtime, /renderLoading = true/, 'role guard ต้องรองรับการคง page skeleton ระหว่างตรวจสิทธิ์');
assert.match(admin, /M\.requestCount/, 'Dashboard ต้องใช้ metadata count query');
assert.match(admin, /dashboardCounts\(scope\.requestCount\)/, 'Dashboard count ต้องอยู่ใน page scope');
assert.doesNotMatch(admin, /select=id&status=neq\.สำเร็จแล้ว&limit=500/, 'Dashboard ห้ามดึง orders 500 row เพียงเพื่อ count');
assert.doesNotMatch(admin, /select=id&active=eq\.true&limit=500/, 'Dashboard ห้ามดึง stores 500 row เพียงเพื่อ count');
assert.doesNotMatch(admin, /select=id&status=eq\.พร้อมรับงาน&limit=500/, 'Dashboard ห้ามดึง riders 500 row เพียงเพื่อ count');
assert.match(admin, /renderLoading: false/, 'Admin shell ต้องคงอยู่ระหว่าง Auth/Role check โดยไม่ข้าม RLS');

console.log('admin MPA performance contract: PASS');
