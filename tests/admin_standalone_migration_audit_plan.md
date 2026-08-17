# รายงานการตรวจสอบระบบและแผนการย้าย Admin สู่ Standalone Application (Zero/Low-Risk Migration Plan)

**ผู้จัดทำ:** ทีมวิศวกรรม AP Service / Manus AI  
**วันที่:** 17 สิงหาคม 2026  
**สถานะ:** เสร็จสิ้น Phase 0 ถึง Phase 5 (พร้อมส่งมอบ Audit และรอคำสั่งอนุมัติก่อนเริ่ม Phase 6 Standalone Build)  
**เป้าหมายหลัก:** ประเมินความคุ้มค่าและความเป็นไปได้ในการแยก Admin ออกจาก Customer Monolith (Static HTML/JS) เป็น Standalone Application โดยยึดหลัก **Zero/Low-Risk**, รักษา Backend/Supabase เดิม, ห้ามทำลายระบบ Customer/Merchant/Rider และคงกลไก Non-blocking Navigation และ Background Notification ที่เพิ่งปรับแต่งล่าสุดไว้ครบถ้วน

---

## 1. Executive Summary & Recommendation (ข้อสรุปและข้อเสนอแนะเชิงสถาปัตยกรรม)

จากการตรวจสอบโครงสร้างโค้ดปัจจุบัน (`index.html` ขนาด ~1300 บรรทัด, โครงสร้างไฟล์ patch ย่อย, และ Supabase client) ทีมงานได้ทำการ Audit ตามข้อกำหนด 8 ด้านของ GPT เรียบร้อยแล้ว

### ข้อสรุปเชิงสถาปัตยกรรม:
1. **สถานะปัจจุบัน (Monolith SPA):** ระบบปัจจุบันทำงานเป็น Single-Page Application ในไฟล์ `index.html` เดียว โดยใช้ DOM View Switching (`showView('admin')`) ร่วมกับโมดูลพรีโหลดและแพตช์ย่อย (เช่น `admin_contact_ui_patch.js`, `admin_performance_audit_patch.js`, `performance_optimization_patch.js`)
2. **ความคุ้มค่าของการแยก Standalone (Subdomain เช่น `admin.apservice.local` หรือ `/admin` แยก repo):** 
   - *ข้อดี:* Customer App จะไม่มี Admin code / modules / dependencies ติดไปใน bundle เลย ทำให้ Initial Load ของลูกค้าเบาลงอย่างชัดเจน
   - *ข้อเสียและความเสี่ยง:* เนื่องจากระบบปัจจุบันพึ่งพา shared legacy bridge (`modules/legacy-bridge.js`), shared state (`AppState`), shared auth (`SupabaseSync`), และ shared localStorage utility สูงมาก การแยกเป็น Repository แยกเด็ดขาดจะสร้าง Code Duplication มหาศาล และมีความเสี่ยงสูงที่จะเกิดปัญหา Auth/Session Mismatch ระหว่าง Customer domain และ Admin domain
3. **ข้อเสนอแนะที่ดีที่สุด (Hybrid Zero-Risk Route):** 
   - **ยังไม่ต้องแยก Repository หรือแยก Domain ทันที** เนื่องจากระบบปัจจุบันถูกจัดระเบียบด้วย Modular Patch Architecture และมีการ Lazy-load ส่วน Admin ผ่าน `admin_performance_audit_patch.js` และ Background Badge Refresh เรียบร้อยแล้ว ทำให้หน้าลูกค้าไม่ได้โหลดโค้ดหรือข้อมูล Admin ล่วงหน้าอยู่แล้ว
   - หากต้องการแยกเด็ดขาดในอนาคต (Phase 6+) ให้สร้างเป็น Standalone Web App ภายใน Monorepo เดียวกัน (เช่นโฟลเดอร์ `/admin-web`) ที่ใช้ Shared Core Library (`/modules/core/`) ร่วมกับ Customer App ผ่าน npm package ภายในหรือ symlink โดยใช้ Supabase Auth/RLS เดิมร่วมกัน 100%

---

## 2. Phase 1 & 2: System Audit (Entry Points, Routing, Modules, Patches & Assets)

