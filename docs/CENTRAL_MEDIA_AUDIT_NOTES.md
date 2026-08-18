# Central Media Audit Notes — 18 August 2026

## ข้อมูลจริงจาก Database และ Storage

การตรวจ `information_schema` พบ media reference หลักใน `stores`, `catalog_stores`, `menu_items`, `catalog_menu_items`, `marketplace_listings`, `delivery_orders`, `withdrawal_requests`, `settlements`, `riders`, `rider_applications`, `creators` และ `public_ap_ride_riders` ก่อนเริ่มงานไม่มี Central Media metadata table/view อยู่แล้ว

Storage buckets มี `catalog-media` และ `marketplace-media` เป็น public; `delivery-proofs`, `payment-slips`, `withdrawal-proofs`, `rider-application-documents`, `error-evidence` เป็น private ทุก bucket มี object count เป็นศูนย์ ณ เวลาตรวจ และ `payment-slips` ยังมี file size limit 5 MB ขณะที่ bucket ใหม่ส่วนใหญ่จำกัด 1 MB

RLS storage ปัจจุบันบังคับ owner-path/role สำหรับ catalog merchant media, marketplace media, payment slips, delivery proofs, withdrawal proofs, rider application documents และ error evidence อยู่แล้ว การเปลี่ยน Central Media ห้ามเปลี่ยน private bucket เป็น public หรือ bypass policy เหล่านี้

## Legacy Reference Footprint

ข้อมูล legacy ที่ populated ทั้งหมดเป็น Data URL ไม่ใช่ HTTPS URL หรือ storage ref โดยมีอย่างน้อย: store/catalog icon 3 รูป JPEG (รวม 951,283 bytes ต่อ reference surface), delivery proof 3 รูป JPEG (818,731 bytes), store/catalog background 3 รูป (JPEG 736,506 bytes สำหรับ 2 รูป และ WebP 352,826 bytes สำหรับ 1 รูป), withdrawal proof 1 JPEG (591,955 bytes), marketplace image 1 JPEG (400,967 bytes), และ menu/catalog menu image 1 WebP (96,918 bytes)

`stores` กับ `catalog_stores` และ `menu_items` กับ `catalog_menu_items` มี Data URL ซ้ำกันตาม alias/reference surface จึงห้ามตีความเป็นไฟล์ storage แยกและห้ามลบจากการนับเบื้องต้น

## ข้อสรุปเพื่อการดำเนินงาน

1. สร้าง Central Media registry แบบ additive ก่อน โดยไม่แก้ existing URL/Data URL หรือ object เดิม
2. Shared Media Service จะเป็นจุดเดียวสำหรับ profile/type/compression/path/metadata registration ของ upload ใหม่
3. Legacy migration ต้องเป็น batch ที่สร้าง optimized copy → verify → register metadata → switch reference โดยเก็บ Data URL เดิมและต้องมี rollback map
4. ไม่ทำ automatic bulk migration ในรอบนี้ก่อนสร้าง/ทดสอบ registry และ resolver เพราะไม่มี object จริงอยู่ใน storage และต้องไม่ทำลาย original
