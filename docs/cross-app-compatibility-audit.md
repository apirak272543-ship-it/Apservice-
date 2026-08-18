# Cross-Application Compatibility Audit — Working Report

**สถานะ:** กำลังตรวจสอบ  
**ขอบเขต:** Customer, Admin, Merchant, Rider และ Supabase project `abtsctwfkgzciseppach`

## ข้อเท็จจริงที่ยืนยันแล้ว

| หัวข้อ | ผลตรวจสอบ |
|---|---|
| Shared contracts | `ap-service-core.js`, `ap-service-mpa.js` และ `ap-service-media.js` มี SHA-256 ตรงกันทั้ง 4 repository |
| Backend | Supabase project `abtsctwfkgzciseppach` มีสถานะ `ACTIVE_HEALTHY` และใช้ region `ap-southeast-1` |
| Store media schema | ตาราง `stores` มี `image_url` และ `background_url`; Customer อ่านผ่าน `catalog_stores` โดยใช้ `icon_url`/`background_url` |
| Admin → Customer promotions | Admin บันทึก `platform_configs.key = customer_promotions` ด้วยรายการที่มี `image_url`; Customer อ่าน key เดียวกันและ render image URL พร้อม fallback |
| Private media | Customer payment slip และ Rider delivery proof ใช้ `APServiceMedia.uploadPrivateImage`; public catalog media ใช้ `uploadPublicCatalogImage` |

## ข้อค้นพบที่ต้องแก้

| ID | ความรุนแรง | จุดพบ | ผลกระทบ |
|---|---|---|---|
| AUD-001 | Critical — แก้แล้ว, รอ E2E ยืนยัน | Rider MPA อ่านเฉพาะ `delivery_orders` ที่ `rider_id` ตรงกับบัญชี Rider และไม่มี query งานว่างหรือ action รับงาน | เพิ่ม available jobs query เฉพาะสถานะ `ร้านค้ารับออร์เดอร์`/`กำลังเตรียมสินค้า` และ conditional PATCH ที่ตรวจ `rider_id is null` กับสถานะเดิมก่อน claim เพื่อป้องกัน Rider รับงานซ้ำ |

การตรวจสรุปจากฐานข้อมูลพบอย่างน้อยหนึ่งออร์เดอร์สถานะ `กำลังดำเนินการ` ที่ยังไม่มี `rider_id` ซึ่งยืนยันว่ามีงานที่ไม่สามารถปรากฏใน Rider MPA ปัจจุบันได้

## หลักฐานโค้ดที่เกี่ยวข้อง

* `admin/admin-app.js`: Admin upload สื่อร้านด้วย `uploadPublicCatalogImage`, PATCH `stores.image_url/background_url`; Admin promotions UPSERT `platform_configs.customer_promotions`.
* `customer/customer-app.js`: Customer reads `catalog_stores.icon_url/background_url` และ `platform_configs.customer_promotions`.
* `merchant/merchant-app.js`: Merchant reads/updates `delivery_orders` โดยกรอง `store_id` และใช้ `APServiceCore.order.canTransition`.
* `rider/rider-app.js`: Rider job query กรอง `rider_id=eq.<current rider>` และไม่มี available-job claim flow.

## การแก้ไขที่ผ่าน static regression

* Rider MPA แสดงส่วน “งานใหม่ที่พร้อมรับ” และ “งานที่รับไว้แล้ว” แยกกัน
* การรับงานตั้ง `rider_id`, `rider_name`, `accepted_at` และ status `ไรเดอร์กำลังไปรับ` โดยใช้ `APServiceCore.canTransition` ก่อน request
* PATCH ระบุ `rider_id=is.null` และ status snapshot ใน URL; ถ้าไม่มี row ตอบกลับ จะแจ้งว่า Rider อื่นรับงานหรือสถานะเปลี่ยนแล้ว
* ผ่าน `rider_available_job_claim_contract_test.cjs`, `rider_delivery_proof_contract_test.cjs` และ JavaScript syntax check

## แหล่งตรวจสอบ

* Supabase Management MCP: project `abtsctwfkgzciseppach`, table schema `public.stores`, `public.menu_items`, `public.riders`, `public.delivery_orders`.
* Shared runtime: `shared/ap-service-core.js`, `shared/ap-service-media.js`, `shared/ap-service-mpa.js`.
