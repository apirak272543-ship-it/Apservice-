# Customer MPA UI/Feature Parity Matrix

**สถานะเอกสาร:** Baseline audit — ยังไม่ใช่รายงานปิดงาน  
**Legacy source of truth:** `index.html` และ patch/dependencies ที่ legacy โหลด  
**Target:** Customer MPA routes ทั้ง Home, Stores, Store, Checkout, Orders, Order Tracking, Notifications, Support และ Marketplace พร้อม `customer-app.js`

> Customer legacy ยังคงเป็น fallback และห้ามลบหรือใช้ Customer MPA ที่มีอยู่เป็นตัวกำหนดขอบเขตผลิตภัณฑ์ เอกสารนี้ระบุ parity จาก source code ที่ตรวจแล้ว; รายการ `MISSING` และ `BROKEN` เป็น backlog บังคับก่อนจะเรียกงาน Customer parity ว่าเสร็จ

## สรุป baseline

Customer MPA มีแกนการสั่งอาหารแบบแยกหน้าและใช้ Shared MPA Runtime แล้ว ได้แก่ catalogue, รายละเอียดร้าน, cart, checkout, payment slip, รายการออร์เดอร์ และ profile แบบย่อ. อย่างไรก็ตาม legacy มี surface area กว้างกว่าอย่างมีนัยสำคัญ ทั้งบริการหลายประเภท, marketplace, search/category, location/distance, order detail/tracking, full profile, support และ notification. การคืนฟังก์ชันจะย้ายตาม dependency จริงและยังคง route responsibility แบบ MPA; จะไม่คัดลอก `index.html` กลับมาเป็น monolith ใหม่.

