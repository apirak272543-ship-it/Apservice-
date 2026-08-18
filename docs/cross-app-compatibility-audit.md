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
| AUD-002 | Critical — กำลังแก้ | Customer checkout ส่ง `delivery_fee: 0` และ `payable = total` โดยไม่อ่าน `platform_configs.business_rules`; Admin มีฟอร์มกติกาค่าส่งกลางแต่ database ยังไม่มี key นี้ | ค่าจัดส่ง/ยอดสุทธิไม่สะท้อนกฎกลาง และไม่ควรอนุญาตให้สร้าง order ด้วยค่าการเงิน hard-coded |

การตรวจสรุปจากฐานข้อมูลพบอย่างน้อยหนึ่งออร์เดอร์สถานะ `กำลังดำเนินการ` ที่ยังไม่มี `rider_id` ซึ่งยืนยันว่ามีงานที่ไม่สามารถปรากฏใน Rider MPA ปัจจุบันได้

การตรวจ config ปัจจุบันยืนยันว่าไม่มี `platform_configs.key = business_rules` แม้ Admin MPA มี UI สำหรับบันทึกค่าส่งเริ่มต้น, ระยะรวม, ค่าต่อกม., ตัวคูณโซน และค่าบริการ

การ deploy pricing migration รอบแรกถูกปฏิเสธอย่างถูกต้อง เพราะ `platform_configs_key_check` ใน database อนุญาตเฉพาะ `payment_public` เท่านั้น ผลตรวจ source ทั้ง 4 repository ยืนยัน keys ตาม contract ที่ต้องรองรับมีเพียง `payment_public`, `business_rules`, `brand_public` และ `customer_promotions`; migration รอบแก้ไขจะขยาย constraint เฉพาะ 4 keys นี้โดยไม่เปิดรับ key อิสระ

### ผลแก้ไขและการยืนยัน

ได้ deploy constraint migration และ pricing migration สำเร็จแล้ว โดยมี `public.create_food_order` เป็น RPC เดียวสำหรับ Customer Food checkout. RPC ตรวจ session/role ลูกค้า, สถานะร้าน, รายการสินค้า/จำนวน, ราคา menu จากฐานข้อมูล, พิกัดจากโปรไฟล์, กติกา `business_rules.food` และคำนวณ `distance_km`, `delivery_fee` และ `payable` บน server. Direct Customer insert ไปที่ `delivery_orders` ถูกปิดเพื่อป้องกันการแก้ราคาใน client.

กติกาทดสอบที่ seed แล้วอยู่ใน Admin Control Plane (เปลี่ยนภายหลังได้จากหน้า Settings):

| Service | Base fee | Included distance | Excess-km fee | Zone multiplier | Service fee |
|---|---:|---:|---:|---:|---:|
| Food | 40 | 3 กม. | 10 / กม. | 1 | 0 |
| Parcel | 50 | 3 กม. | 12 / กม. | 1 | 0 |
| Errand | 50 | 3 กม. | 12 / กม. | 1 | 0 |

Customer checkout ส่งเฉพาะ `item_id` และ `quantity` ไปที่ RPC; QR slip review ใช้ `expected_amount` จาก `order.payable` ที่ server ตอบกลับ. COD ได้สถานะ `ร้านค้ารับออร์เดอร์` ขณะที่ QR/สลิปเป็น `รอตรวจสอบการชำระเงิน`.

### Media, branding และ storage

พบว่า Customer เรียก `brand_public` ตาม contract อยู่แล้ว แต่ RLS เดิมเปิด public select เพียง `payment_public` และ `customer_promotions`; จึงทำให้โลโก้/branding ที่ Admin ตั้งค่าใหม่ไม่สามารถแสดงก่อน login ได้แม้ UI ฝั่ง Admin บันทึกสำเร็จ. ได้เพิ่ม policy `platform_configs_read_brand_public` สำหรับ `anon, authenticated` โดยจำกัดเฉพาะ key `brand_public` และยืนยัน policy บน Supabase แล้ว.

`catalog-media` และ `marketplace-media` เป็น public buckets, จำกัด JPEG/PNG/WEBP ที่ 1 MB; proofs และ payment slips เป็น private buckets พร้อม role-specific policies. ตรวจพบ `payment-slips` เป็นข้อยกเว้นที่ storage limit 5 MB แม้ Shared Media Service บีบอัด client-side. ได้ลด bucket limit เหลือ 1,000,000 bytes ฝั่ง storage แล้ว จึงป้องกันไฟล์ใหญ่ได้แม้ browser/client เก่าไม่บีบอัด.

### Online route smoke check

Customer checkout, Admin Settings, Merchant entry และ Rider jobs route ตอบ HTTP 200 จาก GitHub Pages และแสดง login/application shell เฉพาะบทบาทของตน ไม่มี route ชี้กลับไป repository Customer สำหรับ Merchant/Rider.

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

## ผล regression suite ระหว่าง audit

การรัน Node contract suite ทั้ง 4 repository พบ 55 tests และมี 32 failures ในรอบแรก โดย failures ส่วนใหญ่เป็น **test topology ที่ล้าสมัยหลังแยก repository** ไม่ใช่ runtime error ของ MPA ที่เผยแพร่แล้ว ตัวอย่างเช่น Customer tests ยังเปิด `admin/admin-app.js`, `merchant/merchant-app.js`, `store.html` หรือ root `index.html` จาก repository เดียว ทั้งที่ files ถูกย้ายไป repository เจ้าของบทบาทแล้ว; Admin tests หลายตัวเปิด root `index.html` ซึ่งตั้งใจทำ redirect ไป `admin/`.

ในทางกลับกัน 43 MPA routes ที่ตรวจออนไลน์ตอบ HTTP 200 ครบ และ tests ที่ตรวจ implementation ปัจจุบันผ่านแล้ว ได้แก่ Customer media/marketplace/order/register/support/payment contracts, Admin MPA performance/payment-slip/pending-badge/business-rules contracts, Merchant media contract และ Rider proof/available-job claim contracts. งานถัดไปจะปรับ test targets ให้ตรง repository architecture โดยไม่ย้อนนำ monolith กลับมาเพียงเพื่อให้ test เก่าผ่าน.

## แหล่งตรวจสอบ

* Supabase Management MCP: project `abtsctwfkgzciseppach`, table schema `public.stores`, `public.menu_items`, `public.riders`, `public.delivery_orders`.
* Shared runtime: `shared/ap-service-core.js`, `shared/ap-service-media.js`, `shared/ap-service-mpa.js`.
