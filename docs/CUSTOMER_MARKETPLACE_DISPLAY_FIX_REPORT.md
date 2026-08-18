# รายงานงานไฟล์ที่ 2 — Customer Marketplace Listing และ Category

## ผลการตรวจจากข้อมูลจริง

Marketplace production มีประกาศที่ `status = active` และ public RLS policy อนุญาตให้ผู้เยี่ยมชมอ่านรายการ active ได้จริง การทดสอบ REST แบบ anonymous และ Customer production DOM ยืนยันว่าประกาศ `รถมอเตอร์ไซค์ Yamaha fino คาบูตัวเก่า` แสดงได้

ต้นเหตุของประสบการณ์ที่ไม่ครบคือหน้า browse เดิมมีเพียงช่องค้นหาและป้าย category บน card แต่ไม่มีตัวเลือกหมวดหมู่ที่ลูกค้ากดดูได้ จึงทำให้หมวดหมู่ที่ผู้ใช้ลงประกาศไม่ปรากฏเป็นส่วนการเลือกสินค้าอย่างชัดเจน

## สิ่งที่แก้ไข

หน้า `customer/marketplace.html` ดึงประกาศ `status=active` เช่นเดิม แล้วสร้าง category chips จากค่า `category` ของรายการ active จริงแบบ dynamic มีตัวเลือก `ทั้งหมด` เสมอ รองรับชื่อหมวดว่างเป็น `อื่น ๆ` และ filter หมวดทำงานร่วมกับคำค้นโดยไม่โหลดข้อมูลซ้ำหรือเปลี่ยน data/RLS เดิม

ผล production หลัง deploy แสดง active listing, `ทั้งหมด`, `รถและอะไหล่`, `data-market-category` และจำนวน `1 รายการ` ครบถ้วน การใช้ cache version ใหม่สำหรับ route Marketplace ป้องกัน browser ค้าง script รุ่นเดิม

## ข้อค้นพบด้านสื่อ

รายการ legacy ปัจจุบันยังเก็บ `image_url` เป็น Data URL ขนาดประมาณ 535 KB ซึ่ง Customer MPA ตั้งใจไม่ใช้เป็น background URL เพื่อไม่ให้ Base64 ขนาดใหญ่โหลดเข้า UI และเพื่อรักษามาตรฐาน Shared Media 1 MB การย้าย/normalize รูป legacy ไป Storage URL จะทำในงาน Central Media และ Legacy Media Audit ตามลำดับที่ผู้ใช้กำหนด โดยไม่แก้หรือทำลายข้อมูลเดิมในงานนี้

## การทดสอบและการเผยแพร่

ผ่าน syntax check, Customer Marketplace parity contract และ full AP Service contract suite แล้ว Commit ที่เผยแพร่คือ `1cea535` (`fix(customer): restore marketplace category display`) และ GitHub Pages deployment สำเร็จ
