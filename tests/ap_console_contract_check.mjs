import { readFileSync } from 'node:fs';

const files = {
  customer: readFileSync('/home/ubuntu/app-delivery-mobile/ap-service-location-options.html', 'utf8'),
  rider: readFileSync('/home/ubuntu/app-delivery-mobile/ap-rider.html', 'utf8'),
  store: readFileSync('/home/ubuntu/app-delivery-mobile/ap-store.html', 'utf8'),
};

const requirements = [
  ['Customer/Admin: สมัครสมาชิกและสร้างโปรไฟล์', files.customer, /RegistrationUX[\s\S]*createAccount[\s\S]*user_profiles/],
  ['Customer/Admin: CRM โหลดรายชื่อลูกค้าจาก Supabase', files.customer, /CustomerDirectory[\s\S]*user_profiles\?select=user_id,email,display_name/],
  ['Customer/Admin: แอดมินจัดการคำขอถอนเงิน', files.customer, /admin_review_withdrawal/],
  ['Customer/Admin: AP Ride และคัดเลือก Rider', files.customer, /list_eligible_ride_riders/],
  ['Customer/Admin: เปิดกล้องในช่องรูปภาพ', files.customer, /CameraCaptureUX[\s\S]*capture/],
  ['Rider: แยก session ตามบทบาท', files.rider, /apcx_rider_supabase_session/],
  ['Rider: คำขอถอนเงินผ่าน RPC', files.rider, /request_full_wallet_withdrawal/],
  ['Rider: ข้อความ GPS แยกตามสาเหตุ', files.rider, /gpsErrorMessage/],
  ['Rider: ตรวจระยะ GPS ก่อนปิดงาน', files.rider, /verifyDeliveryGps/],
  ['Rider: กล้องและบีบอัดหลักฐานจริง', files.rider, /(?=[\s\S]*RiderCameraCaptureUX)(?=[\s\S]*capture)(?=[\s\S]*compressRiderProofImage)/],
  ['Store: แยก session ตามบทบาท', files.store, /apcx_store_supabase_session/],
  ['Store: จัดการเมนูผ่านฐานข้อมูล', files.store, /createFood[\s\S]*menu_items/],
  ['Store: คำขอถอนเงินผ่าน RPC', files.store, /request_full_wallet_withdrawal/],
  ['Store: เปิดกล้องในช่องรูปภาพ', files.store, /StoreCameraCaptureUX[\s\S]*capture/],
];

const failed = requirements.filter(([, content, pattern]) => !pattern.test(content));
for (const [label, content, pattern] of requirements) {
  console.log(`${failed.some(([failedLabel]) => failedLabel === label) ? 'FAIL' : 'PASS'}: ${label}`);
}
if (failed.length) process.exit(1);
console.log(`PASS: ตรวจ contract ฟังก์ชันสำคัญครบ ${requirements.length} รายการ`);
