# AP Service Performance Baseline

ตรวจจากเว็บไซต์สาธารณะ `https://apirak272543-ship-it.github.io/apservice-customer-app/?admin-full-audit-verify=778a3a5` เมื่อวันที่ 2026-08-17

## ผลการวัดในเบราว์เซอร์

หน้า navigation มี duration ประมาณ 899 ms, DOMContentLoaded ประมาณ 875 ms และ transfer ของเอกสารหลักประมาณ 120,741 bytes. รวม resource transfer ที่เบราว์เซอร์รายงานประมาณ 108 KB จาก 74 resources.

คำขอ Supabase ที่ใช้เวลานานที่สุดจาก resource timing คือ `catalog_stores` ประมาณ 3.5–4.6 วินาที, `catalog_menu_items` ประมาณ 1.6 วินาที, `marketplace_listings` ประมาณ 2.8 วินาที และคำขอ Admin เช่น `campaigns`, `withdrawal_requests`, `riders`, `menu_categories`, `rider_applications`, `settlements` ประมาณ 1.6–2.5 วินาที. ค่าดังกล่าวเป็นเวลาที่วัดจากเบราว์เซอร์จริง ไม่ใช่ค่าจำลอง.

การวัดฝั่ง client พบ `renderAdmin` ประมาณ 95 ms และการสลับเมนู orders/finance แบบ synchronous ประมาณ 0.9/0.4 ms ในสภาวะทดสอบที่ไม่รอ network. จึงชี้ว่าอาการหน่วงหลักอยู่ที่ network/data refresh และการจัดเก็บ localStorage มากกว่าการสลับ DOM เพียงอย่างเดียว.

localStorage มีขนาดรวมประมาณ 3,364 KB โดย `apcx_stores` เพียงคีย์เดียวมีประมาณ 3,360 KB. การเรียก `Storage.save()` 5 ครั้งใช้เวลาประมาณ 26.2–38.6 ms ต่อครั้ง เฉลี่ยประมาณ 31 ms เนื่องจาก serialize stores ขนาดใหญ่ซ้ำ.

หน้าเว็บโหลดสคริปต์ประมาณ 34 scripts. ไฟล์ patch ที่ใหญ่ที่สุดคือ `admin_contact_ui_patch.js` ประมาณ 93 KB, `creator_affiliate_patch.js` ประมาณ 52 KB และ `admin_floating_cart_patch.js` ประมาณ 40 KB แต่ resource timing ของไฟล์เหล่านี้อยู่ราว 50–100 ms จึงไม่ใช่ตัวชี้หลักเท่ากับ Supabase requests และ localStorage serialization.

## จุดที่พบจากโค้ด

`SupabaseSync.refreshCatalog` ถูกนิยามและ wrap หลายจุด และบูตด้วย `setTimeout(..., 0)` ที่ท้ายหน้า. มีทั้ง loader เดิมและ loader ที่ override ใหม่ โดย query เดิมใช้ `select=*` กับ `catalog_stores` และ `catalog_menu_items` ทำให้มีโอกาสดึงฟิลด์/รูปภาพเกินที่หน้าแรกต้องใช้.

`renderAdmin` ถูก wrap หลาย patch และแต่ละครั้งอาจเรียก `CustomerDirectory.load`, `ContactDirectory.refresh`, `StoreModeration.refresh`, `SettlementAdmin.load`, `CampaignAdmin.load` และ badge refresh. `AdminPendingBadges.refresh` ยิงคำขอ count หลายตารางพร้อมกันและตั้ง interval ทุก 20 วินาที.

`Marketplace.refresh` ถูกเรียกตอนบูตประมาณบรรทัด 833 ทั้งที่ข้อมูลตลาดไม่จำเป็นต่อการแสดงหน้าแรกทุกครั้ง จึงเป็น candidate สำหรับ lazy-load เมื่อเปิดหน้าตลาดหรือเมนูโปรโมชั่นที่ต้องใช้ข้อมูลตลาด.

## ข้อสรุปเบื้องต้น

อาการช้าไม่ได้เกิดจากอินเทอร์เน็ตอย่างเดียว. มีหลักฐานทั้ง latency ของ Supabase ที่สูง, คำขอซ้ำ/โหลดข้อมูลเกินจำเป็น, `select=*` ใน catalog และ localStorage `apcx_stores` ขนาดใหญ่ที่ถูก serialize ซ้ำ. แนวทางแก้ควรเริ่มจาก dedupe/cache network requests, lazy-load marketplace/Admin data, จำกัด select fields และลดการ serialize stores บนทุก action โดยต้องคงข้อมูลจริงและ regression tests เดิม.

แหล่งตรวจ: เว็บไซต์สาธารณะ AP Service URL ด้านบน และ Browser Performance Resource Timing ของหน้าเดียวกัน.

## รอบวัดหลังเพิ่ม performance patch

- หน้าแรก local preview โหลด DOMContentLoaded ประมาณ 0.40–0.52 วินาที และ load ประมาณ 0.45–0.56 วินาที ไม่พบ marketplace request ตอนบูต
- ก่อนแก้ พบ catalog_stores และ catalog_menu_items ถูกยิงซ้ำชุดละ 2 ครั้ง โดยบางชุดใช้ `select=*` และใช้เวลา 1.8–3.4 วินาทีต่อคำขอ
- หลังแก้ CategoryUX ใช้ select เฉพาะฟิลด์และคำขอ catalog เหลือชุดเดียวเมื่อ public read ทำงานปกติ; marketplace เปลี่ยนเป็นโหลดเมื่อเปิดหน้า
- สาเหตุคำขอซ้ำหลักคือ CategoryUX fallback เจอ session Admin หมดอายุจากตาราง option บางชุด แล้วเรียก base refresh ซ้ำ; public read ถูกปรับให้ไม่ต่ออายุ session และ table เสริม fallback เป็น []
- SupportChat `support_admin_presence` จาก 3 คำขอพร้อมกันลดเหลือ 1 คำขอด้วย status cache + in-flight dedupe; polling แชตยังคงทำงานเฉพาะเมื่อเปิดหน้าต่างสนทนา
- localStorage เดิม `apcx_stores` มีประมาณ 3.44 MB และมี inline Base64 8 รูป; แก้ module storage ให้ตัด inline image จาก cache copy ของ `apcx_stores`/`apcx_config` ก่อน stringify โดยไม่แก้ live state และเพิ่ม cache bust ของ boot/legacy bridge
- ต้องวัดซ้ำบน browser หลัง public build เพื่อยืนยันผล storage บนเครื่องใหม่ เนื่องจาก browser เดิมอาจถือ cache จาก module bridge เวอร์ชันเก่า
- URL ทดสอบ local: `http://127.0.0.1:4173/?performance-test=v9`
- URL เว็บไซต์สาธารณะเดิมสำหรับเทียบ: `https://apirak272543-ship-it.github.io/apservice-customer-app/?admin-full-audit-verify=778a3a5`
