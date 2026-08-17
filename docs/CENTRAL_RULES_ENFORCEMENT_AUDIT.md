# Central Rules Enforcement Audit

## Scope

This audit validates whether the existing central business configuration and order lifecycle are enforced by Supabase/server controls rather than relying solely on browser code. It does not change production schema or data.

## Verified Controls

| Area | Existing backend control | Finding |
|---|---|---|
| Central configuration | `platform_configs` with `key`, JSONB `value`, `updated_at`, `updated_by` | Suitable canonical store for Admin Control Plane configuration |
| Admin configuration writes | `platform_configs_admin_manage` RLS policy for authenticated Admin role | Admin management is server/RLS-gated |
| Public payment configuration | `platform_configs_read_payment_public` permits authenticated read only for `payment_public` | Public payment display is narrower than full configuration access |
| Order creation | `orders_customer_insert` requires `customer_id = auth.uid()` | Customer cannot create an order for another user |
| Operational order updates | `orders_participant_update` uses Admin/owned-store/owned-rider role predicates | Role and ownership are checked in RLS; browser storage is not an authority boundary |
| Existing automated effects | Delivery order triggers maintain timestamps, notifications, rider earning and creator commission paths | Any lifecycle change must preserve trigger order and existing side effects |

## Blocking Risk: Lifecycle Vocabulary Divergence

`shared/ap-service-core.js` currently defines food-delivery lifecycle states. The Rider console also contains AP Ride states including `พร้อมรับงาน`, `ถึงจุดรับผู้โดยสาร`, `ไรเดอร์กำลังไปรับผู้โดยสาร` and `กำลังพาผู้โดยสารไปจุดหมาย`. A strict server transition trigger built only from the current Shared Core would incorrectly reject valid AP Ride workflow updates.

> **Decision:** Do not deploy a universal status-transition trigger until food-delivery and AP Ride state machines are separated or reconciled in one central contract. This prevents a security improvement from breaking live rider work.

## Required Next Changes

1. Define service-specific state machines in Shared Core: food delivery and AP Ride must each have explicit valid transitions and actor permissions.
2. Audit every current update payload from Customer, Merchant, Rider and Admin against those machines.
3. Add a database trigger that selects the correct machine by `service_type`, validates actor ownership through the existing `private.has_role`, `private.owns_store` and `private.owns_rider` helpers, and preserves existing timestamp/notification/earning/commission triggers.
4. Add field-level protection so non-admin operational updates cannot alter monetary totals, delivery fee, payable amounts, payment values or ride-pricing fields.
5. Add a route-level Admin Settings page that reads/writes only approved configuration keys through the existing `platform_configs` RLS policy.

## Rollback

No database schema, policy, trigger or data has been changed in this audit. The rollback point remains the documented repository baseline and existing Supabase schema.
