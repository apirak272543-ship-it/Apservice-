# AP Service Central Media Contract v4

## ขอบเขต

`shared/ap-service-media.js` คือสัญญากลางของ Customer, Admin, Merchant และ Rider สำหรับการตรวจไฟล์ การบีบอัด การอัปโหลด การตรวจ render URL การบันทึก metadata และการคืน URL ที่เหมาะกับสิทธิ์ แอปไม่ควรสร้าง uploader ใหม่เอง

| Contract | หน้าที่ | ผลลัพธ์สำคัญ |
|---|---|---|
| `prepareImage(file, profile)` | validate JPG/PNG/WebP, resize/crop/compress | Blob ≤ 1 MB, MIME, byte size, width, height |
| `uploadPublicImage()` | public storage upload + verify + registry | `publicUrl`, `mediaId`, metadata |
| `uploadPublicCatalogImage()` | catalog-media wrapper | contract เดียวกับ public upload |
| `uploadPrivateImage()` | private storage upload + signed verify + registry | durable `storageRef`, temporary `signedUrl`, `mediaId` |
| `getMediaMetadata()` | read registry record ตาม RLS | bucket/path/visibility/version/size |
| `getMedia()` | resolve record ตาม visibility | versioned public URL หรือ signed private URL |

## Media Profiles

ทุก source image รับได้ไม่เกิน 40 MB ก่อน processing และ output runtime จำกัดไม่เกิน 1 MB ตาม policy ปัจจุบัน โดยเลือก WebP เป็น default เมื่อ PNG ไม่จำเป็นต้องคงอยู่

| Media type | Profile runtime | Visibility ปกติ | Bucket/purpose |
|---|---|---|---|
| `STORE_LOGO`, `USER_AVATAR`, `RIDER_AVATAR` | crop กลาง 200×200, ≤350 KB | public/role-specific | catalog/profile |
| `STORE_BACKGROUND`, `BANNER`, `ADVERTISEMENT`, `PROMOTION` | รักษา aspect ratio, max 1600 px, ≤1 MB | public | catalog-media |
| `PRODUCT_IMAGE` | max 1280 px, ≤1 MB | public | catalog-media/marketplace-media |
| `PAYMENT_SLIP`, `DELIVERY_PROOF` | max 1600 px, ≤1 MB | private | payment-slips/delivery-proofs |
| `IDENTITY_DOCUMENT`, `LICENSE`, `VEHICLE_REGISTRATION`, `INSURANCE` | max 1600 px, ≤1 MB | private | rider documents |
| `QR_CODE` | max 1200 px, preserve eligible PNG | role-specific | payout/payment configuration |

The service creates a **primary optimized variant** now. Additional thumbnail/mobile/desktop variants are intentionally deferred until a server-side variant worker exists; applications must not request an original image by default.

## Storage and Access Rules

Public catalog/marketplace objects retain their bucket-level policies. Private evidence never becomes public: `getMedia()` creates a signed URL only after metadata RLS allows the caller to read that record. A durable database value for private evidence remains `bucket/path`; the signed URL is never the durable reference.

Public URL generation appends `?v=<version>` for cache invalidation. The physical storage path continues to use the current policy-compatible structure, for example `merchant/{actorId}/store-{storeId}-image_url/{nonce}.webp` or `{riderUserId}/{orderId}/{nonce}.webp`; this preserves existing storage RLS rather than forcing an unsafe global path rewrite.

## Central Registry

The additive migration `20260818_central_media_assets.sql` creates `public.media_assets`. Its registry holds media ID, actor ownership, media type, bucket/path, public/private visibility, variant, MIME, dimensions, byte size, version, status, timestamps and a `legacy_source` compatibility field. RLS is enabled with public-read-only for `visibility='public'`, owner/admin read, owner insert and owner/admin update.

During the rolling migration, domain rows may retain their legacy URL fields. New shared uploads register a media record and return `mediaId` without changing an existing domain URL contract. This is deliberate compatibility behavior, not a frontend bypass: the registry is the source of metadata for new files while old URL/Data URL fields remain read-only legacy references until their respective domain-specific `*_media_id` migrations are scheduled and verified.

## Four-Application Usage

| Application | Current Central Media v4 integration |
|---|---|
| Customer | Marketplace upload declares `PRODUCT_IMAGE` and `customer`; checkout loads v4 shared service for private payment workflow compatibility |
| Admin | Store, promotion and finance upload surfaces load v4; type inference maps background/icon/promotion scopes without altering existing workflows |
| Merchant | Store icon declares `STORE_LOGO`, background declares `STORE_BACKGROUND`, owner is `merchant` |
| Rider | Delivery evidence declares `DELIVERY_PROOF`, owner is `rider`, and continues to store only private `storageRef` in order data |

## Failure and Rollback Behavior

Image processing, upload, render verification and metadata registration have a visible Thai progress/error state. A failed media action must not crash its page. The registry migration did not update, delete or overwrite any legacy URL, Data URL, storage object or domain record. Rollback of application code is safe because legacy fields are retained; rollback of registry metadata can be performed only after confirming that no domain `mediaId` references depend on it.