| กลุ่ม | Legacy source/location | Customer MPA location | สถานะ | Dependency หลัก | Database/Storage | ผลทดสอบเริ่มต้น |
|---|---|---|---|---|---|---|
| Header, brand และ account actions | `index.html` บรรทัด 51–53 | `customer-app.js` `nav()` + `applyPublicBrand()` | **ADAPTED** | brand config, auth session | `platform_configs.brand_public`, Auth | มีโลโก้/ชื่อ/สี dynamic แบบ non-blocking และ fallback ปลอดภัย; production ไม่มี `brand_public` row จึงยังแสดง fallback |
| Navigation หลัก | Legacy `showView()` | MPA HTML routes | **MIGRATED** | route manifest, Shared Runtime | ไม่มี | Static audit: Home/Stores/Orders/Profile ใช้งาน route จริง |
| Hero section | Legacy `heroSection` | Customer `home()` hero | **ADAPTED** | legacy content config | legacy config / `platform_configs` | Static audit: มี hero แต่ยังไม่ดึง content/brand media กลาง |
| Promotion carousel | Legacy `homePromotions` | `renderPromotions()` | **MIGRATED** | promotion loader, image lazy loading | `platform_configs.customer_promotions`, `catalog-media` | Existing promotion contract ผ่าน |
| Advertisement/featured campaign | Legacy campaign/store content | ไม่มี route/component ครบ | **MISSING** | campaign data, destination route | `campaigns`, `campaign_stores`, media | ต้อง audit query/RLS/click destination |
| Service cards: food | Legacy Home | Stores route | **ADAPTED** | auth/route | catalogue tables | เปิดร้านได้ แต่ visual/service card ยังไม่เหมือน legacy |
| Service cards: supermarket | Legacy `openSupermarkets()` | `stores.html?category=supermarket` | **ADAPTED** | store category routing | categories/catalogue | ใช้ category/catalogue เดิมและ URL filter; ยังไม่เทียบ interaction legacy ทุกจุด |
| Service cards: parcel/errand | Legacy `view-errand` | ไม่มี | **BLOCKED** | GPS/map/fee rule/order workflow | `delivery_orders`, `platform_configs.business_rules` | ตาราง order รองรับ field แต่ central `business_rules` ยังไม่มี row; legacy ใช้ local client fallback ซึ่งไม่ปลอดภัยสำหรับค่าบริการจริง |
| Service cards: AP Ride | Legacy `openRideBooking()` | ไม่มี | **BLOCKED** | rider eligibility, ride selection | riders/RPC/orders | rider eligibility fields มีอยู่ แต่ไม่มี central fare rule ที่เผยแพร่และไม่มี server-side quote/booking contract ที่ระบุค่าใช้ได้ |
| Marketplace | Legacy views `marketplace`, listing, chat | `marketplace*.html` แยก 5 routes | **MIGRATED** | listing/order/conversation/message, auth, image media | marketplace tables + `marketplace-media` | Browse, detail, create, profile, buy request และ participant chat ใช้ RLS ที่ audit; upload บีบอัด 1 MB ผ่าน Shared Media Service |
| Support call/chat | Legacy support centre | `support.html` | **MIGRATED** | admin presence, chat | `support_conversations`, `support_messages` | conversation เดียวต่อ customer, ส่ง/อ่านข้อความตาม participant RLS และ scoped refresh |
| Store list/cards | Legacy home + all stores | `stores.html`, `storeCard()` | **ADAPTED** | catalogue, responsive image | `catalog_stores` / public catalog media | MPA route contract ผ่าน; ยังขาด search/category/location sort และ legacy visual parity |
| Store detail/menu | Legacy `view-storefront` | `store.html` | **ADAPTED** | catalogue menu/cart | `catalog_stores`, `menu_items` | MPA read/cart ผ่าน; ยังขาด background, menu image/options, delivery controls |
| Search/filter/category | Legacy `storeSearch`, categories | `stores.html` search/chips | **MIGRATED** | category query, client filtering | categories/catalogue | มี URL-safe filter, loading/empty state และ category query จริง |
| Cart | Legacy side cart/FAB | Checkout table | **ADAPTED** | Shared cart event/store | session storage | Quantity actions ผ่าน static audit; floating cart/summary parity ยังขาด |
| Multi-store checkout sequencing | Legacy checkout summary | Checkout groups | **BROKEN** | delivery rules, route ordering, transaction sequence | orders/items/config | MPA แยกสร้าง parallel groups แต่ยังไม่มี distance-first sequencing/fee parity |
| Checkout address/GPS/map | Legacy cart/checkout location controls | text address only | **MISSING** | geolocation/map picker/consent | profile/order fields | ต้องย้าย consent + mobile handling |
| QR display and transfer slip | Legacy dynamic QR + slip | Checkout transfer/slip panel | **ADAPTED** | public payment config, Shared Media | `payment_public`, `payment-slips`, `payment_slip_reviews` | แสดง `qrImageUrl`, เคารพ COD flag และ private slip upload; ยังต้องตรวจ payment retry/approval E2E |
| Order list | Legacy `view-orders` | `orders.html` | **ADAPTED** | scoped order sync | `delivery_orders` | MPA scoped sync ผ่าน; detail/tracking/reorder/payment retry ยังขาด |
| Order detail/tracking | Legacy orders + map/status | `order.html` | **MIGRATED** | status events, rider/map visibility | orders/items/events | ใช้ `customer_id` scope, items/status event route, rider state และ external map deep link |
| Profile/address/GPS/credit | Legacy `view-profile` | `profile.html` | **ADAPTED** | profile, consent, location, wallet | profiles/consents/credit tables | MPA บันทึกชื่อ/โทรศัพท์; address, GPS, consent, wallet history ยังขาด |
| Login/register | Legacy login, register, social | `profile.html` login/register | **MIGRATED** | Supabase Auth, profiles, consent | Auth, profiles, consents | Customer register, consent evidence และ editable address ใช้ schema/RLS ที่ตรวจแล้ว; social login ยังไม่คืน |
| Notifications | Legacy status/notification surfaces | `notifications.html` | **MIGRATED** | notification read/sync | `mobile_notifications` | recipient-scoped inbox พร้อม cache-first and background refresh |
| Empty/loading/error state | Legacy UI states | Shared MPA UI helpers | **MIGRATED** | Shared Runtime | ไม่มี | Shared loading/error/empty usageพบใน primary routes |
| Footer | Legacy page footer | ไม่มี | **MISSING** | public brand/support links | public config | ต้องคืน component + validated destination links |

