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
