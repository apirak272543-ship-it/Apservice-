# AP Service Dependency Map — Four-Client Separation

## Current Entry Points

| Client target | Current entry | Status | Primary dependency risk |
|---|---|---|---|
| Customer | `index.html` | Production monolith/fallback, not MPA final | ยังมี inline Admin DOM, state และ render functions |
| Admin | `admin.html` | Compatibility fallback, not MPA final | runtime สร้างจาก `index.html` และยังมี customer-origin code ใน bundle |
| Merchant | `store.html` | Separate functional console; needs route split | มี Cloud/Auth/request/media logic inline ซ้ำกับ Rider/Monolith |
| Rider | `rider.html` | Separate functional console; needs route split | มี Cloud/Auth/request/status/media logic inline ซ้ำกับ Merchant/Monolith |

## Shared Backend Boundary

Supabase project เดิมเป็น source of truth สำหรับ Database, Auth, RLS และ Storage ทุก client. สิทธิ์จริงต้องถูกตรวจด้วย session + backend/RLS เท่านั้น; client storage ใช้เพียง cache/session-resume และไม่ใช่ authorization boundary.

## Current Shared / Legacy Runtime

| Element | Current consumers | Classification | Migration rule |
|---|---|---|---|
| `AppState` | Customer Monolith, Admin runtime | Legacy shared state | แยกเป็น query data + client-local UI state ก่อนลด usage |
| `Storage` | Customer/Monolith Admin | Legacy cache/persistence | คงไว้เป็น fallback; ห้ามใช้ตัดสินสิทธิ์ |
| `SupabaseSync` / `SupabaseAdminSync` | Customer/Monolith Admin | Shared API candidate | ย้ายเป็น shared authenticated API client โดยรักษา request shape |
| `Cloud` in `store.html` | Merchant | Duplicated shared API/Auth | รวม contract/refresh/error behavior ทีละส่วน |
| `Cloud` in `rider.html` | Rider | Duplicated shared API/Auth | รวม contract/refresh/error behavior ทีละส่วน |
| `legacy-bridge.js` | Module boot + Monolith runtime | Legacy bridge | ห้ามลบจน dependency graph แสดง zero consumer |
| `admin_*_patch.js` | Admin and legacy index | Temporary/Admin patch | ย้ายเข้า Admin modules หลังสร้าง replacement และ tests |
| `store_carousel_icon_patch.js` | Customer | Customer feature | ต้องไม่ถูกโหลดใน Admin/Merchant/Rider bundle |

## Client Boundaries

### Customer

Stores, products, cart, checkout, payment submission, order tracking, profile, marketplace and customer notifications. Customer must not load Admin patches, merchant management forms, rider work queue or internal tools.

### Admin

Management dashboard, operational orders, customer/account controls, stores, riders, finance, settlement, payment slips, platform settings, notifications and AI Workspace. Admin must keep original `index.html#admin` fallback during staged migration.

### Merchant

Only owned-store profile, opening hours, menu, stock, orders, promotions, sales/settlement, notifications and store settings. RLS limits data by store ownership.

### Rider

Only rider profile, availability, available/current deliveries, delivery lifecycle, navigation, earnings, history, notifications and rider settings. RLS limits data to rider identity and permitted job visibility.

## High-Risk Dependencies Requiring Staged Replacement

1. `index.html` mixes Customer and Admin DOM plus inline business rules; automatic HTML copying is not final code separation.
2. Merchant and Rider each define direct Supabase clients and duplicate session refresh/error behavior.
3. Order status, media serialization and delivery/payment rules exist in more than one client path and require a shared contract before refactoring.
4. Existing Admin patches address working production behavior; they must be moved only with equivalent route-level tests and fallbacks.

## Safe Migration Order

1. Publish architecture/data/business contracts and shared core interfaces.
2. Replace duplicated API/auth/media helpers with compatible shared functions.
3. Extract Customer first into a standalone entry without Admin patches.
4. Convert Admin to route-level modules while retaining Legacy Admin fallback.
5. Refactor Merchant and Rider to consume shared contracts/services.
6. Execute role/RLS/runtime/regression matrix before any legacy deletion.

## MPA Consumer Audit Gate

`index.html` must never be copied to create a final client. Every target route is defined in `docs/PAGE_ROUTE_MANIFEST.md` and must declare its page-specific CSS, JavaScript, data queries and services before implementation. No legacy/compatibility entry may be removed until its consumer audit reports zero consumers and the full role/RLS/runtime regression matrix has passed.
