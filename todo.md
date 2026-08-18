# AP Service Project TODO

- [x] Modular Architecture Refactor & Legacy Bridge
- [x] Sanitized LocalStorage Cache for Large Base64 Images
- [x] Admin-only AI Collaboration Workspace Schema & UI
- [x] Global Floating Cart (FAB) with Empty State & Popup
- [x] Mobile UX/UI Redesign for Admin & Compact Spacing
- [x] Supermarket Dedicated Category & Automated Distance Calculation
- [x] JWT Auto-Refresh Safeguard for Rider/Store Background Polling
- [x] Login Geolocation Onboarding & Rating/Proximity Store Sorting
- [x] Customer Spacing Cascade Fixes & Store Routing Reset to 'all'
- [x] End-to-End Contract Tests & CDP Layout Audits Verified
- [x] Add QR image download and customer-selected bank app navigation beneath the existing platform QR in checkout summary
- [x] Replace bank app picker with transfer-slip upload and provisional verification status in checkout summary
- [ ] Connect a trusted transaction-verification provider before allowing automatic payment approval and order confirmation
- [x] Create payment-pending orders after preliminary slip validation and surface them in an Admin verification queue
- [ ] Validate slip amount, date, time, recipient, and transaction reference with a trusted provider before automatic approval

- [x] Re-group Admin navigation into four user-approved work categories
- [x] Move payment-slip verification into งานและออร์เดอร์ and separate incoming, in-progress, completed order views
- [x] Move customer chat, admin management, store/menu management, rider management, rider applications, and AI Workspace into บัญชีและโปรไฟล์
- [x] Keep cash closing and settlement cycles together under เงินสดและรายการจ่ายเงิน
- [x] Group website/media, platform settings, data storage/mapping, and error center under ตั้งค่าเว็บไซต์และสื่อ
- [x] Add mobile next-page navigation so Admin menu items do not expand content downward
- [x] Add missing Admin menu shortcuts for withdrawal requests, rider income, order status views, and store menu management
- [x] Verify Admin navigation grouping and mobile layout with browser/CDP tests
- [x] Commit and publish the Admin navigation redesign to GitHub Pages
- [x] Define persistent pending-work badge rules for all Admin menu functions
- [x] Add red count badges for pending orders, payment slips, chats, Rider applications, payouts, withdrawals, and error cases
- [x] Refresh Admin badge counts when queue data or task statuses change
- [x] Test that badges remain until actual action resolves the underlying task
- [x] Commit and publish Admin pending-work badge system to GitHub Pages
- [x] Diagnose Admin withdrawal-payment flow that exits the page or loses session after slip confirmation
- [x] Preserve Admin session and Finance subpage context while uploading withdrawal-payment proof
- [x] Persist withdrawal proof, payment reference, and paid status so Rider can view payout confirmation
- [x] Add regression tests for withdrawal payment completion, upload failure recovery, and session continuity
- [x] Commit and publish withdrawal-payment flow reliability fix to GitHub Pages
- [x] Identify and eliminate Android Chrome crash risks in withdrawal-proof image handling and payment completion
- [x] Add Android-safe image-size, memory, and error-recovery guards for payout proof uploads

- [x] Design Creator Affiliate structure under Admin บัญชีและโปรไฟล์
- [x] Add Creator profile, approval status, contact, area, platform, and payout settings
- [x] Add unique referral code and referral link management with campaign attribution
- [x] Track creator clicks, referred customers, qualified orders, cancellations, and net commissionable sales
- [x] Add content-rights records for creator videos, usage channels, approval, expiry, and source links
- [x] Add Creator performance dashboard and commission ledger without hardcoding financial results
- [x] Add Creator Affiliate pending-work badges and settlement workflow
- [x] Add mobile next-page Creator Affiliate Admin navigation and tests
- [x] Commit and publish Creator Affiliate Admin structure to GitHub Pages

## Creator Referral Link UX Update

- [x] สร้างลิงก์ Referral อัตโนมัติทันทีหลังสร้างแคมเปญ
- [x] แสดงคอลัมน์รหัส Referral และลิงก์พร้อมใช้ในตารางแคมเปญ
- [x] เพิ่มปุ่มคัดลอกรหัส คัดลอกลิงก์ และแชร์ลิงก์ให้ Creator
- [x] เพิ่มข้อความอธิบายวิธีส่งลิงก์ให้ Creator และวิธีที่ลูกค้าใช้งาน
- [x] เพิ่ม contract test สำหรับลิงก์ Referral อัตโนมัติและปุ่มคัดลอก
- [x] Commit และเผยแพร่การปรับปรุงลิงก์ Referral ขึ้น GitHub Pages

## Creator Affiliate Admin Structure

