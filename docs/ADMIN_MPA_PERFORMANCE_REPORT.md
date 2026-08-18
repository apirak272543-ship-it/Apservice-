# รายงานงานไฟล์ที่ 3 — Admin MPA Performance Audit และ Optimization

## ขอบเขตและหลักฐานก่อนแก้

การวัด production โดย Chromium CDP ในสถานะไม่มี session ครอบคลุม Dashboard, Orders, Stores, Riders, Customers, Finance, Settings และ Notifications ก่อนแก้ พบว่า document ทุกหน้ามีขนาดเล็กและเปลี่ยน document ได้ทันที แต่การอ่านโค้ด dashboard พบ bottleneck ที่พิสูจน์ได้: summary สี่ตัวใช้ `GET select=id&limit=500` แล้วนับ row ใน browser ทั้งที่ต้องการเพียงจำนวนเท่านั้น

Dashboard ยัง render Admin shell ก่อนเรียก `requireRole()` แล้ว แต่ role guard เขียนทับ page skeleton ด้วย loading state ระหว่างรอ `currentUser()` และ `rolesFor()` ทำให้ผู้ใช้ไม่เห็น skeleton เฉพาะหน้าที่ route สร้างไว้ แม้ยังไม่ได้เกิดการข้าม RLS หรือ authorization

| เส้นทาง | DCL ก่อน (ms) | Load ก่อน (ms) | Requests ก่อน |
|---|---:|---:|---:|
| Dashboard | 109.0 | 145.1 | 10 |
| Orders | 14.8 | 43.2 | 9 |
| Stores | 14.3 | 44.6 | 11 |
| Riders | 16.5 | 45.0 | 9 |
| Customers | 35.8 | 48.9 | 9 |
| Finance | 39.2 | 52.4 | 10 |
| Settings | 15.9 | 44.9 | 9 |
| Notifications | 16.3 | 44.7 | 9 |

> เมตริก document จาก CDN มีความแปรปรวนตามเครือข่าย จึงใช้เทียบกับ route และเงื่อนไขเดียวกัน ไม่อ้างว่าเวลาส่วนต่างทั้งหมดเกิดจากโค้ดเพียงอย่างเดียว

## Root Cause และสิ่งที่แก้ไข

Shared MPA runtime เพิ่ม `requestCount()` ซึ่งส่ง `HEAD` พร้อม `Prefer: count=exact` และอ่านค่า `Content-Range` จาก PostgREST แทนการดึง body ของ row เพื่อ count ฟังก์ชันนี้ใช้ cache TTL, in-flight deduplication, `AbortController`, page scope และ stale-response protection ชุดเดียวกับ request ปกติ

Admin Dashboard เปลี่ยนสี่ summary queries เป็น metadata count แบบ parallel โดยตัด `limit=500` ออกทั้งหมด จึงคงจำนวน request สรุปเดิมไว้สี่ request แต่ไม่ส่ง row bodies ไปที่ browser อีกต่อไป Background sync ยังคงรันทุก 30 วินาทีหลัง initial summary สำเร็จ และ Shared runtime หยุดงานเมื่อ page hidden หรือ pagehide

Role guard เพิ่ม option `renderLoading` และ Admin gate กำหนดเป็น `false` หลัง route สร้าง shell/page skeleton แล้ว จึงยังตรวจ `currentUser()` และ `rolesFor()` ก่อน query ข้อมูล privileged เหมือนเดิม แต่ไม่เขียนทับ UI skeleton ระหว่างรอ ผู้ที่ไม่มี session ยัง redirect ไป login และ RLS ยังเป็น security boundary ฝั่ง server

Admin MPA routes ทุกหน้าถูก cache-bust ไปยัง runtime/app version เดียวกันเพื่อป้องกัน browser ใช้ JavaScript รุ่นเก่าระหว่าง navigation

## Waterfall หลังแก้

| เส้นทาง | DCL หลัง (ms) | Load หลัง (ms) | Requests หลัง | ผลเทียบก่อน |
|---|---:|---:|---:|---|
| Dashboard | 95.4 | 96.9 | 10 | DCL ลด 13.6 ms; Load ลด 48.2 ms |
| Orders | 42.2 | 50.5 | 9 | ไม่มีการเปลี่ยน query หน้านี้; ค่า CDN รอบวัดสูงขึ้น |
| Stores | 48.1 | 56.3 | 11 | ไม่มีการเปลี่ยน query หน้านี้; ค่า CDN รอบวัดสูงขึ้น |
| Riders | 36.7 | 46.6 | 9 | ไม่มีการเปลี่ยน query หน้านี้; ใกล้เคียง baseline |
| Customers | 16.5 | 45.2 | 9 | DCL ลด 19.3 ms; Load ลด 3.7 ms |
| Finance | 41.6 | 52.0 | 10 | ใกล้เคียง baseline |
| Settings | 45.8 | 53.2 | 9 | ไม่มีการเปลี่ยน query หน้านี้; ค่า CDN รอบวัดสูงขึ้น |
| Notifications | 17.2 | 46.4 | 9 | ใกล้เคียง baseline |

การวัด Dashboard แบบไม่มี session ใช้สำหรับ document/waterfall เท่านั้น จึงไม่เรียก summary API ที่ต้องมี Admin token ข้อพิสูจน์ data-layer ของการแก้คือ query เปลี่ยนจาก GET ที่อาจส่ง 500 ID ต่อ counter เป็น HEAD metadata และตรวจ response header ของ Supabase จริงได้รูปแบบ `Content-Range: 0-0/1` ตาม parser ที่ใช้

## Slow Network และการทดสอบ regression

ทดสอบ `admin/index.html` แบบ cacheless ผ่าน Chromium CDP เพื่อไม่ใช้ session ปลอม พบ Admin login shell render ได้ทุก profile: Fast FCP 216 ms, Normal 4G 416 ms, Slow 4G 928 ms และ High Latency 1,888 ms หน้า login ไม่มี background data query และ mpa-shell ปรากฏในทุก profile

ผ่าน syntax check, contract test ใหม่ `admin_mpa_performance_contract_test.cjs` และ full AP Service contract suite ครบ รวมถึง Admin payment/notification/media, Customer, Merchant และ Rider contracts ไม่มีการเปลี่ยน database schema, policy, RLS หรือ legacy fallback `admin.html`

## ข้อจำกัดที่ยังต้องทดสอบด้วยบัญชี Admin จริง

สภาพแวดล้อมตรวจไม่มี session Admin ที่อนุญาตให้เปิดข้อมูลจริง จึงไม่ได้อ้างตัวเลข authenticated ของ `refreshSession()`, `rolesFor()` หรือ dashboard summary จาก user role จริง การทดสอบครั้งนี้ยืนยัน no-session redirect, shell responsiveness, query contract, RLS-preserving code path และ response count protocol แล้ว การตรวจรับขั้นสุดท้ายควรเปิด Admin ด้วยบัญชีผู้ดูแลหนึ่งครั้งและดูว่าตัวเลข summary ถูกต้องหลัง login

## ไฟล์และ Commit

ไฟล์หลักที่แก้คือ `shared/ap-service-mpa.js`, `admin/admin-app.js`, Admin MPA shells ทั้งหมด และ `tests/admin_mpa_performance_contract_test.cjs` Commit implementation คือ `c4e623e` (`perf(admin): use scoped metadata counts and preserve shell`)
