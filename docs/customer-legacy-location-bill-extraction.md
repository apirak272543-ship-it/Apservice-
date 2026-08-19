# Customer Legacy Location & Bill Adoption Plan

## แหล่งต้นแบบที่ตรวจแล้ว

| ส่วนงาน | Source legacy | หลักการที่ต้องคงไว้ใน Customer MPA |
|---|---|---|
| Location onboarding | `login_location_sorting_patch.js` | ตรวจพิกัดเดิมก่อน, ขอ GPS แบบ explicit/retry, บอกสถานะภาษาไทย, เก็บพิกัดพร้อม accuracy/time/source และเรียงร้านจากระยะทางกับ rating |
| Manual map picker | `admin.html` บรรทัด 949–969 | Leaflet เป็น progressive enhancement เท่านั้น; มี OSM/Carto/HOT fallback, retry/switch provider และยังใช้ GPS หรือ Latitude/Longitude ได้แม้ภาพ tile/แผนที่โหลดไม่ครบ |
| Delivery distance/bill gate | `supermarket_category_distance_patch.js` บรรทัด 76–167 | ระยะทางอ่านอย่างเดียว, รอพิกัดครบก่อนคำนวณ, ไม่ส่ง order หากขาดจุดที่ server ต้องใช้ และไม่ hardcode ค่าส่ง |
| Checkout guidance | `customer-flow-experience-patch.js` | แสดง guidance การชำระ/การแนบสลิปโดยไม่ทำให้ checkout flow เดิมขาดตอน |

## ช่องว่างของ Customer MPA ปัจจุบัน

`customer/customer-app.js` มี GPS ใน Profile แล้ว แต่ Checkout ยังไม่ prefill ที่อยู่/แสดงพิกัดที่บันทึก, ไม่มี manual coordinate fallback หรือ map picker, และให้ server คำนวณค่าส่งเมื่อ submit เท่านั้น ซึ่งถูกต้องด้าน security แต่ UX ต้องบอกสถานะให้ชัดเจนก่อนยืนยัน

## ขอบเขตย้ายที่ปลอดภัย

1. สร้าง shared customer location experience ที่อ่าน/เขียน `user_profiles.location` และ local cache โดยตรวจ coordinate validity เสมอ
2. เพิ่ม checkout location card: ที่อยู่, สถานะพิกัด, ใช้ GPS, เปิด map picker และกรอก latitude/longitude ด้วยมือ
3. ใช้ Leaflet/tiles เป็น optional UI; เมื่อ dependency หรือ tiles ล้มเหลว ต้องเหลือ input พิกัดและปุ่มบันทึกที่ใช้ได้
4. ก่อน submit ให้ persist profile location และปล่อยให้ `create_food_order` เป็นแหล่งเดียวของ delivery pricing
5. ทดสอบ Customer Web และ Customer WebView APK: GPS denied, tile failure, manual coordinates, reload, cart/checkout, และ server rejection เมื่อ location ไม่ครบ