- [x] ตรวจ flow ปัจจุบันของการสร้างแคมเปญและ Referral
- [x] ปรับหน้า Admin ให้แสดงรหัส ลิงก์ และปุ่มคัดลอกหรือแชร์พร้อมใช้
- [x] ทดสอบ flow และเผยแพร่การแก้ไขขึ้น GitHub Pages

## Creator Affiliate Save Error Fix

- [x] ตรวจเส้นทางการบันทึก Creator แคมเปญ และสิทธิ์คอนเทนต์ที่เรียก reset ฟอร์ม
- [x] แก้ Cannot read properties of null หลังบันทึก และคงข้อมูลที่บันทึกสำเร็จไว้
- [x] เพิ่ม regression test สำหรับการ reset ฟอร์มที่มีหรือไม่มี element
- [x] ทดสอบและเผยแพร่บั๊กฟิกขึ้น GitHub Pages

## Referral Guest Login Gate Fix

- [x] ตรวจ flow ผู้เยี่ยมชมจาก Referral ตั้งแต่หน้าร้าน ตะกร้า และ Checkout
- [x] บังคับเข้าสู่ระบบก่อนเพิ่มสินค้า เปิดตะกร้า หรือเปิด Checkout
- [x] รักษาการเปิดดูร้านและการเก็บ Referral สำหรับผู้เยี่ยมชมโดยไม่ล็อกอิน
- [x] เพิ่ม regression test สำหรับ guest และ signed-in flows
- [x] ทดสอบและเผยแพร่บั๊กฟิกขึ้น GitHub Pages

## Header Logo Replacement

- [x] ตรวจตำแหน่งและขนาดโลโก้หัวเว็บบนมือถือ
- [x] นำโลโก้ AP Service ที่ผู้ใช้ส่งมาใช้แทนสัญลักษณ์สีเขียว
- [x] ตรวจการแสดงผลหัวเว็บบนมือถือและเผยแพร่โลโก้ใหม่

## Login Logo Placement Correction

- [x] คืนโลโก้หัวเว็บให้แสดงตามค่าที่ Admin ตั้งไว้
- [ ] ใช้โลโก้ AP Service ที่ผู้ใช้ส่งมาเฉพาะเหนือหัวข้อเข้าสู่ระบบ
- [x] ตรวจหน้าหัวเว็บและหน้าล็อกอินบนมือถือ พร้อมเผยแพร่

## Dynamic Login Brand Logo

- [x] คืนหัวเว็บให้ใช้ค่าโลโก้จากการตั้งค่า Admin โดยไม่มีการบังคับภาพ
- [x] เชื่อมโลโก้เหนือคำว่าเข้าสู่ระบบกับภาพเดียวกับการตั้งค่า Admin
- [x] เพิ่ม regression test และเผยแพร่การตั้งค่าโลโก้แบบ dynamic

## Unified Admin Brand Logo Fix

- [x] ตรวจค่า URL โลโก้ที่ Admin บันทึกจริงและสาเหตุภาพหน้าล็อกอินว่าง
- [x] ใช้ตัวจัดการโลโก้กลางกับหัวเว็บ หน้าแรก และหน้าล็อกอิน
- [x] เพิ่ม fallback เมื่อ URL โลโก้โหลดไม่สำเร็จ พร้อมทดสอบและเผยแพร่

## Creator Affiliate Customer Page Freeze Fix

- [x] แยกการโหลด Creator Affiliate หลังบ้านออกจากหน้าลูกค้า
- [x] ป้องกัน session หมดอายุของ Admin ไม่ให้สร้าง error overlay ค้างบนหน้าเว็บ
- [x] เพิ่ม regression test หน้าแรกเมื่อ Affiliate โหลดไม่สำเร็จ และเผยแพร่บั๊กฟิก

## Brand Logo Image Loading Regression Fix

- [x] ตรวจ request โลโก้ Admin ที่อาจบล็อกการโหลดหน้าเว็บและ Storage assets
- [x] แยกการโหลดโลโก้แบบไม่บล็อกหน้าเว็บและคืนการแสดงภาพร้าน/โฆษณา
- [x] เพิ่ม regression test การโหลดภาพและกดเมนูโดยไม่ค้าง พร้อมทดสอบและเผยแพร่

## Withdrawal Proof Viewer Reliability Fix

- [x] ตรวจปุ่มดูหลักฐานคำร้องถอนเงินและ URL Private Storage ที่ทำให้เบราว์เซอร์เปลี่ยนหน้า
- [x] แสดงหลักฐานการโอนใน modal ภายในเว็บโดยไม่เปิดแท็บหรือแอปภายนอก
- [x] เพิ่ม regression test สำหรับปุ่มดูหลักฐานของคำร้องถอนเงินและรายการจ่ายเงิน
- [x] ทดสอบและเผยแพร่บั๊กฟิกการเปิดหลักฐานการโอน

## Admin Image Quality and Stability Audit

