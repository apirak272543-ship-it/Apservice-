# รายงานงานไฟล์ที่ 5 — Central Media Contract และ Legacy Media Audit

## ผลที่ส่งมอบ

ได้สร้าง **Central Media Contract v4** ใน Shared Media Service และ registry กลาง `public.media_assets` แบบ additive ซึ่งไม่แก้หรือทำลาย legacy reference ใด ๆ New upload จาก Customer Marketplace, Merchant Store และ Rider Delivery Proof จะผ่าน pipeline เดียวกัน: validate → profile → resize/crop/compress → upload → render verification → Central metadata registration

| พื้นที่ | สถานะ |
|---|---|
| Shared processing/profile/progress | สำเร็จ: `shared-media-v4` |
| Central metadata source | สำเร็จ: `public.media_assets` เปิด RLS |
| Public/private media delivery | สำเร็จ: versioned public URL และ signed URL private |
| 200×200 logo/avatar profile | สำเร็จ: crop กลางและ output ≤350 KB |
| General image compression | สำเร็จ: output runtime ≤1 MB |
| Customer / Admin / Merchant / Rider compatibility | สำเร็จสำหรับ new uploads; legacy contract คงอยู่ |
| Legacy Data URL physical migration | ยังไม่รันโดยตั้งใจ: ต้องใช้ protected batch worker |

## Inventory และ Security

Database มี reference columns ที่เกี่ยวข้องอย่างน้อย 30 ช่องใน store/catalog/menu/marketplace/order/settlement/withdrawal/rider/creator surfaces. Legacy references ที่ populated เป็น Data URL ทั้งหมด; storage buckets ทั้ง 7 bucket ไม่มี object ณ เวลาตรวจ. การ audit จึงไม่ได้สรุปจาก URL เพียงอย่างเดียว แต่ตรวจทั้ง reference shape, decoded payload size, bucket inventory และ storage RLS

| เกณฑ์ | ผล audit |
|---|---|
| Public buckets | `catalog-media`, `marketplace-media` |
| Private buckets | `delivery-proofs`, `payment-slips`, `withdrawal-proofs`, `rider-application-documents`, `error-evidence` |
| Private security | owner path / role policy อยู่แล้ว และยังคงเดิม |
| Central registry RLS | enabled; public/owner/admin select, owner insert, owner/admin update |
| Anon REST verification | `GET /media_assets` ตอบ HTTP 200 ด้วย `[]` โดยไม่มี data leak |
| Existing objects changed | 0 |
| Legacy URL/Data URL overwritten | 0 |

## Performance และ Compatibility

ไม่มี physical legacy migration ในรอบนี้ จึงไม่มีการอ้างตัวเลข network before/after ที่ไม่จริง Customer runtime ปัจจุบันปฏิเสธ `data:image` เป็น public background URL อยู่แล้วเพื่อไม่ดึง Base64 ขนาดใหญ่เข้า card; registry v4 เพิ่ม cache version สำหรับ URL ใหม่เท่านั้น. ผล performance ที่วัดได้ในรอบนี้คือการตรวจว่าการเปลี่ยน contract ไม่ทำให้ regression suite ใดล้มเหลว

Future migration มี baseline payload ที่ audit ได้: 3 store icons 951,283 bytes, 3 delivery proofs 818,731 bytes, 3 store backgrounds 1,089,332 bytes รวม JPEG/WebP, 1 marketplace image 400,967 bytes, 1 withdrawal proof 591,955 bytes และ 1 menu image 96,918 bytes ทั้งหมดเป็น decoded evidence แยกจาก duplicated alias surfaces. รายละเอียด action/rollback อยู่ใน [Legacy Normalization Plan](LEGACY_MEDIA_NORMALIZATION_PLAN.md)

## Tests และข้อจำกัด

ผ่าน `central_media_contract_test.cjs` ใหม่, media progress, customer marketplace media, merchant media, rider delivery proof และ full AP Service contract suite ครบ Registry schema/RLS/policies และ anonymous public REST endpoint ถูกตรวจ production แล้ว

การทดสอบ upload จริงแบบ owner/admin ต้องทำจากบัญชีที่มีสิทธิ์ตาม RLS เพื่อไม่สร้าง data ทดสอบใน production โดยไม่มีเจ้าของธุรกิจอนุมัติ. ไม่มีการใช้ session ปลอม, bypass RLS หรือ upload file ทดสอบในงานนี้

## Files และ Database Changes

ไฟล์หลักที่เปลี่ยนคือ `shared/ap-service-media.js`, Customer Marketplace, Merchant Store, Rider Delivery, media-loading HTML shells, `supabase/migrations/20260818_central_media_assets.sql` และ `tests/central_media_contract_test.cjs` Database เพิ่มเฉพาะ `media_assets`, indexes และ RLS policies ไม่มี DROP/DELETE/TRUNCATE หรือ data migration
