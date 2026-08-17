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
