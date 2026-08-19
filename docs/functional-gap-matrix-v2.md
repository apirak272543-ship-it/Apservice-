# AP Service — Functional Gap Matrix v2

**สถานะเอกสาร:** Baseline สำหรับพัฒนาตาม Functional Specification v2 ของผู้ใช้  
**วันที่จัดทำ:** 19 สิงหาคม 2026  
**ขอบเขต:** Customer, Admin, Merchant, Rider, AP Retail POS และ Android WebView APK ทั้ง 4 ตัว

> เอกสารนี้แทนที่การใช้ Blueprint เดิมในฐานะ “รายการตรวจหน้าจอ” ด้วยเกณฑ์ตรวจเชิงระบบ: ข้อมูล, validation, server rule, สิทธิ์, audit, snapshot, idempotency, error/conflict และผลต่อ APK

## 1. วิธีอ่านสถานะ

| สถานะ | ความหมาย |
|---|---|
| **EXISTING** | พบ UI, schema และ server/RLS flow ที่รองรับสาระสำคัญแล้ว แต่ยังต้องผ่าน integration/device test ก่อนปิดงาน |
| **PARTIAL** | พบองค์ประกอบบางส่วน แต่ยังไม่มี data model, policy, server authorization หรือ UX ครบตาม v2 |
| **MISSING** | ยังไม่พบความสามารถหรือข้อมูลรองรับใน schema/runtime ปัจจุบัน |
| **BLOCKER** | ไม่ควรเปิด production สำหรับ workflow นั้นจนกว่าจะปิดช่องว่าง |
| **HOLD** | มี route/ข้อมูลพื้นฐาน แต่ห้ามเปิดธุรกรรมจริงจน policy ครบ |

## 2. หลักฐานระบบปัจจุบันที่ใช้เป็น baseline

ฐานข้อมูล production เปิด RLS กับตารางหลักทั้งหมด และพบตารางสำหรับ order, order event, payment slip review, rider earning, withdrawal, settlement, media asset, audit, marketplace, support, notification และ Retail POS แล้ว อย่างไรก็ดี การมีตารางไม่ได้แปลว่า workflow ครบ

`role-access` รุ่น 16 มี server actions สำหรับ login, rider presence, store moderation/profile/account, withdrawal review, user control, account control, role change, customer-wallet adjustment, account provisioning และ delivery-order management แล้ว ซึ่งเป็นฐานที่ดีสำหรับการย้ายคำสั่งสำคัญออกจาก frontend แต่ยังไม่ครอบคลุม refund, cancellation, grouped checkout, address book, session management และ POS reversal ตาม v2

## 3. Matrix ระดับบัญชีและตัวตน

| Function | Current state | สิ่งที่มีแล้ว | สิ่งที่ยังขาดตาม v2 | Server/Authorization ที่ต้องมี | Audit/Snapshot | APK impact | Priority |
|---|---|---|---|---|---|---|---|
| Customer registration | PARTIAL | มี form, profile, consent record และ role-based entry | แยกชื่อ/นามสกุล, email/phone verification, duplicate policy, password confirmation, account status | rate limit, duplicate-safe create, verification status | consent version/time, account-create event | Customer | P1 |
| Login / session | PARTIAL | Email/password, role gate และ logout มีอยู่ | device session list, logout-all, account-disabled flow, consistent restore/expiry policy | session/account-status check ทุก request สำคัญ | login/logout/security event | ทุก APK | P1 |
| Forgot / change password | MISSING | Admin reset store password เป็นบางกรณี | customer/rider/merchant self-service reset และ change-password พร้อม current-password validation | throttled token flow, invalidate token/session ตาม policy | password-reset/change event | ทุก APK | P1 |
| Email / phone verification | MISSING | profile เก็บ email/phone | verification challenge, pending/unverified state, re-verification เมื่อเปลี่ยน identity factor | verify ownership ก่อนเปลี่ยน factor | verification trail | Customer/ทุก role | P1 |
| Account status | PARTIAL | account_controls และ Admin action บางชุดมีอยู่ | matrix active/pending/unverified/suspended/disabled/archived พร้อม effective/expiry | every sensitive action ต้องตรวจ status | suspend reason/actor/time | ทุก APK | P1 |
| Role / permission matrix | PARTIAL | user_roles และ Admin set roles มีอยู่ | matrix อย่างเป็นทางการสำหรับ Customer, Merchant owner/staff, Rider, Retail staff/manager, Admin, Super Admin | role + permission + scope, ไม่ใช่ role อย่างเดียว | role-change event | ทุก APK | P1 |
| Customer profile edit | PARTIAL | display name, phone, address, location มีอยู่ | identity data vs profile data, re-verification, profile photo policy | owner-only + protected identity change flow | identity-change audit | Customer | P2 |

