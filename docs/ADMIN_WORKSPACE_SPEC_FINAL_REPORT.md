# รายงานตรวจรับ — Admin UI/UX และ Multi-Page Navigation

## 1. Navigation Design และ Icon Mapping

Admin ใช้ top navigation แบบ fixed/sticky ที่มี AP Service brand, primary routes, More menu และทางเข้าตั้งค่าบัญชี ใช้ inline SVG ที่มีขนาด/spacing/state เดียวกัน ไม่ใช้ emoji เป็น production icon และมี short label, `title`, `aria-label`, active state และ visible keyboard focus

| Layer | Menu | Destination |
|---|---|---|
| Primary | ภาพรวม, ออร์เดอร์, ร้านค้า, ไรเดอร์, ลูกค้า | Admin MPA routes โดยตรง |
| Operations | การเงิน, แจ้งเตือน | `finance.html`, `notifications.html` |
| Content | โฆษณา | `promotions.html` พร้อม Shared Media upload |
| System | AI Workspace, ตั้งค่ากลาง | `ai-workspace.html`, `settings.html` |
| Legacy migration | ใบสมัครไรเดอร์, กระทบยอด, Support, Inventory, Content, Admins, Errors, Mapping | deep-link ไป section เดิมของ `admin.html` |

## 2. Page Structure และ Function Preservation

มี Admin MPA 10 หน้า: Dashboard, Orders, Stores, Riders, Customers, Finance, Notifications, Promotions, AI Workspace และ Settings แต่ละ route render shell ก่อนเรียก `requireRole('admin')` แล้วโหลด query ของหน้าตนเองเท่านั้น Dashboard แสดง summary/pending/quick actions โดยไม่ render รายละเอียดทุกระบบในหน้าเดียว

Legacy Admin ยังคงอยู่และเพิ่ม deep-link `admin.html?admin=<section>` เพื่อให้ More menu เปิด function legacy ที่เลือกจริง จึงไม่มี function เดิมถูกลบระหว่าง migration และ Browser Back กลับ MPA document เดิมตาม history มาตรฐาน

## 3. Background Data, Badge และ Performance

Badge ของ Orders, Finance และ Notifications แสดงค่าจาก `sessionStorage` ก่อน แล้วจึง refresh หลัง page shell render ผ่าน `setTimeout(0)`. การ refresh ใช้ Shared `requestCount`, cache key และ TTL 20 วินาที; ไม่ทำงานเมื่อ document hidden และความล้มเหลวคง cached badge ไว้โดยไม่ block route. Notifications data table โหลดเฉพาะเมื่อเปิด Notifications page

| Route / Test | Evidence |
|---|---|
| Dashboard count optimization | ใช้ HEAD + `Prefer: count=exact`; ไม่ดึง 500 records ต่อ card |
| Production dashboard baseline หลัง optimization | DCL 95.4 ms, Load 96.9 ms ในรอบวัดเดิม (ก่อนแก้ count: 109.0 / 145.1 ms) |
| Workspace v2 Dashboard smoke | DCL 58.3 ms, Load 64.4 ms, 11 network requests ใน environment รอบตรวจล่าสุด |
| Workspace v2 Orders smoke | DCL 129.9 ms, Load 131.7 ms, 12 network requests; เป็น cold CDN round และไม่ใช่ compare แบบ controlled กับ baseline |

> ตัวเลข cold/CDN มีความแปรปรวน จึงใช้ยืนยันว่า navigation asset ใหม่ไม่สร้าง blocking failure ไม่อ้างว่า Orders เร็วขึ้นจากรอบเดียว

## 4. Mobile, Desktop, Security และ Regression

Desktop แสดง 5 primary navigation items ส่วน Mobile เหลือ icon หลักที่พอดีแล้วเปิดทุก function ที่เหลือผ่าน More menu; CSS มี focus, active, hover, responsive popover และ touch-friendly height. Production ตรวจว่า Admin MPA 10 routes ทั้งหมดโหลด `admin-navigation.css?v=admin-nav-v2` และ `admin-app.js?v=admin-workspace-v2`; legacy deep-link asset โหลดได้จริง

ผ่าน full AP Service contract suite รวม Admin business rules, image cap, mobile layout, MPA performance, payment slip, pending badge, standalone shell, back navigation, shared request lifecycle, Central Media, Customer, Merchant และ Rider. ไม่มี schema/RLS/security policy เปลี่ยนในงานนี้ และ navigation ไม่ใช้เป็น security boundary

## 5. สิ่งที่ยังต้องทำด้วยสิทธิ์ Admin จริง

การตรวจนี้ไม่ได้ใช้บัญชี Admin ปลอมหรือ bypass RLS จึงไม่ได้ submit CRUD production เช่น approve slip, update order, upload promotion หรือ save business rules. หลัง user login ด้วยบัญชี Admin ควรตรวจรับ 1 รอบตาม flow `click → route → data → action → save → back`; route/data contract และ policy-preserving code path ผ่านแล้ว

## 6. Files และ Commit

ไฟล์สำคัญ: `admin/admin-app.js`, `admin/admin-navigation.css`, Admin MPA shells 10 หน้า, `admin-legacy-deeplink.js`, `admin.html`, `tests/admin_mpa_performance_contract_test.cjs`. Commit: `7a2b4b0` (`feat(admin): complete workspace navigation specification`).
