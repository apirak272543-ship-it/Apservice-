# Wave P1.2 — Order, Payment, Cancellation, Refund and Multi-store State Machine

## 1. Objective

Wave P1.2 แก้ช่องว่างที่ไม่ควรแก้ด้วยการซ่อนปุ่มหรือเพิ่มสถานะใน UI แบบกระจัดกระจาย ได้แก่ cancellation, refund, payment review และ multi-store checkout การออกแบบนี้รักษา `delivery_orders` และเส้นทางงานเดิมไว้ โดยเพิ่ม objects ใหม่เป็นแหล่งจริงสำหรับธุรกรรมการเงินและกลุ่มออร์เดอร์

> **หลักบังคับ:** ออร์เดอร์เดิมไม่ถูกลบ ไม่แก้ยอดย้อนหลังเพื่อให้เหมือนคืนเงิน และการตัดสินใจด้านสถานะ/ยอดเงินอยู่ที่ server เท่านั้น

## 2. Objects ที่ต้องเพิ่ม

| Object | Purpose | Snapshot ที่ต้องเก็บ | สิทธิ์เขียน |
|---|---|---|---|
| `checkout_groups` | รวม order หลายร้านจากการ checkout ครั้งเดียว | ลูกค้า, ที่อยู่, fee policy/config version, group total, request key | Customer ผ่าน RPC สร้างเท่านั้น; Admin เปลี่ยนสถานะตาม policy |
| `order_payments` | สถานะและหลักฐานการชำระเงินของ order | method, amount, reference, QR/slip reference, payment snapshot | Customer submit proof; Admin review/confirm; server controls transition |
| `order_cancellation_requests` | คำขอยกเลิก/ผลตัดสิน | actor, reason, evidence, requested time, eligibility snapshot | Customer/Merchant/Rider request ได้ใน scope; Admin/System resolves |
| `order_refunds` | ธุรกรรมคืนเงินแยกจาก order | original payment, amount, reason, approver, payment reference, proof | Admin financial permission only |
| `order_financial_events` | append-only timeline ทางการเงินและ audit ที่ query ได้ | action, actor, before/after, correlation/idempotency key | server only |

## 3. Canonical order workflow

Order จะรักษา `status` ภาษาไทยเดิมไว้เพื่อ legacy compatibility แต่เพิ่ม `workflow_state` ที่เป็น code คงที่ใน server และ map เป็นภาษาไทยที่ frontend แสดง

| Workflow state | Thai label | ผู้เปลี่ยนได้ | Conditions | Next states |
|---|---|---|---|---|
| `awaiting_payment` | รอชำระเงิน | System | QR/transfer ยังไม่มี payment ผ่าน | `payment_review`, `cancel_requested`, `cancelled` |
| `payment_review` | รอตรวจสอบการชำระเงิน | Customer submit / Admin review | มี slip ที่ผ่าน format policy | `payment_verified`, `payment_rejected`, `cancel_requested` |
| `payment_rejected` | ต้องยืนยันการชำระเงินใหม่ | Admin | reviewer reason required | `payment_review`, `cancel_requested`, `cancelled` |
| `payment_verified` | ชำระเงินแล้ว | Admin/System | payment record verified | `store_accepted`, `cancel_requested` |
| `store_accepted` | ร้านค้ารับออร์เดอร์ | Merchant/Admin | ร้าน active, payment requirement met | `preparing`, `cancel_requested` |
| `preparing` | ร้านกำลังเตรียม | Merchant/Admin | store accepted | `ready_for_pickup`, `cancel_requested` |
| `ready_for_pickup` | พร้อมรับสินค้า | Merchant/Admin | pickup ready | `rider_assigned`, `cancel_requested` |
| `rider_assigned` | มอบหมายไรเดอร์แล้ว | System/Admin | rider eligible/ready and atomic assignment | `picked_up`, `cancel_requested` |
| `picked_up` | ไรเดอร์รับสินค้าแล้ว | Rider/Admin | rider owns assignment | `delivering`, `cancellation_exception_requested` |
| `delivering` | กำลังจัดส่ง | Rider/Admin | rider owns assignment | `delivered`, `cancellation_exception_requested` |
| `delivered` | ส่งสำเร็จ | Rider/Admin | proof policy passes | `completed` |
| `completed` | เสร็จสิ้น | System/Admin | delivery completed / settlement event accepted | terminal |
| `cancel_requested` | รอพิจารณายกเลิก | Customer/Merchant/Admin | allowed actor/time window; reason required | `cancelled`, previous allowed state |
| `cancelled` | ยกเลิกแล้ว | Admin/System | cancellation resolved; payment/refund decision recorded | `refund_pending`, terminal no-refund |
| `refund_pending` | รอดำเนินการคืนเงิน | Admin/System | approved refund exists | `refunded`, `partially_refunded` |
| `refunded` | คืนเงินแล้ว | Admin | full refund settled | terminal |
| `partially_refunded` | คืนเงินบางส่วนแล้ว | Admin | partial refund settled | terminal |
| `disputed` | อยู่ระหว่างข้อพิพาท | Admin | dispute record required | admin-resolved terminal state |

