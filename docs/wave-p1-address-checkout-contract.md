# Wave P1 — Customer Address Book and Checkout Integrity

## Purpose

Wave P1 ปิดช่องว่างระดับ **BLOCKER** สองเรื่องจาก Functional Blueprint v2 โดยไม่เปลี่ยนกติกาค่าส่งเดิมและไม่ลบ checkout/Location fallback ที่ใช้งานอยู่

1. ลูกค้าต้องมี Address Book ที่แยกจาก profile และตั้ง default ได้อย่างปลอดภัย
2. ทุก food order ใหม่ต้องเก็บ immutable address/recipient snapshot และไม่สร้างออร์เดอร์ซ้ำจากการส่งคำขอเดิม

## Data contract

| Object | Required fields | Server rules |
|---|---|---|
| `customer_addresses` | owner, label, recipient name/phone, address line, latitude, longitude, default state | เจ้าของเท่านั้นที่อ่าน/แก้/เก็บ; พิกัดอยู่ในช่วงโลก; มี default ได้เพียงรายการเดียวต่อ owner |
| `delivery_orders` snapshot | address id, recipient name/phone, rendered address, location/accuracy/source, note, captured time | เป็น snapshot ที่แก้ย้อนหลังไม่ได้; order ไม่อ่าน profile/address ล่าสุดเพื่อแสดงข้อมูลธุรกรรมเก่า |
| `delivery_orders` idempotency key | customer + key | key เดิมคืนผลออร์เดอร์เดิม; ห้ามสร้างธุรกรรมซ้ำ |

## UI contract

Checkout จะมี selector ที่อยู่ที่บันทึกไว้, ชื่อผู้รับ, เบอร์ผู้รับ, รายละเอียดจุดส่ง และปุ่มบันทึกที่อยู่ปัจจุบัน ผู้ใช้ยังเลือก GPS, หมุดแผนที่ หรือกรอกพิกัดเองผ่าน fallback เดิมได้ การบันทึกที่อยู่ต้องใช้ตำแหน่งที่ผ่าน validation แล้ว

## Security and audit contract

| Action | Actor | Enforcement | Audit / historical rule |
|---|---|---|---|
| อ่าน/แก้ที่อยู่ | Customer เจ้าของข้อมูล | RLS + server RPC owner check | เก็บ created/updated time; archive แทน hard delete |
| ตั้ง default | Customer เจ้าของข้อมูล | transaction เดียวบน server | default เดิมถูกยกเลิกอย่าง atomic |
| สร้าง order v2 | Customer role เท่านั้น | security-definer RPC ตรวจ customer, address owner, store, menu, price/availability, idempotency | order snapshot ไม่เปลี่ยนเมื่อ address/master data ถูกแก้ |
| ค่าส่ง | Server trigger เดิม | ไม่รับค่าค่าส่งจาก client | price/distance/payable ถูกคำนวณจากกติกากลาง |

## Acceptance criteria

- [x] ลูกค้าเพิ่ม/แก้/ตั้ง default/เก็บที่อยู่ของตนเองได้ และอ่านของผู้อื่นไม่ได้
- [x] checkout ใช้ที่อยู่ที่เลือกและบันทึก recipient/location snapshot ใน order
- [x] แก้ profile หรือ address หลังซื้อแล้วไม่เปลี่ยน order เก่า
- [x] ส่ง `idempotency_key` เดิมซ้ำแล้วได้ order เดิม ไม่เกิด order item หรือ payment review ซ้ำ
- [x] store ปิด, เมนูไม่พร้อมขาย, pิกัดผิด, address ไม่ใช่ของผู้ใช้ และ payload ผิด ถูกปฏิเสธจาก server
- [x] Customer Web ยังใช้ GPS/แผนที่/manual coordinate fallback ได้ตาม regression contract; Customer APK ยังต้องยืนยันบนอุปกรณ์จริง
- [x] checkout QR/slip, COD, multi-store UI และ legacy escape hatch ที่มีอยู่ไม่ถูกลบ; multi-store grouping/fee policy ยังคงเป็น Wave P1.2 ก่อนถือว่า multi-store production-ready

## Explicit non-goals of Wave P1

Wave นี้ไม่กำหนดราคาหลายร้าน, cancellation/refund, payment ledger สากล, POS reversal หรือ device-session management เพราะแต่ละเรื่องต้องมี state machine/financial policy แยกและไม่ควรถูกเดาใน migration เดียว
