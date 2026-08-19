# AP Service Legacy-to-New Parity Matrix

## เป้าหมาย

เอกสารนี้เป็นทะเบียนย้ายระบบจาก fallback/legacy ไปยัง MPA ใหม่ของ AP Service การลบ entrypoint เดิมจะทำได้ก็ต่อเมื่อแต่ละ capability มีสถานะ **ผ่าน** พร้อมหลักฐาน functional และ cross-app test เท่านั้น

| แอป | Legacy entrypoint ที่ต้องเทียบ | MPA ใหม่ที่ต้องครอบคลุม | สถานะ inventory |
|---|---|---|---|
| Customer | `admin.html` (customer fallback) และ root redirect | `customer/` 15 หน้า: catalog, store, checkout, order, profile, support, marketplace และ notifications | กำลังตรวจ Location, map/manual fallback, bill และ payment guidance ก่อน |
| Admin | `admin.html`, `legacy-admin-console.html`, `legacy-admin-standalone.html` | `admin/` 14 หน้า: dashboard, operations, orders, stores, accounts, finance, content, media, workspace | รอแยก control-plane capability เทียบทีละ section |
| Merchant | `store.html` และ legacy bridge modules | `merchant/` 8 หน้า: dashboard, orders, menu, store, finance, settings และ login | รอเทียบ store/menu/order operations กับ legacy |
| Rider | `rider.html` และ payout proof patch | `rider/` 8 หน้า: dashboard, jobs, delivery, earnings, profile, settings และ login | รอเทียบ job lifecycle, proof และ payout operations |

## กฎการเทียบ

1. ทุกแถวต้องระบุ **legacy capability**, route/section ใหม่ที่รับผิดชอบ, source of truth ฝั่ง server, กรณี fallback และหลักฐานทดสอบ
2. ใช้ของเดิมเป็นต้นแบบเมื่อมี flow ที่พิสูจน์แล้ว ไม่ทำ UX ใหม่แทนโดยไม่มีเหตุผลทาง security หรือ architecture
3. หาก legacy อาศัย local state ให้ย้ายเฉพาะ UX/fallback แต่ให้ข้อมูลสำคัญและ business rule อยู่ที่ Supabase/RLS/Edge Function ตามมาตรฐานใหม่
4. ทุกการย้ายต้องทดสอบบน Web และ WebView APK ที่เกี่ยวข้อง; Customer MPA ต้องตรวจ Customer APK เสมอ
5. ห้ามลบ entrypoint legacy, asset หรือ database field ระหว่าง audit; สถานะพร้อมปลดต้องได้รับการอนุมัติภายหลัง

## Customer: finding ที่ยืนยันแล้ว

| Legacy capability | สถานะใน Customer MPA | การย้ายที่ต้องทำ |
|---|---|---|
| GPS onboarding พร้อม retry/status | มี GPS ใน Profile แต่ไม่มี checkout onboarding ที่ใช้ซ้ำ | ย้าย persistent location state และ status card |
| Map picker ที่มี provider fallback | ยังไม่มี | ย้าย progressive map picker, switch/retry tile และ manual latitude/longitude |
| Manual coordinate save เมื่อแผนที่โหลดไม่ครบ | ยังไม่มี | เพิ่มก่อน checkout และ persist ไป `user_profiles.location` |
| Distance/bill gate | Server pricing บังคับใช้แล้ว แต่หน้า UI แจ้งบริบทก่อน submit ยังไม่ครบ | เพิ่ม bill status ที่ชัดเจนโดยไม่คำนวณ/ล็อกค่าแทน server |
| QR/slip guidance | มี panel และ Shared Media Service | รักษา flow เดิมและเพิ่ม location/bill context โดยไม่ลด media guard |

## Candidate capability groups ที่ต้องตรวจแบบทำงานจริง

ตารางนี้ยังไม่สรุปว่า feature ใหม่ “ขาด” เพียงเพราะชื่อ function ต่างกัน แต่ระบุ capability จาก legacy ที่ต้องพิสูจน์ด้วย UI, API และ regression test ก่อนตัดสินใจปลดระบบเก่า