## 4. Matrix ที่อยู่, ร้านค้า และเมนู

| Function | Current state | สิ่งที่มีแล้ว | สิ่งที่ยังขาดตาม v2 | Server/Authorization ที่ต้องมี | Audit/Snapshot | APK impact | Priority |
|---|---|---|---|---|---|---|---|
| Customer address book | **EXISTING** | Address Book แยกจาก profile: label, ผู้รับ, เบอร์, address line, note, location, default และ archive | เขตข้อมูลที่อยู่แบบเป็นมาตรฐาน/การแก้ส่วนแยกตามภูมิภาคยังเป็น P2 | RPC owner-only, default เปลี่ยนแบบ atomic และ RLS | created/updated/archived time; **order snapshot** | Customer APK | P1 complete |
| Order address snapshot | **EXISTING** | delivery_orders เก็บ address id, ชื่อ/เบอร์ผู้รับ, note, location accuracy/source และ immutable JSON snapshot | แสดง recipient/note ใน Rider/Admin detail เป็น P1.2 | checkout RPC อ่าน address ที่เป็นเจ้าของและ active เท่านั้น | immutable delivery snapshot | Customer/Rider/Admin | P1 complete |
| Store create / legal profile | PARTIAL | Admin Store Control Plane มี identity/address/document/account ส่วนสำคัญ | section validation, document status, business type/subcategory, delivery zone, explicit editable-role map | Admin-only legal/commercial fields; Merchant limited public profile | store profile/audit event | Merchant/Customer | P2 |
| Store status machine | PARTIAL | active, moderation_status, emergency_closed และ moderation event มี | pending/active/temporary/emergency/suspended/archived แยก public visibility, accepting orders, account status, compliance | transition matrix + reason + actor | store status event | Customer/Merchant | P1 |
| Opening hours policy | PARTIAL | open/close time, cutoff และ emergency close มี | weekly schedule, breaks, holiday, special closure และ **server decision** ว่ารับ order ได้หรือไม่ | checkout/catalog evaluates server result | status snapshot at checkout | Customer/Merchant | P1 |
| GP change history | MISSING | current GP และ settlement GP snapshot มี | effective date, prior/new value, reason, approval and future-settlement only policy | Admin financial permission | immutable GP change audit | Admin/Merchant | P1 |
| Menu CRUD | EXISTING | category, price, stock, promotion, availability, image, archive/restore | field-level validation contract และ cost-price policy ถ้าต้องใช้ | owner store scope, non-negative price/stock | menu archive event | Merchant/Customer APK | P2 |
| Menu price history | MISSING | order item snapshot pattern บางส่วน | old/new price, reason, actor, effective time | merchant/admin controlled update | price-change event; historical order fixed | Merchant/Admin | P2 |
| Menu archive / restore | EXISTING | reason, actor, time และ restore as inactive/draft model | regression proof ว่า Customer catalog ไม่เห็น archived item | owner scope and transition validation | archive/restore event | Merchant/Customer | P1 |

## 5. Matrix Cart, Checkout, Payment และ Order

| Function | Current state | สิ่งที่มีแล้ว | สิ่งที่ยังขาดตาม v2 | Server/Authorization ที่ต้องมี | Audit/Snapshot | APK impact | Priority |
|---|---|---|---|---|---|---|---|
| Cart revalidation | PARTIAL | frontend ตรวจ stock/availability/price ก่อน checkout | server revalidate menu, stock, price, promotion, store status at commit | atomic server checkout validation | price/availability conflict response | Customer APK | P1 |
| Checkout idempotency | **PARTIAL** | Food order v2 มี key ต่อ customer, unique index, advisory lock และ retry key ใน browser session | grouped checkout/payment/refund idempotency ยังเป็น P1.2 | server replay-safe create สำหรับ food order รายร้าน | request/result linkage | Customer APK | P1 complete for single-store |
| Multi-store checkout group | MISSING | UI แตกตะกร้าเป็น order รายร้าน | checkout_group, policy ความสัมพันธ์, cancellation/refund บางร้าน, aggregate tracking | server calculates group fee/discount/route metadata | group/order snapshots | Customer/Merchant/Rider/Admin | **BLOCKER** |
| Delivery fee calculation | PARTIAL | delivery_fee/distance fields อยู่ใน order | config version, base/per-km/minimum/multi-store/discount and server calculator | server-only fee calculation | fee/config snapshot | Customer/Admin | **BLOCKER** |
| Payment state machine | PARTIAL | method, payment amount, confirmed time และ slip review มี | canonical payment transaction/status: pending/awaiting-slip/review/verified/rejected/paid/refunded/partial/cancelled | transition permissions + amount validation | payment audit and immutable record | Customer/Admin | **BLOCKER** |
| QR / slip review | PARTIAL | private slip path, status, reviewer, timestamp, <=1MB route | metadata size/compression, rejection reason policy, verified payment transition | customer upload own order; Admin review | reviewer audit | Customer/Admin APK | P1 |
| Order status machine | PARTIAL | status, timestamps, status events, role-access order management | formal transition matrix includes cancellation/refund/dispute; public/private event policy | server-authorized transitions only | all status events | ทุกแอป | **BLOCKER** |
| Rider assignment | EXISTING | atomic claim behavior and Admin assignment action, rider presence server action | documented conflict message/device regression | rider active/compliant/ready/no current conflict | assignment audit | Rider/Admin APK | P1 |
| Order cancellation | MISSING | status transition foundation exists | actor/time-window/reason/fee/evidence/refund decision matrix | central cancellation service | cancellation event/audit | ทุกแอป | **BLOCKER** |
| Refund / partial refund | MISSING | payment/ledger foundations exist | refund transaction, approval, payment-reference, partial allocation, no mutation of original order total | financial permission + idempotent refund action | immutable refund/audit | Customer/Admin | **BLOCKER** |
| Order timeline / visibility | PARTIAL | order_status_events exists | customer-visible event policy vs internal Admin timeline | server filters event audience | append-only event audit | Customer/Admin/Rider | P1 |

