# รายงานกู้คืน Banner และรูปหน้าร้าน Legacy

## สาเหตุที่พบ

Customer MPA เคยรับเฉพาะ URL ที่ขึ้นต้น `https://` สำหรับรูปทุกชนิด ขณะที่ข้อมูลเดิมของร้านจริงเก็บรูปเป็น `data:image/...;base64` ใน `stores.image_url`, `stores.background_url` และบาง record เก็บรูปไว้ผิดช่องเป็น `stores.emoji` จึงเกิดสามอาการ: card กลับไปใช้ emoji, พื้นหลังรูปไม่แสดง และบางกรณีแสดงข้อความ `data:i` แทน icon

ส่วน banner มีสองแหล่งที่แตกต่างกัน: Admin config/campaign ในฐานข้อมูลปัจจุบันว่างจริง แต่ legacy `index.html` มี promotion cards 2 รายการฝังใน source code (`promo-food`, `promo-parcel`) จึงทำให้ root legacy แสดง 2 card ขณะที่ Customer MPA แสดง `0 รายการ`

## การแก้ไข

Customer MPA ใช้ลำดับ source ดังนี้: Admin `customer_promotions` ที่มีรูป HTTPS → active campaigns ที่มีรูป HTTPS → legacy promotion cards 2 รายการจาก root app. ดังนั้น AD ที่ Admin สร้างจริงยังเป็นแหล่งหลักและยังต้องผ่าน URL validation เดิม; fallback legacy ใช้ card visual/gradient/icon เท่านั้น ไม่เปิดรับ Data URL เป็น AD image

Store renderer รองรับเฉพาะ legacy `data:image/jpeg|png|webp` ที่มีขนาด string ไม่เกิน 1,400,000 ตัวอักษร, โหลด/decode 4 card แรกแบบ eager และ card ในรายการแบบ lazy. รูปที่อยู่ใน `emoji` ถูกใช้เป็น icon image โดยตรงและไม่สามารถหลุดเป็นข้อความ Data URL ได้อีก. ไม่มีการ UPDATE, DELETE, หรือย้าย original ใน database

## Production Verification

GitHub Pages deployment ของ commit `43e4ebc` สำเร็จ. Chromium CDP ที่ Customer Home production พบ promotion legacy 2 cards และรูปทุก store visual decode สำเร็จ:

| Store visual | Background | Icon | Decode evidence |
|---|---|---|---|
| ก๋วยเตี๋ยวลุงดี&ป่าสาว | 1080×2436 JPEG | 900×1600 JPEG | complete=true |
| ชาตาหนวด สาขาศรีรัตนะ1 | 1080×2436 JPEG | 1600×900 JPEG | complete=true |
| ร้านลาบแตงกวา | ไม่มี background | 900×1600 JPEG | complete=true |
| สิบล้านบ้านสวน | 1531×1027 WebP | 729×1536 JPEG จาก emoji legacy | complete=true |

รูปบางรูปอาจดูเป็นพื้นที่สว่าง/ขาวใน card เล็ก เพราะต้นฉบับเป็นภาพแนวตั้งและ card ใช้ crop เพื่อคง layout เดิม แต่การตรวจ CDP ยืนยันว่า browser decode รูปต้นฉบับได้ ไม่ใช่ปัญหา URL หรือ RLS

## การทดสอบ

ผ่าน `customer_promotions_contract_test`, `customer_legacy_visual_media_contract_test`, Customer visual shell และ full AP Service contract suite ทั้งหมด