- [x] สำรวจทุกจุดอัปโหลดรูปใน Admin และจัดรายการตามประเภทข้อมูลกับที่จัดเก็บ
- [x] ระบุจุดที่เก็บ Base64 หรือส่งภาพเต็มโดยไม่มีขีดจำกัดขนาด
- [x] กำหนดมาตรฐานจัดเก็บใหม่ตามข้อกำหนดล่าสุด: ไม่มีภาพ Base64 เกิน 1 MB
- [x] เพิ่ม validation และการสร้างไฟล์แสดงผลให้ไม่เกินเพดานข้อมูล
- [x] ทดสอบคุณภาพ ความเร็ว และเผยแพร่การปรับปรุง

### Requirement Update: 1 MB Hard Cap

- [x] บังคับให้รูปทุกประเภทที่อัปโหลดจาก Admin ถูกบีบอัดจนไม่เกิน 1 MB ก่อนบันทึก
- [x] แสดงขนาดหลังบีบอัดและปฏิเสธไฟล์ที่ลดขนาดไม่สำเร็จ
- [x] ป้องกัน fallback การอ่านไฟล์เต็มที่อาจเก็บเกิน 1 MB

## Admin Today and History Workspace

- [x] สำรวจทุกหน้าหลังบ้านที่ปนงานปัจจุบันกับข้อมูลย้อนหลัง
- [x] กำหนดเกณฑ์งานวันนี้ งานค้าง และประวัติสำหรับออร์เดอร์ สลิป ถอนเงิน รอบจ่ายเงิน และ Creator
- [x] เพิ่มตัวกรองงานวันนี้/งานค้าง/ประวัติย้อนหลังในแต่ละหมวดที่เกี่ยวข้อง
- [x] ทำให้ป้าย Admin นับเฉพาะงานที่ยังต้องดำเนินการ ไม่รวมประวัติ
- [x] เพิ่ม contract tests สำหรับการคัดกรองตามวันและ regression ของข้อมูลเก่า
- [x] ทดสอบและเผยแพร่ Admin Today and History Workspace

## Back Navigation Reliability Fix

- [x] ตรวจเส้นทางปุ่มกลับหน้าก่อนหน้าและกลับเมนู Admin ที่ทำให้ Android Chrome ค้าง
- [x] จำกัดการบันทึก draft ระหว่างนำทางให้ไม่อ่านค่า Admin หรือข้อมูลขนาดใหญ่
- [x] ป้องกันการกดกลับซ้ำ ล้างสถานะเมนูย่อย Admin และปิด smooth scroll ระหว่างย้อนกลับ
- [x] เพิ่ม contract test และทดสอบการกลับหน้าจาก Admin โดยไม่มี JavaScript error

## Full Admin Functionality and Mobile Layout Audit

- [x] จัดทำบัญชีเมนู Admin ทุกกลุ่ม พร้อมเกณฑ์เปิดหน้า กลับหน้า แสดงข้อมูล และปุ่มดำเนินการ
- [x] ทดสอบการเปิดและกลับเมนูของทุกหน้าหลังบ้าน รวมถึงการทำงานเมื่อข้อมูลว่างหรือโหลดไม่สำเร็จ
- [x] ตรวจปุ่ม ฟอร์ม อัปโหลดรูป ตำแหน่ง และการแสดงตารางของทุกเมนูบนมือถือ
- [x] แก้ปัญหาหน้าว่าง เนื้อหาถูกตัด การค้าง และ callback ที่ผิดพลาดที่พบจากการตรวจจริง
- [x] เพิ่ม regression tests ครอบคลุมเส้นทางเมนู Admin ทุกกลุ่ม
- [x] ทดสอบรอบสุดท้ายและเผยแพร่รายงานผลการตรวจ Admin ครบทุกเมนู

## Performance and Speed Optimization (Slowly/Lag Investigation)
- [x] วัดเวลาในการโหลดหน้าแรก การสลับแท็บ และการเปิดเมนู Admin
- [x] ตรวจสอบว่ามี Network Requests ซ้ำซ้อน, การดึงข้อมูล Supabase ขนาดใหญ่, หรือการเรนเดอร์ DOM หนักเกินไปหรือไม่
- [x] ตรวจสอบขนาดรูปภาพและตัวประมวลผลสคริปต์ที่ทำให้เกิดอาการหน่วง (Slowly)
- [x] ปรับปรุงการแคชข้อมูล ลดการดึงข้อมูลซ้ำ และเพิ่มความเร็วในการตอบสนองของหน้าเว็บ
- [ ] ทดสอบความเร็วหลังปรับปรุงและเผยแพร่ผล

