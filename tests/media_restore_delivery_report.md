# รายงานกู้คืนภาพและองค์ประกอบ UI หลังแก้ Performance

## สาเหตุที่พบ

ต้นเหตุหลักไม่ใช่การหายของข้อมูลจาก Supabase แต่เป็นนโยบาย cache ของ `apcx_stores` ที่เคยแทนค่า `data:image/...` ด้วยค่าว่าง และต่อมามีการเปลี่ยนลำดับ module/cache-busting ทำให้ browser ใช้ patch รุ่นเก่าที่ไม่ติดตั้ง media persistence จริง นอกจากนี้ `emoji` ของร้านบางรายการมีค่าเป็น `data:image` จึงถูก renderer แสดงเป็นข้อความ fallback เมื่อไม่ได้โหลดภาพทันที.

## การแก้ไข

คงภาพเต็มไว้ใน `AppState` และ DOM runtime เพื่อให้ UI แสดงภาพเดิมครบถ้วน ไม่ตัดภาพออกจากหน้าเว็บอีกต่อไป เพิ่ม `persistMediaCache()` ให้สร้างสำเนา localStorage แยกจาก runtime แล้วใช้ `compressImageForUpload()` บีบอัดภาพในสำเนา cache โดยจำกัดภาพต่อรายการไว้ที่ 120,000 bytes และขนาดไม่เกิน 960px ภาพจึงถูกลดคุณภาพเฉพาะสำเนา cache ไม่กระทบภาพที่ผู้ใช้เห็นหรือข้อมูลภาพต้นฉบับในระบบ.

คารูเซลถูกปรับให้ไม่แสดง `data:image` เป็นข้อความ fallback โดยใช้ emoji สำรองเมื่อค่าที่ควรเป็น emoji เป็น data URL พร้อมคง lazy-load, background image, icon image, horizontal snap rail และ auto-slide 2 วินาทีไว้ครบ.

## ผลการตรวจจริง

จาก browser runtime ก่อนแก้ cache มีขนาดประมาณ 3,311,813 bytes และ media รวมประมาณ 2,720,966 ตัวอักษร หลังแก้และโหลด module รุ่นใหม่ cache เหลือประมาณ 842,469 bytes โดย media ใน cache เหลือประมาณ 693,834 ตัวอักษร ขณะที่ `AppState` ยังคง media เดิมประมาณ 2,720,966 ตัวอักษรครบ 4 ร้าน. เมื่อเลื่อนคารูเซลเข้ามาใน viewport พบว่าการ์ดที่เห็นโหลด media ครบ 4/4 และรายการนอกเฟรมยังไม่ถูกโหลดเกินจำเป็น. ไม่พบ `data:image` ถูกแสดงเป็นข้อความในชื่อหรือเนื้อหาการ์ด.

## ไฟล์ที่แก้

`modules/core/storage.js`, `modules/legacy-bridge.js`, `modules/boot.js`, `performance_optimization_patch.js`, `store_carousel_icon_patch.js`, `index.html`, regression tests ที่เกี่ยวข้อง, `todo.md` และ `tests/admin_media_restore_findings.md`.

## การทดสอบ

ผ่าน syntax check และ contract/regression tests ของ performance optimization, Admin performance, Store Carousel, store render resilience รวมถึง browser runtime checks สำหรับ cache size, media preservation, lazy-load และ data URL fallback.

## Commit

`d1f54ccb4c76127dc2fe7e706132e04a42ecc89b`

Commit message: `fix: preserve compressed UI media during performance optimization`

สถานะ branch: `main` ตรงกับ `origin/main` และ push ไปยัง `apirak272543-ship-it/Apservice-` แล้ว.