## 6. Matrix Rider, Earnings และ Settlement

| Function | Current state | สิ่งที่มีแล้ว | สิ่งที่ยังขาดตาม v2 | Server/Authorization ที่ต้องมี | Audit/Snapshot | APK impact | Priority |
|---|---|---|---|---|---|---|---|
| Rider application / compliance | PARTIAL | rider_applications, vehicle/compliance fields and admin review fields | complete document/status transition, rejection reason UX, retention policy | Admin review only; status gate everywhere | application status event | Rider/Admin | P1 |
| Rider presence / ready status | EXISTING | role-access validates profile, compliance, suspension before ready | device/offline handling and live device-test evidence | server-only update | readiness event | Rider APK | P1 |
| Rider location | PARTIAL | last_location + accuracy/time behavior | device/source/permission state history and retention policy | Rider owner only, rate limit | retention-aware location event | Rider APK | P2 |
| Delivery proof policy | PARTIAL | private proof upload exists | explicit required status, minimum proof fields, receiver/note/location requirement | server rejects final transition without required proof | proof metadata/audit | Rider/Customer/Admin | P1 |
| Rider wallet | PARTIAL | rider_earnings, withdrawal items and UI aggregates | canonical wallet transactions/states available/pending/paid/reversed | server computes balances only | earning/reversal entries | Rider/Admin | P1 |
| Withdrawal | EXISTING | recipient snapshot, review detail, approve/pay/reject and audit exist | idempotency key, self-service recipient profile policy, state matrix documentation | server financial permission and snapshot lock | mandatory audit | Rider/Admin | P1 |
| Merchant settlement | PARTIAL | settlements/settlement items, payout snapshot and Merchant ledger UI | source-of-truth computation, idempotency, GP effective-date link, dispute/reversal policy | server generates/changes settlement | settlement audit | Merchant/Admin | P1 |

## 7. Matrix Admin, Support, Notification และ Media

| Function | Current state | สิ่งที่มีแล้ว | สิ่งที่ยังขาดตาม v2 | Server/Authorization ที่ต้องมี | Audit/Snapshot | APK impact | Priority |
|---|---|---|---|---|---|---|---|
| Account Control Plane | PARTIAL | account controls, role actions, profile sections and wallet adjustment | formal field/scope matrix, session/device management, account history UI | least privilege by permission/scope | all sensitive change audit | ทุก APK | P1 |
| Admin order control | PARTIAL | modal edit/status/assignment/history, server action | cancel/refund/payment/proof/audit views per v2 | reason/confirmation/transition checks | order modification audit | Customer/Admin | P1 |
| Audit log | PARTIAL | admin_action_audit and specific events exist | normalized action catalog, immutable old/new/reason and searchable Admin report | append-only server log | all sensitive actions | Admin | P1 |
| Support operations | PARTIAL | customer conversation/message and admin presence exist | inbox, assignment, priority, SLA, category, internal note, reopen/escalation, attachment policy | staff scope and status changes | support event trail | Customer/Admin | P2 |
| Notification event matrix | PARTIAL | in-app/push tables and Merchant/Rider native polling exist | defined events, dedup key, read/sent states, deep link policy | server creates notification events | delivery/read audit | ทุก APK | P2 |
| Media governance | PARTIAL | media_assets, public/private split and <=1MB service exist | authoritative metadata, explicit owner/entity/visibility lifecycle, deletion/retention policy | private signed access and ownership | media audit | ทุก APK | P1 |
| Global config versioning | PARTIAL | platform_configs มีอยู่ | type/version/effective_from/update audit and config validation | Admin/Super Admin permission | config version audit | ทุกแอป | P1 |

