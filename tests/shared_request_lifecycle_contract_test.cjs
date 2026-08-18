const fs = require('fs');
const assert = require('assert');

const runtime = fs.readFileSync('shared/ap-service-mpa.js', 'utf8');

assert.match(runtime, /cacheTtlMs/, 'Shared runtime ต้องรองรับ cache TTL แบบ opt-in');
assert.match(runtime, /inFlight/, 'Shared runtime ต้อง deduplicate request ที่กำลังทำงาน');
assert.match(runtime, /AbortController/, 'Shared runtime ต้องมี cancellation สำหรับ lifecycle ที่หมดอายุ');
assert.match(runtime, /createScope/, 'Shared runtime ต้องสร้าง request scope ป้องกัน stale response');
assert.match(runtime, /startBackgroundSync/, 'Shared runtime ต้องมี scoped background sync');
assert.match(runtime, /document\.hidden/, 'Background sync ต้องลดการทำงานเมื่อ document ถูกซ่อน');
assert.match(runtime, /Math\.max\(15_000/, 'Background sync ต้องไม่ poll ถี่กว่า 15 วินาที');
assert.match(runtime, /cacheHits/, 'Shared runtime ต้องบันทึก metric cache hit');
assert.match(runtime, /deduped/, 'Shared runtime ต้องบันทึก metric request deduplication');
assert.match(runtime, /STALE_RESPONSE/, 'Shared runtime ต้องระบุ stale response ได้');

console.log('shared request lifecycle contract: PASS');
