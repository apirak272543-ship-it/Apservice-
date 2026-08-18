# Admin Media Backend Audit

## Evidence Collected

The production `catalog-media` policy set allows `INSERT`, `UPDATE` and `DELETE` only to authenticated users satisfying `private.has_role('admin')`; upload/update names must use `jpg`, `jpeg`, `png` or `webp` extensions. The local migration specifies a public `catalog-media` bucket with a 1 MB file limit and the same accepted MIME types.

The production `role-access` Edge Function is active and verifies the caller's Supabase access token and `admin` role before performing privileged actions. Its `update_store_section` action allows the `appearance` section to persist `image_url` and `background_url` to `stores`, and returns the updated values. The Store Detail flow in `admin_contact_ui_patch.js` calls this action after `uploadCatalogMedia` returns a verified public URL.

## Interpretation

> The catalog-store image path is not a preview-only path: its intended pipeline is **Admin session → Shared Media compression → `catalog-media` Storage upload → public URL render verification → `role-access:update_store_section` persistence**.

The current evidence does not yet reproduce an upload failure. The remaining audit must distinguish these failure modes: missing/expired Admin session, unsupported source MIME type, canvas/compression failure, Storage RLS rejection, URL render timeout, and a separate failure in the later form save action.

## Confirmed Coverage Gaps

| Gap | Risk | Audit action |
|---|---|---|
| Store quick form has raw file inputs without an explicit camera/library control or a progress component | Mobile interaction can be unclear and appears stalled during compression/upload | Add unified media picker/progress binding after root cause evidence is complete |
| Store Detail and promotion flows show only toast progress | User cannot distinguish validation, compression, transfer, URL verification and final save | Add measurable stage progress with a green bar |
| `update_store_section` accepts supplied media URLs without validating origin/bucket | A manually pasted invalid URL may persist and later render as a broken image | Validate approved catalog URLs or render-check external URLs before persistence |
| Payment proof, identity evidence, menu images and non-Admin flows are not covered by the public-catalog contract | They may use different buckets, size policies and RLS rules | Audit independently; do not route private evidence through the public bucket |
