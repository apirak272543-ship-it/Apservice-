# รายงานงานไฟล์ที่ 1 — กู้ Customer AD Banner

## ขอบเขตและผลการตรวจ

Customer MPA รับข้อมูลโฆษณาหลักจาก `platform_configs.customer_promotions` ซึ่ง Admin MPA บันทึกผ่านหน้า `admin/promotions.html` ตามสัญญาข้อมูล `{ items: [{ id, title, badge, description, image_url, active }] }` รูปโฆษณาต้องเป็น URL สาธารณะ HTTPS จาก Shared Media Service และรายการที่ปิดใช้งานจะไม่แสดง

การตรวจฐานข้อมูลเมื่อ 18 สิงหาคม 2026 พบว่าไม่มี row `customer_promotions` และ table `campaigns` ไม่มีรายการ แม้ policy public read ของทั้ง config promotion และ campaign จะเปิดให้ Customer อ่านรายการ active ได้ ดังนั้นสาเหตุข้อมูลโฆษณาไม่แสดงในรอบตรวจนี้คือ **ไม่มีข้อมูล AD ที่ publish อยู่ในฐานข้อมูล** ไม่ใช่ RLS ของ Customer

## สิ่งที่แก้ไข

Customer Home ใช้ `customer_promotions` เป็นแหล่งหลักเช่นเดิม และเพิ่ม fallback ไปยัง `campaigns` เฉพาะเมื่อ config หลักว่าง โดยรองรับรูป/ปลายทางที่อยู่ใน `campaigns.metadata` และตรวจ active window, HTTPS image URL และ HTTP(S) destination URL ก่อน render เสมอ

เมื่อไม่มีข้อมูลหรือเกิดความล้มเหลว ส่วนโฆษณาจะไม่ถูกซ่อนอีกต่อไป แต่แสดง empty/error state ภาษาไทยพร้อมจำนวน `0 รายการ` เพื่อแยกอาการไม่มี AD ออกจากหน้าเว็บเสียหาย การโหลด AD ทำงานแยกจากรายการร้านค้า จึงไม่ทำให้รายการร้านค้ารอ request โฆษณา และ banner ที่มี URL ปลายทางที่ตรวจผ่านแล้วจะกดไปต่อได้

## การทดสอบและการเผยแพร่

Contract test เฉพาะ promotion, syntax check และ full AP Service contract suite ผ่านทั้งหมด หลัง deploy ได้ตรวจ Customer production ผ่าน Chromium โดยพบ `โปรโมชันและสิทธิพิเศษ`, `customer-promotion-empty`, `ยังไม่มีโฆษณาที่เปิดใช้งาน` และ `0 รายการ` ตาม data จริง

Commit ที่เผยแพร่คือ `8b0c501` (`fix(customer): restore AD banner with dual-source fallback`) และ GitHub Pages deployment สำเร็จแล้ว

## เงื่อนไขสำหรับการแสดง AD จริง

ผู้ดูแลระบบต้องเพิ่มรายการใน Admin Promotions พร้อมรูปที่ upload สำเร็จและกดบันทึกให้เกิด row `platform_configs.customer_promotions` หรือมี campaign active ที่ `metadata` มีรูป HTTPS หลังจากนั้น Customer Home จะแสดง banner โดยไม่ต้องแก้โค้ดเพิ่ม
