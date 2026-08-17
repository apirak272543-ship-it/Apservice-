# AP Service Data Contracts

## Contract Principles

Every client reads/writes the existing Supabase project through role-limited RLS policies. Field names are based on existing tables; clients must not create private status vocabularies or rely on browser cache for authorization.

| Entity | Primary table | Ownership and access |
|---|---|---|
| User / Profile | `user_profiles`, `user_roles` | Self read/update; admin as permitted by RLS |
| Customer | `user_profiles`, `wallet_transactions` | Self/private data only; admin access via RLS |
| Merchant / Store | `stores`, `menu_items`, `menu_categories` | Store owner or admin only for writes |
| Rider | `riders`, `rider_earnings` | Rider self or admin according to RLS |
| Order | `delivery_orders`, `delivery_order_items`, `order_status_events` | Customer, merchant, assigned/eligible rider, or admin according to RLS |
| Payment | `payment_slip_reviews`, `wallet_transactions` | Customer creates own proof; admin reviews under RLS |
| Settlement / Withdrawal | `settlements`, `settlement_items`, `withdrawal_requests` | Recipient sees own rows; admin manages |
| Notification | `mobile_notifications`, `mobile_device_tokens` | Recipient or admin only |
| Media | Supabase Storage + URL/path fields | Bucket policy + record ownership, subject to shared media policy |

## Order Contract

Required core fields are `id`, `status`, `customer_id/customer_email`, `store_id`, `rider_id`, `ordered_at`, `updated_at`, monetary totals and delivery locations where applicable. Status strings must use `shared/ap-service-core.js`.

| Actor | Allowed lifecycle action |
|---|---|
| Customer | Starts payment/places order; may request permitted cancellation |
| Merchant | `ร้านค้ารับออร์เดอร์` → `กำลังเตรียมสินค้า` → `ไรเดอร์กำลังไปรับ` |
| Rider | claims/continues delivery: `ไรเดอร์กำลังไปรับ` → `ถึงร้านค้า` → `รับสินค้าแล้ว` → `กำลังไปส่ง` → `สำเร็จแล้ว` |
| Admin | Operational intervention under RLS/audit rules |

## Error Contract

Clients show a Thai, action-oriented user message. They log a technical diagnostic only through the approved error-reporting path. Tokens, credentials, RLS expressions and raw backend error payloads are not displayed to end users.

## Media Contract

Image upload follows `validate → compress/resize → authorized storage upload → persist URL/path → responsive render`. Default client image cache target is no more than 1 MB. Bucket-specific exceptions such as payment slips must still validate type/ownership and never bypass RLS.
