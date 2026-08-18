# Legacy Media Audit and Safe Normalization Plan

## Audit Result

All populated legacy references discovered in the audit are Data URLs embedded in database text columns. No matching object exists in the current storage buckets, so there is no safe storage object to resize or overwrite. The audit found no populated HTTPS URL or durable storage reference in these surfaces.

| Source surface | Data URL records | Decoded payload evidence | Action |
|---|---:|---|---|
| `stores` / `catalog_stores` icon | 3 each; same alias surface | JPEG total 951,283 bytes per surface | `MIGRATE` once per canonical store reference |
| `stores` / `catalog_stores` background | 3 each; same alias surface | 2 JPEG 736,506 bytes + 1 WebP 352,826 bytes per surface | `MIGRATE` once, use `STORE_BACKGROUND` |
| `menu_items` / `catalog_menu_items` image | 1 each; same alias surface | WebP 96,918 bytes | `MIGRATE` once, use `PRODUCT_IMAGE` |
| `marketplace_listings.image_url` | 1 | JPEG 400,967 bytes | `MIGRATE`, use `PRODUCT_IMAGE` |
| `delivery_orders.proof_image` | 3 | JPEG 818,731 bytes | `REVIEW_MANUALLY`, use private `DELIVERY_PROOF` |
| `withdrawal_requests.proof_image_url` | 1 | JPEG 591,955 bytes | `REVIEW_MANUALLY`, use private evidence policy |
| Rider document/profile/QR fields | 0 populated at audit time | — | `KEEP`, no migration required |

> Counts are reference-surface counts. `stores`/`catalog_stores` and `menu_items`/`catalog_menu_items` are mirrored alias surfaces and must be deduplicated by canonical record/reference before any upload.

## Why Automatic Conversion Did Not Run

The system has zero storage objects across current media buckets, while legacy assets are embedded as Data URLs. Bulk conversion would need to read each original, upload a copy to the appropriate owner-scoped private/public bucket, verify the copy, create metadata, update a domain reference and preserve an exact rollback map. Running that flow from an anonymous static browser or by overwriting a database column would violate the no-destruction requirement. No legacy record, Data URL or URL was changed in this task.

## Required Batch Procedure

1. Select a bounded batch of canonical records and store a migration ledger containing table, primary key, original column, original hash, original Data URL and target type.
2. Decode the original only in a protected migration worker. Classify the profile from this contract; never use the 200×200 profile for background, banner, proof, QR or document media.
3. Upload a new object to the existing policy-compatible bucket/path with `x-upsert=false`, then use the same `prepareImage()` quality limits and verify it opens.
4. Insert a `media_assets` record with `legacy_source` containing the original table/record/column/hash, plus a reversible before/after mapping.
5. Update a new nullable `*_media_id` or approved compatibility reference in a transaction-sized batch. Retain the original Data URL and mark the ledger `verified` only after Customer/Admin/Merchant/Rider rendering checks pass.
6. Keep originals until an explicit retention review approves archival. Never delete a storage object or source value as a side effect of migration.

## Validation and Rollback

For public media, verify anonymous delivery, cache version and image render. For private evidence/documents, verify only with the authorized owner/admin and use a short-lived signed URL. Validate 404, denied, malformed MIME, small/mobile display and slow-network behavior. If any check fails, switch the application reference back to the preserved legacy value and mark the ledger `failed`; do not delete the optimized copy until a later manual review.

## Remaining Implementation Boundary

The Central Media registry and all new uploads are implemented. A protected server-side batch worker and domain-level `*_media_id` rolling migrations remain necessary before claiming that embedded legacy Data URLs have been physically normalized. This work is intentionally queued rather than guessed because it manipulates business records and private evidence.
