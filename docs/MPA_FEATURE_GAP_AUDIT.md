# MPA Feature Gap Audit

## Finding

The published MPA routes are valid document-level entries and load a shared role-aware runtime. They are not yet feature-equivalent to the legacy fallback applications. The following table is a migration backlog, not a claim that a workflow has been removed or accepted.

| Application | MPA capability verified in source | Capability still only in fallback or incomplete | Priority |
|---|---|---|---|
| Admin | Role guard, dashboard summary, order status select, store active toggle, read-only customer/rider/finance/notification pages, basic settings JSON | Store icon/background upload, promotion/banner upload, payment-slip review/viewer, store-detail actions, moderation history, password recovery, full settlement/withdrawal controls, AI workspace operations | Critical |
| Customer | Public catalog, simple store menu, session cart, basic order insert and profile form | Delivery-fee/distance calculation, multi-store sequencing, QR/payment workflow, payment-slip upload, referral, marketplace, support and richer order tracking | Critical |
| Merchant | Login/role guard, summary, simple order status, add-only menu form, basic profile patch | Menu edit/delete/media, store logo/background media, settlement actions, operational notifications and detailed account management | High |
| Rider | Login/role guard, assigned job list, basic delivery status, simple profile patch, basic earnings read | AP Ride lifecycle, job acceptance workflow, proof media, withdrawal request/viewer and notification workflow | Critical |

## Migration Rule

> A MPA page can replace its fallback page only after every workflow in its relevant row is `E2E PASS` in `FUNCTIONAL_ACCEPTANCE_MATRIX.md`. Until then, the fallback remains available and no legacy feature is deleted.

## Immediate Implementation Order

1. Admin store and promotion media are the first MPA implementation target because users reported image failures and these controls are absent from the new Admin route.
2. Customer payment/slip and Rider withdrawal proof remain private-media workflows and must not use the public `catalog-media` bucket.
3. Merchant media must use the same compression/UI contract as Admin catalog media, while retaining store-owner RLS instead of Admin-only Storage access.
