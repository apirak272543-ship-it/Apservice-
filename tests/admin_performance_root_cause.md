# Admin Performance Audit — Root Cause Evidence

ตรวจจาก thread `แก้ Admin โหลดช้า / Performance Audit` และ Task `แก้ Performance หน้า Admin` ใน AI Collaboration Workspace ของ Supabase project `abtsctwfkgzciseppach` เมื่อ 2026-08-17 รวมกับ `performance_baseline.md` และโค้ดที่ checkout อยู่ใน `/tmp/apservice-repo`.

## หลักฐานจาก Workspace และ baseline

| จุดตรวจ | หลักฐาน |
|---|---|
| Network latency | `catalog_stores` ประมาณ 3.5–4.6 วินาที, `catalog_menu_items` ประมาณ 1.6 วินาที, `marketplace_listings` ประมาณ 2.8 วินาที และคำขอ Admin หลายตัวประมาณ 1.6–2.5 วินาที |
| Client render | `renderAdmin` ประมาณ 95 ms จึงไม่ใช่คอขวดหลักเมื่อเทียบกับ network |
| localStorage | `apcx_stores` ประมาณ 3.36 MB และ `Storage.save()` ใช้ประมาณ 26.2–38.6 ms ต่อครั้งเพราะ stringify stores ซ้ำ |
| Duplicate work | ChatGPT ระบุว่า renderAdmin และ refresh catalog ถูก wrap หลายจุด, badge polling ทุก 20 วินาที และ Marketplace ถูกโหลดตั้งแต่ boot |

## หลักฐานจากโค้ดปัจจุบัน

1. `CategoryUX.load()` ใน `index.html` ยิงพร้อมกัน 6 คำขอ (`catalog_stores`, `catalog_menu_items`, `store_categories`, `menu_categories`, `menu_option_groups`, `menu_option_values`) และ `SupabaseSync.refreshCatalog` ถูก override ให้เรียก `CategoryUX.load()`.
2. `setTimeout(() => SupabaseSync.refreshCatalog(), 0)` ที่ `index.html` บรรทัด 1088 ทำให้ catalog โหลดทุกครั้งที่เปิดหน้า แม้หน้าแรกยังไม่ต้องเปิดรายการร้าน.
3. `Marketplace.refresh` ถูกเรียกจาก `admin_contact_ui_patch.js` ใน `renderPromotionEditor()` เมื่อยังไม่มี listing แต่ไม่มี loader หลักที่ผูกกับการเปิดหน้าตลาดอย่างชัดเจน จึงต้องกัน boot/initial calls ด้วย in-flight/TTL cache และโหลดเมื่อจำเป็น.
4. `renderAdmin` ถูกห่อซ้ำอย่างน้อยใน `index.html` สำหรับ settlement และใน `admin_contact_ui_patch.js` ซึ่งเพิ่ม `AdminPendingBadges.start()`, `ContactDirectory.refresh()` และ `StoreModeration.refresh()`. ช่วง module init ยังเรียก `ContactDirectory.refresh()` และ `CustomerDirectory.load()` อีกรอบถ้าเป็น Admin.
5. `AdminPendingBadges.refresh()` ยิง count query 10 ตารางพร้อมกัน และตั้ง `setInterval` ทุก 20 วินาที แม้ผู้ใช้ไม่ได้เปิดเมนู Admin. การ guard `refreshing` กันเฉพาะคำขอซ้อนระหว่างรอบ แต่ไม่กัน polling ที่ไม่จำเป็น.
6. `index.html` บรรทัด 337–340 เก็บ inline request ไว้ใน `legacySupabaseRequest` แล้วเปลี่ยน `SupabaseSync.request` ไปเรียก `window.APServiceModuleApi.request`. `modules/api/supabase-client.js` ใช้ path นี้และ refresh session ทุก 401 โดยไม่มี public-read fallback ของ inline request จึงมีความเสี่ยงให้ public catalog ที่ 401 เกิด session-refresh/retry และทำงานซ้ำ.
7. `modules/core/storage.js` และ inline `safeCacheSet()` sanitize inline image แล้ว แต่ยังเดิน object และ `JSON.stringify` `apcx_stores` ทั้งก้อนทุกครั้งที่ `Storage.save()`; `performance_optimization_patch.js` ช่วย debounce save 140 ms แต่ยังไม่ลดต้นทุนต่อการ flush และยังเรียก `storage.save()` ตอนติดตั้ง patch.

## เกณฑ์แก้ไข

ต้องคง business logic และข้อมูลจริง, ให้ Admin shell/menu แสดงก่อน, ให้โหลดข้อมูลเฉพาะเมนูเมื่อเปิด, dedupe/in-flight cache ต้องใช้ได้กับทุก request path, จำกัด select fields, ลดการเขียน localStorage ซ้ำ และคง polling badge เฉพาะช่วงที่ Admin เปิดหรือมี activity ที่จำเป็น.