## Asset and media inventory (baseline)

| Asset surface | Legacy behavior | MPA behavior | สถานะ/ความเสี่ยง |
|---|---|---|---|
| Brand logo | dynamic brand mark/image and login logo | dynamic public brand mark with fallback | **ADAPTED** — ใช้ `brand_public` แบบ non-blocking; Admin ต้องเผยแพร่ row นี้ก่อน production จะแสดงโลโก้จริง |
| Hero artwork/background | configured URL/upload/local fallback | fixed CSS hero | **MISSING** — ต้องใช้ central media URL, lazy-safe fallback และ no Base64 persistence |
| Promotion images | campaign/promotion image cards | real `customer_promotions` image URL | **MIGRATED** — ต้องทดสอบ click/destination/RLS ต่อ |
| Store icon/background | icon/background URL and fallback | icon present, background not rendered | **ADAPTED** — ต้องคืน visual component และ image error handling |
| Menu media | emoji/URL in legacy | emoji only in MPA query | **MISSING** — ต้องตรวจ media field/data contract ก่อนย้าย |
| Payment slip | private upload/view/review | private upload + review row | **MIGRATED** — ต้องคืน QR and payment retry UX |
| Marketplace listing media | upload/preview/URL | camera/library → compression → public URL | **MIGRATED** — `marketplace-media` public bucket จำกัด JPEG/PNG/WebP 1 MB และ RLS path `marketplace/{auth.uid()}` |

## Visual baseline บนมือถือ (390 × 844)

จับภาพจาก GitHub Pages production เมื่อ 18 สิงหาคม 2026 เพื่อใช้เป็น baseline ก่อนแก้. Customer legacy แสดง top bar ที่มี brand mark, ชื่อแบรนด์, ปุ่มสมัครสมาชิกและ account action, hero พร้อม eyebrow/สอง CTA, promotion heading/จำนวนรายการ, promotion card แบบสไลด์ และจุดเริ่มต้นของ service grid พร้อม floating cart. Customer MPA แสดง nav แบบข้อความ, promotion/loading state, hero แบบย่อ และรายการร้านยอดนิยม แต่ไม่มีองค์ประกอบ brand/action, service-card surface และ floating cart ใน viewport เดียวกัน.

| Visual component | Legacy | MPA ปัจจุบัน | สถานะ audit |
|---|---|---|---|
| Top bar | Brand mark + name + สมัครสมาชิก + account action | ชื่อข้อความ + nav links | **MISSING/ADAPTED** |
| Hero | eyebrow, title, description, 2 CTAs, decorative art | title, description, 1 CTA, gradient | **ADAPTED** |
| Promotion block | heading, count, visible campaign card, horizontal rail | loading shell เมื่อจับภาพ, ไม่มี count/action | **ADAPTED** |
| Service discovery | heading, service cards, floating cart indicator | ไม่ปรากฏใน home viewport | **MISSING** |
| Store discovery | อยู่หลัง service area พร้อม legacy identity | section/title/loader อยู่ด้านล่าง hero | **ADAPTED** |

ผลนี้เป็น visual comparison เท่านั้น ไม่ถือว่า network/data failure เพราะหน้าจอถูกจับจาก unauthenticated production session. จะตรวจ data source และ interaction แยกตาม dependency audit ก่อนแก้ component.

## กติกาการย้ายและเกณฑ์ปิดแต่ละรายการ