## 8. Matrix Marketplace และ Retail POS

| Function | Current state | สิ่งที่มีแล้ว | สิ่งที่ยังขาดตาม v2 | Server/Authorization ที่ต้องมี | Audit/Snapshot | APK impact | Priority |
|---|---|---|---|---|---|---|---|
| Marketplace listing | PARTIAL | listing, conversation/message routes and basic lifecycle | complete draft/review/publish/reserved/sold/hidden/removal rules | seller ownership + moderator action | listing status audit | Customer APK | P3 |
| Marketplace transaction | HOLD | marketplace_orders schema exists | payment, delivery/pickup, cancellation, refund, dispute, moderation workflow | transaction state machine | immutable payment/listing snapshot | Customer/Admin | **BLOCKER** |
| Marketplace dispute/report | MISSING | review_reports exists for rating domain only | report queue, evidence, assignee, resolution/refund outcome | Admin moderation scope | full resolution audit | Customer/Admin | P3 |
| Retail catalog / branch inventory | EXISTING | retail_products separate from store_products/balance | catalog lifecycle/branch permission matrix | branch-scope RLS/RPC | change audit | Retail APK | P2 |
| POS sale | EXISTING | sale snapshot tables, idempotency key, inventory movement approved RPC design | payment reference validation and concurrency/device test | branch stock/permission/idempotency | sale snapshot/movement | Retail APK | P1 |
| POS payment | PARTIAL | payment method field | cash/transfer/QR refs, amount/reconciliation status policy | server validates payment configuration | payment audit | Retail APK | P2 |
| POS void/refund | MISSING | sale and movement foundations exist | void/refund/partial refund, approver, reason, stock reversal | idempotent financial reversal service | immutable reversal audit | Retail/Admin | **BLOCKER** for cash production |
| Cash drawer / shift | MISSING | none | open/close shift, opening/count cash, variance, approval | branch/shift authorization | cash-shift audit | Retail APK | P2 |

## 9. Cross-cutting delivery conditions

| Control | Current state | Required completion condition |
|---|---|---|
| RLS and server authorization | PARTIAL | Every money, state, identity, permission, assignment and stock mutation passes a server rule/RPC/Edge action; hiding UI is never treated as access control |
| Snapshot policy | PARTIAL | Order item, menu price, recipient/address, fee, payment, Rider/merchant data and POS sale details never change retroactively when master data changes |
| Idempotency | PARTIAL | Checkout, payment, refund, withdrawal, settlement, assignment, POS sale and critical transitions reject/replay duplicates safely |
| Error/conflict states | PARTIAL | Every workflow declares loading/empty/validation/permission/network/server/conflict/success behavior with Thai-first message |
| Soft deletion | PARTIAL | Order, payment, refund, settlement, withdrawal, sale, inventory movement and audit never use routine hard delete |
| Android WebView parity | PARTIAL | Route, login/session, upload/camera, GPS, notification, back, external link and logout pass per-web/APK matrix |
| Legacy parity | PARTIAL | Escape hatch remains until functional, data, permission, device and production parity all pass |

## 10. Execution order and acceptance gate

### Wave P1 — Production safety before feature expansion

1. Account status/role-permission/scope matrix and audit vocabulary.
2. Address book plus immutable address snapshot.
3. Server checkout revalidation, idempotency and delivery-fee snapshot.
4. Canonical payment + slip review transition model.
5. Order cancellation/refund transaction model and Admin controls.
6. Store status/opening-hours server decision and GP history.
7. Rider compliance/proof/wallet/withdrawal state documentation and enforcement.
8. POS sale test, then POS reversal before any cash production launch.

### Mandatory acceptance for every delivered function

| Question | Required answer before status can become COMPLETE |
|---|---|
| Who can act? | Exact role, permission and ownership/scope stated |
| What is persisted? | Required/optional fields, timestamps, immutable snapshots stated |
| What does the server reject? | Validation, state transition, duplicate and conflict behavior stated |
| What is recorded? | Event/audit/no-hard-delete rule stated |
| What does the user see on failure? | Thai-first validation, permission, network, server and conflict state stated |
| What else is affected? | 5 Web Apps/4 APK impact and legacy escape-hatch implication stated |

## 11. Change-control rule

No P1 schema migration, Edge Function deployment or production GitHub Pages release may be made as an isolated UI change. Each item must include: migration, RLS/server authorization, action audit where material, regression contract, five-web/four-APK impact note, worktree check, and production verification.