## Store Carousel & Icon/Background Redesign
- [x] สำรวจฟังก์ชันการแสดงร้านค้าและการจัดการร้านใน Admin
- [x] ออกแบบคารูเซลสไลด์แนวนอนซ้าย–ขวา พร้อมระบบ lazy-load ภาพล่วงหน้าเฉพาะคิวที่ 2
- [x] เพิ่มฟอร์มและโมเดลข้อมูลร้านให้รองรับไอคอนร้านและภาพพื้นหลัง (Background) แบบบีบอัด
- [x] ทดสอบการสไลด์ การโหลดภาพตามคิว และการบันทึกข้อมูลร้านในหลังบ้าน
- [ ] เผยแพร่การปรับปรุงขึ้น GitHub Pages และสรุปผล

## AI Collaboration Workspace: Admin Performance Audit (ChatGPT Task)
- [x] อ่านรายละเอียดงาน “แก้ Admin โหลดช้า / Performance Audit” และ Task “แก้ Performance หน้า Admin” จาก Workspace
- [x] ตรวจโค้ดและวัดสาเหตุความช้า (Network/data loading, Supabase queries, localStorage serialization, polling, duplicate requests, lazy loading)
- [x] แก้ไขปัญหา performance โดยคงฟังก์ชัน Admin เดิมอย่างครบถ้วน
- [x] ทดสอบความเร็วและเปรียบเทียบผลลัพธ์
- [x] บันทึก Commit SHA และรายงานผลกลับเข้า AI Collaboration Workspace

- [x] กู้คืนรูปภาพและองค์ประกอบภาพใน UI ที่ถูกตัดออกจากการปรับแต่ง Performance ให้กลับมาครบถ้วนโดยใช้การบีบอัดภาพ (Compressed Images) แทนการลบ
- [x] ตรวจสอบการแสดงผลร้านค้า คารูเซล ไอคอน และภาพพื้นหลังให้มีความสวยงาม ไม่จืดชืด และคงฟังก์ชันเดิมครบถ้วน
- [x] ทดสอบ UI และสร้าง commit ส่งมอบใหม่

## Admin Navigation Delay Audit & Options Analysis (User Request)
- [x] วัดเส้นทางจริง click-to-ready ของ Admin navigation (คลิกเมนู → DOM view switch → render → network → data ready)
- [x] ตรวจสถาปัตยกรรมปัจจุบันว่า Admin เป็น SPA/DOM view switching หรือมี route แยกกันอย่างไร
- [x] วิเคราะห์สาเหตุที่ทำให้ Admin ช้าประมาณ 5 วินาทีหลัง Performance Patch โดยไม่แก้แบบเดาสุ่ม
- [x] เสนอทางเลือก A (ปรับ SPA เดิม) และ B (Hybrid Admin) พร้อมเปรียบเทียบข้อดีข้อเสีย

## Admin Async Background Notification & Performance Timing (User Request)
- [x] แยก AdminPendingBadges ให้อ่านจาก Cached Data ทันทีและรัน `refresh()` แบบ Asynchronous ใน Background โดยไม่ block navigation/render
- [x] ป้องกันไม่ให้ Supabase count requests ขัดขวางหรือชะลอการสลับหน้า Admin
- [x] เพิ่ม Performance Timing log (click → navigation/render vs network request) เพื่อพิสูจน์ว่า navigation ไม่ถูก block
- [x] ทดสอบความทนทาน (Fallback & Resilience) เมื่อ Supabase ช้าหรือล้มเหลว หน้า Admin ยังใช้งานได้ปกติ

## AI Collaboration Workspace: Round 2 Root Cause Audit Task
- [x] ค้นหาและตรวจสอบ Task “ตรวจ Root Cause Admin Navigation Delay รอบ 2” ใน AI Workspace
- [x] ยืนยัน Root Cause ทางเทคนิค (การเรียก Supabase badge count requests พร้อมกัน 10 คำขอใน critical path ก่อนที่ DOM render จะเสร็จสมบูรณ์)
- [x] ตรวจสอบไฟล์ที่แก้ไข (`admin_contact_ui_patch.js`, `tests/admin_pending_badges_contract_test.cjs`) และ Commit SHA (`66bd3ee`)
- [x] อัปเดต Task ใน AI Workspace เป็น completed พร้อมโพสต์รายงาน Root Cause ผลทดสอบก่อน/หลัง และ Commit SHA

## AI Workspace GPT Directives Compliance Task
- [x] ดึงข้อมูล threads, tasks และ messages ล่าสุดทั้งหมดจาก AI Collaboration Workspace ผ่าน Supabase MCP
- [x] ตรวจสอบข้อเสนอแนะและข้อกำหนดเชิงลึกของ GPT (เช่น deduplication ของ requests, การเลือก select fields เฉพาะที่จำเป็น, การลด serialization ซ้ำซ้อน และการรักษาสัญญา legacy contract)
- [x] ตรวจสอบโค้ดปัจจุบันใน `admin_contact_ui_patch.js`, `performance_optimization_patch.js` และโมดูลที่เกี่ยวข้องเทียบกับข้อกำหนดของ GPT
- [x] ยืนยันว่าการทำงานสอดคล้องกับรายงานของ GPT ทุกประการ และรายงานผลกลับเข้า AI Workspace อย่างสมบูรณ์

