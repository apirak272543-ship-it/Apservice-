# รายงานส่งมอบ Admin Async Background Notification

## สรุปผล

ปรับระบบ Notification/งานค้างของ Admin ให้ทำงานอยู่เบื้องหลัง โดยไม่อยู่ใน critical path ของการเปลี่ยนเมนูหรือการ render หน้า Admin ระบบ notification ไม่ได้ถูกลบและยังคงตรวจงานค้างจาก Supabase ครบทั้ง payment slips, chats, Rider applications, settlements, withdrawals, errors, AI Workspace และ Creator queues

เมื่อเปิด Admin หรือคลิกเมนูย่อย ระบบจะอ่าน badge counts ล่าสุดจาก `localStorage` ก่อน แล้วแสดง badge ที่มีอยู่ทันที จากนั้นจึง schedule การ refresh เป็น asynchronous task หลัง DOM navigation/render เสร็จ หาก Supabase ช้าหรือล้มเหลว ระบบจะเก็บค่า cached badge เดิมไว้ ไม่ล้างเป็นศูนย์ และไม่ redirect หรือทำให้หน้า Admin ใช้งานไม่ได้

## ลำดับการทำงานใหม่

| ลำดับ | การทำงาน | อยู่ใน critical path ของ navigation หรือไม่ |
|---|---|---|
| 1 | รับ click และสร้าง navigation timing token | ใช่ แต่ใช้เวลาเพียงบันทึก timestamp |
| 2 | สลับ `.admin-section.active` และสร้าง subpage header | ใช่ |
| 3 | mark `renderAt` และ dispatch timing event | ใช่ แต่เป็นงาน synchronous ขนาดเล็ก |
| 4 | schedule badge refresh ด้วย `setTimeout` และ `Promise.resolve().then(...)` | ไม่ใช่ |
| 5 | เรียก Supabase count requests แบบ asynchronous | ไม่ใช่ |
| 6 | บันทึก counts ลง cache และ render badge ใหม่เมื่อข้อมูลกลับมา | ไม่ใช่ |

## จุดที่แก้ไข

ไฟล์หลักคือ `admin_contact_ui_patch.js` โดยเพิ่ม cache key `apcx_admin_pending_badges`, การอ่าน/เขียน cached counts, `getAdminPerformanceTiming()`, Performance marks/events, การ mark navigation ก่อน scheduling badge refresh และ fallback ที่คงค่าเดิมเมื่อ count request ล้มเหลว

`listCount()` ยังคงเรียก query เดิมทุกชุด จึงไม่ได้ลดความสามารถในการตรวจงานค้าง แต่เปลี่ยนจากการคืนค่า `0` เมื่อ request ล้มเหลวเป็นการคืนค่า `null` แล้วใช้ค่าก่อนหน้าจาก cache แทน เพื่อไม่ทำให้ badge หายไปชั่วคราวเมื่อระบบหลังบ้านหรือเครือข่ายมีปัญหา

Contract test ใน `tests/admin_pending_badges_contract_test.cjs` ถูกปรับให้ตรวจ cache, asynchronous scheduling, timing API, render-before-background และ fallback preservation ส่วนผล browser runtime ถูกบันทึกไว้ใน `tests/admin_async_browser_timing.md`

## ผล Performance Timing จาก Browser Runtime

ทดสอบบน local preview ด้วย mock Supabase count responses ที่หน่วงประมาณ 300 ms ต่อ request เพื่อจำลอง backend ช้าโดยไม่เรียกข้อมูลจริง ผลการวัดล่าสุดคือ click → section active/render ใช้ **1.6 ms** และ `renderAt` เกิดก่อน `badge-network-start` จริง โดยมีช่องว่างระหว่าง render กับการเริ่ม notification network ประมาณ **2,342.6 ms** ในรอบทดสอบนั้น

หลังจบ refresh หน้าเดิมยังคงเป็น `view-admin` และ section `admin-riders` พร้อม `refreshing: false` และ badge counts ยังคงอยู่ครบ จึงยืนยันได้ว่า notification network ไม่ได้ block การเปลี่ยนหน้า

## ผลทดสอบกรณี Supabase ล้มเหลว

จำลองให้ทุก badge request reject ด้วย timeout ผลคือหน้า Admin ยังคงอยู่ที่ `view-admin`, section เดิมยัง active, `refreshing` กลับเป็น `false`, ค่า cached `withdrawals: 7` และ `finance: 7` ไม่ถูกล้าง และ timing ระบุ `failed: true` โดยไม่มีการทำให้หน้าเว็บค้างหรือออกจาก Admin

## Tests

ผ่าน `node --check admin_contact_ui_patch.js`, `admin_pending_badges_contract_test.cjs`, `admin_performance_audit_contract_test.cjs`, `performance_optimization_contract_test.cjs`, `back_navigation_reliability_contract_test.cjs`, `admin_today_history_contract_test.cjs` และ `index_inline_syntax_check.mjs`

`modular_contract_check.mjs` ยังรายงาน failure เดิมเฉพาะการ import `modules/pages/admin/ai-workspace.js` ใน Node harness ที่ไม่มี `window` แม้ production browser runtime โหลดหน้าได้และส่วนตรวจอื่นผ่าน ปัญหานี้ไม่เกี่ยวกับการแก้ Async Notification รอบนี้และไม่ได้เปลี่ยน module ดังกล่าว

## Commit

`fa52f72` — `fix: move admin pending notifications off navigation path`