| แอป | กลุ่ม capability จาก legacy | Route MPA ใหม่ที่ต้องตรวจ | เกณฑ์ผ่านก่อนปิด legacy |
|---|---|---|---|
| Customer | Location onboarding, map picker/manual coordinate, cart/bill, delivery quote, payment slip, order tracking/review, support | `profile`, `stores`, `store`, `checkout`, `orders`, `order`, `support` | ข้อมูล location และ address รอด reload, checkout ไม่ยืนยันเมื่อพิกัดไม่ครบ, ราคาออกจาก server, media/slip ผ่าน policy, tracker ตรงสถานะกลาง |
| Admin | Account/store/rider control, rider application, assign rider, order/payment review, catalog/media/config, finance/withdrawal, operational map, error/support monitor | `dashboard`, `operations`, `orders`, `customers`, `riders`, `stores`, `finance`, `promotions`, `media`, `notifications`, `settings`, `ai-workspace` | ทุก action สำคัญ server-authorized, ข้อมูลเดิม preview/edit ได้, งานค้างแยกจาก history, ไม่พึ่ง legacy route |
| Merchant | Store profile, menu create/edit/delete/image preview, order updates, settlement/withdrawal, error reporting | `dashboard`, `orders`, `menu`, `store`, `finance`, `settings` | เมนูมี ID/สต็อก/รูปผ่าน media policy, เปลี่ยนสถานะตาม contract, ยอดถอนและหลักฐานแสดงผลถูกต้อง |
| Rider | Job accept, delivery status chain, pickup/destination map, GPS verification, proof image compression, payment/change, earnings/withdrawal/proof | `dashboard`, `jobs`, `delivery`, `earnings`, `profile`, `settings` | รับงานและเปลี่ยนสถานะตาม role, map/GPS มี manual/permission fallback, หลักฐานผ่าน media policy, เงิน/ประวัติตรง server |

## ลำดับงานที่เสนอ

1. ปิด Customer Location/Bill parity เป็นกลุ่มแรก เพราะบล็อกการสั่งซื้อจริงและเคยพบจาก audit ว่า checkout ต้องมี location ก่อน server คำนวณราคา
2. ตรวจ Merchant Menu และ Rider Delivery/GPS ต่อ เพราะเป็นจุดเชื่อม lifecycle ที่ legacy มี flow เฉพาะและเป็นความเสี่ยงทางปฏิบัติการสูง
3. ตรวจ Admin control plane ราย section เพื่อยืนยันว่า legacy command ทุกตัวที่ยังจำเป็นมี server-authorized equivalent ก่อนถอด legacy console

## ช่องว่างที่ยืนยันจาก source ณ รอบ inventory นี้

| ระดับ | แอป | ผลเทียบที่ยืนยันแล้ว | การดำเนินการ |
|---|---|---|---|
| P0 | Customer | fallback มี reliable map picker, tile provider switch/retry และ manual coordinates; Customer MPA มี GPS ใน Profile แต่ Checkout ยังไม่มี fallback ดังกล่าว | ย้าย Location/Bill experience ก่อนทำ checkout parity sign-off |
| P1 | Rider | fallback มี `verifyDeliveryGps`, destination map/GPS และ manual destination; Rider MPA delivery มี status/proof media แต่ไม่พบ geolocation หรือ map fallback | ย้าย delivery location verification/fallback โดยให้ server เป็นผู้ตัดสิน business rule |
| P1 | Merchant | fallback มี delete menu และ error report; MPA มี create/edit/availability/media/order/finance แล้ว แต่ต้องตัดสิน policy ก่อนย้าย delete เพราะ Golden Rules ห้ามลบความสามารถเดิมโดยไม่อนุมัติ และ delete มีความเสี่ยงต่อข้อมูล | ทำ discovery UI/permission ก่อนเสนอ soft-delete หรือ retained legacy action |
| P1 | Admin | legacy มี map picker และ operational commands จำนวนมาก; MPA มี control plane/section action จำนวนมากเช่นกัน แต่ยังต้อง trace action ต่อ action ไม่ใช่เทียบจากชื่อ function | ทำ section-level functional mapping โดยใช้ Admin audit account และ server action log |

### Merchant Menu Delete Policy Decision

Legacy Merchant เรียก `DELETE menu_items` โดยตรงจาก `deleteMenu` ขณะที่ MPA ใหม่มีการแก้ไขเมนู, รูปภาพ, สต็อก และสวิตช์ `available` ซึ่งเป็นการปิดขายแบบรักษาประวัติอยู่แล้ว จึง **ยังไม่ย้าย destructive delete** ในรอบ parity นี้ เพราะจะทำลายข้อมูลอ้างอิงของออร์เดอร์และขัดกับกฎไม่ลบข้อมูลโดยไม่มีอนุมัติ

| ทางเลือก | สถานะ |
|---|---|
| ปิดขาย/สต็อกเป็นศูนย์ผ่าน MPA | พร้อมใช้งาน และเป็นทางเลือกปลอดภัยในปัจจุบัน |
| legacy hard delete | คงไว้เป็น fallback เดิม ห้ามลบ entrypoint |
| soft archive แบบ server-authorized พร้อม audit trail | รอการอนุมัติ policy และ migration แยกก่อนเริ่มพัฒนา |

## Active fallback/go-back links ที่พบ

