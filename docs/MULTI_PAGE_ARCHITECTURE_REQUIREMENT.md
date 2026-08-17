# Multi-Page Architecture Requirement

## Binding Requirement

Every AP Service client application—Customer, Admin, Merchant and Rider—must use **Multi-Page Architecture (MPA)**. A page/route has one clear operational purpose and loads only the JavaScript, CSS, data queries and services necessary for that purpose.

Copying the historic monolithic `index.html` into another app and hiding unrelated views is explicitly an **interim fallback only**, not a compliant final architecture. The migration must replace that model with page-specific entries and reusable Shared Core, Shared Services and Shared Components.

## Page Navigation Contract

1. Navigating to another route changes the document/UI immediately and never waits for a data request.
2. Each page may display a loading/skeleton state while its page-specific data loads in the background.
3. Shared Core/Services/Components may be reused, but business rules and UI behavior may not be copied into each page/client.
4. Existing UI/UX and workflow are baseline behavior; MPA is a delivery/performance architecture change, not an unapproved product redesign.
5. Responsive, accessibility, performance and navigation improvements are permitted only when they retain functional parity.

## Deployment Contract

Customer, Admin, Merchant and Rider must be deployable and updatable as independent applications while using the same Supabase Database, Auth, Storage, RLS, central business rules and data contracts.

## Admin Control Plane Requirement

Admin is the control plane for central business configuration. Admin may edit approved configuration records in the central database, such as delivery configuration, platform rules and permitted operational settings. Security- and finance-sensitive rules must be validated and enforced by server-side functions/RLS/database constraints; the client is never the sole enforcement point.

## Migration Gate

The existing `index.html` Customer/Admin monolith and the generated `admin.html` compatibility entry remain fallback only. They cannot be deleted or described as final MPA clients until route manifests, per-page runtime loading, shared contracts, role/RLS tests and rollback tests pass.
