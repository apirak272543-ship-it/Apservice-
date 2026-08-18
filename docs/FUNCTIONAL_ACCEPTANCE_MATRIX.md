# AP Service Four-Application Functional Acceptance Matrix

## Purpose and Test Status Vocabulary

This matrix is the execution checklist for the four published MPA applications and their compatibility fallbacks. A visible button, link, field or panel is **not** considered complete merely because it renders. Each row must produce the expected data mutation, navigation result, rendering result or Thai error state under the applicable Supabase Auth/RLS session.

| Status | Meaning |
|---|---|
| `PENDING` | Not yet executed against the relevant route/session. |
| `STATIC PASS` | Source, import and route contract verified; not a replacement for a real authenticated run. |
| `E2E PASS` | Executed end-to-end and verified for persistence/rendering after reload. |
| `BLOCKED` | Cannot be safely executed without a role-specific test account, controlled test data or a confirmed production-safe test plan. |
| `FAILED` | Reproduced defect with request/console/storage evidence; root-cause and regression test required. |

## Cross-Application Shell, Navigation and Progress

| ID | Application | Route / control | Expected result | Verification | Status |
|---|---|---|---|---|---|
| SH-01 | All | Entry URL and document navigation | New document begins navigation immediately; it never waits for a data request. | HTTP + timing + visual test | STATIC PASS |
| SH-02 | All | Shared CSS/JS assets | `ap-service-mpa.css`, `ap-service-mpa.js` and `ap-service-core.js` return successfully and do not load an unrelated role runtime. | HTTP + contract test | STATIC PASS |
| SH-03 | All | Loading/error state | Loading content and a Thai, action-oriented error state appear instead of a frozen screen. | Visual + forced request failure | PENDING |
| SH-04 | All | Green progress indicator | The percentage is supplied only by measurable media/data stages; unknown-duration requests show a stage indicator rather than a fabricated percent. | Unit + visual test | PENDING |
| SH-05 | All | Back, menu and fallback links | Links open an intended route and never leave a blank/error document. | Click-through matrix | PENDING |
| SH-06 | All | Sign out | Session is cleared, protected route cannot be revisited without a valid session, and the correct login route opens. | Auth E2E | PENDING |

## Customer Application

| ID | Route / control | Expected result | Status |
|---|---|---|---|
| CU-01 | `/customer/` home and “เลือกร้านค้า” | Public stores are shown from `catalog_stores`; empty/error state is Thai. | STATIC PASS |
| CU-02 | `/customer/stores.html` and store cards | “ดูเมนู” preserves the selected store ID and opens the correct menu. | STATIC PASS |
| CU-03 | `/customer/store.html?id=` menu and “เพิ่ม” buttons | Menu comes from the selected store only; cart quantity and total update without a data request. | STATIC PASS |
| CU-04 | `/customer/checkout.html` quantity buttons | Increment/decrement prevents negative quantities and recalculates the total. | STATIC PASS |
| CU-05 | Checkout “ยืนยันออร์เดอร์” unauthenticated | Customer is sent to the profile login route; no order is written. | PENDING |
| CU-06 | Checkout authenticated | Delivery order and line items are created under customer RLS; order appears after reload. | PENDING |
| CU-07 | Payment method / QR / slip | Payment method is persisted correctly; payment proof follows shared media policy, Storage RLS and can be rendered after reload. | PENDING |
| CU-08 | `/customer/orders.html` | Only current customer's orders are shown and status is rendered in Thai. | PENDING |
| CU-09 | `/customer/profile.html` login/save/sign-out | Session, role-neutral profile update and sign-out behave correctly under RLS. | PENDING |
| CU-10 | Customer referral, support, marketplace and legacy fallback flows | Existing baseline workflows remain available or have an explicit, working MPA migration route. | PENDING |

## Admin Control Plane

