# AP Service Architecture Contract

## Purpose

AP Service is being separated into **Customer**, **Admin**, **Merchant**, and **Rider** web clients. All clients use the existing Supabase Database, Authentication, Row Level Security and Storage project. This contract is the source for client boundaries during migration.

Every client must use a **Multi-Page Architecture (MPA)**. A route/page must load only the JavaScript, CSS, data and services it needs. Copying the legacy `index.html` into a new entry and hiding views is an interim fallback technique only; it does not satisfy final separation.

## Non-Negotiable Rules

1. Supabase Auth session and RLS are the authorization boundary. Browser localStorage is never a security boundary.
2. No client may change another role's private records except through a backend/RLS-authorized contract.
3. Order state, delivery fee, payment state, store state, role/permission and validation rules have one shared owner.
4. Media follows a common pipeline: validate → compress/resize → upload → persist URL/path → responsive render → replace/delete with authorization.
5. Existing `index.html` and its Admin view remain a rollback fallback until every new client passes runtime, security and regression tests.
6. Admin is the control plane for central business configuration. Financial and security-sensitive configuration must be validated/enforced by server/RLS/database rules, never by a client alone.

## Application URLs

| Application | Current URL | Target migration direction |
|---|---|---|
| Customer | `/index.html` | Dedicated customer entry with no Admin runtime |
| Admin | `/admin.html` | Route-level Admin shell and lazy modules; current compatibility entry is fallback only |
| Merchant | `/store.html` | Role-scoped Store/Merchant multi-page console |
| Rider | `/rider.html` | Role-scoped Rider multi-page delivery console |

## Shared Core Interfaces

| Interface | Owner | Contract |
|---|---|---|
| Authentication & session | Shared Core | Refresh session safely, clear on invalid session, do not infer roles from cache |
| Roles & permissions | Supabase/RLS + Shared Core | Customer, admin, store_owner, rider/creator roles are checked by authenticated backend access |
| Order lifecycle | Shared Business Rules | Only valid transitions may be sent; every update emits a status event/audit record where supported |
| Payment lifecycle | Shared Business Rules | Payment submission/review/approval/rejection uses contract statuses, not client-specific text rules |
| Delivery fee | Shared Business Rules | Fee inputs and calculation version are contract fields; clients display but do not independently invent fee rules |
| Notifications | Shared Service | Cached badge first, background refresh, request deduplication and failure tolerance |
| Media | Shared Service | Accepted type, max size, compression, resize, bucket/path ownership and responsive delivery are common |
| Error format | Shared API | User-safe Thai message plus technical diagnostic record without leaking credentials |

## Security Contract

- Customer cannot access Admin/Merchant/Rider private data.
- Merchant A cannot read/write Merchant B store, menu, order or settlement data.
- Rider cannot update deliveries not assigned/available under RLS rules.
- Admin client UI does not grant authorization; protected rows still require RLS approval.
- Direct URL, browser refresh, expired session and failed request must return a safe login/error state without exposing protected content.

## Legacy Removal Gate

`legacy-bridge.js`, inline `AppState`, Admin patches and old Monolith views may only be removed after a documented consumer audit shows zero consumers and the full regression/security matrix passes on all four clients.

## MPA Runtime Gate

Route changes must not await network requests. Each route changes document/UI first, then starts page-specific data work with an appropriate loading/skeleton state. Customer must not download Admin runtime; Admin must not download Customer runtime; Merchant and Rider must not download Customer/Admin runtime they do not consume.
