import { readFileSync } from 'node:fs';

const files = {
  customer: readFileSync('/home/ubuntu/app-delivery-mobile/ap-service-location-options.html', 'utf8'),
  rider: readFileSync('/home/ubuntu/app-delivery-mobile/ap-rider.html', 'utf8'),
  store: readFileSync('/home/ubuntu/app-delivery-mobile/ap-store.html', 'utf8'),
  reviewMigration: readFileSync('/home/ubuntu/app-delivery-mobile/supabase/migrations/20260814_review_legacy_customer_email.sql', 'utf8'),
};

const requirements = [
  ['Customer/Admin: สมัครสมาชิกและสร้างโปรไฟล์', files.customer, /RegistrationUX[\s\S]*createAccount[\s\S]*user_profiles/],
  ['Customer/Admin: CRM โหลดรายชื่อลูกค้าจาก Supabase', files.customer, /CustomerDirectory[\s\S]*user_profiles\?select=user_id,email,display_name/],
  ['Customer/Admin: ยอมรับเงื่อนไขและนโยบายก่อนสมัคร', files.customer, /registrationCustomerConsent[\s\S]*registrationCustomerLocationNotice[\s\S]*type="checkbox" required/],
  ['Customer/Admin: checkbox การยินยอมไม่ถูกติ๊กล่วงหน้า', files.customer, /<input id="registrationCustomerConsent" type="checkbox" required \/>[\s\S]*<input id="registrationCustomerLocationNotice" type="checkbox" required \/>/],
  ['Customer/Admin: URL เปิดฟอร์มสมัครตามประเภท', files.customer, /RegistrationEntryRoute[\s\S]*get\('register'\)[\s\S]*\['customer','rider'\]/],
  ['Customer/Admin: ย้อนกลับและคงข้อมูลฟอร์ม', files.customer, /(?=[\s\S]*NavigationUX)(?=[\s\S]*apcx_customer_form_drafts_v1)(?=[\s\S]*history\.pushState)/],
  ['Customer/Admin: ส่ง metadata การยินยอมตอนสมัคร', files.customer, /privacy_policy_accepted[\s\S]*location_service_notice_accepted/],
  ['Customer/Admin: ขอ GPS ครั้งแรกโดยไม่ถามซ้ำทุกออร์เดอร์', files.customer, /PrivacyUX[\s\S]*ensureFirstLocationUse[\s\S]*requestPosition/],
  ['Customer/Admin: หน้าร้านจัดเมนูแบบการ์ดแนวตั้งสำหรับมือถือ', files.customer, /@media\(max-width:580px\)[\s\S]*#view-storefront \.food-grid\{grid-template-columns:1fr/],
  ['Customer/Admin: แผนที่กลับสู่ตำแหน่งปัจจุบันได้และให้พิกัดลูกค้ามาก่อนค่าเริ่มต้น', files.customer, /(?=[\s\S]*mapFocusLocation)(?=[\s\S]*focusMapOnCurrentLocation)(?=[\s\S]*customerPoint)(?=[\s\S]*configuredPoint)/],
  ['Customer/Admin: รีวิวเฉพาะร้านหรือ Rider ที่ผูกกับออร์เดอร์', files.customer, /reviewTargets[\s\S]*reviewTargetRatings[\s\S]*reviewTargetLabel/],
  ['Supabase: รีวิวออร์เดอร์เดิมตรวจเจ้าของจากอีเมลเมื่อยังไม่มี customer_id', files.reviewMigration, /o\.customer_id IS NULL[\s\S]*customer_email[\s\S]*auth\.jwt\(\)/],
  ['Customer/Admin: แอดมินจัดการคำขอถอนเงิน', files.customer, /admin_review_withdrawal/],
  ['Customer/Admin: AP Ride และคัดเลือก Rider', files.customer, /list_eligible_ride_riders/],
  ['Customer/Admin: เปิดกล้องในช่องรูปภาพ', files.customer, /CameraCaptureUX[\s\S]*capture/],
  ['Rider: แยก session ตามบทบาท', files.rider, /apcx_rider_supabase_session/],
  ['Rider: คำขอถอนเงินผ่าน RPC', files.rider, /request_full_wallet_withdrawal/],
  ['Rider: ข้อความ GPS แยกตามสาเหตุ', files.rider, /gpsErrorMessage/],
  ['Rider: ตรวจระยะ GPS ก่อนปิดงาน', files.rider, /verifyDeliveryGps/],
  ['Rider: ปุ่มย้อนกลับและคงข้อมูลฟอร์ม', files.rider, /(?=[\s\S]*riderBackButton)(?=[\s\S]*RiderNavigationUX)(?=[\s\S]*apcx_rider_form_drafts_v1)/],
  ['Rider: กล้องและบีบอัดหลักฐานจริง', files.rider, /(?=[\s\S]*RiderCameraCaptureUX)(?=[\s\S]*capture)(?=[\s\S]*compressRiderProofImage)/],
  ['Store: แยก session ตามบทบาท', files.store, /apcx_store_supabase_session/],
  ['Store: จัดการเมนูผ่านฐานข้อมูล', files.store, /createFood[\s\S]*menu_items/],
  ['Store: คำขอถอนเงินผ่าน RPC', files.store, /request_full_wallet_withdrawal/],
  ['Store: เปิดกล้องในช่องรูปภาพ', files.store, /StoreCameraCaptureUX[\s\S]*capture/],
  ['Store: ยอดขายรวมและยอดพร้อมถอนแสดงบนหน้าแรก', files.store, /StoreDashboardFinance[\s\S]*ยอดขายทั้งหมด[\s\S]*พร้อมถอน/],
  ['Store: ปุ่มย้อนกลับและคงข้อมูลฟอร์ม', files.store, /(?=[\s\S]*storeBackButton)(?=[\s\S]*StoreNavigationUX)(?=[\s\S]*apcx_store_form_drafts_v1)/],
  ['Store: เลือกได้ทั้งคลังไฟล์และกล้อง', files.store, /StoreImageSourceChoices[\s\S]*removeAttribute\('capture'\)[\s\S]*ถ่ายรูปด้วยกล้อง/],
];

const failed = requirements.filter(([, content, pattern]) => !pattern.test(content));
for (const [label, content, pattern] of requirements) {
  console.log(`${failed.some(([failedLabel]) => failedLabel === label) ? 'FAIL' : 'PASS'}: ${label}`);
}
if (failed.length) process.exit(1);
console.log(`PASS: ตรวจ contract ฟังก์ชันสำคัญครบ ${requirements.length} รายการ`);
