# Wave P2 — Store Operations และ Rider Compliance/Wallet

## จุดประสงค์

Wave P2 แยกเป็นส่วนที่เผยแพร่ได้อย่างปลอดภัยเพื่อไม่เปลี่ยนกฎการเงินหรือสถานะงานเดิมโดยรวมในครั้งเดียว ส่วน P2a ทำให้ Merchant จัดการการเปิดรับออร์เดอร์, เวลารับออร์เดอร์รายวัน และการปิดฉุกเฉินผ่าน server-authorized workflow พร้อมประวัติที่ตรวจสอบได้ ส่วน P2b จะใช้ฟิลด์ Rider compliance และ wallet ที่มีอยู่จริงเพื่อทำเอกสาร/หลักฐาน, review action sheet และ ledger ที่ย้อนได้ ส่วน P2c จะเพิ่มประวัติอัตรา GP ที่มีผลตามเวลาและผูกกับ settlement ใหม่เท่านั้น

## P2a Acceptance Criteria

| หัวข้อ | เกณฑ์สำเร็จ |
|---|---|
| สิทธิ์ | Merchant แก้ได้เฉพาะร้านที่ผูกกับบัญชีของตน; Admin อ่าน audit ได้; anon เรียก RPC ไม่ได้ |
| เวลาเปิด | ตารางรายสัปดาห์ใช้เวลา Asia/Bangkok, รองรับวันปิด, และไม่ยอมรับเวลาเปิดมากกว่าหรือเท่ากับเวลาปิด |
| ปิดฉุกเฉิน | ต้องมีเหตุผลเมื่อปิด; order อาหารใหม่ถูกปฏิเสธบน server แม้มี client เก่าหรือ API call ตรง |
| สถานะร้าน | active, emergency close และตารางเวลาเปลี่ยนผ่าน RPC เดียว พร้อม snapshot ก่อน/หลังใน `store_operation_events` |
| ความเข้ากันได้ | ตาราง `stores.open_time`, `close_time`, `order_cutoff_minutes` เดิมยังคงเป็น fallback จนทุก Merchant มี weekly schedule |

## สิ่งที่ยังไม่ปิดใน Wave P2

การตั้งค่า GP ใหม่ไม่ย้อนแก้ settlement ที่สร้างแล้ว, การตรวจเอกสาร Rider ต้องใช้ private storage และ action sheet ของ Admin, และสรุป wallet ต้องใช้ ledger ที่ append-only โดยไม่แก้ยอดใน `rider_earnings` โดยตรง