## AI Workspace GPT Migration Plan Task
- [x] อ่านข้อความและข้อกำหนดของ ChatGPT ใน AI Workspace (Thread: วางแผน + เตรียม Migration แยก Admin Application แบบ Zero/Low-Risk)
- [x] ดำเนินการตามข้อกำหนดทั้ง 9 Phase (Safety baseline, Audit entry points/modules/patches/assets/shared dependencies, Auth/RLS/Supabase/localStorage, Architecture evaluation, Migration/Rollback plan, Performance/Regression test, และ Workspace reporting)
- [x] จัดทำรายงาน Audit และ Migration Plan แบบ Zero/Low-Risk โดยไม่ทำลายฟังก์ชันเดิมของ Customer, Merchant หรือ Rider
- [x] อัปเดตสถานะ Task ใน AI Workspace เป็น completed และบันทึกผลงานลงใน Supabase พร้อมส่งมอบรายงานให้ผู้ใช้

## AI Workspace Zero/Low-Risk Admin Standalone Migration Execution Task
- [x] ยืนยัน Baseline, Git status, และเตรียม Rollback Point
- [x] สร้างโครงสร้าง Admin Standalone Shell ควบคู่แบบ Feature Flag โดยไม่ลบ Admin เดิม
- [x] เชื่อมต่อ Shared Core (Storage, Supabase Client, Auth, RLS) และแยก Admin Bundle
- [x] รันการทดสอบครบทุก Acceptance Criteria (Auth, Performance, Navigation, Media, Regression)
- [x] ทำ Staged Rollout Readiness และอัปเดต AI Workspace พร้อมรายงานผลสมบูรณ์

## Standalone Admin Public Link Verification
- [x] ตรวจ runtime ของ admin-standalone.html และสาเหตุที่ GitHub Pages ยังตอบ 404
- [x] แก้เฉพาะจุดที่จำเป็นและเพิ่ม regression check สำหรับ public entry
- [x] commit/push ไฟล์ Standalone Admin และตรวจ URL จริงบน GitHub Pages

## AI Workspace Latest GPT Task Tracking
- [x] ดึงข้อมูล Task และ Messages ล่าสุดทั้งหมดจาก AI Workspace ผ่าน Supabase MCP
- [x] ตรวจสอบหัวข้อและข้อกำหนดใหม่จาก GPT ทันที
- [x] ดำเนินการตามข้อกำหนด ทดสอบ และรายงานผลกลับ Workspace อย่างครบถ้วน

## AI Workspace Comprehensive Admin Redesign Execution Task
- [x] ดึง Task และข้อความล่าสุดจาก AI Workspace เพื่อยืนยัน Acceptance Criteria ทั้งหมด
- [x] ตรวจสอบระบบเดิม, ตรวจความเสี่ยงของ Dependency, และรักษาระบบ Admin เดิมไว้เป็น Fallback
- [x] ออกแบบและพัฒนา Admin ใหม่ (Mobile-first & Desktop Sidebar) พร้อมฟังก์ชันครบถ้วน, Search, Quick Actions, States และ Confirmations
- [x] ตรวจสอบ Supabase Auth + RLS, Notification/Badge, Upload + 1MB Compression, และ Customer/Merchant/Rider Regression
- [x] ทดสอบ Responsive และ Performance ก่อน/หลัง พร้อมทำ Final Report + Commit SHA ลง AI Workspace

## Two-App Architecture Separation: Customer App vs Admin App
- [x] แยกโครงสร้างไฟล์และ entry point เป็นสองแอปเด็ดขาด (Customer Monolith `index.html` และ Admin Standalone App `admin.html`)
- [x] แชร์ Supabase connection, Auth, RLS และ Core Storage โดยไม่มีการสร้างฐานข้อมูลใหม่
- [x] ตัด Admin bundles และ modules ทั้งหมดออกจาก Customer App เพื่อลด Initial Load และ Bundle Size
- [x] กำหนด Auth Guard และ Supabase Session/Role verification ที่เข้มงวดใน Admin App
- [x] ทดสอบสองแอปแยกกันและยืนยันว่า Customer, Merchant, Rider และ Admin ทำงานได้ปกติ พร้อม deploy และรายงานผล

## Dedicated Admin App Functional Parity Recovery
- [x] ตรวจ DOM/runtime contract ที่ทำให้ Dedicated Admin App เป็นเพียง shell และไม่มีฟังก์ชันจริง
- [x] นำ Admin views, forms, dynamic sections และ event handlers ของระบบเดิมมาใช้งานใน Dedicated Admin App ครบทุกหมวด
- [x] รักษา Supabase/Auth/RLS/Storage เดิมและห้ามนำ Customer UI หรือ flow มาปะปนใน Dedicated Admin App
- [x] ทดสอบ Admin functions, navigation, notification, upload และ fallback กับ Monolith Admin ก่อนเผยแพร่