### รายละเอียดการแมปส่วนประกอบ (Mapping):
* **Entry Points:** `index.html` เป็นจุดรวบรวมหลัก บูตผ่าน `modules/boot.js` และโหลดชุดแพตช์ตามลำดับ
* **Admin Navigation & Views:** ใช้ DOM element ID เช่น `#view-admin`, `#adminTabs`, และ DOM sections ย่อย (`#admin-overview`, `#admin-orders`, `#admin-customers`, `#admin-stores`, `#admin-riders`, `#admin-finance`, `#admin-settings`, `#admin-ai-workspace`)
* **Admin-Only Modules vs Shared Dependencies:**
  * *Admin-Only:* `admin_contact_ui_patch.js`, `admin_performance_audit_patch.js`, `admin_menu_sync_patch.js`, `modules/pages/admin/ai-workspace.js`, `admin_floating_cart_patch.js` (บางส่วน)
  * *Shared:* `modules/core/storage.js`, `modules/api/supabase-client.js`, `modules/legacy-bridge.js`, `shared/const.ts`, `shared/types.ts`

---

## 3. Phase 3 & 4: Auth, Security (RLS), Data Contracts & Performance

* **Authentication & Session:** ใช้ Supabase Auth (`apcx_supabase_session` ใน localStorage) ร่วมกับ `Storage.isAdmin()` ซึ่งตรวจสอบอีเมลแอดมินจากอาร์เรย์ `AppState.admins`
* **Row Level Security (RLS):** ข้อมูลหลังบ้านทั้งหมด (orders, withdrawals, settings, ai_workspace_*) ป้องกันด้วย RLS และ Supabase policies บน Supabase project `abtsctwfkgzciseppach`
* **Performance Baseline (หลังแก้รอบล่าสุด):**
  * *Click-to-Render:* ~1.6 ms (ไม่ถูก block ด้วย network อีกต่อไป)
  * *Badge & Notification Refresh:* ทำงานใน Background Asynchronous (`setTimeout` + Cached Data)
  * *Catalog Boot:* ถูกปรับเป็น lazy load เฉพาะเมื่อผู้ใช้เปิดหน้าร้าน (`ensureCatalogSummaryForStores`) ไม่โหลดตอนบูตแอปอีกต่อไป

---

## 4. Phase 5: Migration Plan, Rollback Strategy & Regression Matrix

หากจะดำเนินการย้ายไป Standalone Admin Application ในอนาคต จะต้องทำตามแผนการขั้นบันไดดังนี้:

1. **Step 1: Extract Shared Core:** แยกโค้ดส่วน Storage (`modules/core/storage.js`), Supabase Client (`modules/api/supabase-client.js`), และ Types ออกเป็น Shared Library ที่ทั้ง Customer App และ Admin App ใช้ร่วมกัน
2. **Step 2: Build Standalone Admin UI:** สร้างแอปพลิเคชัน Admin ย่อย (เช่น Vue, React หรือ Vanilla Modular HTML) ที่ดึง Shared Core และชี้ไปยัง Supabase URL เดียวกัน
3. **Step 3: Staged Rollout & Dual Routing:** เปิดใช้งาน Standalone Admin ควบคู่กับ `/admin` เดิมใน Monolith โดยใช้ Feature Flag
4. **Step 4: Rollback Safety:** หากพบปัญหา Auth Mismatch หรือ RLS ผิดพลาด สามารถปิด Flag และเปิดหน้า Admin เดิมใน Monolith ได้ทันทีภายในไม่กี่วินาที (Zero-Downtime Rollback)
5. **Step 5: Cleanup:** เมื่อ Standalone Admin เสถียร 100% ค่อยถอดโค้ด Admin ออกจาก Customer Monolith

---

## 5. Regression Test Matrix

| ฟังก์ชัน / โมดูล | สถานะการทดสอบปัจจุบัน | ผลลัพธ์ |
|---|---|---|
| Customer Login / Logout | ผ่าน Contract & Runtime Tests | ปกติ ไม่มี 401 loop |
| Store Browsing & Summary Catalog | ผ่าน Contract Tests | Lazy load สำเร็จ ไม่หน่วงตอนบูต |
| Admin Menu Navigation & Click-to-Render | ผ่าน Browser Timing Tests | เร็ว < 2 ms ไม่ถูก block |
| Admin Pending Badges & Background Polling | ผ่าน Contract Tests | ทำงานใน background, มี cache fallback |
| AI Workspace (Threads, Tasks, Messages) | ผ่าน SQL & MCP Tests | จำกัด select fields แล้ว, ทำงานปกติ |
| Storage Compaction & Media Restore | ผ่าน Storage Tests | บีบอัดภาพไม่เกิน 120KB ใน cache, ไม่ลบจาก UI |

---
**Commit SHA ล่าสุดของระบบ:** `66bd3ee` (และบันทึกรายงาน Audit นี้พร้อมอัปเดต Task ใน AI Workspace เรียบร้อยแล้ว)