ทุกการย้ายต้องผ่านลำดับ dependency ได้แก่ UI component → data source → selected fields → Storage path/URL → RLS → image loading/fallback → cache/scope → interaction/click destination → mobile behavior → end-to-end test. สถานะ `MIGRATED` หมายถึง route/logic ใหม่มีอยู่และเชื่อม data source แล้ว; `ADAPTED` หมายถึงมี capability ส่วนหนึ่งแต่ UI/UX หรือ dependency ยังไม่ครบ legacy; `MISSING` หมายถึงยังไม่มี route/feature; `BROKEN` หมายถึงมี flow แต่ไม่เป็นไปตาม legacy business behavior.

สถานะ `BLOCKED` ใช้เมื่อ dependency ที่เกี่ยวข้องกับราคา ความปลอดภัย หรือ lifecycle ฝั่งเซิร์ฟเวอร์ยังไม่ถูกกำหนดในระบบกลาง. ในกรณี parcel/errand/AP Ride พบว่า legacy fallback กำหนด `baseFee`, `perKm`, `includedKm` และ multiplier ไว้ใน client source ขณะที่ `platform_configs.business_rules` ไม่มีข้อมูล. MPA จะไม่คัดลอกตัวเลข fallback มาสร้างราคาหรือออร์เดอร์จริง จนกว่า Admin จะกำหนดค่าและ server-side enforcement/quote contract พร้อมใช้งาน.

## Local visual และ performance acceptance

ตรวจ static preview บน viewport 390 × 844 แล้ว Customer Home แสดง top bar, dynamic-brand fallback, navigation, hero, CTA, promotion loading state และ floating cart โดยไม่พบ text overflow หรือ contrast failure ใน viewport แรก. Marketplace route แสดง shell เดียวกัน, CTA, search, loading/empty state และ floating cart โดยไม่ทับกัน. ภาพและข้อสังเกตเก็บไว้ที่ `customer-visual/visual-review-notes.md` ภายนอก repository เพื่อใช้เป็น evidence ของรอบตรวจนี้.

วัด Chromium CDP จาก static preview หลัง parity change ด้วย fresh profile. ค่า single cold-run sample แสดงว่า Home มี 8 network requests, DCL 243 ms และ load 243.3 ms; Marketplace มี 4 requests, DCL 55.7 ms และ load 106.7 ms; Support มี 0 requests, DCL 34.4 ms และ load 35.8 ms; Profile มี 2 requests, DCL 38.8 ms และ load 91.6 ms. ตัวเลข local นี้ใช้ตรวจว่าหน้าใหม่ไม่ block shell หรือก่อ request storm เท่านั้น ไม่ใช่ SLA หรือผล production network.

## Security hardening ที่ตรวจและแก้ในรอบนี้

Supabase Security Advisor เคยรายงาน error สำหรับ `catalog_stores` และ `catalog_menu_items` ที่เป็น SECURITY DEFINER views. หลังตรวจ projection และ RLS ของ `stores`, `menu_items`, `store_categories` และ `menu_categories` แล้ว จึงตั้งทั้งสอง views เป็น `security_invoker = true` ตามแนวทาง Supabase และทดสอบ public catalogue REST read กลับได้ HTTP 200. แก้ warning `normalize_login_id()` ที่มี mutable search path โดยตั้ง fixed `pg_catalog, public` แล้ว.

Security Advisor รอบสุดท้ายไม่รายงาน catalog view error หรือ mutable search path warning แล้ว. คำเตือน SECURITY DEFINER function ที่เปิดให้ `anon`/`authenticated` เรียกได้ยังคงอยู่จากระบบ legacy เดิม เช่น attribution, referral, ride selection, wallet และ settlement; ไม่ได้แก้แบบเหมารวม เพราะต้อง audit role/trigger/body ราย function ก่อน revoke หรือเปลี่ยน invoker เพื่อไม่ทำ workflow การเงินและการมอบหมายงานเสียหาย.

