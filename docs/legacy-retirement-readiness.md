# AP Service — Legacy Retirement Readiness

## ขอบเขตและหลักตัดสิน

เอกสารนี้ใช้ตัดสินว่า fallback/legacy ของ AP Service จะยังคงอยู่หรือจึงจะขออนุมัติปลดได้ในอนาคต ครอบคลุม Customer, Admin, Merchant และ Rider ที่ใช้ Supabase กลางร่วมกัน โดย **ไม่มี entrypoint, asset หรือข้อมูล legacy ใดถูกลบในรอบนี้**

> สถานะ “พร้อมเสนอปลด” ไม่ใช่คำสั่งลบระบบเก่า การลบจะทำได้ต่อเมื่อทุกแถวที่เกี่ยวข้องผ่านครบ ได้รับอนุมัติจากเจ้าของระบบ และมีแผน rollback ที่ใช้งานได้จริง

## หลักฐานที่ผ่านแล้ว

| หัวข้อ | ผลที่ยืนยัน | หลักฐาน |
|---|---|---|
| Customer Location/Bill parity | Checkout มี GPS retry, map provider fallback, manual coordinate และไม่คำนวณค่าส่งเอง | `customer_location_picker_contract_test.cjs`, `customer_delivery_pricing_contract_test.cjs`, production DOM check |
| Rider Delivery parity | Delivery มี GPS distance UX, Google Maps/OpenStreetMap fallback และ manual route reference ที่ไม่แก้ destination ลูกค้า | `rider_delivery_location_contract_test.cjs`, `rider_delivery_proof_contract_test.cjs` |
| Admin Store Control Plane | GP, profile field, พิกัด และ media update ใช้ `role-access/update_store_section` ที่ allow-list แล้ว | `role_access_store_section_contract_test.cjs`, `admin_store_section_server_action_contract_test.cjs`, Supabase `role-access` v13 active |
| Admin account/finance baseline | Account control, Store control, และ withdrawal workflow regression ผ่าน | `admin_account_management_contract_test.cjs`, `admin_store_management_contract_test.cjs`, `admin_withdrawal_workflow_contract_test.cjs` |
| Merchant baseline | Merchant MPA gate regression ผ่าน | `merchant_mpa_gate_contract_test.cjs` |
| Rider job lifecycle baseline | Available job claim และ proof delivery contracts ผ่าน | `rider_available_job_claim_contract_test.cjs`, `rider_delivery_proof_contract_test.cjs` |

## เกณฑ์ก่อนขออนุมัติปลด Legacy

| แอป | เกณฑ์บังคับที่ยังต้องผ่าน | สถานะปัจจุบัน | เจ้าของตรวจ |
|---|---|---|---|
| Customer | Browser authenticated: GPS allowed/denied, tile failure, manual save, reload persistence, submit order; Customer WebView APK ต้องทดสอบหน้าจอเดียวกัน | รอ interactive audit | Customer + Customer APK |
| Rider | Browser authenticated: GPS allowed/denied, destination coordinate/address fallback, manual route reference, proof และ status close; Rider WebView APK ต้องทดสอบ | รอ interactive audit | Rider + Rider APK |
| Merchant | ตัดสิน policy การลบเมนู: soft archive server-authorized หรือคง legacy hard delete; ทดสอบ menu/order/finance/media แบบ authenticated | รอ policy และ interactive audit | Merchant + Merchant APK |
| Admin | AImanus Admin audit ทุก section; ตรวจ action log ของ order/payment/rider actions; ปิด evidence เรื่อง backend transition validation และ Rider control actions | รอ interactive audit และ P1 evidence | Admin |
| Shared backend | ตรวจ RLS/Edge Function logs ของ action สำคัญ และทดสอบ lifecycle Customer → Merchant → Rider ใน production-safe audit fixture | E2E lifecycle เคยผ่าน; ต้อง rerun เมื่อ browser พร้อม | ทุกแอป |

## เงื่อนไขความปลอดภัยที่ห้ามผ่อนปรน

การปลด legacy ต้องรักษาหลักที่สำคัญดังต่อไปนี้: ข้อมูลการเงินต้องมาจาก server, การเปลี่ยนสถานะและสิทธิ์สำคัญต้องบังคับผ่าน backend/RLS, รูปภาพต้องผ่าน Shared Media Service และมีขนาดไม่เกิน 1 MB, การเปลี่ยนพิกัดต้องไม่ทำให้ Rider เขียนทับจุดส่งของ Customer และทุกหน้าต้องใช้ข้อความภาษาไทยที่อธิบายข้อผิดพลาดได้ชัดเจน

## ผลตัดสินรอบปัจจุบัน

สถานะของทั้งระบบคือ **ยังไม่พร้อมปลด legacy** เพราะ interactive audit ด้วยบัญชี AImanus และการทดสอบ Android WebView ที่เกี่ยวข้องยังไม่ครบ แม้ source contracts, deployment checks และ capability migrations ที่มีความเสี่ยงสูงบางส่วนผ่านแล้ว จึงต้องคงลิงก์ fallback ของ Merchant และ Rider รวมถึง legacy entrypoints ของ Customer/Admin ไว้ต่อไป

การดำเนินงานลำดับถัดไปคือรัน interactive acceptance ตามตารางข้างต้นเมื่อ browser audit กลับมาเสถียร แล้วบันทึกผลเป็น evidence ต่อแถวใน `legacy-to-new-parity-matrix.md` ก่อนขออนุมัติใด ๆ เกี่ยวกับการปลดระบบเก่า
