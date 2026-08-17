# GPT Directives Understanding and Current Gap Audit

แหล่งข้อมูลคือข้อความจาก AI Collaboration Workspace thread `แก้ Admin โหลดช้า / Performance Audit` และผลรายงานที่ส่งกลับใน thread `Admin Navigation ยังช้า หลังแก้ Notification` ของ Supabase project `abtsctwfkgzciseppach` เมื่อ 2026-08-17

## ข้อกำหนดจาก GPT ที่ต้องทำตาม

GPT ระบุให้ dedupe/in-flight cache ทุก request path, lazy-load ข้อมูล Admin เฉพาะเมนูที่เปิด, จำกัด `select` เฉพาะฟิลด์ที่ใช้แทน `select=*`, ลดหรือหยุดการ serialize inline Base64 รูปซ้ำใน localStorage, ลด polling ที่ไม่จำเป็น, รวม wrapper ที่ซ้ำโดยคง legacy contract, ไม่เปลี่ยน business logic/ข้อมูลจริงโดยไม่จำเป็น และเพิ่ม regression tests พร้อมวัดผลก่อน/หลัง โดย Admin shell/menu ต้องแสดงก่อนแล้วข้อมูลค่อยโหลดแบบ async

## สิ่งที่ยืนยันว่ามีอยู่แล้ว

`performance_optimization_patch.js` มี request cache และ in-flight dedupe TTL 8 วินาที, debounce `Storage.save()` 140 ms และ dedupe wrappers ของ catalog/marketplace refresh. `admin_performance_audit_patch.js` มี in-flight dedupe ของ section loaders. `admin_contact_ui_patch.js` มี cached pending badges, async refresh, fallback และ timing API. `index.html` ใช้ select fields แบบแคบใน `refreshCatalog()` และ `modules/core/storage.js` มี revision cache กับ asynchronous media compaction

## Gap ที่ตรวจพบก่อนการแก้รอบนี้

1. `index.html` ยังมี `runInitialCatalog()` ที่เรียก `SupabaseSync.refreshCatalog({ summary: true })` หลัง performance patch พร้อมทุกครั้งที่บูต จึงยัง eager-load catalog ก่อนผู้ใช้เปิดร้าน
2. `index.html` ยังมี legacy `safeCacheSet()` ที่เดิน object และ `JSON.stringify()` `apcx_stores`/`apcx_config` ทุกครั้ง แม้จะ sanitize image; module storage path มี revision cache แต่ legacy path ยังอยู่
3. `admin_menu_sync_patch.js` ยังเรียก `menu_items?...&select=*` และเรียก `Storage.save()` หลัง load/submit ซ้ำ
4. `admin_contact_ui_patch.js` ยังมี promotion editor ที่อาจเรียก `Marketplace.refresh()` เมื่อไม่มี listing; ต้องให้เกิดจากการเปิด/ใช้ promotion editor เท่านั้น ไม่ใช่ boot path

ข้อมูลนี้เป็น acceptance criteria สำหรับการแก้รอบต่อไปและใช้ตรวจว่าไม่กล่าวอ้างว่าทำครบเกินหลักฐานจริง