`cancellation_exception_requested` เป็น internal operational state สำหรับกรณีหลังไรเดอร์รับงานแล้ว ต้องไม่แปลงเป็นยกเลิกอัตโนมัติ เพราะอาจต้องมีหลักฐาน สินค้า และผลการเงินต่างกัน

## 4. Payment state machine

| Payment state | Actor | Mandatory input | Server rejection |
|---|---|---|---|
| `pending` | System | payment method + order snapshot | no order/payment mismatch |
| `awaiting_slip` | System | transfer method | COD must not create slip requirement |
| `under_review` | Customer/System | private slip metadata <= 1 MB, correlation key | proof belongs to another order; duplicate proof request |
| `verified` | Admin | reviewer and optional reference | invalid amount, unavailable order state, prior terminal payment |
| `rejected` | Admin | rejection reason | blank reason; prior verified/refunded payment |
| `paid` | System/Admin | confirmed settlement or COD receipt policy | payment total mismatch |
| `refund_pending` | Admin/System | approved refund ID | original verified/paid amount unavailable |
| `refunded` / `partially_refunded` | Admin | refund reference/proof, paid amount | amount exceeds remaining refundable amount |
| `cancelled` | System/Admin | cancellation linkage | no approved cancellation |

## 5. Cancellation decision matrix

| Requester | When request is allowed | Resolution | Financial outcome |
|---|---|---|---|
| Customer | awaiting payment, payment review, payment rejected, store accepted, preparing | Server auto-cancels only before store acceptance; Admin decides after acceptance | Refund is never assumed; system opens/refuses refund based on payment state and approval |
| Merchant | before rider pickup | Admin/System review with reason | no automatic charge mutation |
| Rider | after assignment only as an operational exception | Admin dispatch resolution | retain rider/location/evidence trail |
| Admin | any non-terminal state | confirmation + reason required | may approve cancellation and separately create refund decision |
| System | payment expiry/invalid verification policy only | explicit policy/config version required | records no-refund/refund-pending result, never silently changes totals |

## 6. Refund rules

1. `order_refunds` is append-only. It stores `requested_amount`, `approved_amount`, `paid_amount`, `currency`, `reason`, `approver`, `payment_reference`, `proof`, `status`, and timestamps.
2. The server calculates refundable balance as verified/paid amount minus successful refunds. The client never provides the final refundable balance.
3. Partial refunds are allowed only when the aggregate of prior successful and in-progress approved refunds does not exceed the original captured amount.
4. Refund approval and marking paid are separate actions. Each requires an audit event and idempotency key.
5. An order may be cancelled with `no_refund` only when the actor/reason/payment policy permits it. That decision remains visible in both the customer and Admin timeline.

## 7. Multi-store checkout policy

| Requirement | P1.2 decision |
|---|---|
| Parent record | One `checkout_group` is created atomically before child orders. Each child `delivery_order` links to the group. |
| Idempotency | One group request key; child keys derive from the group key and store ID. Retry returns the same group and child orders. |
| Fees | Server returns a fee quote with config version and per-store line items before commit. The committed order snapshots that quote. No frontend fee arithmetic. |
| Route / rider | P1.2 records planning hints only. Dispatch may combine rides only after an explicit route feasibility policy is implemented. |
| Cancellation | A child order may cancel independently. Group status is computed from child terminal/non-terminal states; group never hides a child refund outcome. |
| Payment | Payment allocation is stored per child order and reconciles exactly to the group payment amount. |

## 8. Mandatory server controls

Every state-changing RPC/Edge action must require an authenticated caller, exact role + scope, one idempotency key, row lock/atomic update, allowed transition, Thai-first error response, status event, financial event if money is affected, and immutable admin audit if an Admin intervenes.

## 9. Acceptance criteria before UI exposure

- [ ] A duplicate request or two concurrent requests cannot create two payment/refund/cancellation decisions.
- [ ] Customer cannot cancel another customer’s order, change money fields, or force an order/refund state.
- [ ] Merchant/Rider cannot bypass assigned store/order scope.
- [ ] Admin can see a popup/action sheet with current state, payment snapshot, actor, reason, evidence and consequence before a financial action.
- [ ] Customer sees only customer-safe timeline fields; Admin sees full audit/financial detail.
- [ ] Existing Thai order statuses and legacy routes still render while the canonical workflow is introduced.
- [ ] All 5 Web Apps and 4 WebView APK have a written impact and regression result before release.