## Dedicated Admin Login and Dashboard Entry
- [x] ทำหน้า Admin Login เป็นหน้าแรกของ Dedicated Admin App โดยใช้ Supabase Auth เดิม
- [x] route แอดมินที่ผ่านสิทธิ์เข้าสู่ Dashboard/ศูนย์ควบคุมและงานค้างทันที
- [x] ซ่อนปุ่มและเส้นทาง Customer ออกจาก Dedicated Admin App พร้อมคง Customer App เดิมไม่เปลี่ยนแปลง
- [x] ทดสอบ Admin login, auth guard, dashboard entry และหน้าจอมือถือก่อนเผยแพร่

## Full Application Separation Master Task
- [ ] ค้นหาและอ่าน AP-Service-Full-Application-Separation-Master-Task.md
- [ ] ค้นหาเอกสารและข้อความ Master Task จาก AI Collaboration Workspace
- [ ] แปลงข้อกำหนดเป็น acceptance criteria และตรวจ gap ของ Customer/Admin Apps ปัจจุบัน
- [ ] ดำเนินการตาม Master Task พร้อมทดสอบและ rollback plan

## Four-Client Application Separation Master Task
- [ ] ทำ Safety baseline, rollback point และ audit Supabase/Auth/RLS/Storage/Legacy โดยไม่ลบข้อมูลหรือ schema
- [ ] สร้าง dependency map และ ARCHITECTURE_CONTRACT.md สำหรับ Customer/Admin/Merchant/Rider + Shared Core/Services
- [ ] สร้าง Data Contracts และ Central Business Rules สำหรับ order, payment, delivery, roles, media และ notification
- [ ] แยก Customer, Admin, Merchant และ Rider Applications พร้อม entry points, role guards และ shared backend เดิม
- [ ] ตรวจ Notification, Media Compression, Performance, Responsive, Deep Link และ shared contracts ทุก Client
- [ ] ทดสอบ Security/RLS/Unauthorized/Regression/Runtime ครบทุก role และคง Monolith เป็น fallback
- [ ] ทำ staged deployment, Final Report, rollback procedure และ Commit SHA ใน AI Workspace

## Multi-Page Architecture and Control Plane Requirement
- [ ] เปลี่ยน Master Task และ Architecture Contract ให้บังคับ Multi-Page Architecture สำหรับทุก Client Application
- [ ] สร้าง page/route manifest ที่กำหนด JS/CSS/Data/Service เฉพาะหน้าสำหรับ Customer, Admin, Merchant และ Rider
- [ ] หยุดแนวทาง copy `index.html` เพื่อสร้าง SPA/Monolith ใหม่ และใช้ shared components/core โดยไม่ทำ logic ซ้ำ
- [ ] ทำ Admin เป็น Control Plane ของ central business configuration โดยบังคับกฎด้านความปลอดภัยและการเงินผ่าน Server/RLS
- [ ] แยกและ reconcile state machine ของ Food Delivery กับ AP Ride ก่อนใช้ database trigger บังคับ lifecycle กลาง

## Image Upload, Compression and Storage Functional Audit
- [ ] สร้าง inventory เส้นทางเลือกภาพ → ตรวจไฟล์ → resize/compress → Blob/File → Storage upload → URL/path → Database → render ของ Customer/Admin/Merchant/Rider
- [ ] หา root cause อาการกรอบรูปแสดงแต่รูปจริงไม่สำเร็จจาก implementation เดิม โดยห้ามรื้อระบบหรือเดาสุ่ม
- [ ] ตรวจ MIME type, Blob/File integrity, JPEG/PNG/WebP conversion, canvas result, bucket/path, Storage RLS, database record และ URL อายุสั้น
- [ ] กำหนด Shared Media Service contract ที่บีบอัดรูปไม่เกิน 1 MB และแยก preview URL ออกจาก Storage URL ที่บันทึกถาวร
- [ ] ผ่าน end-to-end matrix: JPEG, PNG, WebP, รูปใหญ่หลัง compress, Android และ Desktop ก่อนถือว่า MPA migration เสร็จ
- [ ] บังคับให้ทุกฟังก์ชันที่รับ อัปโหลด แก้ไข หรือสร้างรูปภาพในอนาคตเรียก Shared Media Service ก่อนบันทึก และเพิ่ม regression test ตามชนิดของ image flow
- [ ] ทำเครื่องหมาย milestone ว่าเสร็จเมื่อ implementation และ tests ผ่านจริงแล้ว commit/push ขึ้น GitHub Pages ให้ผู้ใช้ตรวจ โดยคงของเก่าเป็น fallback จนกว่าจะได้รับคำสั่งใหม่