## ผลงานที่จะส่งมอบในรอบถัดไป

Phase ต่อไปจะตรวจ code paths, patch modules, database/RLS และ asset references ของแต่ละรายการใน matrix แล้วจัดลำดับ migration ตามความสำคัญ โดยจะเริ่มจาก Customer home/header/search/category/store detail/cart/checkout/order tracking ที่เป็น core path ก่อน. รายงานสุดท้ายจะไม่ระบุว่า Customer MPA “Complete” ตราบใดที่ยังมี `MISSING` หรือ `BROKEN` ใน matrix นี้.

## Dependency audit: Database, RLS และ Storage

การตรวจ read-only บน Supabase project `abtsctwfkgzciseppach` ยืนยันว่าตาราง Customer legacy ที่สำคัญมีอยู่แล้ว ได้แก่ catalogue, campaigns, marketplace, support chat, notifications, profiles/consents, orders/status events และ payment-slip review. จึงไม่ต้องสร้างชุดข้อมูลใหม่เพื่อเลียนแบบ legacy. ตาราง marketplace, support, consent และ notification มี RLS ระดับ participant/customer อยู่แล้ว; การย้าย MPA ต้องใช้ session/role guard เดิมและไม่ bypass policy ด้วย LocalStorage.

| Dependency | สถานะที่ตรวจแล้ว | แนวทาง MPA ที่ต้องใช้ |
|---|---|---|
| Promotion/campaign | `campaigns` และ `campaign_stores` มี public-active/public-read policy | โหลดเฉพาะ Home แบบ P2/cache-first; validate destination ก่อน render click action |
| Catalogue/categories | `catalog_stores`, `catalog_menu_items`, `store_categories`, `menu_categories` มีอยู่ | ใช้ public catalogue view/query เดิม; เพิ่ม search/category filter โดยไม่เปลี่ยน data source |
| Marketplace | listings, orders, conversations และ messages มีทั้ง public listing read กับ participant RLS | แยก MPA routes ตาม browse/detail/create/profile/chat; ทุก mutation ต้องใช้ customer session |
| Support | conversations/messages/admin presence มี customer/participant RLS | คืน customer chat เป็น route/modal ที่อ่านเฉพาะ conversation ของตน |
| Profile/consent | `user_profiles` และ `user_consents` มี self read/write policies | คืน address/GPS/consent ด้วย user-bound requests เท่านั้น |
| Notifications | `mobile_notifications` มี recipient/admin read และ recipient/admin update | คืน inbox ของ customer พร้อม scoped background refresh หลัง shell render |
| Payment slip | `payment-slips` เป็น private; Customer upload/read ได้เฉพาะ folder ที่ขึ้นต้นด้วย `auth.uid()` และ Admin อ่านได้ | ใช้ Shared Media private upload/signed URL; เก็บ storage reference ไม่เก็บ public/expired URL |
| Catalogue media | `catalog-media` เป็น public และจำกัด 1 MB; admin/merchant เป็นผู้เขียน | Customer render URL ได้โดยตรง แต่ต้องมี `loading=lazy`, fallback และไม่เปิดสิทธิ์ upload ให้ customer |
| Rider document/proofs | private และมี RLS ของ rider/admin | ไม่เกี่ยวกับ Customer UI โดยตรง; จะไม่เรียกจาก Customer MPA |

ผล join รอบแรกของ bucket/policy ถูกตรวจซ้ำด้วย policy expression โดยตรงแล้ว จึงใช้เฉพาะ policy expression ในตารางนี้เป็นหลักฐาน scope. ขั้นต่อไปจะเริ่มคืน component ที่ไม่มี dependency ใหม่ก่อน ได้แก่ header/brand/service discovery/search/category และ store visual surface; feature ที่ต้องเพิ่ม route ใหม่จะทำหลัง contract และ RLS read path ชัดเจน.
