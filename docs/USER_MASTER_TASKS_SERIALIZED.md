# ข้อกำหนดจากไฟล์ผู้ใช้แนบ — สรุปสำหรับการทำงานแบบเรียงลำดับ

ไฟล์ต้นทางที่ผู้ใช้แนบในรอบนี้ ได้แก่ `pasted_content.txt`, `pasted_content_2.txt`, `pasted_content_3.txt` และ `pasted_content_4.txt` เมื่อ 18 สิงหาคม 2026. ผู้ใช้สั่งให้ทำงานทีละไฟล์/flow: อ่าน dependency ให้เข้าใจก่อน แก้และทดสอบงานแรก แล้วจึง commit/push/report ก่อนเริ่มงานถัดไป. ลำดับที่ผู้ใช้ให้ความสำคัญทันทีคือ Customer AD banner ที่ Admin สร้างแต่ไม่แสดง และ Customer marketplace/category listing ที่ไม่แสดง.

| ไฟล์ผู้ใช้ | ขอบเขตหลัก | ข้อห้าม/เกณฑ์สำคัญ |
|---|---|---|
| `pasted_content.txt` | Admin performance root-cause และ optimization | วัด click-to-render/network/auth/role/data เป็น ms, UI shell ต้องไม่รอ background, ไม่ลด feature เพื่อความเร็ว, ต้องมี before/after waterfall และ regression |
| `pasted_content_2.txt` | Admin MPA navigation/UI | Persistent navigation, page-level data isolation, icon/label/active state, mobile navigation, quick actions, back button ธรรมชาติ, ไม่โหลดทุก domain ใน dashboard |
| `pasted_content_3.txt` | Central Media Standard | ใช้ shared media contract เดียวทั้ง 4 apps, metadata/database แยกจาก storage, media type/profile/path/visibility/signing/error/lazy/cache/versioning และห้ามทำ media pipeline แยกกัน |
| `pasted_content_4.txt` | Legacy media audit/normalization | Audit → Verify → Normalize → Validate, ไม่ลบ original, ไม่ overwrite file เดิมทันที, inventory DB/storage/actual file, แยก profile ตาม use case และทำ reference mapping ก่อน repair/migrate |

## ข้อค้นพบสำหรับงานแรก: Customer AD Banner

Admin MPA route `admin/promotions.html` บันทึก `platform_configs.key = customer_promotions` และ payload รูปแบบ `{ items: [{ id, title, badge, description, image_url, active }] }`. รูปถูกอัปโหลดผ่าน Shared Media Service ไปยัง public `catalog-media` และ Admin editor ปิดปุ่มบันทึกถ้ารายการใดไม่มีภาพ. Customer MPA loader ปัจจุบันอ่าน key เดียวกัน แต่ filter รายการด้วย `active !== false` และ `image_url` ต้องเป็น HTTPS; เมื่อไม่มีรายการที่ผ่าน filter จะซ่อน section ทั้งหมด. งานแรกต้อง audit row/storage URL/current cache/production asset แล้วแก้เฉพาะ flow นี้โดยรักษา data contract เดิม.

## ข้อค้นพบสำหรับงานถัดไป: Marketplace

Customer MPA มี marketplace routes แล้ว แต่ผู้ใช้รายงานว่ารายการและประเภทสินค้ายังไม่แสดง. ต้อง audit public RLS, active/status filters, selected fields, category source, image URL และ production deployment เป็นงานลำดับถัดไป โดยไม่แก้ Marketplace create/chat/profile ก่อนเข้าใจ browse data path.
