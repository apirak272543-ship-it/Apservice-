const assert = require('assert');
const fs = require('fs');

const runtime = fs.readFileSync('shared/ap-service-mpa.js', 'utf8');
const admin = fs.readFileSync('admin/admin-app.js', 'utf8');
const navigationCss = fs.readFileSync('admin/admin-navigation.css', 'utf8');
const sharedCss = fs.readFileSync('shared/ap-service-mpa.css', 'utf8');

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
assert.match(admin, /renderLoading: false/, 'Admin shell ต้องคงอยู่ระหว่าง Auth\/Role check โดยไม่ข้าม RLS');
assert.match(admin, /admin-nav-more/, 'Admin ต้องมี More navigation สำหรับ mobile โดยไม่ซ่อน function ถาวร');
assert.match(admin, /admin-nav-icon/, 'Admin navigation ต้องใช้ SVG icon ของระบบแทน emoji');
assert.match(admin, /admin-quick-actions/, 'Dashboard ต้องมี quick actions ที่นำไปยัง MPA หน้าที่เกี่ยวข้อง');
assert.match(admin, /href="orders\.html"/, 'Quick action ต้องใช้ route จริง ไม่สร้าง logic ซ้ำใน dashboard');
assert.match(sharedCss, /\.mpa-topbar\{[^}]*position:sticky/, 'Navigation ต้องคงอยู่ด้านบนระหว่างใช้งาน');
assert.match(navigationCss, /:focus-visible/, 'Navigation ต้องมี visible keyboard focus');
assert.match(navigationCss, /@media\(max-width:760px\)/, 'Navigation ต้องมี mobile breakpoint');
assert.match(navigationCss, /admin-nav-more/, 'Navigation ต้องมี More menu สำหรับ mobile');
assert.match(navigationCss, /admin-nav-link:nth-child\(4\)/, 'Mobile ต้องเก็บ primary icon เท่าที่พอดีและย้ายที่เหลือไป More menu');

console.log('admin MPA performance contract: PASS');