## Four Live MPA Applications Acceptance Gate
- [x] Customer MPA: เปิดร้าน ดูเมนู จัดการตะกร้า ส่ง checkout และดูออร์เดอร์ของบัญชีที่ล็อกอินได้จริง
- [x] Admin MPA: login/role guard, dashboard, orders, stores, riders, finance และ settings โหลดข้อมูลจริงเฉพาะหน้าที่เกี่ยวข้อง
- [x] Merchant MPA: login/role guard, dashboard, orders, menu, store profile และ finance ใช้งานผ่าน routes แยกได้จริง
- [x] Rider MPA: login/role guard, dashboard, jobs, delivery, earnings และ profile ใช้งานผ่าน routes แยกได้จริง
- [x] ทุก route แสดง loading/error ภาษาไทย, ไม่รอ network ก่อนเปลี่ยน document, ใช้ Shared Core/Services และไม่ import runtime ของบทบาทอื่น
- [ ] รัน live route/auth/RLS/media/performance regression แล้ว commit/push ก่อนส่งลิงก์ 4 แอปให้ผู้ใช้ตรวจ

## Four-Application Production Audit
- [ ] ตรวจ production HTTP status, redirect, script/CSS assets และ runtime syntax ของทุก Customer/Admin/Merchant/Rider route
- [ ] ตรวจ public data loading, no-session behavior, role guard และ Thai error/loading states ของทุกหน้า
- [ ] ตรวจ console/runtime errors และ Supabase request contracts โดยไม่แก้จากการคาดเดา
- [ ] แก้เฉพาะข้อผิดพลาดที่พิสูจน์ได้ เพิ่ม regression test และเผยแพร่ผลแก้ไขให้ตรวจซ้ำ

## End-to-End Functional Acceptance Matrix
- [ ] สร้าง matrix ของทุกปุ่ม ฟอร์ม upload/download, navigation, modal, data read/write และ role workflow ใน Customer/Admin/Merchant/Rider
- [ ] ตรวจทุกปุ่มและ action: บันทึก เพิ่ม แก้ไข ลบ เปิดรายละเอียด กลับหน้า ยืนยัน ยกเลิก รีเฟรช อัปโหลด ดาวน์โหลด คัดลอกลิงก์ และแจ้งเตือน ว่ามีผลลัพธ์หรือ error state ภาษาไทยที่ถูกต้อง
- [ ] วัด click-to-document, data load และ media processing เพื่อแก้เฉพาะ latency ที่เกินความจำเป็น
- [x] เพิ่มแถบ progress สีเขียวและข้อความขั้นตอน โดยใช้ความคืบหน้าที่วัดได้จริงของงาน data/media และไม่แสดงเปอร์เซ็นต์เทียม
- [ ] กำหนด P0/P1/P2/P3 data priority, non-blocking navigation, request deduplication, cache refresh และ stale-response protection สำหรับ Shared MPA runtime
- [ ] ทำ scoped background sync/realtime ตามบทบาทโดยไม่ poll ทุกตาราง, ไม่ reset UI และไม่สร้าง duplicate request/request storm
- [ ] วัด network waterfall, request count/duplicate, navigation timing และ first render บน mobile/desktop ก่อน report ว่าผ่าน performance acceptance
- [x] ปรับ `/admin/` และ Admin login ให้ตรวจ session/role แล้วเข้าสู่ `/admin/dashboard.html` โดยตรงหลัง login โดยไม่มีหน้า Landing/ข่าวของ Admin
- [ ] ย้าย Admin MPA media workflow สำหรับไอคอน/พื้นหลังร้านและภาพโฆษณาจาก fallback โดยใช้ Shared Media Service, Storage URL persistence และ reload verification
- [ ] ระบุและย้าย feature gap ของ Customer payment/media, Merchant menu/store media และ Rider proof/withdrawal media ออกจาก fallback สู่ MPA โดยไม่ลด workflow
- [ ] ตรวจ Admin image upload ทุกประเภท: branding, store icon/background, banner/ad, payment-slip review และหลักฐานอื่น ตั้งแต่ file → compress → Storage/RLS → database → render หลัง reload
- [ ] ตรวจ Customer flow: login/profile, catalog, cart, multi-store checkout, payment/QR/slip, order status, referral และ support paths
- [ ] ตรวจ Merchant flow: login, dashboard, order update, menu CRUD, store profile/media, finance/settlement และ notifications
- [ ] ตรวจ Rider flow: login, availability, job acceptance, food/AP Ride lifecycle, proof/media, earnings, withdrawal และ notifications
- [ ] ห้ามทำเครื่องหมาย functional acceptance ว่าเสร็จก่อนผ่าน test จริงในทุก row หรือบันทึก blocker พร้อมหลักฐาน

## MPA Performance, Media and Payment Lifecycle Milestone