| ID | Route / control | Expected result | Status |
|---|---|---|---|
| AD-01 | `/admin/` login | Only a session with the `admin` role enters the Control Plane; other roles receive Thai access denial. | STATIC PASS |
| AD-02 | Dashboard cards and navigation | Shell renders before counts; background count/query failure does not block navigation. | STATIC PASS |
| AD-03 | `/admin/orders.html` status selector | Only Shared Core admin transitions are offered and PATCH result persists through RLS. | STATIC PASS |
| AD-04 | `/admin/stores.html` active toggle | Store activation persists and is reflected in customer catalog after reload. | PENDING |
| AD-05 | Customers, riders, finance and notifications pages | Admin queries use valid fields/policies and show Thai empty/error states rather than raw backend errors. | PENDING |
| AD-06 | `/admin/settings.html` JSON save button | JSON is validated first; approved central config key is upserted under admin-only RLS and server controls remain authoritative. | STATIC PASS |
| AD-07 | AI Workspace entry | Route does not load unrelated operational data; legacy compatibility link remains valid until dedicated workspace migration is completed. | STATIC PASS |
| AD-08 | Brand logo, store icon/background, banner/advertisement upload | Every file runs validate → compress → authorized `catalog-media` upload → URL persistence → render verification after reload. | PENDING |
| AD-09 | Payment-slip review / evidence viewer / download | Private proof uses the correct signed/private Storage path, opens in-app rather than navigating away, and does not expose another user’s proof. | PENDING |
| AD-10 | All admin badges, refresh, copy, confirmation, delete/edit, export/download and modal controls in fallback Admin | Every click has a valid action, confirmation where destructive, and a Thai result/error state. | PENDING |

## Merchant Application

| ID | Route / control | Expected result | Status |
|---|---|---|---|
| ME-01 | `/merchant/` login and role guard | Only `store_owner` user with owned store can open protected routes. | STATIC PASS |
| ME-02 | Dashboard | Store-specific order summaries load without exposing another store. | STATIC PASS |
| ME-03 | Orders status selector | Merchant transitions follow Shared Core and persist through store ownership RLS. | STATIC PASS |
| ME-04 | Menu form “เพิ่มเมนู” | Name, price and stock validation prevent invalid values; new menu appears for the correct store only. | PENDING |
| ME-05 | Store profile save/toggle | Profile fields persist under store ownership RLS and public catalog reflects approved public fields. | PENDING |
| ME-06 | Store logo/background/menu media input | All image inputs invoke Shared Media Service and preserve output after reload. | PENDING |
| ME-07 | Finance and settlement actions | Only store-owned financial data can be viewed; requests/errors are Thai and do not expose raw data. | PENDING |

## Rider Application

| ID | Route / control | Expected result | Status |
|---|---|---|---|
| RI-01 | `/rider/` login and role guard | Only `rider` users with a rider profile enter protected routes. | STATIC PASS |
| RI-02 | Availability/profile save | Rider can update only their allowed availability/profile fields; value persists after reload. | PENDING |
| RI-03 | Jobs list and “เปิดงาน” | Only assigned/eligible rider jobs are shown; selected job ID opens the correct details. | STATIC PASS |
| RI-04 | Delivery status save | Food delivery transition is Shared Core valid and RLS owner check passes; AP Ride states require reconciled state machine before enforcement. | PENDING |
| RI-05 | Proof of delivery / ride/document media | File type, compression/size, ownership, Storage path and post-upload render are all verified. | PENDING |
| RI-06 | Earnings, finance and withdrawal actions | Rider sees only own items; withdrawal request and evidence actions handle success/failure without logout or a blank document. | PENDING |

## Legacy Compatibility Fallbacks

`index.html`, `admin.html`, `store.html` and `rider.html` remain in scope until MPA functional rows pass. Any feature that exists only in a fallback receives a corresponding migration or documented compatibility route; it may not be silently removed.

## Performance and Progress Evidence

| Scenario | Required evidence | Status |
|---|---|---|
| Document navigation | `click → navigationstart` happens before data fetch completion. | PENDING |
| Public catalog load | Timing for first response and data-render completion, including slow/failure state. | PENDING |
| Authenticated section load | Timing around role check and data request; no blocked document navigation. | PENDING |
| Image processing/upload | Measured stages: selected, validated, compressed, upload transfer, URL persisted, render verified. | PENDING |
| Notification/badge refresh | Cached value appears first; refresh is asynchronous and failure does not block navigation. | PENDING |