| แอปใหม่ | Link ที่ยัง active | ความหมายในการย้าย |
|---|---|---|
| Merchant MPA | `../store.html` ใน navigation และ login | legacy store ยังเป็น escape hatch; ต้องเทียบ menu, order, media, settlement และ error handling ก่อนนำออก |
| Rider MPA | `../rider.html` ใน navigation และ login | legacy rider ยังเป็น escape hatch; ต้องเทียบ maps/GPS, proof, status chain และ payout ก่อนนำออก |
| Customer MPA | back links ภายใน route และ root redirect ไป `customer/` | ต้องคง internal back navigation แต่ย้าย checkout location/bill fallback ให้ครบก่อนทำ retirement decision |
| Admin MPA | legacy console/standalone entrypoints ใน repository | ต้อง audit command/control-plane capability ราย section ก่อนปิด legacy admin routes |

## หลักฐานการย้าย Customer Location/Bill

| หัวข้อ | ผล | หลักฐาน |
|---|---|---|
| Checkout location card | ผ่าน DOM verification | Chromium headless พบ `checkoutLocationStatus`, GPS, map และ manual-save controls ทั้ง static preview และ Customer GitHub Pages production เมื่อ 19 สิงหาคม 2026 |
| Server pricing boundary | ผ่าน contract | Customer ยังคงสร้างออร์เดอร์ผ่าน `rpc/create_food_order`; location picker ไม่คำนวณหรือ hardcode ค่าส่ง |
| Map fallback | ผ่าน source contract | มี OpenStreetMap, Carto Voyager และ Humanitarian OpenStreetMap พร้อม manual latitude/longitude fallback |
| Browser interactive retest | Blocked ชั่วคราว | browser subsystem ถูกปิดชั่วคราวหลัง crash loop; ต้องรันทดสอบคลิก GPS denied, tile error และ map save ซ้ำบน production/WebView หลัง push |

## Admin Section-Level Functional Mapping (Source Verified)

ตารางนี้ตรวจจาก active dispatcher ของ Admin MPA และ route ที่ใช้งานจริง ไม่สรุปจากชื่อ function หรือ legacy redirect เพียงอย่างเดียว

| Section MPA | Capability ที่ยืนยัน | Server boundary ที่พบ | สถานะ parity / follow-up |
|---|---|---|---|
| Dashboard | สรุปงานค้างและการเงินจากข้อมูลจริง, ทางลัดไปงานย่อย | Read ผ่าน RLS | ผ่าน source review; browser audit รอระบบ browser กลับมา |
| Accounts / Customers | แยก Admin, Customer, Store, Rider; บัญชี, role, feature overrides และ wallet adjustment | `role-access`: `list_user_control_plane`, `create_managed_account`, `set_user_roles`, `set_account_control`, `adjust_customer_wallet` | ผ่าน server-control-plane source contract |
| Stores V3 | สร้างร้าน+Merchant, บัญชี Merchant, ระงับร้าน, ปิดฉุกเฉิน, GP, เวลา/พิกัด, สื่อ และเมนู | `role-access` สำหรับ provision, account, moderation และ emergency state | **P1 hardening:** การแก้ field/sื่อ และ delete menu บางเส้นยัง PATCH/DELETE table โดยตรง; ต้องย้ายเป็น allow-listed server action ก่อน retirement sign-off |
| Orders | ดูคิวและเปลี่ยนสถานะตาม Shared Core | RLS และ client transition helper ที่ตรวจในหน้า | **P1 evidence required:** ยืนยัน policy/RPC ฝั่ง backend ว่าป้องกัน invalid transition แม้ client ถูกดัดแปลง |
| Finance | ดูสลิป signed URL, อนุมัติ/ปฏิเสธ/จ่ายคำขอถอนพร้อมหลักฐาน ≤1 MB | `rpc/admin_review_withdrawal` สำหรับ withdrawal; signed private media | ผ่าน withdrawal server RPC; payment-slip multi-table update ต้องมี browser/API retest |
| Riders | เพิ่ม/แก้ rider, สถานะ, รถ และ operational note | RLS row mutation ปัจจุบัน | **P1 evidence required:** ยืนยัน server authorization/action log สำหรับ create/edit/suspend ก่อนปลด legacy console |
| Notifications / Media | งานวันนี้, pending/history และ preview media/signed private media; migration รูป legacy ผ่าน Shared Media Service | RLS read, Shared Media Service | ผ่าน source review; ต้อง browser retest empty/error/modals |

> ยังไม่มี section ใดของ Admin ได้สถานะพร้อมปลด legacy จนกว่าจะผ่าน browser audit ด้วยบัญชี AImanus Admin และปิด P1 hardening/evidence ตามตารางนี้