- [x] เพิ่ม Shared MPA request lifecycle: cache-first TTL, in-flight deduplication, request scope/AbortController และ stale-response protection
- [x] เพิ่ม scoped background sync ที่หยุดเมื่อหน้าเว็บถูกซ่อน และกำหนด cadence ขั้นต่ำ 15 วินาที
- [x] นำ non-blocking scoped sync ไปใช้กับ Customer order list, Admin counters, Merchant orders และ Rider jobs
- [x] เพิ่ม Merchant store icon/background upload จากคลังหรือกล้อง ผ่าน Shared Media Service และ RLS path ของเจ้าของร้าน
- [x] เพิ่ม Rider private delivery-proof upload จากคลังหรือกล้อง พร้อม private bucket, signed verification และ storage reference ถาวร
- [x] เพิ่ม Customer payment-slip upload และ payment_slip_reviews ตาม schema/RLS ที่มีอยู่
- [x] เพิ่ม Admin MPA payment-slip queue, in-app private viewer และ approval/needs-reupload ที่ใช้ Shared Core transition
- [x] เพิ่ม Admin Control Plane form สำหรับ business_rules โดยคง platform_configs RLS และ JSON editor เดิม
- [x] เก็บ HTTP และ Chromium-CDP production baseline สำหรับ request count, resource bytes, first paint และ navigation timing
- [x] Push milestone, วัด production หลังเผยแพร่ และบันทึก before/after performance evidence

## Customer MPA UI and Feature Parity Restoration

- [x] สร้าง Feature/Component/Asset Parity Matrix ระหว่าง Customer legacy (`index.html` และ dependencies) กับ Customer MPA ทุก route
- [x] ตรวจ dependencies ของ banner, promotion, advertisement, media, store card และ content จริงทั้ง Database, Storage, URL, RLS, cache และ destination routes
- [ ] คืน UI/UX, navigation และ customer workflows ที่ legacy มีแต่ MPA ยังไม่มี โดยไม่ลบหรือแก้ fallback
- [ ] คืน media/advertisement/promotion พร้อม data source จริง, lazy loading, image error handling และ responsive behavior
- [ ] ตรวจ Customer acceptance ครบหน้าแรก, ค้นหา, หมวดหมู่, ร้าน, cart, checkout, order, tracking, profile, login/register และ notifications
- [ ] ทำ visual/mobile/performance parity audit, commit/push และส่ง final report ที่ระบุ MATCHED/MIGRATED/ADAPTED/MISSING/BROKEN อย่างโปร่งใส
- [x] ย้าย Customer support conversation/chat ตาม `support_conversations`, `support_messages` และ participant RLS เดิม
- [x] ย้าย Customer marketplace browse/detail/create/profile/chat ตาม table และ media/RLS เดิม โดยแยก MPA routes
- [x] เพิ่ม Customer marketplace image upload จากคลัง/กล้องผ่าน `marketplace-media`, compression 1 MB, render verification และ owner-path RLS
- [x] เพิ่ม Customer profile location consent/GPS โดยต้องกดอนุญาตก่อน, บันทึก location/profile และ consent ตาม RLS
- [ ] คืน Customer location consent/GPS/address map flow และ distance/service-fee behavior โดยใช้ business rules ที่ตรวจสอบได้
- [ ] คืน Customer errand/ride service routes หลัง audit central fee rules, rider eligibility และ status contracts ครบ
- [x] คืน Customer campaign/advertisement surface พร้อม public-active data source, validated destination และ responsive lazy media
- [ ] กำหนดและเผยแพร่ `platform_configs.business_rules` พร้อม server-side quote/enforcement ก่อนเปิด Customer parcel/errand/AP Ride booking ที่คิดเงินจริง

## Serialized User-Requested File Workflow

- [x] ไฟล์งานที่ 1: Audit และแก้ Customer AD banner ให้ดึงข้อมูลจาก Admin data source จริง แสดงภาพ/ข้อความ/ปลายทาง และไม่ซ่อนเมื่อมี active data
- [x] ไฟล์งานที่ 1: ทดสอบ AD banner บน local/production แล้ว commit/push พร้อมรายงานเฉพาะงาน
- [x] ไฟล์งานที่ 2: Audit และแก้ Customer marketplace browse/category display ให้รายการ public-active และหมวดหมู่แสดงจากข้อมูลจริง
- [x] ไฟล์งานที่ 2: ทดสอบ marketplace display บน local/production แล้ว commit/push พร้อมรายงานเฉพาะงาน
- [x] ไฟล์งานที่ 3: ทำ Admin performance waterfall audit/fix ตาม `pasted_content.txt` โดยมี before/after metrics
- [x] ไฟล์งานที่ 4: ทำ Admin MPA navigation/UI audit/fix ตาม `pasted_content_2.txt` โดยรักษา functionality เดิม
- [ ] ไฟล์งานที่ 5: ทำ Central Media Contract และ legacy media inventory/normalization plan ตาม `pasted_content_3.txt` และ `pasted_content_4.txt`
