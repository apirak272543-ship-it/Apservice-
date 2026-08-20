# Wave P4 — Admin Override Governance

## เป้าหมาย

Admin แก้ปัญหาข้าม scope ได้ทันทีโดยไม่มี approval queue เพิ่ม แต่ทุก action ที่เป็น override ต้องมีเหตุผลอิสระอย่างน้อย 10 ตัวอักษร, รองรับหลักฐานรูปภาพ private แบบไม่บังคับ, แสดงสรุปก่อนยืนยัน และสร้าง audit record ที่ค้นย้อนหลังได้จากหน้าเดียว ขณะที่ Customer, Merchant และ Rider ยังคงทำงานประจำวันใน scope ของตนเองตาม server rule เดิม

## Contract กลาง

| ส่วน | กติกาที่บังคับ |
|---|---|
| Reason | Admin override ต้องกรอกข้อความภาษาไทย/มนุษย์อ่านได้อย่างน้อย 10 ตัวอักษร; ไม่ใช้ approval step เพิ่ม |
| Evidence | ไม่บังคับ แต่ UI แนะนำเมื่อ action แตะเงิน/บัญชี/ออร์เดอร์; รูปผ่าน Shared Media Service และไม่เกิน 1 MB |
| Storage | หลักฐานใช้ private bucket `admin-override-evidence`; path ต้องเป็น `admin-override-evidence/{admin_user_id}/override/...` |
| Audit | `admin_action_audit` เก็บ actor, target user/type/id, action, reason, evidence path, before/after state, metadata และเวลา |
| Read access | Admin เท่านั้นที่อ่าน Audit Log; รูปหลักฐานเปิดด้วย signed URL ตาม private storage policy |
| Immediate authority | Admin action ผ่าน server/RPC ทันทีหลัง reason/evidence validation; ไม่มี multi-step approval |
| Daily role autonomy | Customer/Merchant/Rider ไม่ต้องกรอก free-text reason สำหรับงานปกติใน scope ของตน; dropdown reason ของ Merchant/Rider เป็นงาน Wave ถัดไปเมื่อเพิ่ม flow เหล่านั้น |

## รอบงานที่เชื่อมแล้วใน Wave P4

1. Account control, role change และ customer wallet adjustment: RPC เพิ่ม evidence path, reason ขั้นต่ำ 10 ตัวอักษร และ audit metadata.
2. Admin order management, cancellation resolution และ group payment review: Edge/UI ส่ง evidence path ที่ validate แล้ว และ audit record เก็บ reference.
3. Admin Audit Log: MPA ใหม่มี filter action/date/admin/target, link entity และ signed preview หลักฐาน private.

## รายการที่ยังไม่เปิดเป็นธุรกรรมใหม่

| Addendum item | สถานะ | เหตุผล |
|---|---|---|
| Force cancel/refund และ split allocation | ต่อจาก Wave P4 | ต้องปิด canonical cancellation/refund/ledger matrix ก่อน เพื่อไม่สร้าง mutation การเงินนอก state machine |
| Delivery fee override | ต่อจาก Wave P4 | ต้องมี adjustment ledger และ fee-config version ก่อน |
| Zone shutdown | ต่อจาก Wave P4 | ต้องมี zone model และผลกระทบ order/store ที่ยืนยันแล้วก่อน |
| Master POS override | Blocked | ยังไม่มี branch mapping governance ตาม Blueprint |
| Review moderation | ต่อจาก Wave P4 | ต้อง inventory review model และ merchant read-only audit surface ก่อน |
| Merchant/Rider reason dropdown | ต่อจาก Wave P4 | ต้องเชื่อมกับ operation/rejection/incident flows ที่มี server contract ครบก่อน |

## Acceptance

- Admin ยังแก้ account/wallet/order/payment review ได้ทันทีเมื่อผ่าน server authorization.
- Override ที่เชื่อมแล้วปฏิเสธ reason สั้นกว่า 10 ตัวอักษร และ evidence path ของคนอื่น.
- Evidence upload ใช้ private storage, signed preview และ media cap 1 MB.
- Audit Log filter ได้ตาม action, date, actor และ target และไม่เปิดให้ non-admin อ่าน.
- การเปลี่ยนแปลงไม่ลดสิทธิ์งานประจำวันของ Customer, Merchant, Rider หรือ POS.
