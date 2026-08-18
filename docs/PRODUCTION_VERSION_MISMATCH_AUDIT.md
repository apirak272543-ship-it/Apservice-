# Production Version/Cache Audit — 18 August 2026

## Findings

1. `https://apirak272543-ship-it.github.io/Apservice-/customer/` โหลด Customer MPA ใหม่จริง: พบหัวข้อ `โปรโมชันและสิทธิพิเศษ`, คำอธิบาย Admin-updated, และ empty state `0 รายการ` ตาม database ที่ยังไม่มี `customer_promotions` หรือ active campaign
2. `https://apirak272543-ship-it.github.io/Apservice-/` คือ legacy `index.html` fallback ที่ตั้งใจคงไว้ตามข้อกำหนด จึงมี UI/flow monolith รุ่นเดิมจำนวนมากและอาจทำให้ผู้ใช้เห็นว่าหน้าตา "เหมือนเดิม" เมื่อเปิดโดเมนหลัก
3. GitHub Pages production มี asset `shared-media-v4` บน Customer Checkout/Marketplace New, Admin Finance/Promotions/Stores, Merchant Store และ Rider Delivery แล้ว การเปลี่ยน Central Media เป็น infrastructure upload pipeline จึงจะเห็นผลเมื่อเลือกอัปโหลดภาพใหม่ ไม่ได้เปลี่ยนรูปลักษณ์หน้า Home ทันที
4. Browser inspection ของ Customer Home หลัง commit `bf88e70` ยืนยันว่า customer route โหลดและ database ส่ง Data URL legacy มาถึงหน้า แต่ browser console subsystem อยู่ใน crash-loop จึงใช้ contract/full regression plus production asset verification แทนในรอบตรวจนี้ ต้องตรวจ visual gesture บนอุปกรณ์ผู้ใช้ซ้ำหลัง deploy

## Safe Resolution

ต้องคง root legacy fallback ไว้ จึงไม่ redirect หรือเขียนทับ `index.html` ในรอบตรวจนี้ ผู้ใช้ควรเปิด Customer MPA ผ่าน `/customer/` และ Admin/Merchant/Rider ผ่าน routes เฉพาะตามลิงก์ในรายงาน หากต้องการให้โดเมนหลักเปิด Customer MPA ใหม่เป็นค่าเริ่มต้น ต้องได้รับคำสั่งใหม่ที่อนุญาตให้เปลี่ยนบทบาทของ legacy fallback ก่อน
