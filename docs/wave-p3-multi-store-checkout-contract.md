# Wave P3 — Multi-Store Checkout Group

## เป้าหมาย

ให้ Customer ส่งคำสั่งซื้ออาหารจากหลายร้านใน **ครั้งเดียว** โดยระบบสร้าง `checkout_group` หนึ่งรายการและออร์เดอร์ย่อยหนึ่งรายการต่อร้านใน transaction เดียว หากร้านใดร้านหนึ่ง, เมนู, ที่อยู่, พิกัด, สลิป หรือกติกาค่าส่งไม่ผ่าน ระบบต้องไม่สร้างออร์เดอร์ใดเลย

## Contract กลาง

| วัตถุ | ข้อมูลที่เก็บ | กฎ server |
|---|---|---|
| `checkout_groups` | เจ้าของ, idempotency key, address, pricing, route, ยอดรวม, จำนวนและสถานะออร์เดอร์, สถานะการชำระเงิน | อ่านได้เฉพาะ Customer เจ้าของหรือ Admin; ไม่มี client mutation โดยตรง |
| `checkout_group_payments` | วิธีชำระ, ยอดรวมที่ต้องชำระ, สลิป private, สถานะ, reviewer, snapshot | สลิปโอนได้ครั้งเดียวต่อ group; Admin เท่านั้นที่ตรวจรับ/ปฏิเสธ |
| `checkout_group_events` | group, action, actor, ก่อน/หลัง, idempotency, reason | append-only history สำหรับสร้าง group และพิจารณาการชำระเงิน |
| `delivery_orders` | `checkout_group_id`, รายการ/ราคา/ค่าส่ง/route ต่อร้าน | คงออร์เดอร์และ payment record เดิมแยกร้าน แต่เกิดจาก transaction เดียว |

## Pricing และ route

ค่าจัดส่งถูกคำนวณใน RPC จาก `platform_configs.business_rules.food` เท่านั้น ไม่รับราคา ระยะทาง หรือส่วนลดจาก client สูตร v1 ใช้ระยะเส้นตรงจากพิกัดร้านถึงพิกัดที่อยู่, หักระยะรวมในราคา, คิดอัตราต่อกิโลเมตร, ค่าบริการ และตัวคูณโซน แล้วรวมผลของทุกร้านเป็นยอดกลุ่ม การเปลี่ยน config ภายหลังจะไม่แก้ข้อมูลเดิม เพราะบันทึก pricing/route snapshot ลง group และ order ทุกครั้ง

## การชำระเงินและสถานะ

| วิธีชำระ | สิ่งที่ Customer ส่ง | สถานะเริ่มต้น group | ผลต่อ order payment |
|---|---|---|---|
| COD | ไม่มีสลิป | `pending` | `pending` แยกร้าน |
| QR/สลิป | private `payment-slips/{customer_id}/...` ที่ผ่าน Shared Media Service ไม่เกิน 1 MB | `under_review` | `under_review` ทุก order ใน group |

Admin เรียก `admin_review_checkout_group_payment` พร้อมเหตุผลและ idempotency key เพื่อเปลี่ยนเป็น `verified` หรือ `rejected`; การเปลี่ยนแปลงส่งต่อสถานะไปยัง `order_payments` ของทุก order ใน group และบันทึก audit ทั้งระดับ group และ Admin

## การป้องกันและ conflict

1. RPC ตรวจ Customer role, ownership ของ address, store opening rule, menu/store relation, availability, archived menu, พิกัด และ business rule configuration ก่อนเขียนข้อมูล
2. `customer_id + idempotency_key` ใช้ advisory lock และ unique constraint; การส่งซ้ำคืน group เดิมพร้อมรายการ orders โดยไม่สร้างรายการ/การชำระเงิน/เหตุการณ์ซ้ำ
3. ร้านซ้ำใน payload, จำนวนร้านเกิน 10, รายการเกิน 100 ต่อร้าน, จำนวนสินค้าผิดช่วง, สลิปไม่ใช่ของ Customer และ method/snapshot ไม่ถูกต้องถูกปฏิเสธด้วยข้อความภาษาไทย
4. Trigger ทำ aggregate จาก `delivery_orders.workflow_state` เป็น `active`, `partially_cancelled`, `cancelled` หรือ `completed`; cancellation/refund ของแต่ละร้านยังใช้ state machine เดิมและจะไม่ทำให้ข้อมูลกลุ่มย้อนหลังเปลี่ยนโดย client

## ผลกระทบ 5 Web Apps และ 4 WebView APK

| พื้นที่ | ผลกระทบ Wave P3 |
|---|---|
| Customer Web / Customer APK | checkout เปลี่ยนจาก client loop เป็น RPC เดียว, แสดงสรุปร้าน/ค่าส่ง/ยอด group และส่งสลิปครั้งเดียว |
| Admin Web | อ่านรายละเอียด group และพิจารณา payment group ผ่าน action sheet ในระยะ UI ถัดไป; server action พร้อมตั้งแต่ Wave P3 |
| Merchant Web / APK | แต่ละร้านเห็นเฉพาะ order ของตัวเองตาม RLS เดิม; ไม่เห็น order ร้านอื่นหรือสลิป group |
| Rider Web / APK | เห็นเฉพาะ delivery order ที่มอบหมายตาม RLS เดิม; group ไม่เปิดข้อมูลร้านอื่น |
| AP Retail POS / APK | ไม่มีการเปลี่ยน mutation หรือ schema ของ POS; regression ต้องยืนยันว่า checkout group ไม่แตะ retail sale flow |

## เกณฑ์รับงาน

- [ ] สร้าง group หลายร้านสำเร็จแบบ atomic และเชื่อมทุก order กับ group เดียว
- [ ] replay key เดิมคืนผลเดิมโดยไม่มี duplicate order/payment/event
- [ ] server คำนวณ fee/route จาก config และ snapshot เท่านั้น
- [ ] สลิป private หนึ่งรายการต่อ group, owner validation และไม่เกิน 1 MB ตาม bucket policy
- [ ] Admin เปลี่ยน payment group ได้แบบ server-authorized พร้อม audit และ sync order payment
- [ ] สถานะ group aggregate เปลี่ยนตามสถานะ order โดยไม่เปิดสิทธิ์ client write
- [ ] regression ครอบคลุม Customer, Admin, Merchant, Rider, Retail POS และ WebView impact
